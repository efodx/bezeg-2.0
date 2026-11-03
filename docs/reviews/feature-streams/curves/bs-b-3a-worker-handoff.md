# BS-B-3a handoff (partial)

State: implementation and tests written; verification NOT finished.

Files touched (worktree stream-curves, uncommitted):
- src/learning/model.ts: new LessonAction kind `knot-insertion` (operations insert/set-example/set-comb/reset).
- src/graphs/curves/bspline/BSplineInsertionGraph.tsx: registerLessonActions + applyKnotInsertionAction (throws on non-finite, unknown example, refused insertion).
- src/learning/content/bsplineInsertionGuidedLessons.ts (new, 6 steps: predict; insert u=1; insert u=0.5; cubic simple vs double knot with comb hidden; comb + jump list; explore).
- src/learning/content/bsplineInsertionGuidedLessons.test.tsx (new, real-graph tests, 8 tests).
- src/demonstrations.ts (lesson:false removed), guidedLessons.ts, lessonMathNotation.test.ts (import, list, id list), guidedExamplePreviewCopy.ts (+ test counts 100/107), guidedLessonOwnership.ts (b-splines/bspline-insertion), bsplineChapterRegistry.ts, bsplineChapter.ts (3rd section), bsplineChapter.test.ts, familyChapters.test.ts (bspline-insertion removed from CHAPTER_LINK_PENDING), lessonCatalog.test.ts, tests/guided-lessons.smoke.spec.cjs (row bspline-insertion).
- docs/reviews/b-splines-nurbs/bs-b-3a-l3-lesson.md (draft note; Checks section needs the results below).

Checks: unit run 1 failed only from a parse error in bsplineChapter.ts (unescaped apostrophe), fixed. Unit run 2 (just unit src/learning src/graphs/curves/bspline src/graphs/base src/demonstrations, log unit2.log) was still running at handoff; result unknown.
Not run: tsc, eslint, mutations (disable each knot-insertion handler branch), just build, just smoke-lesson bspline-insertion.
Caveat: the Bash tool halves backslashes in python heredocs; use Edit/Write for text with \( .
Unverified: expected strings in the test (jump lines, prose numbers) were not yet confirmed to pass.
