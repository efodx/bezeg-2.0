# 01 Circle construction kernel (F1, Batch 0)

Spec: [circle construction kernel](../../specs/circle-geometry-lessons.md#circle-construction-kernel-batch-0-owned-by-this-spec) items 1–4; the kernel parts of CG1–CG4 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0045 §2–3.

Scope: new `src/compgeo/circleConstructions.ts` and its test file. Reuse `src/compgeo/circle.ts`, `rational.ts` and `grid.ts` as they are. Edit no existing file.

Acceptance:

1. `tangentsFrom(P, circle)` returns `inside`, `on` (exact tangent line through \(P\)) or `outside`. For `outside` it also returns the exact chord of contact and the squared tangent length, equal to `powerOfPoint`, plus the points of contact, which are inexact. The CG1 numbers match. Over all grid \(P\) in \([-16,16]^2\) and a set of circles, each contact point lies on the circle and on the Thales circle to \(10^{-12}\). They agree with `tangentPoints` in `src/projective/conic.ts`, which serves as the independent oracle.
2. `radicalAxis` returns an exact line, `concentric` or `coincident`. `radicalCentre` returns an exact point with its common power, `parallel`, or `coaxal` when the two axes are the same exact line. The CG2 numbers match. A coaxal test uses three circles through two common points.
3. `apolloniusLocus(A, B, m)` returns the exact perpendicular bisector for \(m=1\), otherwise the exact circle with centre \((mB-A)/(m-1)\) and \(\rho^2=m|AB|^2/(m-1)^2\). Membership is checked exactly. The division points are the endpoints of a diameter. The CG3 numbers match.
4. `commonTangents(c1, c2)` returns the count \(0,1,2,3,4\) or infinitely many, using the exact rule from `intersectCircles` and \(k=d^2-r_1^2-r_2^2\). The homothety centres are exact. Equal radii give parallel external tangents. Tangent lines are inexact apart from the exact contact cases. The CG4 numbers match. Each line touches both circles to \(10^{-12}\), checked in the test by an independent distance formula.
5. No \(\varepsilon\) appears in any discrete decision. Off-grid inputs are rejected.

Checks: `just unit src/compgeo/circleConstructions`, then `npx tsc --noEmit --pretty false` and `just lint src/compgeo`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are a tolerance in the tangency test and `coaxal` folded into `parallel`.
