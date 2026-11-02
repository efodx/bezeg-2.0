# 19 — Voronoi graph with the Delaunay duality overlay (T3, B4, F2a)

Status: planned 2026-11-02 (geometry handler 34). Source: spec [B4](../../specs/triangulation-voronoi-lessons.md#b4-voronoi-diagrams-and-duality) (example, steps 3–7, capabilities, acceptance 1–5 and 7), common criteria C1–C6 ([concept contracts](../../specs/triangulation-voronoi-lessons.md#concept-contracts-and-acceptance-criteria)), [implementation decisions](../../specs/triangulation-voronoi-lessons.md#implementation-decisions) (Preset contents and validation), [correctness notes](../../specs/triangulation-voronoi-lessons.md#correctness-notes). Kind: F2a (no route, no registration), engineering, mathematical (readouts, overlay, query point) and UI/accessibility review. Depends on 18 (drawing), 05 (`voronoiFromDelaunay`, `clipCell`, `nearestSites`, `dualEdges`), 13 (`DelaunayGraph`: circle drawing, triangle selection) and the point-set graph. Template: 12 and 13 for structure, edit rule and tests.

`VoronoiGraph extends PointSetGraph` in `src/graphs/compgeo/` (decided), points mode only. Its scene is the points plus the overlay switches, a selected site, a construction count and a query point; the diagram is derived (`voronoiFromDelaunay`) and never stored.

## Acceptance

1. **Shared drawing extraction (first, before any new graph code):** the circumcircle and triangle-selection drawing of `DelaunayGraph` (13) moves into a shared module in `src/graphs/compgeo/` used by both `DelaunayGraph` and `VoronoiGraph`, with no copy. The existing `DelaunayGraph` host and lesson-action tests pass unchanged; any edit to them is a finding. Observe a deliberate mutation of the shared module fail tests of both graphs.
2. **Board:** the diagram through 18, the sites and, with the `delaunay` overlay on, the Delaunay triangulation (interior and hull edges distinguishable without colour) and, for a selected triangle (board click or keyboard list), its circumcircle with the circumcentre marked as the matching Voronoi vertex. The overlay is a switch, off by default (B4 acceptance 5).
3. **Cell construction (B4 step 3):** for a selected site, a Show control reveals the cell by its bisectors (half-planes intersected) in the decided order (other sites by increasing distance from the chosen site, ties by site index) until the cell is the intersection. The state is a count in the scene, so Next, Back and Reset are deterministic (C3).
4. **Query point (B4 step 7):** a draggable point with a numeric alternative and keyboard moves (C5). The panel names its nearest site from `nearestSites` (ties named as ties) and the cell containing it is highlighted. The query point is not a site and is outside the site limit.
5. **Readouts:** \(n\), vertex count, finite edges, rays, bounded and unbounded cells; the selected vertex with exact rational coordinates and the sites it is equidistant from; a live region announces overlay and selection changes. For the B4 example: 7 vertices equal to the spec's exact list, 8 finite edges, 5 rays, 5 unbounded cells and the bounded cells of \(p_5,p_6\).
6. **Edits:** adding, moving or removing a site recomputes the diagram and clears selection and construction count (C1). Duplicates, fewer than two sites and collinear sets follow 05 (refusal message; collinear sets draw lines, see 20). Point limit and snapping come from the point-set graph (C6).
7. **Reset view** restores the box of 18's `frame` (B4 capabilities). Reset restores the example and clears selection (C2).
8. **Presets:** collection `compgeo-voronoi` with the B2/B4 seven points. Stored data: points in grid units and overlay switches; import validates counts, integer range and mode with an actionable localized error.
9. **Localization:** one key block after the Delaunay keys at the same position in `sl.ts` and `en.ts`; terms from the spec's table (*Voronojev diagram*, *celica*, *Voronojevo oglišče*, *mesto*, *dualnost*).
10. **Tests** (host):
   - The B4 example shows the 7 spec vertices as exact text, 8 finite edges and 5 rays (spec acceptance 1 and 2).
   - The overlay is off after load and toggles on and off.
   - Selecting the triangle \((0,1,5)\) shows the vertex \((4,-1)\), and every other triangle shows its vertex from the spec's list.
   - The query point at a rational position inside the \(p_5\) cell names \(p_5\); on a seeded set of random positions the brute-force nearest site equals the highlighted cell (spec acceptance 3).
   - A site drag changes diagram and overlay together in one write (B4 step 6); an edit clears selection and construction.
   - The construction ends at the polygon `clipCell` returns (exact).
   - Keyboard only: select a site, select a triangle, move the query point, toggle the overlay.
   - Preset round trip and each import refusal; live language switch; disposal leaves no objects, listeners or timers.
   - Observe each new assertion fail against a deliberate mutation (for example a circumcentre of the wrong triangle, a nearest site that ignores ties, an overlay left on after Reset).

## Open points for the handler

- Display of ties for the query point (on a bisector) is not in the spec; proposed: the panel lists every tied site.

Not in scope: route, registration, lessons, the four-point and collinear modes (20), the sweep construction.

Performance: at most 40 sites; use the drag measurement of 18 to select the redraw approach.

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just unit src/localization`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.
