# Lane L20 (triangle-solver), round 8: PARTIAL handoff (budget signal at 135k)

## Done (observed)
- Parity recorded BEFORE converting: `data-readout-note` added to `<p data-triangle-status>` (text unchanged); SAMPLES entry `triangle-solver` (16 states, `run(patch)` = `runAs('learner', setState({...fresh, ...patch}))`) in `src/graphs/base/declare/parity.test.tsx`; `src/graphs/trig/__parity__/triangle-solver.json` recorded (passed). Never re-record. Golden has no notes: expect notes-only `golden [] now [...]` differences, report verbatim.
- `TriangleSolverGraph.tsx` converted, `npx tsc --noEmit` clean (0 errors) right after it: `TriangleSolverIds` (params `triangle-mode`, `triangle-data`; rows; note `status`; legend circumcircle/antipode/ssa-arc/height), rows as Messages (`geometryRows/solveRows` -> `TriangleSolverRow[]`, public `readoutRows()`, `listRows()` renders panel text), `statusMessage()` (`statusText()` = renderMessage of it), `viewMarks()`, `parameterBindings()` (2 keys, refusal `DomainError(trisolve_choice_rejected)`), `declaration()` (legend from `legendItems()`), `drawnObject()` via new `legendObjects` map filled in `buildScene`, cleared in `disposeScene`; Orodja mode and data-type ChoiceSelects wrapped in `PuckOwned`; panel group has `data-declared-panel`; `FunctionLegend` render removed (declared legend replaces it).
- Fragment `src/localization/fragments/triangle-solver.ts` (10 keys, `trisolve_*`) registered in `fragments/index.ts` (import + 3 lists).
- Own test `TriangleSolverGraph.test.tsx`: `asLearner` helper + `solve` wrap writes in `runAs('learner')` (import of runAs added); not yet re-run.

## Placement (one line each)
- Mode choice (3 options) puck: lessons and exploration flip sides/circle/solve to compare.
- Data type (4 options, solve mode only) puck: lessons switch SSS/SAS/ASA/SSA; max 2 pucks at once.
- Side/angle sliders (a, b, c, A, B) stay in Orodja, undeclared (typed data that defines the triangle; lessons type values but with >4 would exceed the puck cap); vertices stay in Orodja (point list: no point parameter kind).

## Not done / next commands
1. `just unit src/graphs/trig` failed (log `.command-logs/l20-unit1.log`) for untagged writes: own `TriangleSolverGraph.test.tsx` (now fixed, rerun), `TriangleSolverLessonActions.host.test.tsx` (`apply()` of `set-mode`/`set-data` calls untagged `setState`: wrap `apply` as `act(() => { runAs('lesson', ...) })` or `runAs('learner')`, as the real host runs lesson actions in `runAs("lesson")` (BaseGraph.tsx:786); `pick`/`type` DOM events are tagged), and SHARED `trigPresetCollection.test.tsx` ("an SSA solve state round-trips ..." applies a state untagged: wrap in `runAs('learner', ...)` per brief, import from `../base/writes/writeSource`; anything else: leave `triangle-mode`/`triangle-data` undeclared and report test:line).
2. Add a puck test (`chooseOnPuck('triangle-mode','solve')`, `chooseOnPuck('triangle-data','ssa')`, `typePuck` not needed; puck-absent-from-Orodja check, copy L19 `GrowthGraph.test.tsx`).
3. Write `TriangleSolverGraph.declaration.test.tsx` (copy `GrowthGraph.declaration.test.tsx`; file name starts with `trianglesolver`): 5+ states (sides, circle, circle right, solve SSS, SSA two, ASA none), `checkDeclaration` empty, keys bound, rows equal `readoutRows()`, legend entries visible in circle and SSA; break one row value, quote the red failure.
4. Lesson frames (`trigSolveGuidedLessons.ts`, `trigTriangleGuidedLessons.ts`): `frameDeclarer<TriangleSolverIds>()` (type import from graph), `uses: ['triangle-data']` where prompts ask to choose data type (trigSolve lines ~139, ~156) and `triangle-mode` where mode is asked; highlight given rows only, never predicted values; sliders are undeclared so no `uses`. Reword prompts naming a moved control as "polje": sl line 139/156 "v polju Podani podatki izberi" and en "in the field Given data choose" (keep label `Podani podatki`/`Given data`, drop "polje"/"field"); same for "Način" in trigTriangleGuidedLessons (grep). Update pinning tests (`trigSolveGuidedLessons.test.ts`, `trigTriangleGuidedLessons.test.ts`). `*FirstTask.test.tsx` case for triangle-solver (grep).
5. Checks after the last edit: `just graph-check triangle-solver --route triangle-solver`; `BEZEG_PARITY_GOLDEN_CHECK=1 BEZEG_PARITY_GOLDEN_ID=triangle-solver just unit src/graphs/base/declare/parityGolden.test.tsx`; `just unit src/graphs/trig src/learning/content src/localization src/graphs/base/declare src/graphs/base/presets`; `npx tsc --noEmit --pretty false`; `just lint` on changed files; `just build`; `just smoke-lesson <triangle-solver rows of tests/guided-lessons.smoke.spec.cjs> --port 4391 --workers=1`.
6. Scratch to delete: `.command-logs/l20-*` (rows.txt, rec.log, tsc.log, unit1.log).

## Files touched
`src/graphs/trig/TriangleSolverGraph.tsx`, `TriangleSolverGraph.test.tsx`, `src/graphs/trig/__parity__/triangle-solver.json` (new), `src/graphs/base/declare/parity.test.tsx`, `src/localization/fragments/triangle-solver.ts` (new), `src/localization/fragments/index.ts`.

## Round 8 continuation (observed)
- Item 1: the app already tags scene actions (BaseGraph.applyLessonAction runs runAs lesson); the host test failure was the moved selects (puck), not tagging. Host test now uses chooseOnPuck (async after()).
- Own tests: pucks via chooseOnPuck; view tests pin declared marks (director owns the view when marks are declared); setBoundingBox wrapped in asLearner; puck test added.
- Shared trigPresetCollection.test.tsx: line 63 source.setState wrapped in runAs learner, import added line 14.
- TriangleSolverGraph.declaration.test.tsx added (7 states, bindings); red: expected 206/16 got 205/16 (reverted).
- trigSolveGuidedLessons: polje/field dropped before Podani podatki/Given data; uses triangle-data on tr5-sas, tr5-asa, tr5-explore explanation frames; test updated (puck options). trigTriangle: no prompt asks to pick the mode, unchanged.
- Checks: tsc 0, lint 0, unit (5 dirs) pass, build pass, smoke-lesson triangle-solver pass; graph-check golden fails notes-only (golden has no notes); logs .command-logs/l20-*.log.
