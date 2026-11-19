# Rational Bézier curves control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Keep the identity of the selected curve and point visible during a weight edit. Preserve the graph's existing treatment of zero or otherwise unsupported weights and expose refusal reasons where an operation is attempted.

**Implementation order.** Rational curve first, then constructions, weight operations and the circle.

<a id="rational"></a>

## Rational Bézier curve

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/rational/base) · [RationalBezierCurveGraph](../../../src/graphs/curves/rational/RationalBezierCurveGraph.tsx)

- **First task.** Lead the visitor from a control point to its weight. Keep the active point and weight identifiable while editing.
- **Other controls.** Group exact coordinates, full weight editing and curve operations by task.
- **Acceptance.** Increasing one positive weight pulls the curve toward the corresponding point while the control points stay put.

<a id="rational-decasteljau"></a>

## Rational De Casteljau

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/rational/rational-decasteljau) · [RationalDecasteljauGraph](../../../src/graphs/curves/rational/RationalDecasteljauGraph.tsx)

- **First task.** Scrub the construction parameter first and follow the final weighted interpolation point.
- **Other controls.** Keep weights and their selected curve in one secondary group, with coordinate entry beside it.
- **Acceptance.** Changing the parameter moves the constructed point along the rational curve. Editing a weight updates the construction at the same parameter.

<a id="rational-elevation"></a>

## Degree elevation

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/rational/rational-elevation) · [RationalElevationGraph](../../../src/graphs/curves/rational/RationalElevationGraph.tsx)

- **First task.** Lead with one elevation of the weighted curve. Keep the before and after polygons available for comparison.
- **Other controls.** Group individual weights and typed point entry after the operation.
- **Acceptance.** One elevation adds a control point while preserving the rational curve, including between its endpoints.

<a id="rational-extrapolation"></a>

## Extrapolation

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/rational/rational-extrapolation) · [RationalExtrapolationGraph](../../../src/graphs/curves/rational/RationalExtrapolationGraph.tsx)

- **First task.** Place the extension parameter before the weight editor. Show the original endpoint and the extension together.
- **Other controls.** Group weight inspection, precise coordinates and curve selection. Keep any refusal next to the attempted operation.
- **Acceptance.** A valid extension changes the represented interval as indicated. Any existing domain restriction remains visible and actionable.

<a id="rational-subdivision"></a>

## Subdivision

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/rational/rational-subdivision) · [RationalSubdivisionGraph2](../../../src/graphs/curves/rational/RationalSubdivisionGraph2.tsx)

- **First task.** Put the split parameter and Subdivide together. Start with the selected split position visible.
- **Other controls.** Group the two resulting sets of weights and coordinates under their respective pieces.
- **Acceptance.** An interior split yields two weighted pieces sharing the split point and reproducing the original trace.

<a id="farin"></a>

## Farin points

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/rational/farin-points) · [FarinPointsCurveGraph](../../../src/graphs/curves/rational/FarinPointsCurveGraph.tsx)

- **First task.** Turn on the Farin points and compare their positions with the neighbouring weights. Use an allowed weight edit to move a division point.
- **Other controls.** Keep the weight labels and polygon display available together. Defer full coordinate editing.
- **Acceptance.** Changing the ratio of adjacent positive weights changes the division point on their common edge and the rational curve.

<a id="circle"></a>

## Circle from n pieces

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/rational/circlen) · [RationalBezierCurveCircleGraphN](../../../src/graphs/curves/rational/RationalBezierCurveCircleGraphN.tsx)

- **First task.** Lead with the number of arcs. Change it once with the supporting polygons visible.
- **Other controls.** Group per-arc selection, polygon overlays and weights after the count.
- **Acceptance.** The number of arc pieces changes while their union still traces the same circle.
