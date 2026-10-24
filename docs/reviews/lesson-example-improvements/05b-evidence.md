# Task 05b evidence: spline parameterization

**Status:** implemented 2026-10-24; browser acceptance pending (task 09). Worker notes: [05b-handoff.md](05b-handoff.md).

## Scene

All five steps use one `lesson-fixture`: 8 free points `[[-7,-2],[-7,1.5],[-5,0.5],[-4,1.5],[-3.2,-1],[4,2.5],[6,-1.5],[2,-3.5]]`, view `[-9, 5, 9, -5]`, ten samples, derived points visible. The C² spline has 5 pieces, 4 joints and 12 derived points (30 board points with the samples). Steps set \(\alpha = 1/2, 1/2, 0, 1, 1/2\).

- Unequal edges: chords \(3.20, 1.41, 2.62, 8.01, 6.32\).
- Knot spans: \(\alpha=0\) gives 0.2 each; \(\alpha=1\) ranges from 0.066 to 0.371.
- The construction changes the spline itself: joint \(J_3\) moves from \((-32/15, 0)\) at \(\alpha=0\) to \((-3.325, 0.385)\) at \(\alpha=1\) (1.25 units) while the free points stay. The prose says this is not a reparameterization of one fixed Bézier curve.
- Samples at \(t=k/11\), \(k=1,\dots,10\) (no end points): per piece 2,2,2,2,2 at \(\alpha=0\) and 1,1,1,4,3 at \(\alpha=1\).

## Checks

- `src/learning/content/splineParameterizationExamples.test.ts` (17 tests) recomputes chords, spans, \(C^2\) continuity at the joints, the shape change, sample distribution, view containment and label separation, and checks the prose in both languages.
- Worker: `splineGuidedLessons`, `lessonMathNotation`, `sceneContentAgainstGraphs` and the new test: 115 passed; `npx tsc --noEmit`: clean; 11 of 12 mutations failed tests.
- Handler: the 12th mutation (derived points hidden) fails 2 tests (`mutate05b.py`, file restored). Smoke row `spline-parameterization` updated by the handler (alpha list, 10 samples, 30 points, derived points visible).

## Gaps

The alpha slider during the lesson and the restore of the user's alpha and samples after exit are not yet browser-checked.
