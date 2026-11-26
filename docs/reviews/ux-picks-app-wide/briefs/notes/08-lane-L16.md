# Lane L16 (projective-five-point), round 7: PARTIAL handoff (budget signal at 135k)

## Done (observed)
- Parity recorded BEFORE converting: markers `data-readout-note` already existed on every panel sentence (no panel edit needed); SAMPLES entry `projective-five-point` (8 states) in `src/graphs/base/declare/parity.test.tsx`; `src/graphs/projective/__parity__/projective-five-point.json`. Never re-record.
- `FivePointGraph.tsx`: `FivePointIds` (note status/conic/control/weight/weight-kind/farin/deviation; legend conic/line-pair/arc/continuation/polygon/tangents/points; no param/row/section/action), `declaration()` (notes in panel order, status is the first note with `tone: 'warning'` unless kind is ok; legend; marks.must = the five points), `drawnObject`, `named` map in `DrawnScene`. Base `performAction` already throws.
- `fivePointText.ts`: `fivePointMessages()` (Message twin of `describeFivePoint`, same words).
- Fragment `src/localization/fragments/projective-five-point.ts` (pair, status+stale join, 7 legend keys), registered in `fragments/index.ts`.
- `FivePointControls.tsx` (shared): ONLY change is a `<div data-declared-panel="">` around the sentence paragraphs (LiveReadout stays outside, so the announcement survives). No other file imports it (grep: only FivePointGraph), so ThreeViews does not use it despite the brief.
- Lesson frames: `projectiveFivePointGuidedLesson.ts` all 9 observation frames `declare` (open readouts + highlights).
- `FivePointGraph.declaration.test.tsx`: 11 tests pass. RED: swapped `weight` note text for `weightKind` -> `AssertionError: expected [ …(7) ] to deeply equal [ …(7) ]`, `- "Utež w ≈ 0,7071 (w² = 1/2)."` / `+ "w < 1: lok je del elipse."`; reverted.
- Checks (observed, after last edit): graph-check projective-five-point PASS (contract, parity 2, golden 1, declaration 11, shared 150); golden check passes with no difference (notes were already marked); tsc clean; lint clean; `just build` passed; `just unit src/graphs/projective src/learning/content src/localization src/graphs/base/declare src/graphs/base/presets`: 3294 passed, 1 failed = `parity.test.tsx > parity recording linear-program` (other lane's flake, the unit L15 noted; a later run failed to parse because someone has temporary `DBGVIEW/DBGSTACK` console.log edits in `src/graphs/levelsets/LinearProgramGraph.tsx` in this worktree, not mine).

## Placement (one line each)
- No pucks: example (6 options), arc ends (5 options each) exceed 4; third point and continuation switch are setup/display and have no arbiter key. All controls stay in Orodja; only the status/readout paragraphs are now the declared notes (hidden in Orodja while board cards show). Points are board-owned; legend and marks cover them.

## Not done / next commands
1. `just smoke-lesson projective-five-point --port 4391 --workers=1` (not run).
2. Rerun `just unit src/graphs/base/declare/parity.test.tsx` once the LinearProgramGraph debug lines are gone.
3. Delete scratch `.command-logs/l16-*`.
