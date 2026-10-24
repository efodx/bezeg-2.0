# Engineering review: lesson-example-improvements (791af6e..HEAD)

Scope: shared runtime (`lesson-fixture` prepared scene, `view` on `demonstration-default`), content/test quality, smoke spec. Read-only; no browser run. Focused vitest run (lessonFixtureScene, lessonCatalog, splineExamples): 125 passed.

Result: 0 blocker, 0 major, 6 minor.

## Runtime verdict (checked, no defect)

- Validation before mutation: `prepareLessonFixtureScene` (BaseGraph.tsx:~483-497) runs ready-check, `collection.check`, `checkLessonView` before `importPresetData`; `lessonFixtureData` is pure. The invalid-fixture test asserts scene equality before and after.
- Ordering: `replaceState` is synchronous, so a later action in the same tick reads fixture state (farin test covers this).
- Checkpoints: capture uses `exportPresetData`, restore uses `importPresetData`, so fixture geometry round-trips; the test checks repeated preparation and restore keep one curve.
- Free-exploration default and stored Presets: `defaultPreset()` is not mutated; the fixture builds a new object and `cloneLessonValue` is applied before `check`.
- Equal-axis: both paths pass `equalAxisUnits` to `setBoundingBox`; tests accept widening only.
- Function graphs: `prepareLessonDefaultScene` override runs first, then the view is applied, so the view wins.

## Findings

1. minor - src/graphs/base/BaseGraph.tsx:458-466. In the `demonstration-default` path the view is applied after `prepareLessonDefaultScene` (which already ran `boardUpdate` and `requestRender`). The result is a second `boardUpdate` and no `requestRender`. The fixture path applies the view before replacement, so the two paths differ. Failure: a graph whose render depends on `requestRender` could show the old view until the next tick. Expected: apply the view inside the single replacement, or call `requestRender` after it.

2. minor - src/graphs/base/BaseCurveGraph.tsx:115-117 and BaseGraph.tsx:470-471. A graph whose default has other than one curve, and every function graph, throws a generic `does not support lesson action`. `supportsLessonAction` is true for all graphs because `handles` matches by kind only, so the capability check cannot tell that a fixture is unsupported. Failure: a fixture authored against such a graph fails only when the learner reaches the step, with a message that does not name the cause. Expected: a message saying the demonstration has no single default curve to replace, or a catalog-time check. All demonstrations used today have a single default curve (checked by reading defaults), so this is latent.

3. minor - tests (content/*Examples.test.ts, lessonCatalog.test.ts). No test applies every content fixture to its real graph (mount, `collection.check`, point-count and weight-length agreement). The Examples tests build the pure classes from the adapted lesson (for example `splineExamples.test.ts` fixturesOf and build) and `lessonFixtureScene.test.tsx` uses hand-written fixtures. Failure: a content fixture with a wrong weight or hodograph count passes the unit tests and is caught only by the browser smoke. Expected: one test that iterates all `lesson-fixture` scenes in the catalog and applies each to `graphFactories[id]()` through `capabilities.apply`.

4. minor - src/graphs/base/lessonFixtureScene.test.tsx:84. The rejection assertion is only the regex `/lesson (geometry|view)/`. It confirms the scene is unchanged but not that the message carries the rejection reason. The `renderMessage(checked.rejection)` text is not asserted, so the "actionable" criterion is untested.

5. minor - src/learning/model.ts:645 doc, BaseGraph `prepareLessonFixtureScene`. A fixture without `view` keeps the current view. Navigating Back from a viewed step to a view-less fixture scene keeps the previous step's view. Documented, but the type allows it; consider requiring `view` on fixtures, since all content fixtures set one.

6. minor - tests/guided-lessons.smoke.spec.cjs:~621 (comment above `symmetricSplineRow`). It still says "the lessons only change switches", which is now false (fixtures replace points). Cross-checks against content passed: parameterization samples [3,3,3,10,20] and [3,3,3,10,10], Taylor 8 rows with hidden steps 1,2,4,6,7, uniform exitStep 6 with n=11, trig exitStep 6, decasteljau-alternative t list and exitStep 5 (t=0.25), symmetric spline `duringLesson` using `stepPoints[1]` with exitStep 2, G1 polygon `step>=2`, G1 symmetric betas and polygon `step<=3`. No logic error found. The helpers handle fewer sliders: the G1 second-slider check is gated to step 5 and `stableCounts` drops b1 for both G1 rows. Point counts and `offscreenPoints===0` assertions (spline-cn step 5, G1) depend on view geometry and were not verified without a browser.

## Content/test sampling

splineExamples, phExamples and bezierExamples recompute values independently of the content (exact fractions in phExamples, repo spline classes in splineExamples) and check view containment; no vacuous assertions found. Weakest assertions seen: `expect(lesson).toBeDefined()` (guard only) and `toBeGreaterThan(0)` on distances, both reasonable.
