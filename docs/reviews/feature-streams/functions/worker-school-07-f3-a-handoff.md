# Worker handoff: school function graphs 07 F3 Part A (S5), partial

State: lesson and registration written; NOTHING has been run (no typecheck, no unit, no node --test). Not committed.

## Done (files touched)
- `src/learning/model.ts`: added parameter names `series-a`, `series-q`, `series-n`, `series-tolerance` and choice `series-example` (values `SERIES_EXAMPLE_IDS`, import added). No visibility name added.
- `src/graphs/functions/GeometricSeriesGraph.tsx`: `lessonFunctionActions()` override wiring those names to setA/setQ/setTerms/setTolerance/setExample (import `FunctionLessonActions`). Setters throw DomainError on out-of-range; none starts playback.
- NEW `src/learning/content/schoolFunctionGraphsBatchCGuidedLessons.ts`: lesson S5 on `geometric-series`, 8 steps (prose SL+EN written once).
- `src/learning/content/guidedLessons.ts` (import + spread in allLessonByDemonstration), `lessonMathNotation.test.ts` (register + `geometric-series` in expected id list), `src/demonstrations.ts` (dropped `lesson: false`), `guidedLessonOwnership.ts` (+geometric-series -> section geometric-series), `schoolFunctionGraphsChapterRegistry.ts` (+section), `guidedExamplePreviewCopy.ts` (+geometric-series entry, backslashes verified doubled), `familyChapters.test.ts` (removed from CHAPTER_LINK_PENDING), `lessonCatalog.test.ts` (opt-out list now `['bspline-nurbs','conic-focal']`).
- Count edits: `guidedExamplePreviewCopy.test.ts` 103->104 and 110->111; `authoredChapterCoverage.test.ts` 117->118 (recheck by running; other counts may also move).

## Scenes (id: example, n, tolerance)
1 series-bars-default: default, 3, 0 (S3=1,75)
2 series-predict-next: default, 4, 0 (S4=1,875)
3 series-reveal-five: default, 5, 0 (S5=1,9375)
4 series-limit-two: default, 5, 0 (limit 2, error 0,0625)
5 series-alternating-q: alternating, 4, 0 (S4=0,625, limit 2/3)
6 series-divergence-minus-one: divergent, 6, 0 (S6=0, no limit)
7 series-decimals-third: repeating-three, 4, 0 (S4=0,3333, limit 1/3; 0,999...=1 in worked example)
8 series-explore-band: default, 8, 0.01 (error 1/128, first n=8)

Deviation: 8 steps, not the spec's 7 (decimals step added so 0,3 recurring has a scene). Step 1 text mentions the limit line at 2 because the graph draws it for any n when |q|<1.

## Remaining
1. `src/learning/content/schoolFunctionGraphsPreviewCopy.ts`: add `'school-function-graphs.geometric-series.geometric-series'` copy (alt/caption); update the "(S1..S4)" comment.
2. Chapter: append `withExample('geometric-series', {...})` section after rational-function in `schoolFunctionGraphsChapter.ts` (id, demonstrationIds ['geometric-series'], investigationPrompts, title, formula, 3 paragraphs); widen `purpose` and the doc comment; update `schoolFunctionGraphsChapter.test.ts` (IDS, demonstrationIds list, remove 'geometrische/geometric series' from the not-advertised words, add facts row, formula check, quoted numbers recomputed).
3. Scripts: add `geometric-series` to the route regex + routeText in `scripts/capture-guided-example-previews.cjs:58` and an entry in `.test.cjs:~258` (path `/bezeg-2.0/functions/geometric-series?example=lesson.school-function-graphs.geometric-series.geometric-series`); add `seriesExpectedFor` (authored from the model: segments 2n + 1 limit + 2 band edges if tolerance>0, curve 1 for band) in `scripts/generate-guided-example-inventory.cjs` dispatch plus a test.
4. Smoke row in `tests/guided-lessons.smoke.spec.cjs` (copy `rationalFunction` at line 2039; path `${BASE}/functions/geometric-series`, steps 8, titles 'Geometrijska vrsta in delne vsote' / 'Geometric series and partial sums'; add to LESSONS).
5. NEW `schoolFunctionGraphsBatchCGuidedLessons.test.ts` (copy the Batch B test pattern: real graph, scenes out of order and twice, assert a,q,terms,tolerance; not playing; numbers recomputed; prose contains quoted numbers in SL `{,}` and EN; sceneAction rejects unknown name `series-bogus`; out-of-range values rejected).
6. Run `just typecheck`; `BEZEG_MEMORY_FLOOR_GB=0.5 just unit src/learning src/graphs/functions src/localization src/demonstrations.test.ts`; the two `node --test` scripts; report one mutation failure per new assertion kind. Also check the SL prose read (grammar) and that `lessonMathNotation.test.ts` passes.

## Checks run
None.
