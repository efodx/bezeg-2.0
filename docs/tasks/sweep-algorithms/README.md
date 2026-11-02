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
| 02 | [Sweep trace model and event order](02-sweep-trace-model.md) | F1 | convexity 02 (`trace.ts`), triangle geometry 01 (`rational.ts`) | accepted 2026-11-01 |
| 03 | [Exact segment primitives and brute-force intersections](03-segment-primitives.md) | F1 | 02 | accepted 2026-11-01 |
| 04 | [Segment-set graph mode](04-segment-set-mode.md) | F2a | 03 | accepted 2026-11-01 (handler 10; Sonnet `medium`, engineering + UI/a11y review: two low findings repaired, focus after removal deferred) |

## Batch S1 — C1 and C2 (kernels and modes not gated by `G-REG`; graphs, registration and lessons follow when these are accepted)

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 05 | [Interval sweep kernel](05-interval-sweep-kernel.md) | F1 | 02 | accepted 2026-11-01 |
| 06 | [Bentley–Ottmann kernel](06-bentley-ottmann-kernel.md) | F1 | 02, 03 | accepted 2026-11-01 |
| 07 | [Interval graph mode](07-interval-mode.md) | F2a | 04, 05 | accepted 2026-11-01 |
| 08 | [Interval sweep graph](08-interval-sweep-graph.md) | F2a | 05, 07 | accepted 2026-11-01 (handler 14): engineering, math, UI/accessibility reviews, repairs |
| 09 | [Bentley–Ottmann graph](09-bentley-ottmann-graph.md) | F2a | 04, 06 | accepted 2026-11-01 (handler 15): engineering, math, UI/accessibility reviews, repairs |
| 10 | [Sweep registration](10-sweep-registration.md) | F2b | 08, 09, `G-REG` | accepted 2026-11-01 (handler 15); default-view follow-up |
| 11 | [Interval-sweep lesson C1](11-interval-sweep-lesson.md): `set-points` modes, `set-trace-step` | F3 | 08, 10 | accepted 2026-11-01 (handler 20) |
| 12 | [Bentley–Ottmann lesson C2](12-segment-intersections-lesson.md) | F3 | 09, 10, 11 | accepted 2026-11-02 (handler 21) |
| 13 | [Sweep-line algorithms chapter](13-sweep-chapter.md) | F4 | 11, 12 | accepted 2026-11-02 (handlers 22, 23) |
| F6 | [S1 acceptance (C1, C2)](../../reviews/feature-streams/geometry/f6-t1-s1-acceptance.md) | F6 | 02–13 | accepted 2026-11-02 (handler 24); S1 released |

## Batch S2 — C3 and C4 (planned 2026-11-02, handler 26)

S1 and triangulation T1 are released, so C4 makes the ear-clipping contrast. The kernels are independent of the triangulation T2 tasks and may interleave with them.

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 14 | [Monotone partition kernel](14-monotone-partition-kernel.md) | F1 | 02 | accepted 2026-11-02 (handler 33): mathematical review |
| 15 | [Monotone triangulation kernel](15-monotone-triangulation-kernel.md) | F1 | 14, triangulation 06 | accepted 2026-11-02 (handler 33): mathematical review |
| 16 | [Monotone partition graph](16-monotone-partition-graph.md) | F2a | 14, 09, triangulation 07 | accepted 2026-11-02 |
| 17 | [Monotone triangulation graph](17-monotone-triangulation-graph.md) | F2a | 15, 16 | planned |
| 18 | [S2 registration](18-s2-registration.md) | F2b | 16, 17 | planned |
| 19 | [Monotone partition lesson C3](19-monotone-partition-lesson.md) | F3 | 16, 18 | planned |
| 20 | [Monotone triangulation lesson C4](20-monotone-triangulation-lesson.md) | F3 | 17, 18, 19 | planned |
| 21 | [Chapter sections for S2](21-s2-chapter-sections.md) | F4 | 19, 20 | planned |
| F6 | S2 acceptance (C3, C4) | F6 | 14–21 | — |

## Later batches

- **S3 (C5):** kernel, graph, registration, lesson and media as in the spec's release batches; S3 needs triangulation T0 and T3 (the Voronoi value) and a measured beach-line drawing. Task files are written when the kernels they use are accepted.
