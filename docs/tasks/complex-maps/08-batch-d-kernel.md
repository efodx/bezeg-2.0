# 08 Batch D kernel: powers and Euler's circle (F1)

Spec: [Batch D amendment](../../specs/complex-maps-lessons.md#batch-d-gating-kernel-gaps-f1-terms-and-tests-families-prep-amendment-2026-11-10) kernel gaps (1)–(2); M6 and M7 checked numbers and acceptance. Decisions: [ADR 0058](../../adr/0058-complex-maps-batch-d-power-and-euler-graphs.md). Stream: [families-prep](../feature-streams/families-prep.md).

Scope: new `src/analysis/complexPower.ts` and `src/analysis/eulerCircle.ts`, and their test files. `complexIntegerPower` in `complexRootsModel.ts` is the test oracle only and is not moved. Edit no existing file.

Acceptance:

1. `polarPower(z, n)` returns the modulus\(^n\), the unwrapped \(n\varphi\) and the principal argument, and agrees with repeated multiplication. `exactIntegerPower(a, b, n)` works on integer grid units with a bound check \(n\le8\). It is exact, \((1+\mathrm i)^8=16\) included, and checked against `complexIntegerPower`.
2. `eulerPoint(θ)` takes integer degrees and gives exact axis points at multiples of \(90^\circ\). `circularMotion(ω, t)` returns position, velocity and acceleration, checked by central differences. `expSeriesPartial(θ, N)` uses the spec's recurrence and is checked against `Math.cos` and `Math.sin`.
3. The M6 and M7 numbers match. Out-of-range input throws `RangeError`.

Checks: `just unit src/analysis/complexPower src/analysis/eulerCircle`, then `npx tsc --noEmit --pretty false` and `just lint src/analysis`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: the bound \(n\le9\), the principal argument returned unwrapped, and a series term with the wrong sign.
