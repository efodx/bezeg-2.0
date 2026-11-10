# 10 Batch D kernel: iteration and stability (F1)

Spec: [Batch D amendment](../../specs/linear-maps-lessons.md#batch-d-gating-kernel-gaps-f1-terms-and-tests-families-prep-amendment-2026-11-10) kernel gaps (1)–(3); L6 and L7 checked numbers and acceptance. Decisions: [ADR 0057](../../adr/0057-linear-maps-batch-d-iteration-modes-in-linear-map-graph.md). Stream: [families-prep](../feature-streams/families-prep.md).

Scope: new `src/linear/iterate2.ts` and `src/linear/stability2.ts` (including `companion`), and their test files. Reuse `matrix2.ts` and `eigen2.ts` as they are. Edit no existing file.

Acceptance:

1. `orbit(A, v0, n)` has a step cap and an `overflow` result. Its power-method readouts are the angle to the dominant direction, the stretch ratio and \(|\lambda_2/\lambda_1|\). It matches chains of `multiply`, and the closed form where the spec gives one.
2. `iterationOutcome(A)` returns `dominant`, `equal-moduli`, `rotating`, `scalar` or `defective` from \(\tau\) and \(\Delta\), using the entries only to separate `scalar` from `defective` when \(\tau^2=4\Delta\). It is exact on snapped entries and checked over a grid of snapped matrices against `classifyEigen`.
3. `discreteStability(A)` returns `inside`, `edge` (with the edge name) or `outside`. `flowStability(A)` is \(\tau<0\wedge\delta>0\). Both are exact. The 2000-matrix stability-triangle check passes against eigenvalue moduli computed independently.
4. `companion(τ, δ)` has the given trace and determinant.
5. The L6 and L7 numbers match. The continuous-time type names are not duplicated here.

Checks: `just unit src/linear`, then `npx tsc --noEmit --pretty false` and `just lint src/linear`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: the triangle edge \(\delta=1\) treated as inside, `equal-moduli` folded into `dominant`, and the overflow cap removed.
