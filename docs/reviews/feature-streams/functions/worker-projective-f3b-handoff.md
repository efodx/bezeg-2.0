# Handoff: projective 06 F3b (Pascal lesson K2)

Done: pascal-* ops (model.ts union + PascalGraph.applyProjectiveAction/setHandleIndex), K2 lesson (7 steps, SL+EN) in projectiveConicsGuidedLessons.ts, registration (demonstrations, ownership, preview copy + counts 74/81, lessonMathNotation, lessonCatalog, smoke row), tests: src/learning/content/projectivePascalLesson.test.ts and src/graphs/projective/PascalLessonActions.host.test.tsx.
Checks: just typecheck passed; focused unit run (src/learning src/graphs/projective src/localization src/demonstrations.test.ts) passed 99 files / 1579 tests (.command-logs/2026-11-02T08-19-37-380Z-83880-68b69a94.log).
Not done: mutation runs (script $JOBS/tmp/proj-f3b/mut.sh was stopped; sources restored, verified by cmp with backups). No smoke, no build.
Next: run the mutations: PASCAL_DRAG_INDEX 52->53; step-4 order pappus->star; a quoted point in a scene text; drop the isReachable check; make set-order a no-op. Expect failures in the two new test files.
