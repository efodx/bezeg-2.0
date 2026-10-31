# 01 Möbius and inversion kernel (F1, Batches A and C)

Spec: "Reuse and new modules" (`complexMobius.ts`, generalized circle), M1 acceptance 3–4, M4 acceptance 1–4 and 6, M5 acceptance 1, 2 and 4, Testing Decisions, Correctness Notes. Decisions: ADR 0028 §3 (0.05 grid, integer units of \(1/20\)).

Scope: `src/analysis/complexMobius.ts` and its test file. Pure TypeScript; reuse `Complex`, `complexMultiply` and the grid helpers from `src/analysis/complex.ts` without changing their behaviour. Worker effort `high`.

Acceptance:

1. `Mobius` (four `Complex` coefficients), `mobiusApply` with typed results `point | pole` (and \(\infty\mapsto a/c\) via `mobiusImageOfInfinity`, `infinity` when \(c=0\)), `mobiusCompose`, `mobiusInverse`, `mobiusDeterminant`, `mobiusThroughThree` (rejects equal points), `crossRatio`. \(ad-bc=0\) is rejected by a validator with a typed reason.
2. `circleInversion(z, c, r)` returns `point | pole` (at \(z=c\)); involution to \(10^{-12}\); fixes the circle, decided exactly in grid units; reverses orientation (\(-90^\circ\) at \(0.5+0.5i\) for directions \(1,i\)).
3. `GeneralizedCircle` in the real form \(A|z|^2+\bar Bz+B\bar z+C=0\) with constructors from centre and radius and from two points of a line. `mobiusImage` via \(H'=N^*HN\) and `inversionImage` (conjugate first). "Passes through the pole" and "image is a line" decided exactly by \(A'=0\) in integer grid units; a range test confirms the integer bound stays below \(2^{53}\) over the whole grid domain.
4. Every checked number of M4 and M5 matches (\(10^{-12}\)): Cayley map images, the circle \(|z-1|=\tfrac12\) to centre \(-\tfrac17-\tfrac87i\), radius \(\tfrac47\); the second example's determinant, pole, \(\infty\) image and unit-circle image; \(\varphi_{0.5}\) values and \(|z|=0.5\mapsto\) centre \(-0.4\), radius \(0.4\); \(\varphi_a\) with \(a=0.3+0.4i\) and the identity value \(0.3525\). Image circles are verified independently by applying the map to several source points.
5. Cross-ratio invariant within \(10^{-9}\) relative on 1000 seeded random quadruples; concyclic quadruples give a real value within \(10^{-9}\). `discAutomorphism(a, theta)` with exact \(|a|<1\) check; inverse is the parameter \(-a\), composed within \(10^{-12}\).
6. A source circle driven through the pole and one grid step from it: line versus visible circle, with no NaN or infinity in any result.

Checks: `just unit src/analysis/complexMobius`, `just unit src/analysis/complex` (released tests unchanged), then the full unit suite once. Report an observed failure of each assertion group against a deliberate mutation. Review: mathematical (Sonnet).
