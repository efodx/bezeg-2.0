# Task 01 part (b) evidence: decasteljau-alternative, affine, elevation

Content: `src/learning/content/rationalConstructionGuidedLessons.ts`, `expansionGuidedLessons.ts`, `additionalGuidedLessons.ts`.
New test: `src/learning/content/interpolationExamples.test.ts` (16 tests). Stale pins fixed in the three existing `*GuidedLessons.test.ts` files.

## Scenes

### decasteljau-alternative (7 steps; two new opening steps)
- Fixture `p = (-4,-2),(-2,4),(2,2),(4,-2)`, view `[-6,6,6,-4]` (left, top, right, bottom). All controls inside.
- Step 1 `da-cubic-two-quadratics`, t = 1/2: `Q1 = (-3/2,2)`, `Q2 = (3/2,3/2)`, `B = (0,7/4)`.
- Step 2 `da-cubic-quarter`, t = 1/4: `Q1 = (-23/8,1/2)`, `Q2 = (-1/8,23/8)`, `B = (-35/16,35/32)`.
- Steps 3-7 unchanged (demonstration-default quartic, t = 1/2, 1/2, 1/4, 3/4, 1/2).
- Intended observation: two helper quadratics, their points visibly separate (distance 3.0 / 2.9 at t = 1/2, 1/4... see test thresholds), B between them at ratio t:(1-t); the same recursion then reappears at degree 4.

### affine (5 steps)
- Fixture `P = (1,0),(2,3),(4,2),(5,-1)`, view `[-5,7,9,-5]`; every scene restarts from the fixture. `B(1/2) = (3,7/4)`.
- Pivot (from code, not from the comment): `rotate()` and `flip()` call `transform()` without a centre, which uses the mean of the control points (`getPointsCenter`); `scale()` uses the bounding-box centre. Here both are `(3,1)`. The doc comments "Rotates the curve around origin" (`abstract-point-controlled-curve.ts:73`, `api/curve/point-controlled-curve.ts:32`) are wrong. Positive angle is counter-clockwise. The graph does not draw the centre (gap).
- translate `(-2,-1)`: `P' = (-1,-1),(0,2),(2,1),(3,-2)`, `B = (1,3/4)`.
- rotate `pi/2` about `(3,1)`: `(4,-1),(1,0),(2,2),(5,3)`, `B = (9/4,1)`; an origin turn would give `(-7/4,3)` (the prose says so, the test asserts it).
- scale 2 about `(3,1)`: `(-1,-1),(1,5),(5,3),(7,-3)`, `B = (3,5/2)`.
- composed translate, rotate, scale, t = 3/4: after the translation the rotation centre is the new mean `(1,0)`, after the turn the scale centre is the new box centre `(1,0)`; controls end at `(3,-4),(-3,-2),(-1,2),(5,4)`, all inside the view.

### elevation (4 steps)
- Default cubic `(-4,-2),(-3,3),(2,3),(3,-2)` in the board default view `[-5,5,5,-5]` (no per-scene view; value taken from `BaseGraph.tsx` `DEFAULT_BOUNDING_BOX`, the Elevation graph does not override it).
- Elevated `Q = (-4,-2),(-13/4,7/4),(-1/2,3),(9/4,7/4),(3,-2)`; `B(1/2) = (-1/2,7/4)` on both; degree 5 preview controls also inside the view.
- Steps 1-3 show the solid cubic polygon with the existing dashed elevated overlay; step 4 presses elevate (solid polygon becomes `Q`, dashed overlay previews degree 5), evaluation point 0.75.
- Overlay gap disposition (not added, no action exists): after elevation the original `P` polygon is no longer shown, and no action hides the overlay. The prose therefore says the solid polygon is the former dashed `Q` and that the new dashed polygon is not the original `P`. A "keep original" action would be a graph change outside this task.

## Checks and results
- Independent Bernstein form and hand-written De Casteljau rows vs `PolynomialBezierCurve.eval`/`decasteljauScheme` (rows trimmed to n-r entries, as the repository keeps n per row) for every prose number of the alt cubic (both t), affine B(1/2) and the four transformed curves, elevation B(1/2).
- Helper separation at the demonstrated t: `|Q1-Q2| > 1.5`, `|Q1-B|, |Q2-B| > 0.5`; the two parameters give points more than 1.5 apart.
- Affine: the graph's real centres (`getPointsCenter`, `getBoundingBoxCenter`) equal `(3,1)`; the repository's `moveFor`/`rotate`/`scale` (the exact calls of `AffineTransformsBezierCurveGraph.tsx` lines 41-46) give the same controls as hand-written rotation/scale about the stated centres; `T(B(t)) = B_T(t)` for t in {1/4,1/2,3/4,1} in the composed scene; lesson action lists equal the intended sequences; origin-centred turn differs by more than 3.
- Elevation: hand elevation = `elevatedControlPoints` = `curve.elevate()`; elevated and original agree at 21 parameters, endpoints equal, second elevation (6 points) keeps the shape, interior `Q` points are more than 0.1 from the curve (prose says they are off the curve).
- Prose: worked-example LaTeX is flattened and must contain each verified point; every `(x,y)` point written in step prose of the alt and affine lessons must be in the verified set; elevation prose contains `(-1/2,7/4)`.
- All control points (and transformed ones) inside each scene's view.
- Mutation checks (temporary edit, run `interpolationExamples.test.ts`, restore): 12 of 12 killed. Content: alt control point, alt result `7/4`->`9/4`, alt quarter t 0.25->0.3, affine control point, rotate pi/2->pi/3, rotate prose `(9/4,1)`->`(9/4,2)`, affine view right 9->5, elevation `7/4`->`5/4`, drop `elevate-degree` in step 4. Repository: `rotate()` about `[0,0]` (kills 2), `scale()` about `[0,0]` (kills 2), `elevate()` weights shifted (kills 2).
- Existing tests: `rationalConstructionGuidedLessons.test.ts` (7 steps, upper bound 6 raised to 7, first two alt steps are `lesson-fixture` scenes, action list), `expansionGuidedLessons.test.ts` (affine actions: `translate-x -2`, `translate-y -1`, `rotate-affine pi/2`, `scale-affine 2`), `additionalGuidedLessons.test.ts` (`elevate-degree` only in step 4, evaluation 0.5 in step 3).

## Commands
`npx vitest run src/learning/content/rationalConstructionGuidedLessons.test.ts src/learning/content/expansionGuidedLessons.test.ts src/learning/content/additionalGuidedLessons.test.ts src/learning/content/interpolationExamples.test.ts src/learning/content/lessonMathNotation.test.ts src/learning/content/sceneContentAgainstGraphs.test.tsx` (all pass) and `npx tsc --noEmit --pretty false` (clean). No build, no Playwright.

## Gaps
- Smoke spec not edited (see `01b-smoke-changes.md`); affine and elevation rows there are not modified by this task beyond what is listed.
- Affine centre is not drawn; no action shows it. Elevation has no hide-overlay/keep-original action.
- Wrong doc comments on `rotate()` (graph/curve code, not edited).
- Chapter: `bezierChapter.ts` affine section says the demonstration "uses a different, explicitly prepared cubic example" and `activities.ts` `transform-shape` opens the plain `affine-default` demonstration-default scene, so the activity does not use the lesson fixture `(1,0),(2,3),(4,2),(5,-1)`; the chapter never states the turn/scale centre. Elevation is only linked. Not edited.
- Elevation view and the decasteljau-alternative prose were not checked in a browser (no Playwright).
