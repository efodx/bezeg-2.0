# Lane L18 (quadrature), round 7: PARTIAL handoff (budget signal at 135k input)

## Done (observed)
- Parity recorded BEFORE conversion: sample `quadrature` (8 states) in `src/graphs/base/declare/parity.test.tsx` (`quadratureAccepted` is an empty list, to be filled if the check reports the slider read-offs), recording `src/graphs/functions/__parity__/quadrature.json` (6 rows, 1 note; outputs empty). Old panel already had `data-readout`/`data-readout-note` markers, so none added. Never re-record.
- `QuadratureGraph.tsx` converted: `QuadratureIds`, `drawn` map, `parameterBindings` (quadrature-rule/-function/-a/-b/-n), `declaration()`, `functionPanel()` (rows, note, statuses, `plotted` f, `must` = bound points and f at them), `drawnObject`, `renderReadout` (declared readout + `FunctionStatus`), `renderLegend` null, `PuckOwned`/`PuckOwnedGroup` around the rule select and n slider. `npx tsc --noEmit --pretty false` clean after this.
- Fragment `src/localization/fragments/quadrature.ts` (n/a/b bare names, short rule names, three function option labels) registered in `fragments/index.ts`.
- Lesson `numericalQuadratureGuidedLesson.ts`: FOCUS table, `quadratureFrame`, `frame(..., declare)`; step simpson-even prompt/explanation reworded without "polje"/"drsnik" (sl: "Podintervali \(n\)", en: "Subintervals \(n\)"). NOT yet run through declarationContract.
- `QuadratureGraph.host.test.tsx` moved to arbiter writes (`setN`, `setRule`, `graph.parameters.read`), odd-n refusal asserted on the arbiter result, puck test added at the end (installBoardShims, waitForPucks, typePuck, chooseOnPuck). NOT yet rerun after the edit.

## Placement judgements
- Pucks (2): rule (choice of two, the lessons switch it to compare errors) and n (a range puck with step from `countRule`: Simpson needs step 2, which a count puck cannot express; doubled again and again while the error ratio is watched).
- Orodja: function (setup choice that replaces the view), bounds a and b (set once, also draggable on the axis). Legend declared (function, bound, shapes); marks plotted f plus corners of the region.

## Not done
- `QuadratureGraph.declaration.test.tsx` (copy `EulerGraph.declaration.test.tsx`: >= 5 states vs `quadratureView`, keys bound, legend resolves, arbiter writes incl. refused odd n for Simpson, red check breaking a row value, quote failure).
- Rerun own tests: `just unit src/graphs/functions/QuadratureGraph src/learning/content/numericalQuadrature` (last run before host edits: only host test failed; `QuadratureGraph.axisRefusal/lesson/test` and lesson test passed). Check `QuadratureGraph.axisRefusal.test.tsx` and `.lesson.test.ts` for UntaggedWriteError (the passed run suggests none).
- No `AnalysisFirstTask.test.tsx` case exists for quadrature (grep found none).
- Parity check: `BEZEG_PARITY_CHECK=1 BEZEG_PARITY_ID=quadrature just unit src/graphs/base/declare/parity.test.tsx` (expect maybe slider read-off outputs, then fill `quadratureAccepted`).
- `just graph-check quadrature --route analysis/quadrature`; golden check `BEZEG_PARITY_GOLDEN_CHECK=1 BEZEG_PARITY_GOLDEN_ID=quadrature just unit src/graphs/base/declare/parityGolden.test.tsx` (report differences verbatim, never re-record); `just unit src/graphs/functions src/learning/content src/localization src/graphs/base/declare`; `npx tsc --noEmit --pretty false`; `just lint` on changed files; `just build`; `just smoke-lesson quadrature --port 4391 --workers=1` (smoke row id `quadrature`, tests/guided-lessons.smoke.spec.cjs:2397; check its control locators for rule/n).
- Possible issues: declared `must` may push the view; row `half-error` name embeds a value (as in Euler); legend `bound` uses point A's fill colour; declared a/b/function are tools params, so frames with them in `uses` open tools (explore step does).

## Scratch
`.command-logs/l18-*.log` only (logs); scratch scripts deleted.
- round8: declaration test written+green, axisRefusal wrapped in runAs, red check done (reverted), parity passes with empty quadratureAccepted
- round8: all checks pass (tsc, lint, golden, graph-check, unit, build, smoke-lesson)
