# Parametrizations control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Make it clear whether a control changes the sampling rule or the number of markers. State what stays fixed during each comparison. Preserve each route's sampling calculation and valid ranges.

**Implementation order.** Compare the weighted and uniform routes, then apply the wording to splines.

<a id="spline-parameterization"></a>

## α parametrizations

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/param/param/alphaparam2) · [SplineAlphaParametrizationGraph](../../../src/graphs/curves/parametrisations/SplineAlphaParametrizationGraph.tsx)

- **First task.** Lead with α and keep the sample count fixed for the first comparison. Draw attention to the marked points along the spline.
- **Other controls.** Group sample count and exact spline-point editing under setup.
- **Acceptance.** Changing α redistributes the samples for the same count and the visitor can compare their spacing.

<a id="weighted-parameterization"></a>

## Weighted parametrization

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/param/param/alphaparam) · [AlphaParamBezierCurveGraph](../../../src/graphs/curves/parametrisations/AlphaParamBezierCurveGraph.tsx)

- **First task.** Move α away from its neutral value with a fixed number of markers. Label the effect as point spacing.
- **Other controls.** Group sample count and control-polygon editing below the slider.
- **Acceptance.** Two α settings visibly change marker density along the curve without changing the requested number of samples.

<a id="uniform-parameterization"></a>

## Uniform parametrization

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/param/param/uniform) · [UniformParamBezierCurveGraph](../../../src/graphs/curves/parametrisations/UniformParamBezierCurveGraph.tsx)

- **First task.** Lead with the parametrization chooser. Compare weighted and uniform arc-length spacing on the same curve.
- **Other controls.** Group sample count with the comparison. Show the weight parameter only where that method uses it.
- **Acceptance.** Switching methods preserves the curve and marker count while the displayed spacing follows the selected method.
