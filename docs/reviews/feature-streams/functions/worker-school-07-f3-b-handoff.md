# Worker handoff: school function graphs 07 F3 Part B (S6 conic-focal), partial

State: lesson, actions, registration and chapter section written; NOTHING has been run (no typecheck, no unit, no node --test). Not committed. Logs dir unused: `C:/Users/1337Hacker/.claude/jobs/d52899e5/tmp/s07/` (f3b-* are only helper scripts/text).

NOTE for the next worker: in Bash commands, backslashes in python heredocs are halved. Write scripts/text with the Write tool, not Bash heredocs.

## Done (files touched)
- `src/learning/model.ts`: visibility target `conic-bridge`, parameter `conic-weight`, choice `conic-example` (values `CONIC_EXAMPLE_IDS`, import added). No `conic-epsilon`/`-ell`/`-phi` (not needed; examples fix them).
- `src/graphs/functions/ConicFocalGraph.tsx`: `lessonFunctionActions()` override (conic-weight -> setWeight, conic-bridge -> setBridge, conic-example -> setExample; import `FunctionLessonActions`).
- `src/learning/content/schoolFunctionGraphsBatchCGuidedLessons.ts`: `conicLesson` appended (7 steps), exported array now `[seriesLesson, conicLesson]`.
- `src/demonstrations.ts` (dropped `lesson: false` on conic-focal), `guidedLessonOwnership.ts`, `schoolFunctionGraphsChapterRegistry.ts` (+conic-focal), `familyChapters.test.ts` (CHAPTER_LINK_PENDING now `['patch-coons']`), `lessonCatalog.test.ts` (opt-out list now `[]`), `lessonMathNotation.test.ts` (id list +conic-focal).
- `schoolFunctionGraphsChapter.ts`: section `conic-focal` after `geometric-series`, purpose widened (SL+EN), doc comment; `schoolFunctionGraphsChapter.test.ts`: IDS, demonstrationIds, removed the "not the conics" test, facts row 6, formula check `sections[5]`.

## Scenes (conic-example first, then bridge/weight)
1 conic-ellipse-sum-scene: ellipse, P=(0,3), PF=5, PF2=5, sum 10
2 conic-ratio-reveal-scene: ellipse, Pd=6.25, ratio 0.8
3 conic-parabola-scene: parabola, P=(1,2), PF=Pd=2
4 conic-hyperbola-scene: hyperbola, PF=7, Pd=4.2, ratio 1.6667, PF2=13, diff 6
5 conic-circle-scene: circle, PF=3, no directrix
6 conic-bridge-scene: ellipse + conic-bridge true, w1=sqrt2/2~0.7071, point (3.5355, 2.1213)
7 conic-weight-scene: ellipse + bridge + conic-weight 1 (kind by weight parabola)

## Remaining
1. Preview copy: `guidedExamplePreviewCopy.ts` (`'conic-focal': copy(...)`) and `schoolFunctionGraphsPreviewCopy.ts` (`'school-function-graphs.conic-focal.conic-focal'`, update "(S1 to S5)" comment); count tests: `guidedExamplePreviewCopy.test.ts` 104->105 and 111->112, `authoredChapterCoverage.test.ts` 118->119 (recheck by running).
2. Scripts: add `conic-focal`/`conics` to the route regex + routeText in `scripts/capture-guided-example-previews.cjs:58` and an entry in its `.test.cjs` (path `/bezeg-2.0/functions/conics?example=lesson.school-function-graphs.conic-focal.conic-focal`); in `scripts/generate-guided-example-inventory.cjs` add `conicExpectedFor` dispatched in `schoolFunctionGraphsExpectedFor` (`.conic-focal`), authored for the opening scene only (ellipse, no bridge): types `{curve:1, line:1, segment:3, point:3}`, curveCount 1, points sorted `[-4,0],[0,3],[4,0]`; assert on other examples ("extend conicExpectedFor") using `assertOnlyActions` (choice `conic-example`); add a test in `.test.cjs` like the series one. `guidedExamplePreviews.test.ts`: add the S6 id to the `school-function-graphs` ids/counts (will be red only for the missing card).
3. Smoke row in `tests/guided-lessons.smoke.spec.cjs` (copy the `geometricSeries` row; path `${BASE}/functions/conics`, 7 steps, titles `Stožnice: gorišče, vodnica, izsrednost in most do Bézierja` / `Conics: focus, directrix, eccentricity and the Bézier bridge`; add to LESSONS).
4. NEW tests in `schoolFunctionGraphsBatchCGuidedLessons.test.ts` (copy the S5 pattern; real graph `createGraph('conic-focal')`): all scenes out of order and twice, assert example/bridge/weight state; recompute 5, 6.25, 0.8, 10; 2/2; 7, 4.2, 5/3, 13, 6; (3.5355, 2.1213) via independent rational Bézier formula; deviation ~0 in scene 6, clearly >0 in 7; quoted numbers in SL `{,}` and EN; `sceneAction` rejects unknown name `conic-bogus`; out-of-range weight (0.05, 6) and unknown example rejected. Note `mount()` there is typed for the series model.
5. Run `just typecheck` (check `SchoolFunctionGraphsSectionId` accepts `conic-focal`; check the lesson's `satisfies LessonAction` objects), `BEZEG_MEMORY_FLOOR_GB=0.5 just unit src/learning src/graphs/functions src/localization src/demonstrations.test.ts`, the two `node --test` scripts, one mutation failure per assertion kind.

## Deviations / open points
- 7 steps (spec 7 with predict+reveal merged as one step; free exploration folded into step 7).
- Term: README table says "numerična ekscentričnost" and that "izsrednost" is not used, but the shipped `conic_*` keys use "numerična izsrednost"; the lesson follows the shipped keys. Handler to decide.
- Rational Bézier chapter: no cross-chapter link mechanism found; the lesson names the chapter "Racionalne krivulje" / "Rational curves" in text (route `/bezeg-2.0/rational/base`, chapter id `rational-curves`).
- Tighter view: no existing lesson action sets a view; not done (view top stays 20).
- Step 2 and step 1 scenes have the same state (different ids).
