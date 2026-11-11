# f2a-lm-11 FINAL EVIDENCE (Batch D F2a, linear maps)

Nothing committed. Status line added in docs/tasks/linear-maps/11-batch-d.md:3.

## Built

`src/linear/linearMapModel.ts` (start, step, validators, appliers); `src/graphs/linear/iterationScene.ts`, `iterationBoard.ts`, `LinearMapGraph.tsx` (iterate and tracedet modes, playback, inputs, legend); `linearMapScene.ts`, `linearMapPresetCollection.ts`; 66 `linear_map_*` keys in both locales. Tests: `linearMapModel.test.ts`, `iterationScene.test.ts`, `LinearMapIteration.host.test.tsx`.

## Defects found by the tests

- A direct `setState({model})` while playing did not pause. `LinearMapGraph.tsx` now overrides `setState` (compares stored content, skips the playback's own tick).

## Observed checks (this session)

- `just unit src/linear src/graphs/linear`: passed. `just lint src/linear src/graphs/linear`: passed.
- `npx tsc --noEmit --pretty false`: no error in linear files or locales after fixing two in `LinearMapIteration.host.test.tsx:100,109`. One error remains in `src/graphs/levelsets/ContourMapGraph.tsx:959` (other worker).
- `git diff --check`: only the warning that `LinearMapGraph.tsx` is CRLF and git will normalise it. Trailing-space and control-character greps: 0 on all owned files and both locales. New files end with a single newline.
- Mutations (each restored, cmp identical; backups `.command-logs/lm11c-*.bak`, `lm11d-*.bak`): failing tests per mutation: pauseoff 10, pausealways 3, reducedbtn 1, dragsnap 1, typedoff 1, tdcompanion 2, disc 2, comma 14, oldpreset 12, stepcap 2, setstart 6, locale 1, zerostart 1, settled 1, tdstatus 1, resetlabel 4, rayleigh 2 (`iterationScene.test.ts` L6 and E), unmount 1 (listener baseline), disposepause 1 (dispose while playing), planeview 1 (plane default view).
- Survivor: `play()`'s own reduced-motion guard (the disabled button already blocks Play; defence in depth).

## Not verified

Browser smoke test; a lesson-wired `set-start`/`step` (the shared `LessonAction` union lacks them); production build.

## Decisions and doubts for review
- `linearMapModel.ts` edited (outside the first list, confirmed in scope by the handler).
- Tracedet draws no orbit; the length of the iterate at the stored step is a readout row. No overflow status within 30 steps.
- Tracedet axes are labelled with the symbols tau and delta (plain text, not localized); area labels use locale keys.
- The matrix Reset button stays in all modes; the playback Reset (step to 0) appears only in iterate. Two "reset" labels in iterate mode may confuse; review.
- Existing fixed ids (`linear-map-entries-help`, `linear-map-notice`) were left; only new ids are per-instance.
- Moving the plane view on a mode change discards a user pan or zoom.
- Existing test constraints (H1/H2 = point indexes 6/7, Bezier curve last) forced the two-call split of the iteration board.

- The reset labels: matrix Reset and playback Reset are distinct buttons in distinct labelled groups (tested); no help text. Review whether two "reset" labels in iterate mode still confuse.
- Plane-view test at `LinearMapIteration.host.test.tsx:100` uses `checkGraphState?.(...)`, which passes if the method were absent; the `check` assertions above it cover the real behaviour.
- A mode change resets pan and zoom to the mode's default view (accepted per brief, tested).

## Review repairs
Tests: `LinearMapIteration.host.test.tsx`, describe "review repairs (F2a task 11)". Pre-fix failure was not observed for items 1-7 (tests written with the fix); item 8 mutation was observed.
1. Done. `IterationView.startToZero` (`iterationScene.ts`, exact: nonzero start, A v = 0 on the quarter grid, not A^2 = 0); the status `start-to-zero` (new key `linear_map_status_start_to_zero`) replaces other-eigenvector in that case. Test: diag(1,0), v0 = (0,1) gives `start-to-zero`, then `zero-iterate` at step 1; mu = 1/2 keeps `other-eigenvector`.
2. Done. `estimatesDominant(view)` (dominant class, start not on the other eigenvector); else the row `rayleigh` takes `linear_map_readout_rayleigh_plain` (v^T A v / v^T v of the iterate). Test: E from (1,0): 5 at k=1, 5,0769 at k=2 with the dominant label; rotation, Q = [[0,3],[3,0]] and E from (1,-2) carry the plain label.
3. Done. Error-factor wording (`linear_map_readout_ratio`) only when `estimatesDominant`; otherwise `linear_map_readout_ratio_plain`. Test: shear [[1,1],[0,1]] gets the plain label.
4. Done. `TRACE_DET_DRAWING` and `legendKindFor` in `iterationBoard.ts` feed both the drawing and the legend: parabola dashed-line, flow dashed, triangle line (no pale-face-with-solid-outline kind exists; the text says "pale face, solid outline"). Test compares swatch classes and the board objects' dash and fill opacity.
5. Done. The start, step and length rows are shown only in iterate mode (tracedet no longer lists them). Test over tracedet, basis, determinant.
6. Done. `StepCounter.tsx` renders the counter inside the playback group and sets aria-describedby on the Next step button after each render (PlaybackButtons has no description slot and is shared, so it is not edited). Test: id in the button's description list, also at the last step.
7. Done. The iterate gloss (`linear_map_note_iterate`) is an inspector help above the start fields (removed from the readout note); `linear_map_mode_tracedet` is "Ravnina sled–determinanta" / "Trace–determinant plane"; the unit-arrow legend text says "solid line with an arrowhead from the origin" (kind line). Tests for gloss order and both labels.
8. Done. The test asserts `checkGraphState` is defined, accepts `start: [1.25, -2]`, and the full `check` refuses `start: [0.3, 0]` (checkGraphState itself does not test the grid; the field list only lets the array through) and accepts [0.25, 0]. Mutation: dropping 'start' from the field list failed "every example in both old modes ..." as expected; restored.
Pre-existing, left alone: ids `linear-map-entries-help` / `linear-map-notice` and the live regions.
Checks: `just unit src/linear src/graphs/linear` 197 passed; `just lint` passed; tsc reports only `ComplexPowerGraph.tsx(209)` (the other worker's file); `git diff --check` clean.
