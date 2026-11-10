# 02 Triangle solver kernel (F1, Batch 0)

Spec: [trigonometry kernel](../../specs/trigonometry-lessons.md#trigonometry-kernel-owned-by-this-spec) items 3, 4; TR3 acceptance 1, 2, 4; TR4 acceptance 1, 2; TR5 acceptance 1, 2, 4; Testing Decisions; Correctness Notes (SSA count). Decisions: ADR 0044 §2.

Scope: new `src/trig/triangleSolver.ts`, `src/trig/sineCosineRules.ts` (TR3/TR4 helpers on grid triangles) and their test files. Reuse `src/compgeo/circle.ts` (`circumcircle`, `angleBetween`, `thalesDot`, `intersectLineCircle`) and `src/compgeo/triangle.ts` (`circumradiusSquared`, `classifyTriangle`) as they are. Edit no existing file.

Acceptance:

1. `solveTriangle(spec)` for `sss`, `sas`, `asa` (AAS by the angle sum) and `ssa`, returning `none` with a reason, `one`, `two` or `degenerate`. Inputs outside the ADR 0044 grid are rejected.
2. The SSA count follows the exact rule:
   - the integer test \(2a=b\) at \(A=30^\circ\);
   - the double comparison of \(a\) with \(b\sin A\) for the other acute angles;
   - \(a\) against \(b\) for right and obtuse angles.
   The test enumerates all \(48\times48\times179\) inputs. It compares with an independent root-finding oracle where the gap exceeds the oracle's resolution, and with the integer rule at the tie cases.
3. `triangleFromSolution` builds vertices. Sides, angles (`atan2` of cross and dot) and area (shoelace and Heron) are re-measured from them and agree with the solver to \(10^{-12}\). The TR5 default numbers match the spec.
4. TR3 helpers:
   - the antipode \(A'=2O-B\) is exact (`Rational`), and `thalesDot` at \(C\) is \(0\);
   - the three ratios equal \(2R\) to \(10^{-12}\) over a dense grid;
   - the right angle at \(A\) is reported as a status, not a degenerate triangle.
5. TR4: \(c^2=a^2+b^2-2\,CA\cdot CB\) holds as an exact integer equality on grid triangles. The acute, right and obtuse status at \(C\) is the sign of the integer dot product.
6. Degenerate and impossible data give a status and no numbers. No `NaN` appears anywhere.

Checks: `just unit src/trig`. Report an observed failure of each new assertion group against a deliberate mutation. For the SSA rule, the mutation compares \(a\) with \(h\) by a tolerance.
