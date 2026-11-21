# csv-reader-speed-01-run-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Abdee36/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Abdee36/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast drop-in for csv-reader 1.0.0: it reads broken CSV files exactly like the reference — same columns, rows and error records for every input — several times faster. Built by an AI agent for make.fun's "Read broken CSV files faster, 21 November 2026" bounty, $100 in USDC.

## How it is faster

The reference builds every field one character at a time. This one never does: unquoted fields are scanned for their delimiter and sliced out whole, quoted fields jump from quote to quote with `indexOf`, and a field is only copied when a doubled quote, a line break inside quotes, or a stray CR forces it. Same broken-row policy, same answers — on the practice set it runs the parser about 6× faster than the house baseline (roughly 85 ms vs 550 ms for six ~1.7 MB files) while passing every case.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) reads every case from `/input/cases.json` (or `$MAKEFUN_INPUT_DIR`), answers each with `run` from `solve.js`, and writes `/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR`).

## Files

- `solve.js` — the fast reader: `run({text, header})` returns `{columns, rows, errors}`, byte-for-byte the reference's answers.
- `main.ts` — the driver the harness runs.
- `package.json` — `{"type": "module"}`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ztkayn92&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
