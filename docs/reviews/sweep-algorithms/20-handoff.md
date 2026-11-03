# Task 20 handoff (partial)

State: lesson C4 `monotone-triangulation` written (7 steps, sl+en) on the whole C3 polygon; trace steps 15, 19, 21, 23, 28, 43, 0. No graph file changes needed (the graph inherits the lesson actions).

Remaining: rerun `just unit --no-fsModuleCache src/learning src/graphs/compgeo src/localization src/demonstrations.test.ts src/Routes.test.tsx` (the last run's log came out empty; the earlier run had one notation failure, since fixed by wrapping the worked-example check text, not yet re-run) and `just build`; delete the review logs if unwanted.

Files: compgeoGuidedLessons.ts, its test, guidedExamplePreviewCopy.ts and test, lessonMathNotation.test.ts, lessonCatalog.test.ts, guidedLessonOwnership.ts, demonstrations.ts, tests/guided-lessons.smoke.spec.cjs, new src/graphs/compgeo/MonotoneTriangulationLessonActions.host.test.tsx.

Checks seen: host test passed (9 tests); tsc exit 0; eslint exit 0 (before the notation fix); mutation checks (trace step 21->22, ear count showing the monotone count) failed 3 tests, restored byte-identical.
