# Geometry of curves control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

These routes include several independent graph implementations. Reuse point, parameter and playback controls where already supplied. Keep a mathematical undefined status near the action that produced it.

**Implementation order.** Use the audited curvature slider as a reference. Review the two motion routes together.

<a id="curve-parametric"></a>

## Parametric and polar curves

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/curve-geometry/parametric) · [ParametricCurveGraph](../../../src/graphs/curves/parametric/ParametricCurveGraph.tsx)

- **First task.** Start with a named curve and its parameter slider. Follow the point and tangent along one turn.
- **Other controls.** Group alternate curves and speed/derivative calculations after the slider.
- **Acceptance.** The marked point, tangent direction and speed agree at the chosen parameter. A stationary point is identified when the example has one.

<a id="curve-curvature"></a>

## Curvature and the osculating circle

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/curve-geometry/curvature) · [CurvatureBezierCurveGraph](../../../src/graphs/curves/bezier/CurvatureBezierCurveGraph.tsx)

- **First task.** Keep the parameter slider first. Ask where the osculating circle gets smaller as the point moves.
- **Other controls.** Put curve selection, point editing and exact curvature values after the experiment.
- **Acceptance.** The circle follows the point and changes radius with curvature. A straight or zero-curvature case has an intelligible result.

<a id="curve-comb"></a>

## Curvature comb and spline joins

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/curve-geometry/comb) · [CurveCombGraph](../../../src/graphs/curves/comb/CurveCombGraph.tsx)

- **First task.** Keep Show comb and its gain together. Move gain once on a curved example.
- **Other controls.** Group curve choice and precise editing after the comb. Describe gain as a display scale.
- **Acceptance.** Gain changes tooth lengths without deforming the base curve or changing where curvature vanishes.

<a id="curve-evolute"></a>

## Evolute

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/curve-geometry/evolute) · [CurveEvoluteGraph](../../../src/graphs/curves/bezier/CurveEvoluteGraph.tsx)

- **First task.** Move the parameter and follow the centre of the osculating circle against its locus.
- **Other controls.** Group normal and construction details after the moving centre. Keep any undefined-centre status near the control.
- **Acceptance.** The centre tracks the evolute where defined. The UI handles a zero-curvature position without presenting a finite centre.

<a id="curve-offset"></a>

## Offset curves

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/curve-geometry/offset) · [CurveOffsetGraph](../../../src/graphs/curves/offset/CurveOffsetGraph.tsx)

- **First task.** Lead with signed distance and show which side of the original the offset occupies.
- **Other controls.** Group cusp markers and construction details after the distance slider.
- **Acceptance.** Positive and negative distances place the offset on the appropriate sides. At zero it coincides with the base curve.

<a id="curve-envelope"></a>

## Envelope

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/curve-geometry/envelope) · [CurveEnvelopeGraph](../../../src/graphs/curves/envelope/CurveEnvelopeGraph.tsx)

- **First task.** Put the line count first. Add lines and watch a curve emerge, then inspect one line with the parameter slider.
- **Other controls.** Group visibility of the underlying curve and contact-point construction together.
- **Acceptance.** Increasing the count reveals the envelope more clearly. The highlighted line touches at the current parameter.

<a id="curve-kinematics"></a>

## Kinematics of a point on a curve

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/curve-geometry/kinematics) · [KinematicsGraph](../../../src/graphs/curves/kinematics/KinematicsGraph.tsx)

- **First task.** Lead with time or playback. Show the moving point and its velocity arrow before the numerical decomposition.
- **Other controls.** Group acceleration components and detailed readouts under motion details.
- **Acceptance.** At a regular point the velocity arrow is tangent to the path and both vectors update when time changes.

<a id="mechanics-descent"></a>

## The fastest descent

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/curve-geometry/descent) · [DescentGraph](../../../src/graphs/mechanics/DescentGraph.tsx)

- **First task.** Start the three-bead race from the common release point. Keep playback and time together.
- **Other controls.** Group path parameters, precise setup and calculations after the first comparison.
- **Acceptance.** With the default race the beads follow the indicated paths and the arrival order agrees with the displayed times.
