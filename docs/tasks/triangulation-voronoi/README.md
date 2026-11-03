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
| 03 | [Triangulation structure and flip](03-triangulation-structure.md) | F1 | 02 | accepted 2026-10-31 (math review, no findings) |
| 04 | [Delaunay construction and Lawson trace](04-delaunay-lawson.md) (B3 examples, brute-force oracle) | F1 | 03 | accepted 2026-10-31 (math review; count wording) |
| 05 | [Voronoi value with exact rational vertices and duality](05-voronoi-value.md) (B4 example) | F1 | 04, triangle geometry 02 (`circumcentre`) | accepted 2026-11-01 (handler 10; Sonnet `high`, math review no correctness findings, 3 test gaps closed) |
| 08 | [Ear-clipping registration](08-ear-clipping-registration.md) | F2b | 07, `G-REG` | accepted 2026-11-01 (handler 15) |
| 09 | [Ear-clipping lesson actions and lesson B1](09-ear-clipping-lesson.md) | F3 | 07, 08 | accepted 2026-11-01 (handler 18) |
| 10 | [Triangulations and Voronoi chapter, T1](10-triangulation-chapter.md) | F4 | 09 | accepted 2026-11-02 (handler 21) |
| F6 | [T1 acceptance (B1)](../../reviews/feature-streams/geometry/f6-t1-s1-acceptance.md) | F6 | 06–10 | accepted 2026-11-02 (handler 24); T1 released |

## Later batches

- **T1 (B1 ear clipping):** kernel [06 ear-clipping trace, 3-colouring and guards](06-ear-clipping-kernel.md) (F1, accepted 2026-10-31 after math review and test repairs) needs only `orient` and can run beside T0; graph F2a [07 ear-clipping graph](07-ear-clipping-graph.md) (accepted 2026-11-01); registration and lessons wait for `G-REG`.
- **T3 (B4, B5):** see [Batch T3](#batch-t3--b4-and-b5-task-files-written-2026-11-02-handler-34-t2-released) below.

## Batch T2 — B2 and B3 (task files written 2026-11-02, handler 25; T0 kernels accepted)

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 11 | [Point insertion and boundary counts](11-point-insertion-kernel.md) | F1 | 03, 04 | accepted 2026-11-02 (handler 26) |
| 12 | [Point-set triangulation graph](12-point-set-triangulation-graph.md) (B2) | F2a | 11 | accepted 2026-11-02 (handler 27): 12a/12b workers, engineering + UI/accessibility review, repairs |
| 13 | [Delaunay graph with the Lawson trace](13-delaunay-graph.md) (B3) | F2a | 12, 04 | accepted 2026-11-02 (handler 28) |
| 14 | [Registration of `point-set-triangulation` and `delaunay`](14-t2-registration.md) | F2b | 12, 13 | accepted 2026-11-02 (posters pending) |
| 15 | [Triangulation lesson actions and lesson B2](15-point-set-triangulation-lesson.md) | F3 | 12, 14 | accepted 2026-11-02 (handler 31): review fix (hidden counts), B2 section pulled forward as 17a |
| 16 | [Delaunay lesson B3](16-delaunay-lesson.md) | F3 | 13, 14, 15 | 16a accepted 2026-11-02 (handler 32); 16b accepted 2026-11-02 (handler 33) |
| 17 | [Chapter sections for B2 and B3](17-t2-chapter.md) | F4 | 15, 16 | 17a (B2 section) accepted 2026-11-02 (handler 31); 17b (`delaunay`) accepted 2026-11-02 (handler 33) |
| F6 | T2 acceptance | F6 | 11–17 | accepted 2026-11-02 ([record](../../reviews/feature-streams/geometry/f6-t2-acceptance.md)) |

## Batch T3 — B4 and B5 (task files written 2026-11-02, handler 34; T2 released)

Release condition (spec): T2 released; Voronoi drawing reviewed for reuse by Fortune (task 18, item 7). The Voronoi value (05) is already accepted.

### Decisions (T3, 2026-11-02, geometry handler 34)

- Whether a partial diagram is a valid `VoronoiDiagram` stays an item of 18's Fortune reuse review.
- **Settled by handler 35 (18 accepted):** a partial diagram is not a `VoronoiDiagram`. A mid-sweep edge has no valid value, `clipCell` over-fills a cell whose edge list is incomplete, and "open" would stop meaning "continues beyond the box". Fortune's graph therefore draws its own sweep state (sweep line, beach line, breakpoints, traced half-edges, circle events), owns and disposes those objects, and may reuse `clipToBox`, `edgeInBox` and `frame`. At `done` it hands its final value to `voronoiDrawing`. The optional final-cells sub-diagram must meet the invariant in [18-fortune-reuse.md](../../reviews/triangulation-voronoi/18-fortune-reuse.md) (b).
- Cell construction (B4 step 3): other sites by increasing distance from the chosen site, ties by index.
- B5 coordinates: 20's worker derives the near-circle quadruple and the on-circle move from the spec's examples (unit square scaled to the grid, or the trapezoid) with `python -I`; the handler confirms them in 20's review before 23 quotes them. Convention: a diagonal is legal when `incircle <= 0`.
- B5 gets its own Demonstration and route `voronoi-degenerate`, because lessons are keyed one per Demonstration (`getGuidedLesson(demonstrationId)`, `lessonCatalog.ts`). It is served by `DegenerateSitesGraph extends VoronoiGraph`, which opens in the four-point mode; the modes live in `VoronoiGraph` and its scene, and the subclass only fixes the default mode, its Presets collection `compgeo-voronoi-degenerate` and its title. Lesson B5 may switch four-point and collinear by `set-mode`. Chapter sections open their own routes.
- `VoronoiGraph extends PointSetGraph`; the circumcircle and triangle-selection drawing of `DelaunayGraph` is extracted into a shared module first (19 item 1).
- Routes and posters follow T2: route registered before its lesson with `lesson: false`; poster at the next joint capture.
- 24 narrows the T2 Voronoi-free test to the B2/B3 sections, adds a B3-to-B4 forward link and may name the diagram in the chapter opening.

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 18 | [Voronoi drawing module and Fortune reuse review](18-voronoi-drawing.md) | F2a-support | 05 | accepted 2026-11-02 (handler 35, [record](../../reviews/triangulation-voronoi/18-acceptance.md)) |
| 19 | [Voronoi graph with the Delaunay duality overlay](19-voronoi-graph.md) (B4) | F2a | 18, 13 | accepted 2026-11-03 (handler 36, [record](../../reviews/triangulation-voronoi/19-acceptance.md)) |
| 20 | [Four-point and collinear modes and `DegenerateSitesGraph`](20-degenerate-sites-graph.md) (B5) | F2a | 19 | accepted 2026-11-03 (handler 36, [record](../../reviews/triangulation-voronoi/20-acceptance.md)) |
| 21 | [Registration of `voronoi` and `voronoi-degenerate`](21-t3-registration.md) | F2b | 19, 20 | planned |
| 22 | [Voronoi lesson actions and lesson B4](22-voronoi-lesson.md) | F3 | 19, 21 | planned |
| 23 | [Degenerate sites lesson B5](23-degenerate-lesson.md) | F3 | 20, 21, 22 | planned |
| 24 | [Chapter sections for B4 and B5](24-t3-chapter.md) | F4 | 22, 23 | planned |
| F6 | T3 acceptance | F6 | 18–24 | planned |
