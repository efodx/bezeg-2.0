# Task 13 worker handoff (partial)

State: implementation done, tsc 0, new test file 20/22 pass. Not yet run: lint, wider unit, full unit, build, mutations.

Files touched: src/compgeo/pointSetModel.ts (POINT_SET_OVERLAY_NAMES), src/learning/model.ts (2 point-set union members), src/graphs/compgeo/PointSetGraph.tsx (applyPointSetAction + registerLessonActions), src/learning/runtime/lessonCatalog.ts (checkAuthoredAction), src/learning/content/compgeoGuidedLessons.ts (+ .test.ts), guidedLessons.ts join, lessonMathNotation.test.ts (list entry), src/demonstrations.ts (lesson:false removed for orientation, polygon-area), src/learning/chapter/guidedLessonOwnership.ts (interim owner foundations/complex-plane, needed by types; real chapter is F4), src/learning/content/guidedExamplePreviewCopy.ts (2 entries, needed by types). No locale catalog changes (lesson text is inline).

Failing (test bugs, not code): (1) orientation-flip text lacks token "\(-8" (text has "\(D=-8\)"); (2) area-explore text lacks "B=8" in sl (uses "\(B=8\)" in en; check sl wording). Fix tokens in test quotes or text.

Remaining: fix those 2, run lessonCatalog.test.ts (line ~186 expects orientation/polygon-area lessonless: must update to ['linear-map','convex-hull']), guidedLessonOwnership/authoredChapterCoverage tests, `just lint`, `just unit src/graphs/compgeo src/learning`, full unit, build, mutations (e.g. drop closed check, remove overlay ownership check, flip reversed points, change a quoted number). Smoke rows in tests/guided-lessons.smoke.spec.cjs (LESSONS array line ~1601) not added.

Risks: status readout under the board shows the value in predict steps (leak); interim owner chapter is wrong semantically.
