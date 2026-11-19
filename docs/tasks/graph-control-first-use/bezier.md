# Bézier curves control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Start with the De Casteljau pilot. Several routes inherit point editing from the same curve workspace. Make construction-first order opt-in and test one sibling that keeps selection first. The clipping route owns an algorithm workspace of its own.

**Implementation order.** De Casteljau first, then the alternative construction and subdivision routes, then the remaining curve operations.

<a id="bezier"></a>

## Bézier curve

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/curve) · [BezierCurveGraph](../../../src/graphs/curves/bezier/BezierCurveGraph.tsx)

- **First task.** Point out one orange handle and invite a drag. Put access to exact point entry beside the cue.
- **Other controls.** Group curve selection with operations that need a target, including degree and point management.
- **Acceptance.** Dragging a point reshapes the curve without a selection step. Editing the same point by keyboard gives the same shape.

<a id="decasteljau"></a>

## De Casteljau

**Pilot.** [Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/decasteljau) · [DecasteljauGraph](../../../src/graphs/curves/bezier/DecasteljauGraph.tsx)

- **First task.** Lead with Play and the position slider so the first move constructs a point.
- **Other controls.** Group speed and exact point coordinates separately. Opt into the ordering on this route.
- **Acceptance.** From the initial curve, Play advances the construction without selecting it. Scrubbing lands on the corresponding point.

<a id="decasteljau-alternative"></a>

## De Casteljau alternative

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/decasteljau2) · [DecasteljauGraph2](../../../src/graphs/curves/bezier/DecasteljauGraph2.tsx)

- **First task.** Put the interpolation parameter first. Slide from one end toward the middle and follow the point between the component curves.
- **Other controls.** Group curve selection and exact point setup after the construction.
- **Acceptance.** At two parameter values the component-curve points and their interpolated point agree with the displayed construction.

<a id="affine"></a>

## Affine transformations

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/affine) · [AffineTransformsBezierCurveGraph](../../../src/graphs/curves/bezier/AffineTransformsBezierCurveGraph.tsx)

- **First task.** Offer one existing rotation with its angle and direction visible. Let the visitor rotate the whole figure once.
- **Other controls.** Keep the other rotations and axis reflections in a transformation group. Put point editing after them.
- **Acceptance.** The control polygon and curve rotate together. Applying the inverse rotation restores the original positions.

<a id="subdivision"></a>

## Subdivision

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/subdivision-2) · [SubdivisionGraph1](../../../src/graphs/curves/bezier/SubdivisionGraph1.tsx)

- **First task.** Place the split parameter beside Subdivide. Mark where the proposed split will occur.
- **Other controls.** Put exact control-point coordinates and subsequent curve selection below the split task.
- **Acceptance.** At an interior parameter the two pieces meet at the chosen point and together reproduce the original curve.

<a id="repeated-subdivision"></a>

## Repeated subdivision

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/subdivision) · [SubdivisionGraph](../../../src/graphs/curves/bezier/SubdivisionGraph.tsx)

- **First task.** Lead with one midpoint subdivision and invite a second press. Keep the control polygons easy to see.
- **Other controls.** Group curve selection and individual polygon coordinates after the repeat action.
- **Acceptance.** Two successive presses create progressively smaller pieces whose polygons follow the same curve.

<a id="extrapolation"></a>

## Extrapolation

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/extrapolation) · [ExtrapolationGraph](../../../src/graphs/curves/bezier/ExtrapolationGraph.tsx)

- **First task.** Lead with the extrapolation parameter and its extension preview. Move it past the original endpoint.
- **Other controls.** Put exact polygon editing and display switches together after the preview. Keep the apply operation distinguishable.
- **Acceptance.** Crossing the endpoint exposes the extension. A visitor can distinguish the original segment from the extrapolated portion.

<a id="elevation"></a>

## Degree elevation

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/elevation) · [ElevationGraph](../../../src/graphs/curves/bezier/ElevationGraph.tsx)

- **First task.** Lead with the degree-elevation preview and the existing apply action. Show the old and proposed control points together.
- **Other controls.** Group exact point editing and general curve operations after elevation.
- **Acceptance.** After one elevation the degree rises by one and the visible curve keeps its shape.

<a id="reduction"></a>

## Degree reduction

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/reduction) · [DegreeReductionGraph](../../../src/graphs/curves/reduction/DegreeReductionGraph.tsx)

- **First task.** Start with the existing exactly reducible example. Drag one cubic control point and compare the reduced curve.
- **Other controls.** Keep the exactness indicator near the plot and group detailed difference/error calculations below it.
- **Acceptance.** The default curves coincide. A perturbation that breaks exact reduction produces a visible separation and a nonzero error.

<a id="arc-length-param"></a>

## Arc-length parametrization

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/arc-length) · [ArcLengthParametrizationGraph](../../../src/graphs/curves/arclength/ArcLengthParametrizationGraph.tsx)

- **First task.** Put the equal-parameter and equal-length sample comparison next to the drawn markers.
- **Other controls.** Group sampling precision and exact control-point editing after the comparison, where offered.
- **Acceptance.** On a curve with varying speed, the student can identify where equal parameter steps bunch up and compare the spacing of equal arc-length samples.

<a id="bezier-clipping"></a>

## Intersections by Bézier clipping

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/bezier/clipping) · [BezierClippingGraph](../../../src/graphs/compgeo/BezierClippingGraph.tsx)

- **First task.** Lead with Next step and the two active parameter intervals. Keep the tested curve portions visible.
- **Other controls.** Group control polygons, hull overlays and precise edits under construction details.
- **Acceptance.** Stepping a nontrivial example updates a live interval or its disposition and highlights the corresponding curve portion.
