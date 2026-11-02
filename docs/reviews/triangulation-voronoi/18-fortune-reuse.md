# 18 — Voronoi drawing: reuse review for Fortune (T3 gate)

Reviewer note for task [18](../../tasks/triangulation-voronoi/18-voronoi-drawing.md), written against `src/graphs/compgeo/voronoiDrawing.ts` and the sweep spec's C5 section ([sweep-algorithms-lessons.md](../../specs/sweep-algorithms-lessons.md), "C5. Fortune's algorithm"). Performance numbers: `18-perf-raw.txt` (jsdom SVG board, script cost only; no browser was available, so frame times are not measured).

## Verdict

The drawing is reusable by Fortune for the finished diagram as is. For the running sweep, recommendation: **Fortune supplies its own partial drawing** (beach line, sweep line, traced half-edges, circle events) and hands the module only the diagram that is complete at the sweep's end, plus, if wanted, the part that is already final during the sweep as a separate complete `VoronoiDiagram` (see (b)). The handler settles this.

## (a) Input is the value C5 names

C5 declares its output value to be "a `VoronoiDiagram` of the triangulation spec (exact rational vertices; segment, ray and line edges; cells by site)". `createVoronoiDrawing(...).update(diagram, points, box, options)` takes exactly that type (`src/compgeo/voronoi.ts`), the site grid points and an exact `RationalBox`. Nothing else about the producer is read: a hand-built three-site value draws identical objects to the Delaunay-built one (test "draws exactly like the Delaunay-built value"). Fortune's equality check against the Delaunay dual (C5 acceptance 2) therefore also means equal drawings.

Fields the drawing relies on, which Fortune must fill the same way the Delaunay builder does:
- `vertices[i].point` exact; `vertices[i].sites.length` is the degree (3, or 4 or more for the degree-four marker).
- `edges[e].kind` and, per kind: `segment.from/to` valid vertex indices; `ray.vertex` and an integer `direction` pointing away from the remaining sites (a reversed direction is caught by the ray test); `line.point` and `direction`.
- `cells[s].edges` listing the edges of the cell with `edges[e].sites` containing `s` (this is what `clipCell` reads, in any order the kernel accepts) and `cells[s].site === s`.

## (b) Partial diagram while the sweep runs

What the running sweep needs to draw, per the C5 steps: the sweep line, the beach line (parabola arcs, drawn approximately and labelled so), breakpoints, half-edges being traced by breakpoints, scheduled and cancelled circle events with their circles, and the Voronoi vertices found so far.

Does the drawing accept a partial value? Not safely. What it assumes that a mid-sweep state breaks:
1. **Edges with one unfinished end.** `segment` needs two vertex indices and `ray` one vertex plus a final direction; a traced half-edge has one known vertex and a growing other end (a breakpoint that moves). There is no value for it.
2. **Cells.** `clipCell` intersects half-planes from the edge list of a cell. During the sweep a cell's edge list is incomplete, and the clipped polygon would be too large: it would fill space that later sites will take. A partially built cell drawn this way is wrong, not merely unfinished.
3. **Hull/open state is unknown** until the end (whether a ray exists depends on later sites).
4. The meaning of "open side" (the "continues" marker) is "the cell continues beyond the box", not "not finished yet". Reusing it for unfinished cells would teach the wrong thing.

Widening `VoronoiDiagram` (for example an `unfinished` edge kind) would put sweep-only states into the shared kernel value, break the "same value type, compared by equality" property that C5 relies on, and make `clipCell` and `nearestSites` answer partial-state questions they were not specified for. Recommendation: do not widen it.

Consequently:
- During the sweep Fortune draws, in its own graph, the objects listed above. It may reuse from this module the pure helpers `clipToBox` and `edgeInBox` (exact clipping of a ray, segment or line to the box) and `frame` if useful; they take no diagram internals beyond what they are given.
- **Finished parts may use the module** if Fortune assembles a complete `VoronoiDiagram` for the sites whose cells are provably final (a site whose cell is closed by completed circle events and lies fully above the sweep line cannot change). That is an optional refinement and needs its own invariant: every edge of every listed cell is finished and every listed cell has all its neighbours' edges. The sub-diagram is still a full `VoronoiDiagram` over the full site list: `cells` is indexed by site (`cells[s].site === s`) and every edge's `sites` index into the full point list; cells that are not final are present in `cells` but are not drawn; and every edge references vertices that exist in `vertices`. Without the invariant, draw nothing from the module before the end.
- At the end of the sweep (`done` event) Fortune passes its final value, and the module draws it exactly like the Delaunay-dual drawing, which is what C5 step 7 and acceptance 2 want ("the finished diagram equals the dual").

If the handler prefers "the drawing accepts a partial value", the exact invariants the drawing already relies on are: all `edges[e].from/to/vertex` indices valid; every ray direction final; every cell's edge list complete (otherwise `clipCell` over-fills). A partial value that meets them is just a complete diagram of fewer constraints, which is not what the sweep holds mid-run, so the invariants are not met by an ordinary mid-sweep state. This is the reason for the recommendation above.

## (c) No import from Delaunay or triangulation code

`voronoiDrawing.ts` imports `../../compgeo/voronoi` (types and `clipCell`), `../../compgeo/rational`, `../../compgeo/grid` (type) and `../styles/GraphPalette`. `voronoi.ts` itself imports `./delaunay` and `./triangulation`, but only for `voronoiFromDelaunay`; the drawing calls only `clipCell`, which reads the value and the sites. No import from `src/compgeo/delaunay*`, `triangulation*` or any graph under `src/graphs/compgeo/*Graph*` exists in the drawing module (checked by search). The module never recomputes the diagram.

One consequence for reuse: importing `clipCell` from `voronoi.ts` loads the Delaunay builder in the bundle. This is a bundle matter, not a dependency of the logic. If the sweep family wants a Delaunay-free chunk, `clipCell` and the types could move to their own file; not done here, to stay in scope.

## (d) Options Fortune needs

Provided: separate toggles `cells`, `edges`, `vertices`, and `highlightCell` (a site index), a view box in exact rationals, `frame(diagram, points)` for the initial box, and a handle with `update` and `dispose` that reuses objects across redraws (Fortune redraws on every step).

Listed as changes, not done here (they are Fortune-side or optional):
1. Per-element emphasis beyond one highlighted cell (for example colouring the two cells whose breakpoint is being traced): add an option `highlightCells: readonly number[]` if needed.
2. Drawing only a subset of cells or edges (for the "final part" refinement in (b)): either the caller passes a sub-diagram that satisfies the invariant, or an option `onlyCells`. Prefer the sub-diagram.
3. The module offers no hook for extra layers above the edges; Fortune adds its own board objects, owned by its own graph, with their own disposal.
4. Sweep-time labelling of vertices (event names) belongs to the Fortune graph.

## Performance relevant to Fortune

Redraw of a final 12-site diagram (the sweep family's site limit): median about 2 ms, p95 about 3 ms of script time in the jsdom SVG board (`18-perf-raw.txt`), which is the per-step cost if Fortune redraws a finished diagram on every step. No browser paint or compositing was measured.
