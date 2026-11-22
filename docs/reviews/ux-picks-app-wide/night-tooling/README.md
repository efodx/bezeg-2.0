# Night tooling from the UX picks prototype (frozen copy)

Copied on 2026-11-22 from `C:/Users/1337Hacker/Desktop/bezeg-ux-picks/night/` on the owner's machine, the only place it existed, as the first step of [task 01c](../../../tasks/ux-picks-app-wide/01c-check-tooling.md). It ran against the `ux-picks` prototype (frozen at `aff6df6c`). These files are a reference for the port into the repository's Playwright setup, not code to run from here; they are excluded from ESLint and are not edited.

- `fuzz/fuzz.cjs`, `fuzz/inv.cjs`: the randomized interaction fuzzer and its invariant checker (I1 to I5, `--replay`, `--selftest`).
- `fuzz/min-*.json`: minimised failure cases (F1, F2, the waves case); `fuzz/RESULTS.md`, `fuzz/RESULTS2.md`: the runs before and after the prototype's R30 fixes; `fuzz/final/*.txt`: final per-route output; `fuzz/NOTES.md`: the fuzzer's own notes.
- `probe.cjs`: the jank probe and its thresholds.
- `CHECKLIST.md`, `GUIDE.md`: the prototype's conversion checklist and guide.
- `conv/<graph>/NOTES.md`: per-graph conversion notes from the prototype's night passes.

Not copied: screenshots, failure PNGs and the full `fail-*.json` traces (the full seeds replay from the fuzzer), and the critique, polish and brief files of the night runs.
