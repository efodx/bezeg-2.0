# Interpolation and approximation control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Give the fitted or interpolated object and the input data visibly different roles. Exact entry should still identify the point or tangent being edited, especially where two curves share data.

**Implementation order.** Pilot the comparison on Lagrange and Bézier, then address fitting, subdivision and node choice.

<a id="interp-lagrange"></a>

## Through the points or near them

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/interpolation/lagrange) · [InterpolationGraph](../../../src/graphs/curves/interpolation/InterpolationGraph.tsx)

- **First task.** Drag one interpolation point with both comparison curves identifiable on the graph.
- **Other controls.** Group the parameter convention, point count, exact coordinates and basis displays.
- **Acceptance.** The Lagrange curve still passes through the moved point. The Bézier comparison responds using the same control points.

<a id="interp-hermite"></a>

## Hermite and Catmull-Rom curves

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/interpolation/hermite) · [HermiteGraph](../../../src/graphs/curves/hermite/HermiteGraph.tsx)

- **First task.** Pick Hermite and move one tangent handle at a fixed interpolation point.
- **Other controls.** Group exact tangent and point coordinates together. Put Catmull–Rom alongside Hermite for the next comparison.
- **Acceptance.** The curve keeps the interpolation point while its tangent changes. Switching curve type exposes the appropriate handles.

<a id="interp-runge"></a>

## Runge's phenomenon and Chebyshev nodes

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/interpolation/runge) · [RungeInterpolationGraph](../../../src/graphs/functions/RungeInterpolationGraph.tsx)

- **First task.** Raise the degree on equispaced nodes, then choose Chebyshev nodes at the same degree.
- **Other controls.** Group formula and node details below the degree and node-choice controls.
- **Acceptance.** On the Runge example the two same-degree plots let the visitor compare the error near the endpoints.

<a id="interp-least-squares"></a>

## Least squares

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/interpolation/least-squares) · [LeastSquaresGraph](../../../src/graphs/functions/LeastSquaresGraph.tsx)

- **First task.** Drag one data point away from its neighbours and watch the fitted line and residuals.
- **Other controls.** Group exact data entry and fit settings below the graph. Keep the squared-error result beside the experiment.
- **Acceptance.** The fitted line and sum of squared residuals respond to the same point edit.

<a id="interp-subdivision"></a>

## Subdivision curves

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/interpolation/subdivision) · [SubdivisionCurveGraph](../../../src/graphs/curves/subdivisionCurves/SubdivisionCurveGraph.tsx)

- **First task.** Show one refinement step, then offer the two subdivision rules for comparison.
- **Other controls.** Group initial point editing and exact coordinates below the rule and step controls.
- **Acceptance.** From the same starting polygon, the four-point rule retains old points and the Chaikin refinement cuts corners.
