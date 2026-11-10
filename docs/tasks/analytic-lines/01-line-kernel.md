# 01 Line kernel (F1, Batch 0)

Spec: [line kernel](../../specs/analytic-lines-lessons.md#line-kernel-owned-by-this-spec) items 1–7; the kernel parts of L1–L5 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0046 §2–3.

Scope: new `src/compgeo/lineForms.ts` and its test file. Reuse `src/compgeo/circle.ts` (`Line`, `lineThrough`, `lineValue`, `intersectLineCircle`), `rational.ts` and `grid.ts` as they are. Edit no existing file.

Acceptance:

1. Forms:
   - `normalizeLine` divides by the gcd and fixes the sign, so equal lines compare equal;
   - `explicitForm` returns \(\{k,n\}\) as `Rational`, or `{vertical, x0}`, and never divides by zero;
   - `interceptForm` returns `undefined` when either intercept is missing or both are \(0\).
   The L1 numbers match, including the double counter-example in the spec.
2. `parallel`, `perpendicular` and `sameLine` are exact integer tests.
3. `project`, `footOfPerpendicular` and `distanceSquared` are exact `Rational`. `distance` is a double. The L4 numbers match: \(121/5\) and the foot \((4/5,12/5)\). In the test, "on the line" is checked by a hand-written integer determinant, not by `lineValue`.
4. The angle between lines is `atan2(|cross|,|dot|)`, the acute convention. The L3 numbers match.
5. `intersectLines` returns `point` (exact by Cramer's rule), `parallel` or `same`. Line and circle use `intersectLineCircle` unchanged. The L5 numbers match, including the tangent case.
6. Property tests over random integer grid input in \([-8,8]\):
   - the foot lies on the line;
   - the foot-to-point direction is perpendicular to the line;
   - the intersection point satisfies both lines;
   - normalisation is idempotent.

Checks: `just unit src/compgeo/lineForms`, then `npx tsc --noEmit --pretty false` and `just lint src/compgeo`. Report an observed failure per assertion group against a deliberate mutation. The required mutations are a tolerance in `parallel` and a sign error in the foot.
