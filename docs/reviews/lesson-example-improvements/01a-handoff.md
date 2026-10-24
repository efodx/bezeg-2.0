# 01a handoff (partial): Bezier and De Casteljau lessons

## State
- `src/learning/content/guidedLessons.ts`: `bezier` and `decasteljau` adapted. `ph-cubic` untouched. Compiles; tsc showed no errors in my files (the one earlier run reported errors only in another worker's `splineG1Examples.test.ts`; the last tsc run printed nothing).
- New `src/learning/content/bezierExamples.test.ts`: 23 tests, all pass. 13 mutations were each caught; mutations were reverted.
- Vitest run (guidedLessons, bezierChapter, lessonMathNotation, sceneContentAgainstGraphs, ChapterPage, bezierExamples): all pass; 99 tests before the last test tweak, which now also passes.

## Bezier lesson
- View `[-4.5, 4, 4.5, -3.5]` for all fixture scenes.
- Symmetric cubic (-3,-2),(-3,2),(3,2),(3,-2): steps introduction, control-polygon, endpoints, evaluation. B(1/2)=(0,1).
- Asymmetric cubic (-3,-2),(-1,3),(2,-1),(3,2): influence step, with the new worked example `bezier-asymmetric-midpoint`. B(1/2)=(3/8,3/4).
- Free exploration: demonstration default.
- The influence step now has a calculation frame.
- Removed: the old (-1/2,7/8) value.

## De Casteljau lesson
- View `[-4.5, 4.8, 4.5, -3]`. The lesson now has 7 steps.
- Steps 1-3: quadratic (-3,-2),(0,4),(3,-2) at t=1/2 (first row (-3/2,1),(3/2,1), result (0,1)).
- Step 4 (`decasteljau-cubic`): symmetric cubic at t=1/2, rows 3/2/1 points, result (0,1).
- Step 5 (`decasteljau-change-parameter`): t=1/4, result (-33/16,1/4).
- Step 6 (new `decasteljau-three-quarter`): t=3/4, result (33/16,1/4).
- Step 7 (`decasteljau-free-exploration`): demonstration-default quartic at t=1/2, result (0,7/4).
- Removed: step `decasteljau-reconstruct`.
- New worked examples: quadratic-midpoint, cubic-midpoint, cubic-quarter, cubic-three-quarter.

## Chapter
- `bezierChapter.ts` and `activities.ts` are unchanged. The chapter does not reference the lesson fixtures or the old (-1/2,7/8) value. It runs on demonstration defaults, which are unchanged.

## Checks
- The independent Bernstein and De Casteljau code in the test agrees with `PolynomialBezierCurve.eval` and `decasteljauScheme`. The repo scheme keeps n entries per row, so only the first n-r entries of row r count.
- Fixtures, t values, views and prose numbers are checked in both languages. Every control point lies inside its scene's view.

## Remaining
- `01a-evidence.md` and `01a-smoke-rows.md` are not written.
- Proposed smoke rows: one row each for `bezier` and `decasteljau`, following the `alternativeDeCasteljau` row style, covering these steps. The existing `tests/guided-lessons.smoke.spec.cjs` has no rows for these lessons.
- No smoke or Playwright run.
- Visual check of label legibility is still needed. Quadratic first-row points (±3/2,1) are near the curve at t=1/2.
