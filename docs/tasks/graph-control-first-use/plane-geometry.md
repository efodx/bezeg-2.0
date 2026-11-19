# Plane geometry control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Start with a defining point or a named construction. Preserve the graph's handling of coincident points, exceptional triangles and unsolvable inputs. Group derived measurements separately from editable givens.

**Implementation order.** Use audited Triangle centres to try the approach, then cover the remaining constructions.

<a id="triangle-centres"></a>

## Notable points of a triangle

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/triangle-centres) · [NotablePointsGraph](../../../src/graphs/compgeo/NotablePointsGraph.tsx)

- **First task.** Drag one triangle vertex and follow its circumcentre. Keep the active centre named and the triangle visible.
- **Other controls.** Group other centres and their construction lines together. Put radii, coordinates and exact vertex entry under details.
- **Acceptance.** Changing an acute triangle into an obtuse one moves the circumcentre from inside to outside. Coordinates remain reachable by keyboard.

<a id="inscribed-angle"></a>

## Inscribed angle and Thales' theorem

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/inscribed-angle) · [InscribedAngleGraph](../../../src/graphs/compgeo/InscribedAngleGraph.tsx)

- **First task.** Move the point on a single arc subtending a fixed chord. Predict the angle before revealing the comparison.
- **Other controls.** Group radii, central-angle construction and exact point settings below the movable point.
- **Acceptance.** On the same arc the inscribed angle stays constant. The diameter example gives a right angle.

<a id="euler-line"></a>

## Euler line and nine-point circle

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/euler-line) · [EulerLineGraph](../../../src/graphs/compgeo/EulerLineGraph.tsx)

- **First task.** Move a vertex in a non-equilateral triangle and follow circumcentre, centroid and orthocentre.
- **Other controls.** Group the nine-point circle, auxiliary constructions and exact coordinates below the three centres.
- **Acceptance.** The three centres remain collinear in the ordinary example. An equilateral case handles coincident centres.

<a id="simson-line"></a>

## Simson line

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/simson-line) · [SimsonLineGraph](../../../src/graphs/compgeo/SimsonLineGraph.tsx)

- **First task.** Drag the point round the circumcircle and look at its three perpendicular feet. Offer the line reveal beside that task.
- **Other controls.** Group auxiliary perpendiculars and exact triangle setup separately.
- **Acceptance.** For a regular position on the circumcircle the three feet align with the revealed Simson line.

<a id="inversion"></a>

## Inversion

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/inversion) · [InversionGraph](../../../src/graphs/compgeo/InversionGraph.tsx)

- **First task.** Drag X toward the inversion centre and follow the image point on the same ray.
- **Other controls.** Group radius, exact coordinates and alternate examples after the distance comparison.
- **Acceptance.** For a positive inversion radius the product of the two distances from the centre stays constant. At the centre the singular case is explained.

<a id="triangle-solver"></a>

## Solving triangles

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/triangle-solver) · [TriangleSolverGraph](../../../src/graphs/trig/TriangleSolverGraph.tsx)

- **First task.** In the opening sides mode, move a vertex and compare its sides. In Solve mode, expose the independent givens of the chosen data type.
- **Other controls.** Group alternate data modes separately. Put worked trigonometry under the solution and retain the ambiguous-case selector where needed.
- **Acceptance.** A valid set draws a matching triangle. In a two-solution case the visitor can inspect both, and impossible data has a reason.

<a id="line-geometry"></a>

## Lines in the plane

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/line-geometry) · [LineGeometryGraph](../../../src/graphs/lines/LineGeometryGraph.tsx)

- **First task.** Drag a defining point until the line is vertical and follow its equation.
- **Other controls.** Group the equivalent forms and exact point entry together. Keep pair-of-lines measurements with their own example.
- **Acceptance.** The line remains well defined in an appropriate form when its slope is undefined. Intersection and parallel states remain distinguishable.

<a id="circle-construction"></a>

## Circle constructions

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/circle-constructions) · [CircleConstructionGraph](../../../src/graphs/compgeo/CircleConstructionGraph.tsx)

- **First task.** Start on tangents and move the external point relative to the circle. Keep the number of tangents beside the plot.
- **Other controls.** Group the other constructions by name. Show only the point, centre and radius inputs belonging to the chosen construction.
- **Acceptance.** An exterior point has two tangents, a point on the circle has one, and an interior point has none.
