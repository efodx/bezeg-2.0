# 18 — Point-in-polygon graph (Batch 2, F2a)

Status: planned 2026-11-03 (geometry handler 48). Source: spec [A3](../../specs/convexity-hulls-lessons.md#a3-point-in-polygon) (graph, steps), [shared core](../../specs/convexity-hulls-lessons.md#shared-computational-geometry-core) (polygon mode). Kind: F2a (engineering + UI/accessibility review). Depends on 16 and 09 (template: `PolygonAreaGraph`).

`PointInPolygonGraph` under `src/graphs/compgeo/` is a `PointSetGraph` subclass in closed polygon mode that uses the overlay hook. Do not change the base interface. If a minimal base change is unavoidable, document it in the module comment of `PointSetGraph.tsx` and report it.

1. The default polygon is the notched pentagon, with query point \(q=(3,1)\). The query point is a separate draggable grid point, not a polygon vertex. It snaps to the grid, moves by arrow keys with the vertices' step, and has its own accessible name. Adding or removing vertices does not move it. A scene option selects task 16's pentagram as the polygon.
2. Overlays:
   - `ray`: the ray from \(q\) to the board edge. Counted crossings are marked and numbered. Vertex touches that do not count get a different marker shape, so colour is never the only signal.
   - `winding`: each counted edge is labelled \(+1\) or \(-1\).

   Non-simple polygons carry the polygon-area graph's "self-intersecting" label.
3. A readout outside the board (`role="status"`, one concise line per item) shows the location in words (inside, outside or on the boundary), the crossing count, the even–odd and nonzero verdicts, and the winding number. On the boundary it says so and shows no count. Put the value-to-readout mapping in a pure, unit-tested adapter. A lesson must be able to hide the verdicts (for step 2, "predict") through a scene option, not by unmounting the readout.
4. Locale keys go in one block after the polygon-area graph's block, at the same position in `sl.ts` and `en.ts`. Take terms from the spec table (*točka v večkotniku*, *sodo-liho pravilo*, *ovojno število*), and choose any other new terms by [choosing new terms](../../localization.md#choosing-new-terms).
5. Tests, as host tests in the style of 09 plus adapter unit tests:
   - the three pentagon queries and the pentagram centre and tip show task 16's values;
   - a query dragged onto an edge shows "on the boundary";
   - a query on the horizontal through the notch vertex \((3,2)\) shows task 16's verdict;
   - overlay objects are removed when hidden and on unmount (exact object counts);
   - the readout is correct after a language switch and after a scene change;
   - observed failures under two mutations.

Checks: `just unit src/graphs/compgeo src/compgeo --maxWorkers=2`, `just lint src/graphs/compgeo src/compgeo`, tsc, production build (locale change). No browser smoke until 20.
