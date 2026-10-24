# Mathematical review (partial, stopped on HANDOFF)

## Findings

### F1 (major) additionalGuidedLessons.ts:359 (elevation closing step, SL text)
The Slovenian string uses single backslashes: `prejšnji črtkani \(Q\); ... ni prvotni \(P\).` In a JS string literal `\(` collapses to `(`, so the learner sees "(Q)" and "(P)" instead of rendered math. The English text on the next lines uses `\\(`, so the SL and EN texts disagree in rendering. Expected: `\\(Q\\)` and `\\(P\\)`. Verified with grep on the source (line 359 shows `\(Q\)`, line 370 shows `\\(Q\\)`). The lessonMathNotation test did not catch this.

### F2 (minor, unverified) code check
I did not confirm the new tests are non-vacuous.

## Numbers verified by hand (all correct, SL and EN agree)

- Bezier: symmetric cubic B(1/2) = (0,1). Asymmetric cubic B(1/2) = (3/8,3/4).
- De Casteljau: quadratic rows and (0,1). Cubic t=1/2 gives (0,1). Cubic t=1/4 gives (-33/16,1/4), with rows and Bernstein weights 27/64, 27/64, 9/64, 1/64. Cubic t=3/4 gives (33/16,1/4), mirrored.
- PH cubic: P1, P2, P3 = (-2/3,-1), (2/3,-1/3), (5/3,1). Speed 4+t^2. Arc length 13/3. r(1/2) = (-1/24,-1/2). w1=2+2i gives arc length 16/3. Normal at t=1 is (4/5,-3/5), vertical shift 3/5. Curvature 4/(4+t^2)^2, radius 4 to 25/4.
- PH offset sign and regularity: d>0 is the right side and the outer side for a left-turning curve. For d<0, regular iff |d|<R, so a cusp at |d|>=4. The formula 1+dκ>0 is consistent with the right-normal convention.
- PH quintic: w(t) = (2-t^2) + i(2t-t^2). Speed 4-4t^3+2t^4. Arc length 17/5. Speed at 1/2 is 29/8. w(1/2) = 7/4+3i/4. w0-2w1+w2 = -1-i. κ(1) = 1 hand-checked. Claims that κ_max = 1 and the quintic's last control point (1/3,16/15) were NOT numerically confirmed; the script was refused by the sandbox.
- Rational (cubic, weights 1,1,1,1 / 1,2,1,1 / 1,4,1,1): (0,3/2), (-9/11,21/11), (-27/17,39/17). Shares 3/8, 6/11, 12/17. Endpoints are independent of the weights.
- Rational De Casteljau: quadratic (1,2,1) rows and (0,1). Cubic equal-weight rows and (0,3/2). Cubic (1,2,1,1) homogeneous rows and (-9/8,21/8,11/8).
- Affine: B(1/2) = (3,7/4). Mean of control points and bounding-box centre are both (3,1). Quarter-turn control points and (9/4,1). Scale-2 control points and (3,5/2). Translation by (-2,-1) gives (1,3/4).
- Taylor e^x: T2(1) = 5/2. Errors 0.7183, 0.2183, 0.0516, 0.000226. Bound e/5040 = 0.000539.
- Sequence 1/n: ε=1/4 open band, a_4 on the edge, least N = 5. Twelve terms shown, eight in the band. ε=0.1 gives N=11.
- Uniform convergence: x/n sup = 1/n attained at x=1. N(0.5)=6 for x/n. Shared N=11. For x^n: N(0.5)=4, N(0.9)=22, N(0.99)=230. Sup 1 not attained. 0.9^5 = 0.59049. 0.9^10 ≈ 0.35.
- Affine pivot claims: abstract-point-controlled-curve.ts confirms rotate uses the mean of the control points and scale uses the bounding-box centre.

## Lessons reviewed

Bezier, decasteljau, ph-cubic, rational-decasteljau, elevation, rational, ph-quintic, affine, taylor, sequence, uniform-convergence.

## Not reached

- spline-cn, spline-c1, spline-c2, spline-g1, spline-g1-symmetric (splineGuidedLessons.ts diff, 677 lines)
- spline-parameterization, weighted-parameterization, uniform-parameterization (parameterizationGuidedLessons.ts)
- trigonometric-functions, area-between-curves (functionGuidedLessons.ts)
- decasteljau-alternative
- the rationalConstructionGuidedLessons.ts diff
- all new test files (non-vacuity unchecked)
