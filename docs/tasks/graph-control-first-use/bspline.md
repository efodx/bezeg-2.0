# B-splines control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Keep experimental controls separate from structural edits to the knot vector. Preserve ordering, multiplicity and span rules, refusals and exact knot entry on every route that exposes them.

**Implementation order.** Start with audited de Boor. Check insertion and extraction together before moving the vector editor.

<a id="bspline-basis"></a>

## B-spline basis functions

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bspline/basis) · [BSplineBasisGraph](../../../src/graphs/curves/bspline/BSplineBasisGraph.tsx)

- **First task.** Move the parameter across a knot and highlight the basis functions active there.
- **Other controls.** Group degree, knot multiplicities and typed knot values. Keep the active span beside the slider.
- **Acceptance.** Crossing a knot updates the active functions according to the chosen span. The right endpoint remains usable.

<a id="bspline-deboor"></a>

## de Boor's algorithm

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/bspline/deboor) · [DeBoorGraph](../../../src/graphs/curves/bspline/DeBoorGraph.tsx)

- **First task.** Lead with Next level, the current level and the parameter. Let the visitor finish one construction.
- **Other controls.** Put degree, control-point count, knot vector and exact coordinates into named setup groups.
- **Acceptance.** Advancing to the last level yields one point on the curve. Changing the parameter updates the construction.

<a id="bspline-insertion"></a>

## Knot insertion and multiplicity

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bspline/insertion) · [BSplineInsertionGraph](../../../src/graphs/curves/bspline/BSplineInsertionGraph.tsx)

- **First task.** Choose a valid interior knot and place Insert beside its value. Show the control polygon before and after.
- **Other controls.** Group degree, multiplicities and the full editable knot vector below the insertion task.
- **Acceptance.** A valid insertion adds a knot and control point while preserving the curve. A disallowed multiplicity has a reason.

<a id="bspline-extraction"></a>

## Bézier extraction

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bspline/extraction) · [BSplineExtractionGraph](../../../src/graphs/curves/bspline/BSplineExtractionGraph.tsx)

- **First task.** Lead with the extracted Bézier pieces and a control-point drag. Identify the affected spans.
- **Other controls.** Group knot and coordinate details separately from the piece display.
- **Acceptance.** After a local edit the affected Bézier pieces still meet at their shared boundaries and reproduce the displayed spline.

<a id="bspline-nurbs"></a>

## NURBS and the circle

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bspline/nurbs) · [BSplineNurbsGraph](../../../src/graphs/curves/bspline/BSplineNurbsGraph.tsx)

- **First task.** Compare the existing unit-weight and rational-circle examples using their weight settings.
- **Other controls.** Group the full weights and knot vector below the two-example comparison. Keep radial error near the result.
- **Acceptance.** The rational circle example agrees with its intended radius to numerical precision. Switching examples updates both weights and plot.

<a id="bspline-blossom"></a>

## Blossoming (polar form)

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bspline/blossom) · [BSplineBlossomGraph](../../../src/graphs/curves/bspline/BSplineBlossomGraph.tsx)

- **First task.** Put the two blossom arguments together. Start with a diagonal pair, then swap an unequal pair.
- **Other controls.** Group knots, degree-related details and exact point data under construction setup.
- **Acceptance.** On the quadratic example equal arguments land on the curve and swapping the two arguments gives the same blossom point.
