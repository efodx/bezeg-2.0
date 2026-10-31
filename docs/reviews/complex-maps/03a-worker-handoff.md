# Complex maps 03a (reciprocal graph) worker handoff - partial

## State
Reciprocal graph implemented; not committed. Unit tests: model test passes (3 groups, `just unit src/analysis/complexReciprocalModel`). Graph test file written (12 tests); last run 3 failed, 9 passed (before two test-only fixes of which only one landed).

## Files
- src/analysis/complexReciprocalModel.ts (+ .test.ts)
- src/graphs/complex/ComplexReciprocalGraph.tsx, ComplexReciprocalGraph.test.ts
- src/graphs/complex/complexReciprocalPresets.ts (Preset collection key `complex-reciprocal`, diagnoses; task 04 may move it into functionPresetCollections.ts, which I did not touch)
- src/localization/sl.ts, en.ts: 53 `complex_recip_*` keys + `invalid_complex_inversion_radius` inserted after `complex_legend_arcs` (CRLF kept). Other worker's lines untouched.

## Known failing tests (all test-side, product code not implicated)
1. Preset test: regex `/zRe.*0\.05.*-2.*2/` (line ~384) must accept the Unicode minus: use `[-−]2`. The sed did not apply.
2. Caption test: expected line 5 should be `z' = 0,9 − 0,8i` (z=1−i, c=0.5, r=1); the sed replacement of the `.replace(...)` expression did not apply.
3. Unmount test: fixed by deleting the `graph.graphSession.isAlive = false` line (applied); rerun unconfirmed.

## Remaining
- Fix 1 and 2, rerun `just unit src/graphs/complex/ComplexReciprocalGraph`.
- `npx tsc --noEmit --pretty false`: last run only errors in src/graphs/linear (other worker). Not rerun after tests were added.
- `npm run build` not run. Mutation evidence not collected. Host test (real JSXGraph, StrictMode) not written. docs/localization.md term table not updated (terms: konjugirano število, obratna vrednost, inverzija v krožnici, enotska krožnica, krožnica inverzije, količnik).
- Not run: ComplexMultiplication tests (files untouched).

## Decisions / risks
- Lesson actions: only complex-z-re/im, complex-w-re/im are reachable; names for reveals, circle and examples are a closed set in src/learning/model.ts (another worker has edited it), so task 04/lessons must add them.
- Roots graph not built.
- Statuses: predict, z-zero, inside, outside, on-circle, centre-pole, off-view. Position (inside/on/outside) decided via exact `circlePosition`; circleInversion guarded by `isInversionRadius`.
- Later smoke must check: dragging z/w/centre/radius handle on a real board, labels not overlapping, z=0 display, off-view warning when zooming, live SL/EN switch, Reset/preset restore.
