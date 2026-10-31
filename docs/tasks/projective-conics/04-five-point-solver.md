# 04 Five-point solver and rational arc (F1, Batch B)

Spec: K4, and the solver and bridge tests in [testing decisions](../../specs/projective-conics-lessons.md#testing-decisions). Decisions: [ADR 0031](../../adr/0031-projective-conics-exact-kernel-and-family.md) §1 and §3. Depends on 02.

Scope: `conicFromFivePoints` in `src/projective/conic.ts`, `src/projective/rationalArc.ts`, and their tests. The task reads the rational Bézier kernels and does not change them.

Acceptance:

1. `conicFromFivePoints` returns the integer cofactors and a classification `unique | line-pair | pencil | invalid`:
   - The K4 default gives \(9x^2+25y^2=225\) up to scale.
   - \((0,0),(1,1),(2,2),(3,0),(0,4)\) gives \(96x^2-24xy-72y^2-288x+288y=0\) up to scale, classified `line-pair`.
   - Four collinear points, or a duplicate point, give `pencil` (all-zero cofactors).
   - The cofactors agree with an independent recomputation recorded in the test header.
2. `rationalArc(conic, a, b, third)` gives \(P_1\) as the pole of the chord and \(w\) from the third point. Parallel end tangents (\(P_1\) ideal) give a typed `split-needed` status, with no arithmetic on an infinite point.
3. K4 checks:
   - Arc \((5,0)\)–\((0,3)\): \(P_1=(5,3)\), and \(w=\tfrac{\sqrt2}2\) to \(10^{-12}\). This equals S6's bridge weight in [school-function-graphs-lessons.md](../../specs/school-function-graphs-lessons.md); test it against `src/analysis/conic.ts` where that module exposes the bridge.
   - The Farin points are \((5,1.2426)\) and \((2.0711,3)\).
   - Hyperbola \(16x^2-9y^2=144\): \(P_1=(3,2)\), \(w=\tfrac2{\sqrt3}\), and the denominator zeros are \(t=-1.366\) and \(2.366\).
   - Parabola \(y^2=4x\): \(w=1\) exactly.
4. Evaluate the arc with the existing rational curve evaluator. Over 200 samples, its maximum distance from the conic is below \(10^{-9}\).

Checks: `just unit src/projective`, then the full suite once, and `just typecheck`. Report mutation evidence.
