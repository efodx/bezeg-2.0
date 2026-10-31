# 03 Polynomial and rational kernels: mathematical and engineering review

2026-10-31. Implementation: `bezeg-worker` (Sonnet 5.5, `medium`), handler 2. Review: `bezeg-reviewer` (Sonnet 5.5, `medium`), handler 3. Repairs: handler 3. Scope: `polynomial.ts`, `rational.ts`, the `poly`/`rational` kinds in `schoolFunctions.ts`, and their tests (commit 3c78461).

## S4 spec decision

The spec's horizontal example \(\dfrac{2x^2+1}{x^2-1}\) has a numerator with no real zeros, so it has no product form (ADR 0026). It was replaced by \(\dfrac{2(x-1)(x+1)}{(x-2)(x+2)}\), with asymptote \(y=2\) and value \(2.0625=2+6/96\) at \(x=10\). The decision is recorded in the spec. The test asserts this value, its zeros and its poles. Extending the product form with irreducible quadratic factors was rejected: it would change the union, the validator, the text and the degree count for one example.

## Findings and disposition

There were no blockers.

- **Fixed: dead `unsupported-kind` reason.** It had no producer and no consumer, so it was removed from `SchoolFunctionReason`.
- **Fixed: unchecked merge cast.** `mergeZeros` cast summed multiplicities to `ZeroEntry` even above 3, and only `validatePoly`'s pre-check prevented that. It now throws a `RangeError` for a merged multiplicity above 3, so the cast is justified for every caller. New test.
- **Fixed: hole limit `-0` and untested scaling.** `-(x-1)^2/(x-1)` gave the hole limit `-0`. The value is normalized to 0. A new test covers leading factors other than 1 (\(-2(x+1)(x-1)/(4(x-1))\), limit \(-1\)) and the `-0` case. Mutation check: removing the normalization fails the new test (1 failed, 6 passed).
- **Documented: exact zero pairing.** Holes pair zeros by `===`, which suits slider and step inputs. The module comment now says so.
- **Accepted: merge rejection message.** A merged multiplicity above 3 is rejected as `out-of-range` on the later entry, even though that entry's own value is valid. The task 06 UI should block such a merge before it reaches validation.
- **Accepted: `signAround` step.** It uses \(h=10^{-6}\), so zeros closer than that would give wrong signs. It is used only by tests, and UI steps are much coarser.
- **Open coverage gap: rational derivative text.** The rational derivative is checked numerically by the catalogue loop. Its quotient-rule LaTeX has no exact-text assertion. The graph slice that first shows it should add one.

## Cleared

- Hole and pole rules: a hole when the numerator multiplicity is at least the denominator's, with limit 0 when it is larger; otherwise a pole of the multiplicity difference.
- Asymptotes on the reduced fraction: horizontal 0 when deg p < deg q, the leading quotient when the degrees are equal, oblique only when deg p = deg q + 1, otherwise none. `dividePolynomials` is correct.
- S3 values (\(p(0)=2\), \(p(1)=0\), \(p'(1)=0\), \(p''(1)=6\)) and S4 values (\(x+2+3/(x-2)\), 0.375, the hole at \((1,2)\), 2.0625).
- Product-rule derivatives against expanded coefficients. Evaluation never expands. Degree cap 5 (`degree-too-high`). \(k=0\) is rejected as `excluded-value`, so an identically zero denominator cannot occur.
- `value` and `derivative` are undefined at holes and poles. No plot piece spans a pole, near-pole values are clipped, and the test covers a simple and a double pole.
- LaTeX and plain text: backslashes intact, signs of negative zeros, exponents, \(k=\pm1\), and bracketing.
- Worker decisions: `POLY_BOUNDS` (\(k\) in \(\pm10\), zeros in \(\pm20\)) are reasonable; owner confirmation is pending, as for `TRANSFORM_BOUNDS`.
