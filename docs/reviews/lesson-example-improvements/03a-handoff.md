# 03a handoff (partial): rational and rational-decasteljau

## State
Content and tests are written; the targeted vitest files pass except the stale `lessonCatalog.test.ts` pins listed below. Not done: mutation checks, `npx tsc --noEmit`, `03a-evidence.md`, `03a-smoke-rows.md`.

## Fixtures (all scenes: view `[-6, 5, 6, -4.5]`, parameter t = 1/2)
- `rational` (expansionGuidedLessons.ts): P = (-4,-3),(-3,3),(3,3),(4,-3). Steps: weights (1,1,1,1) -> (1,2,1,1) -> (1,4,1,1) -> endpoints (1,4,1,1) -> analysis (1,1,1,1). Worked examples `rational-base-equal`, `rational-base-midpoint`, `rational-base-heavy`. New formula `rational-base-second-weight`. Shares of P1: 3/8, 6/11, 12/17.
- `rational-decasteljau` (additionalGuidedLessons.ts, 6 steps): quadratic P = (-4,-3),(0,3),(4,-3) with weights (1,1,1) then (1,2,1), then the cubic above with weights (1,1,1,1), then (1,2,1,1). Worked examples `rational-decasteljau-quadratic` and `rational-decasteljau-midpoint`.

## Computed values at t = 1/2
- Cubic: w = (1,1,1,1) gives (0,3/2). w = (1,2,1,1) gives (-9/11,21/11), with last homogeneous point (-9/8,21/8,11/8). w = (1,4,1,1) gives (-27/17,39/17).
- Quadratic: w = (1,1,1) gives (0,0). w = (1,2,1) gives last homogeneous point (0,3/2,3/2), projected to (0,1).

## Files touched
- `src/learning/content/expansionGuidedLessons.ts`
- `src/learning/content/additionalGuidedLessons.ts`
- `src/learning/content/expansionGuidedLessons.test.ts`
- `src/learning/content/additionalGuidedLessons.test.ts`
- `src/learning/content/rationalExamples.test.ts` (new)
- `src/learning/runtime/lessonCatalog.test.ts`: only the two rational pins were changed. The rational-decasteljau pin now expects 6 steps and a fixture scene `rational-decasteljau-quadratic-weighted`. The rational pin now expects the fixture scene `rational-base-midpoint`.

## Checks
Command: `npx vitest run` over expansionGuidedLessons.test.ts, additionalGuidedLessons.test.ts, rationalExamples.test.ts, lessonMathNotation.test.ts, sceneContentAgainstGraphs.test.tsx and lessonCatalog.test.ts.
- All files pass except `lessonCatalog.test.ts`, which has 3 failing tests (bezier pilot scenes, elevation, and the ph-quintic/affine part of the expansion cohort test). These are stale pins from content committed earlier, not caused by this task.
- The rational assertions inside the expansion test come first and pass.

## Remaining
1. Update the stale `lessonCatalog.test.ts` pins as the coordinator described: bezier `bezier-control-polygon-and-hull` fixture with view `[-4.5,4,4.5,-3.5]`; decasteljau-introduction quadratic fixture with view `[-4.5,4.8,4.5,-3]`; elevation steps[3] contains `degree-elevation`; ph-quintic fixture `{points:[[-2,-1]], hodographs:[[2,0],[2,1],[1,1]]}` with view `[-3,2.2,2.5,-2.6]`; affine translate-x -2, rotate pi/2, scale 2.
2. Mutation-check each assertion in `rationalExamples.test.ts`.
3. Run `npx tsc --noEmit --pretty false`.
4. Write `03a-evidence.md` and `03a-smoke-rows.md`. Model the rows on `rationalSubdivision` in `tests/guided-lessons.smoke.spec.cjs` (about line 287). The smoke spec has no rows for these two lessons.
5. The "ordinary counterpart" is shown as equal-weight scenes (quadratic and cubic), not as a separate polynomial graph. Record this in the evidence.
