// Fast drop-in for csv-reader 1.0.0 (make.fun's own reference program).
// run(input) returns exactly what csv-reader 1.0.0 returns for {text, header}:
// {columns, rows, errors}. Same broken-row policy, same error records, same order.
//
// Speed comes from never building a field one character at a time: unquoted
// fields are scanned for their delimiter and sliced out whole, quoted fields
// jump from quote to quote with indexOf, and a field is only copied when a
// doubled quote, a line break inside quotes, or a stray CR forces it.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input, faster. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (n > 0 && text.charCodeAt(0) === 0xFEFF) pos = 1;

  // The record being read: the line it starts on and the index in rows it takes (null: the header).
  let recordLine = 1;
  let recordRow = null;

  function err(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // A quoted segment that holds a line break: count its breaks (CRLF counts
  // once) and read every CRLF or lone CR inside it as LF, in a single pass.
  function fixBreaks(seg) {
    return seg.replace(/\r\n?|\n/g, () => {
      line += 1;
      return '\n';
    });
  }

  // Reads unquoted characters onto `value` up to the next comma or line break:
  // a CR not followed by LF is dropped (stray_cr). Returns the field and how
  // it ended; `added` counts the characters kept in this call.
  function readUnquoted(value) {
    let added = 0;
    let start = pos;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        if (pos > start) {
          const seg = text.slice(start, pos);
          value = value ? value + seg : seg;
          added += pos - start;
        }
        pos += 1;
        return { value, ended: COMMA, added };
      }
      if (c === 10) {
        if (pos > start) {
          const seg = text.slice(start, pos);
          value = value ? value + seg : seg;
          added += pos - start;
        }
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      if (c === 13) {
        if (text.charCodeAt(pos + 1) === 10) {
          if (pos > start) {
            const seg = text.slice(start, pos);
            value = value ? value + seg : seg;
            added += pos - start;
          }
          pos += 2;
          line += 1;
          return { value, ended: LINE_BREAK, added };
        }
        if (pos > start) {
          const seg = text.slice(start, pos);
          value = value ? value + seg : seg;
          added += pos - start;
        }
        err('stray_cr');
        pos += 1;
        start = pos;
        continue;
      }
      pos += 1;
    }
    if (pos > start) {
      const seg = text.slice(start, pos);
      value = value ? value + seg : seg;
      added += pos - start;
    }
    return { value, ended: END, added };
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = null; // nothing accumulated yet: the first segment is taken as-is
    let p = pos + 1;
    for (;;) {
      const q = text.indexOf('"', p);
      if (q < 0) {
        // The quote never closes: it is a literal character, and the text
        // after it is read again as unquoted.
        pos = open + 1;
        line = openLine;
        err('unterminated_quote');
        return readUnquoted('"');
      }
      let seg = text.slice(p, q);
      if (/[\n\r]/.test(seg)) seg = fixBreaks(seg);
      if (text.charCodeAt(q + 1) === 34) {
        // A doubled quote inside: one quote, and the field goes on.
        value = value === null ? seg + '"' : value + seg + '"';
        p = q + 2;
        continue;
      }
      value = value === null ? seg : value + seg;
      pos = q + 1;
      if (pos >= n) return { value, ended: END, added: 0 };
      const c = text.charCodeAt(pos);
      if (c === 44) {
        pos += 1;
        return { value, ended: COMMA, added: 0 };
      }
      if (c === 10) {
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK, added: 0 };
      }
      if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
        return { value, ended: LINE_BREAK, added: 0 };
      }
      // What follows the closing quote is appended as it stands, up to the
      // next comma or line break.
      const junk = readUnquoted(value);
      if (junk.added > 0) err('quote_junk');
      return junk;
    }
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
