# 08 F3+F4 worker 1 notes (partial, stopped on HANDOFF)

## Done (uncommitted, in the working tree)
- `src/learning/model.ts`: new action kind `inversion` (load-example, set-focus, set-x with `point: {x, y}`, set-theta with `degrees`).
- `src/compgeo/pointSetModel.ts`: `POINT_SET_OVERLAY_NAMES` gains `inversion-circle`, `rays`, `image`, `secant`, `tangent`, `angle-tangents`.
- `src/graphs/compgeo/InversionGraph.tsx`: `applyInversionAction` plus `registerLessonActions`. It throws on an invalid example, focus, X or non-finite angle.
- `src/learning/content/triangleGeometryChapterLessons.ts`: `inversionLesson` (7 steps: power, product, image, line, circle, angle, explore) and `INVERSION_THETA_TURNED` = 20.
- `triangleGeometryChapterRegistry.ts`: `inversion` registered.
- `triangleGeometryChapter.ts`: section `inversion`, purpose and prerequisites text updated, `prerequisiteLinks` to `/bezeg-2.0/learn/complex-maps#reciprocal-inversion`. This reuses the chapter-level `prerequisiteLinks` field that other chapters use.
- `guidedExamplePreviewCopy.ts` (new `inversion` entry) and its test (counts 83 and 90).
- `src/demonstrations.ts`: `lesson: false` removed for `inversion`.
- `familyChapters.test.ts`: `inversion` removed from `CHAPTER_LINK_PENDING`; triangle-geometry minimum now 5.
- `tests/unified-learning.smoke.spec.cjs`: triangle-geometry minimum now 5.
- `lessonCatalog.test.ts`: the `inversion` opt-out removed.
- `triangleGeometryChapter.test.ts`: the existing "registered" and "links" tests adjusted. A new describe block for T5 appended: numbers, prose, scenes on the real graph, actions.
- Sources: FMF, Inverzija (lecture notes), cited by title only. Coxeter appears only after "see also" / "glej tudi".
- `NO_SYNCHRONOUS_SCENE_CHANGE` still lists `inversion`: `sceneActions` has no candidate for the new kind.
- `npx tsc --noEmit` passes (log `.command-logs/t08-f3f4/tsc.log`).

## Not done
- No unit test has been run (`just unit ...` on the focused paths); lint was not run either.
- `BEZEG_TRANSIENT_STATE=inversion just unit src/graphs/base/GraphTransientState.part` not run.
- Smoke row in `tests/guided-lessons.smoke.spec.cjs` not added. Template: the `simsonLine` row; add `inversionLesson` to `LESSONS` with 7 steps and a centre-point check ("T5 centre point").
- `authoredChapterCoverage.test.ts` (currently 92) probably needs +1; check after the unit run. Other counts may also need updating (`lessonSmokeCoverage`, `guidedLessonOwnership`, `LessonActionRegistry` tests).
- Mutation evidence not gathered.
- `docs/localization.md`: no new terms were added, so no rows are needed. The chapter row at about line 94 still says only some sections are published; consider updating it.

## Open risks
- In the T5 test, the angle signs (+60 to -60) and `which` are assumed. Check them against `INVERSION_EXAMPLES` `angle.which` = 1. Fix the prose if the signs are reversed.
- The scene-view assertions use the initial view [-5,6,10,-6]. Step `image` hides the `image` overlay but still checks X' is in view.
- Prose rules may trip `lessonMathNotation.test.ts` (for example `\\(X^{\\prime}\\)` and the `»Slika«` quotes).
- The Python edit scripts in `.command-logs/t08-f3f4/` are scratch files; delete them. The `.part.ts` files there are also scratch.

## Next steps
1. `just unit src/learning src/graphs/compgeo src/compgeo src/localization src/demonstrations src/Routes src/DemonstrationsPage`, logging to `.command-logs/t08-f3f4/`. Fix failures and counts.
2. Add the smoke row.
3. Run the transient-state contract and `just lint` on the changed files.
4. Do 2 or 3 deliberate mutations on new assertions (for example change the θ constant, or make `set-x` skip the validation).

## Worker 2
- Fixed: prerequisites prose used single backslashes in `triangleGeometryChapter.ts:28` (now `\(...\)`); T3 test no longer forbids "inversion" in the chapter purpose/prerequisites; T5 scene test expects `exampleId` undefined on the `product` step (theta turned); `authoredChapterCoverage.test.ts` 92 -> 93; centre-message assertion strengthened (`has no image` / `nima slike`).
- Angle signs checked against `analyseAngle` (`which` = 1 gives +60 before, -60 after); the unit test reads them from the model.
- Smoke: `inversionLesson` row (path `/bezeg-2.0/inversion`, 7 steps) added to `LESSONS`, plus an "Inversion extras" test at the file end for the centre point (fills `X: x`, `X: y` = 0 at step 3). Not run (no smoke by brief); the labels and route are unverified in a browser.
- Logs: `.command-logs/t08-f3f4/unit.log` (first run), `unit2.log`, `transient.log`, `lint.log`, `mut-*.log`.
- Mutations (each failed the named test, then reverted): INVERSION_THETA_TURNED 30 (power test); drop finite check on set-theta, skip set-x throw, skip set-focus check (actions test); drop `angle-tangents` overlay name (scene + actions); `(3/2,0)`->`(5/2,0)` in section (section test); `-60` -> `+60` in lesson prose (angle test); "keeps/colour" for reverses/orientation (theorem test); en and sl centre message changed (centre test).
