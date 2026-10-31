# Triangulations and Voronoi tasks

Source: [triangulation-voronoi-lessons.md](../../specs/triangulation-voronoi-lessons.md). Stream: [geometry](../feature-streams/geometry.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template). Core contracts (predicates, point-set graph, trace model): [convexity tasks](../convexity-hulls/README.md). Reviews and evidence: `docs/reviews/triangulation-voronoi/`.

## Decisions (F0, 2026-10-31, handler)

- **Robustness:** no new ADR. `incircle` falls under [ADR 0021](../../adr/0021-exact-grid-predicates.md) (exact predicates on grid points), as the spec states. Doubles are used when every absolute coordinate is at most \(2^{11}\); otherwise the same function computes in `BigInt`. Handler check of the double path: with differences at most \(2^{12}\), each \(2\times2\) minor is at most \(2^{25}\) and each lift \(d_x^2+d_y^2\) at most \(2^{25}\), so each of the three terms of the cofactor expansion is at most \(2^{50}\) and the sum at most \(3\cdot2^{50}<2^{53}\). The double path must use that expansion order; a different order needs its own bound.
- **`incircleValue` returns `bigint`.** At the grid limit \(2^{25}\) the determinant reaches about \(2^{105}\), so a `number` cannot hold it exactly. Readouts convert with `toString()`.
- **Collinear \(a,b,c\)** in `incircle` throws a `RangeError`; triangulation code never passes a degenerate triangle.
- **Triangulation structure:** option A of the spec (immutable counter-clockwise triangle list with neighbour indices), as a spec decision without an ADR; it fits the pure `stateAt` fold of the trace model. Internal and cheap to change.
- **Delaunay construction:** incremental insertion in lexicographic order plus Lawson flips (the same code serves B3's trace); brute-force empty-circle check over all triples as the test oracle only.
- **Location:** `src/compgeo/` (kernels and traces), graphs under `src/graphs/compgeo/`, Demonstration family **Računska geometrija / Computational geometry** as decided for convexity.
- **Terms:** the spec's proposals as written (one-shot lesson text rule); *Delaunayeva*, *Voronojev*.
- **Trace events:** this family adds the kinds `flip` and `circle` to its own traces; the convexity traces are unchanged.

## Batch T0 — kernel (not gated; needs convexity Batch 0, accepted 2026-10-31)

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 01 | F0 plan (this file) | F0 (handler) | — | done |
| 02 | [`incircle` predicate](02-incircle.md) | F1 | convexity 02 | accepted 2026-10-31 (math review, no findings) |
| 03 | [Triangulation structure and flip](03-triangulation-structure.md) | F1 | 02 | implemented; math review pending |
| 04 | Delaunay construction and Lawson trace (B3 examples, brute-force oracle) | F1 | 03 | task file written when 03 is accepted |
| 05 | Voronoi value with exact rational vertices and duality (B4 example) | F1 | 04 | task file written when 04 is accepted |

## Later batches

- **T1 (B1 ear clipping):** kernel [06 ear-clipping trace, 3-colouring and guards](06-ear-clipping-kernel.md) (F1, implemented; math review pending) needs only `orient` and can run beside T0; graph F2a; registration and lessons wait for `G-REG`.
- **T2 (B2, B3), T3 (B4, B5):** graphs, registration, lessons, chapter, media and acceptance as in the spec's release batches. Task files are written when the kernels they use are accepted.
