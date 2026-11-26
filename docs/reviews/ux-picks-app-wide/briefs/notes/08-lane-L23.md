# Lane L23 (arc-length-param): partial, HANDOFF at 135k input. Nothing below is run green yet.

## Done (edited, unverified: no tsc, no unit run after the graph edit)
- Parity recorded BEFORE converting: SAMPLES entry `arc-length-param` in `src/graphs/base/declare/parity.test.tsx` (7 states), recording
  `src/graphs/curves/arclength/__parity__/arc-length-param.json` (copy of the baseline in `.command-logs/l23-parity-baseline.json`). Never re-record.
  No marker needed: `ReadoutDetails` li's already carry `data-readout-note` (the details lines); the mover line "t = .., s(t) = .." is only a board caption (recorded as caption).
- Fragment `src/localization/fragments/arc-length-param.ts` (7 keys) registered in `fragments/index.ts`.
- Graph `ArcLengthParametrizationGraph.tsx`: `declaresCurveWorkspace` true, `curveDisplayPuck` false (polygon/hull stay Orodja, keeps pucks at 3),
  `ArcLengthIds`, `parameterBindings` (arc-pieces count, arc-mover-mode choice puck, arc-mover-position range; DomainError refusals),
  `declaration()` (notes mover/length/exact/bracket/ratio-t/ratio-arc/polyline/status = old details lines, readoutHelp arcparam_help, legend common + mover/equal-t/equal-arc
  only while shown), `curveViewMarks` override (adds the mover point), `drawnObject` (equal-t/equal-arc/mover from overlay elements, else super), `puckLiveValue` via `LiveParameter`
  (reported in play/advance/stopPlayback), `PuckOwned` around the three Orodja controls, `data-declared-panel` around help and details.
- Declaration test written (not yet run): `ArcLengthParametrizationGraph.declaration.test.tsx`.
- Placement reasoning: pieces N, mover mode (2 options) and position are what the lessons change/compare while watching -> pucks; curve choice is setup, equal-t/arc and speed-plot switches, polygon/hull stay in Orodja; control points board-owned.

## Not done / next
1. `npx tsc --noEmit --pretty false`; fix (possible: `arbiter write` returns WriteResult rather than throwing in the test's refusal assertion; `graph.parameters.read` exists on arbiter? check `graph.parameters` API; `ReadoutNote` unused import checks; `drawnObject` typing).
2. `just unit src/graphs/curves/arclength/ArcLengthParametrizationGraph.declaration.test.tsx`, then break once (e.g. drop `+ 1` from marks or change a `pressed`/legend visible) and quote the red failure.
3. `BEZEG_PARITY_CHECK=1 BEZEG_PARITY_ID=arc-length-param just unit src/graphs/base/declare/parity.test.tsx`: expect an extra-note difference for the help line (add an `arcAccepted` list like `nurbsAccepted` in parity.test.tsx) and uncovered caption `s(1) = .. (točno)` for the PH curve.
4. Update `src/graphs/curves/ArcLengthFirstTask.test.tsx` case: pieces and mode are pucks now (first = `arcparam_equal_t_shown`; later = curve label, equal-arc; pieces/mode absent from Edit, present on `[data-puck-strip]`).
5. Lesson prose: `arcLengthGuidedLessons.ts:100` "premakni drsnik lege" / "move the position slider" -> reword with the label "Lega točke" / "Point position" without "drsnik"/"slider"; update pinning tests (`arcLengthGuidedLessons.test.tsx`, grep drsnik). Optional frame `declare` (add optional arg to local `frame` as in `projectiveConicsGuidedLessons.ts:16`, `frameDeclarer<ArcLengthIds>()`, uses `arc-pieces`/`arc-mover-position`).
6. Own tests `ArcLengthParametrizationGraphReal.test.tsx` and `ArcSpeedPlot.test.tsx` may hit UntaggedWriteError (bound keys written outside a source; e.g. `graph.reset`, `act(action)`): leave key undeclared if so and report test:line.
7. Run: `just graph-check arc-length-param --route bezier/arc-length`; golden check `BEZEG_PARITY_GOLDEN_CHECK=1 BEZEG_PARITY_GOLDEN_ID=arc-length-param just unit src/graphs/base/declare/parityGolden.test.tsx` (notes-only differences expected, report verbatim); `just unit src/graphs/curves src/learning/content src/localization src/graphs/base/declare`; tsc; `just lint` on changed files; `just build`; `just smoke-lesson arc-length-param --port 4391 --workers=1`; screenshot at width 310 of the Orodja panel.
8. Shared `ReadoutDetails.tsx`/`ArcSpeedPlot.tsx` untouched (not needed).

## Round 8 continuation: DONE, all checks green
- tsc clean; declaration test 10 pass (red: marks `+ 2` -> "expected 5 to be 6", reverted); parity passes with `arcAccepted` (help line + mover-line notes as extras); golden, graph-check, unit (curves, content, localization, declare), lint, build, smoke-lesson arc-length-param pass.
- Fixes: binding `arc-mover-position` reads the committed position (live value only via puckLiveValue); Real test wraps writes/pause/reset/board press in `runAs('learner')`; position slider tests now read the puck (puck follows live, not disabled while playing); FirstTask test checks pucks on the strip; prose reworded ("krmilnik Lega točke" / "Point position control"); observation frames declare `uses`.
