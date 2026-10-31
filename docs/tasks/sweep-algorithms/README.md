# Sweep-line algorithm tasks

Source: [sweep-algorithms-lessons.md](../../specs/sweep-algorithms-lessons.md). Stream: [geometry](../feature-streams/geometry.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template). Core contracts (predicates, point-set graph, trace model): [convexity tasks](../convexity-hulls/README.md); Voronoi value: [triangulation tasks](../triangulation-voronoi/README.md). Reviews and evidence: `docs/reviews/sweep-algorithms/`.

## Decisions (F0, 2026-10-31, handler)

- **Coordinates and exactness:** [ADR 0035](../../adr/0035-sweep-coordinates-and-exact-event-order.md). Grid input with \(|c|\le2^{10}\); derived positions are `RationalPoint`s of the shared `src/compgeo/rational.ts` ([ADR 0030](../../adr/0030-triangle-geometry-rationals-gliders-and-placement.md), written by triangle geometry task 01 in the maps stream); Fortune heights \(q-\sqrt r\) compared exactly by squaring.
- **Sweep direction:** downwards, events by decreasing \(y\) then increasing \(x\), as the spec proposes and de Berg et al. use. One convention for the family.
- **Status structure:** ordered array, as the spec decides; the lessons name the balanced tree.
- **Location:** kernels in `src/compgeo/sweep/`, graphs under `src/graphs/compgeo/`, Demonstration family **Računska geometrija / Computational geometry** as decided for convexity.
- **Terms:** the spec's table as written (one-shot lesson text rule), with *obalna črta* for *beach line*.
- **C6 (closest pair, overlay):** not scheduled; it stays an owner decision as the spec says.
- **Trace events:** the spec's kinds (`pop`, `status-insert`, `status-remove`, `status-swap`, `neighbour-test`, `schedule`, `cancel`, `report`) extend the core trace; convexity and triangulation traces are unchanged.

## Batch S0 — foundation (not gated by `G-REG`; needs convexity Batch 0, accepted 2026-10-31)

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 01 | F0 plan (this file, ADR 0035) | F0 (handler) | — | done |
| 02 | [Sweep trace model and event order](02-sweep-trace-model.md) | F1 | convexity 02 (`trace.ts`), triangle geometry 01 (`rational.ts`) | planned; waits for `rational.ts` on `master` |
| 03 | [Exact segment primitives and brute-force intersections](03-segment-primitives.md) | F1 | 02 | planned |
| 04 | Segment-set graph mode (F2a) | F2a | 03 | task file written when 03 is accepted |

## Later batches

- **S1 (C1, C2), S2 (C3, C4), S3 (C5):** kernels, graphs, registration, lessons and media as in the spec's release batches; S2 needs triangulation T1 (ear clipping) released or its absence stated in C4; S3 needs triangulation T0 and the Voronoi value. Task files are written when the kernels they use are accepted. Registration and lessons wait for `G-REG`.
