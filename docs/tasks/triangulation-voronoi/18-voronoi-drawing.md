# 18 — Voronoi drawing module and Fortune reuse review (T3, F2a)

Status: accepted 2026-11-02 (geometry handler 35, [record](../../reviews/triangulation-voronoi/18-acceptance.md)); planned 2026-11-02 (geometry handler 34). Source: spec [Voronoi drawing](../../specs/triangulation-voronoi-lessons.md#voronoi-drawing-reused-by-the-sweep-family), [B4](../../specs/triangulation-voronoi-lessons.md#b4-voronoi-diagrams-and-duality) (capabilities, acceptance 4 and 6), [release batches](../../specs/triangulation-voronoi-lessons.md#release-batches) (T3 gate "Voronoi drawing reviewed for reuse by Fortune"), [implementation decisions](../../specs/triangulation-voronoi-lessons.md#implementation-decisions) (rendering); sweep spec [C5](../../specs/sweep-algorithms-lessons.md) (output value; S3 gate). Kind: F2a-support (a drawing module with no graph, route or registration), engineering review, mathematical review and a written reuse review. Depends on 05 (`VoronoiDiagram`, `clipCell`, `RationalBox`) and the point-set graph. Template: the drawing helpers of 13.

The kernel value exists (05). This task adds the board-side drawing of a `VoronoiDiagram` in `src/graphs/compgeo/` (proposed `voronoiDrawing.ts`), so that 19, 20 and the later Fortune graph (sweep family S3) draw the same way.

## Reuse contract (the point of this task)

The module's input is only a `VoronoiDiagram`, the site points, a view box and options. It imports nothing from the Delaunay or triangulation code and never recomputes the diagram. Exact rationals are converted to doubles only inside the draw step; no discrete decision compares drawn doubles.

## Acceptance

1. **Draws** from a `VoronoiDiagram` value: cell fill per site (clipped with `clipCell` to the current box), segment edges, ray edges extended to the box, full-line edges (collinear sites), vertex markers (a vertex of degree 4 or more is distinguishable without relying on colour) and the "continues" marker on every open side of an unbounded cell (B4 capabilities). Hull-site cells are visibly open.
2. **Clipping follows the view** (B4 acceptance 4): after a zoom or pan the same cell is clipped consistently, and the marker count equals the number of open sides reported by `clipCell`. A `frame(diagram, points)` helper computes a box that contains every vertex, including circumcentres outside the hull or the initial view; the caller owns the Reset view control.
3. **Options** are separate toggles, not always on: cells, edges, vertices, and a highlighted cell (by site index). The module draws neither the Delaunay overlay nor the bisector construction; those belong to 19.
4. **Ownership and disposal:** the module returns a handle that owns every board object it creates and removes them all, with their listeners, on `dispose()`. Redrawing reuses objects rather than leaking them.
5. **Tests** (jsdom board in the style of `DelaunayGraph.host.test.tsx`; framing and box arithmetic as plain unit tests):
   - B4 example (the spec's seven points): 7 vertex markers, 8 segments, 5 rays, 5 open cells with markers and 2 closed.
   - Five collinear sites: four full lines, no vertex markers, strip cells open.
   - A hand-built three-site `VoronoiDiagram` that never went through the Delaunay code draws like the Delaunay-built value for the same sites (B4 acceptance 6).
   - Zoom out and in: marker count equals open sides; every clipped polygon vertex lies inside the box (exact).
   - `dispose()` leaves no board objects or listeners; a second call is harmless.
   - Observe each new assertion fail against a deliberate mutation (for example a ray extended toward the remaining sites, a missing marker on one open side, an undisposed fill polygon).
6. **Performance:** measure a drag at 40 sites (spec rendering decision, [performance plan](../../performance-plan.md)) before choosing between per-cell polygons and batched curves, and record the numbers. Also record the cost of redrawing a final diagram of 12 sites, because Fortune redraws on every step (the sweep family's site limit is 12).
7. **Reuse review (T3 gate):** a short written review in `docs/reviews/triangulation-voronoi/18-fortune-reuse.md` by a reviewer who has read the sweep spec's C5 section: (a) the input is the `VoronoiDiagram` that C5 names as its output value; (b) whether a partial diagram can be drawn while the sweep runs, or what Fortune must complete first and what the sweep graph draws itself; (c) no import from Delaunay or triangulation code; (d) the options Fortune needs exist or are listed as changes. The verdict is recorded in the README row.

## Open points for the handler

- Whether a partially built diagram (edges with an unfinished endpoint) is a valid `VoronoiDiagram` is not defined by the spec or by 05. The reuse review must settle it; do not widen the value type in this task without the handler.

Not in scope: the Delaunay duality overlay, bisector construction, query point, readouts, route, registration, lessons, Fortune itself.

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.
