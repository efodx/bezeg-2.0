# Computational geometry control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

For steppable algorithms keep the next action, current decision and affected geometry together. Retain the point editor, exact setup and tie/degeneracy rules in named groups. Some routes use free manipulation or an edge flip instead of playback.

**Implementation order.** Use Convex hull and Delaunay as references, then cover point queries, triangulations and sweeps.

<a id="orientation"></a>

## Orientation of three points

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/orientation) · [OrientationGraph](../../../src/graphs/compgeo/OrientationGraph.tsx)

- **First task.** Drag the third point through the directed line between the first two. Put the turn and determinant sign together.
- **Other controls.** Group exact coordinates and grid controls below the drag cue.
- **Acceptance.** Moving from left through collinear to right produces positive, zero and negative determinant signs for the stated point order.

<a id="polygon-area"></a>

## Polygon area

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/polygon-area) · [PolygonAreaGraph](../../../src/graphs/compgeo/PolygonAreaGraph.tsx)

- **First task.** Move one polygon vertex and compare the shape with its signed area.
- **Other controls.** Group the ordered vertex list and shoelace products under calculation details. Keep point order explicit.
- **Acceptance.** For a simple polygon, reversing the vertex order changes the sign and preserves the absolute area.

<a id="convex-hull"></a>

## Convex hull

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/convex-hull) · [HullTraceGraph](../../../src/graphs/compgeo/HullTraceGraph.tsx)

- **First task.** Keep Next step immediately after algorithm choice and draw attention to the edge or turn being tested.
- **Other controls.** Fold the long exact point editor. Keep the active algorithm, accepted edges and step status easy to see.
- **Acceptance.** One step updates the construction or decision on the plot. Finishing the default run leaves the boundary of the input set.

<a id="point-in-polygon"></a>

## Point in polygon

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/point-in-polygon) · [PointInPolygonGraph](../../../src/graphs/compgeo/PointInPolygonGraph.tsx)

- **First task.** Drag the query point across one polygon edge and watch ray crossings and classification.
- **Other controls.** Group polygon vertex editing and individual edge tests below the query. Keep boundary status distinct.
- **Acceptance.** Crossing a non-vertex edge changes inside/outside classification. Placing the query on an edge gives the graph's boundary result.

<a id="hull-robustness"></a>

## Degenerate cases and robustness

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/hull-robustness) · [HullRobustnessGraph](../../../src/graphs/compgeo/HullRobustnessGraph.tsx)

- **First task.** Show the collinear example and put the two pop rules beside Next step.
- **Other controls.** Group exact or near-degenerate point setup below the rule comparison. Keep the current turn decision visible.
- **Acceptance.** On the same collinear edge example the two policies handle boundary points differently while enclosing the same input.

<a id="bezier-hulls"></a>

## Hulls of Bézier curves

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/bezier-hulls) · [BezierHullsGraph](../../../src/graphs/compgeo/BezierHullsGraph.tsx)

- **First task.** Advance one subdivision level and follow which pairs of control hulls still overlap.
- **Other controls.** Group curve coordinates and hull display options below the step. Name overlapping pairs as candidates.
- **Acceptance.** Separated hulls eliminate a pair. Remaining overlap indicates a candidate and does not assert that the curves intersect.

<a id="ear-clipping"></a>

## Ear-clipping triangulation

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/ear-clipping) · [EarClippingGraph](../../../src/graphs/compgeo/EarClippingGraph.tsx)

- **First task.** Press Next step and follow the candidate ear and the diagonal it would introduce.
- **Other controls.** Group the vertex editor and detailed ear tests after the step; keep any reason for rejecting a candidate visible.
- **Acceptance.** For a valid simple polygon an accepted clip removes an ear and leaves the remaining polygon ready for the next step.

<a id="point-set-triangulation"></a>

## Triangulating a point set

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/point-set-triangulation) · [TriangulationGraph](../../../src/graphs/compgeo/TriangulationGraph.tsx)

- **First task.** Select a flippable interior edge and follow the two adjacent triangles when the diagonal flips.
- **Other controls.** Group exact site data and triangulation statistics below the edge action. Keep refusal reasons at nonflippable edges.
- **Acceptance.** A legal flip swaps diagonals in the same quadrilateral, keeps every site, and preserves the number of triangles.

<a id="delaunay"></a>

## Delaunay triangulation

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/delaunay) · [DelaunayGraph](../../../src/graphs/compgeo/DelaunayGraph.tsx)

- **First task.** Keep Next step and the tested edge together. Show the fourth point relative to the circumcircle.
- **Other controls.** Group the full Lawson-algorithm explanation, exact sites and edge editing below the current decision.
- **Acceptance.** On the prepared illegal-edge example a flip replaces the diagonal. The resulting step and plot agree.

<a id="voronoi"></a>

## Voronoi diagram

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/voronoi) · [VoronoiGraph](../../../src/graphs/compgeo/VoronoiGraph.tsx)

- **First task.** Select one site and reveal its bisectors one at a time. Keep the chosen site and current cell identifiable.
- **Other controls.** Group site management and global overlays below the cell construction.
- **Acceptance.** As each half-plane is included, its intersection with the previous region gives the next cell region. At completion the selected cell satisfies every competing site's constraint.

<a id="voronoi-degenerate"></a>

## Degenerate sites

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/voronoi-degenerate) · [DegenerateSitesGraph](../../../src/graphs/compgeo/DegenerateSitesGraph.tsx)

- **First task.** Lead with the four-cocircular-sites example, then move one site slightly to inspect the change.
- **Other controls.** Group precise site positions and triangulation overlays below the example. Keep the degenerate case labelled.
- **Acceptance.** Four cocircular sites in convex position share one Voronoi vertex. A small generic perturbation resolves it into ordinary vertices.

<a id="interval-sweep"></a>

## Interval sweep

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/interval-sweep) · [IntervalSweepGraph](../../../src/graphs/compgeo/IntervalSweepGraph.tsx)

- **First task.** Lead with Next step, the current endpoint event and the set of active intervals.
- **Other controls.** Group exact interval endpoints and the complete event list below the sweep. Preserve the endpoint tie convention.
- **Acceptance.** Stepping across an endpoint updates the active set according to the displayed convention, including tied endpoints.

<a id="segment-intersections"></a>

## Segment intersections

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/segment-intersections) · [BentleyOttmannGraph](../../../src/graphs/compgeo/BentleyOttmannGraph.tsx)

- **First task.** Advance one event and highlight the active segments whose relative order or membership changes.
- **Other controls.** Group the full event queue, status listing and exact segment endpoints behind named details.
- **Acceptance.** On a crossing example the intersection is reported at the appropriate event and agrees with the marked coordinates.

<a id="monotone-partition"></a>

## Monotone partition

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/monotone-partition) · [MonotonePartitionGraph](../../../src/graphs/compgeo/MonotonePartitionGraph.tsx)

- **First task.** Step through the prepared polygon and draw attention to the current vertex type and the next inserted diagonal.
- **Other controls.** Group full classifications, helper/status details and vertex coordinates below the current decision.
- **Acceptance.** At a step requiring a diagonal the endpoints agree with the construction. Completing the run yields monotone pieces.

<a id="monotone-triangulation"></a>

## Monotone triangulation

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/monotone-triangulation) · [MonotoneTriangulationGraph](../../../src/graphs/compgeo/MonotoneTriangulationGraph.tsx)

- **First task.** Place Next step beside the current vertex and the top of the stack. Highlight the most recent diagonal.
- **Other controls.** Group the full stack trace and exact vertex inputs below the active action.
- **Acceptance.** Stepping the default monotone polygon reveals push/pop decisions and finishes with a triangulation of that polygon.

<a id="fortune"></a>

## Fortune's algorithm

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/compgeo/fortune) · [FortuneGraph](../../../src/graphs/compgeo/FortuneGraph.tsx)

- **First task.** Step through the prepared example until a circle event is cancelled. Keep the sweep line, event and affected arc identifiable.
- **Other controls.** Group full event/status history and exact site data below the sweep. Keep valid and cancelled events visually distinct.
- **Acceptance.** At a cancelled circle event the indicated arc stays on the beach line. The status explains the cancellation.
