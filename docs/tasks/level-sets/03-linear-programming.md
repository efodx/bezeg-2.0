# 03 Exact linear programming (F1, Batch 0)

Spec: [kernels](../../specs/level-sets-optimization-lessons.md#kernels) item 5; the kernel parts of LS5 acceptance; Testing Decisions (LP); Correctness Notes. Decisions: ADR 0053 §4.

Scope: new `src/optimization/lp2.ts` and its test file. Reuse `src/compgeo/rational.ts`, and `polygonMeasures.ts` only as a test cross-check. Edit no existing file.

Acceptance:

1. The constraints \(a_ix+b_iy\le c_i\) have integer coefficients and always include \(x,y\ge0\). Rows with \(a_i=b_i=0\) are rejected. Vertices are found by Cramer's rule in `Rational`, kept when every constraint holds exactly, and deduplicated by exact equality, so a degenerate vertex reached by several pairs appears once.
2. The kernel reports `infeasible` (no vertex), `point`, `segment` or `polygon`. It reports `unbounded` by the ray test over \(\{\pm(b_i,-a_i)\}\). Otherwise it reports the optimum, with every optimal vertex for ties.
3. Brute force over a fine rational grid of the window agrees with the reported optimum on random small integer programs. The polygon area in `Rational` agrees with `doubledSignedArea` when the vertices are integer. The LS5 numbers match.

Checks: `just unit src/optimization`, then `npx tsc --noEmit --pretty false` and `just lint src/optimization`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: deduplication removed, the feasibility test with `<` in place of `<=`, and the unbounded test ignoring the objective sign.
