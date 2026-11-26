# 08 lane L38 (root-finding): PARTIAL handoff (budget signal)

Started 01:58, stopped about 02:20. Not committed.

## Done
- Parity recorded first: SAMPLES entry in `src/graphs/base/declare/parity.test.tsx` (9 states, lesson actions), `src/graphs/functions/__parity__/root-finding.json`. Log 08-L38-record.log.
- Base `IterativeFunctionGraph.tsx`: `IterationActionId`, `iterationActions()` (next-step, play with `pressed`, reset; enabled by the `playbackBlocks` rule) and `performIterationAction(id)` (runAs learner; false for foreign ids). General, for bisection, sequence, fixed-point, geometric series, CLT to follow. Not used by them yet; their tests (src/graphs/functions) passed in the unit run below.
- `RootFindingGraph.tsx`: `RootFindingIds`, `parameterBindings` (root-x0, root-x1, root-finding-method, root-finding-example), `declaration()` (spreads `commonDeclaration()`), `functionPanel()` (5 rows with the old keys, note, status with tone, plotted curve and start marks), legend of 4 entries with `drawnObject`, `performAction`, `renderLegend()` returns null, `renderReadout()` draws rows via `renderDeclaredReadout()` + the table + the status from the same `status()`.
- Fragment `src/localization/fragments/root-finding.ts` registered in `fragments/index.ts` (bare names "Začetek"+x_0, "Drugi začetek"+x_1, method puck shorts, example option labels).
- Lessons: `numericalMethodsGuidedLessons.ts` `FOCUS` map + `rootFrame` give every step's frames `declare` (highlight rows, `uses` on the observation frame).
- Test `RootFindingGraph.declaration.test.tsx` (6 states + note + arbiter + actions), 9 pass. Red check: `error` row value +1 in `functionPanel()` failed 6 tests ("expected '1,414213562373' to be '0,414213562373'"; the first version of the test, comparing only to the panel, did not fail because panel and declaration share the data, so values are now checked against the kernel). Log 08-L38-red.log. Restored.
- `just graph-check root-finding --route /bezeg-2.0/analysis/root-finding`: PASS (contract 1, parity 2, golden 1, declaration 9; browser skipped).
- Golden check (parityGolden, id root-finding): passed.
- tsc: clean (before the test file and lesson edits were added; rerun not done after them... the unit run compiled them).

## Placement judgements
- Board: x0 and x1 range pucks (dragged and compared constantly while watching the iterates; x1 only for secant), method as a 2-option choice puck (N3 compares Newton and secant), actions next-step/play/reset. Orodja: the example choice (setup: choosing it resets the starts), the iterate table (no declared form).
- Legend: default place left as is (marks cover the curve and the starts).
- Orodja keeps old keys; Orodja sliders/method select wrapped in PuckOwned, start group in PuckOwnedGroup (hides the starts help text with the pucks; the help is also the declared `help` of both pucks). Orodja playback buttons stay (board actions are not pucks).

## Open (4 failures in the last unit run, log 08-L38-unit.log)
1. `RootFindingGraph.host.test.tsx` "a real board shows the iteration ...": looks for the label "Začetni približek x₀, vrednost" in Orodja; the slider is now a puck (PuckOwned renders nothing). Update to drive the x0 puck (see how other host tests of converted graphs do it) or set via `graph.parameters`.
2. Same file, "label of the second start x1 ...": `fireEvent.change` on an element with no value setter, same cause (slider gone).
3. `src/workspace/presenter/BoardCards.test.tsx:351` and 4. `LessonCard.test.tsx:139`: both use root-finding as the "undeclared graph" example; it is declared now. They need another undeclared function graph (another lane's choice, or the handler's): not mine to retarget without a decision (BoardCards/LessonCard are listed as lane own tests, so they may be edited by this lane: swap to a still undeclared graph).
Not run: `just lint`, `npx tsc` after the final edits, `just unit src/learning/content/declarationContract` separately (the src/learning/content run was green), `*FirstTask` tests (none mention root-finding), browser, screenshot at 310 px.

## For the handler
- No lease: IterationController.useLease is not wired in TracePlayback (shared, not mine); root-finding playback writes the model by `commitModel`, not an arbiter key, so there is nothing to lease. Bisection does not use useLease either, despite the dispatch.
- `drawnObject` casts the element to add `evalVisProp` (as DecasteljauGraph does).

## Continuation (completed)
- Host test: x0 typed via typePuck, method via chooseOnPuck, x1 via puckControl; installBoardShims + openTools. BoardCards/LessonCard now use FixedPointGraph (undeclared; route analysis/fixed-point).
- Label/symbol rule ok: bare names "Začetek"/"Drugi začetek" (<=16), symbol x_0/x_1; method label "Metoda".
- Checks: typecheck, lint, graph-check (contract 1, parity 2, golden 1, declaration 9), golden check, unit of functions/analysis/content/localization/declare/presenter: all passed.
- Not run: browser, 310px screenshot.
