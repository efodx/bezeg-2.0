# Functions and calculus control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Show one actionable relationship between input and output. Keep a graph's exact-entry path, conditional domain messages and reveal sequence. The prompt can identify the existing handle, slider or reveal by name.

**Implementation order.** Begin with audited Linear, Derivative, Definite integral, Transformations, Polynomial zeros and Waves, then cover the remainder.

<a id="linear-function"></a>

## Linear function

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/functions/linear) · [LinearFunctionGraph](../../../src/graphs/functions/LinearFunctionGraph.tsx)

- **First task.** Move a point on the line or edit its slope with the current equation beside it.
- **Other controls.** Group the two points' exact coordinates. Keep slope and intercept directly accessible.
- **Acceptance.** Changing the default second point's y from 5 to 6 yields slope 2.5 and equation y = 2.5x + 1.

<a id="exponential-function"></a>

## Exponential function

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/exponential) · [ExponentialFunctionGraph](../../../src/graphs/functions/ExponentialFunctionGraph.tsx)

- **First task.** Start with the base slider. Compare a positive base below one with a base above one.
- **Other controls.** Group exact values and auxiliary displays below the base comparison.
- **Acceptance.** The curve decays on one side of base one and grows on the other. Both pass through (0, 1).

<a id="trigonometric-functions"></a>

## Trigonometric functions

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/trigonometric) · [TrigonometricFunctionsGraph](../../../src/graphs/functions/TrigonometricFunctionsGraph.tsx)

- **First task.** Start on sine with the function choice and amplitude together. Change amplitude before adding another transformation.
- **Other controls.** Group frequency, phase and vertical shift by effect, preserving access to exact values.
- **Acceptance.** On sine, changing only amplitude alters its vertical extent and preserves its period.

<a id="function-transformation"></a>

## Transforming a function graph

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/functions/transformations) · [FunctionTransformationGraph](../../../src/graphs/functions/FunctionTransformationGraph.tsx)

- **First task.** Start with one translation of the base graph and keep the two curves identifiable.
- **Other controls.** Group horizontal and vertical translations together, then the stretches and the tracked-point controls.
- **Acceptance.** Changing only vertical shift moves the transformed graph by that amount at every displayed x.

<a id="function-inverse"></a>

## Inverse function and logarithm

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/inverse) · [FunctionInverseGraph](../../../src/graphs/functions/FunctionInverseGraph.tsx)

- **First task.** Select a point, predict its reflection in the diagonal, then reveal the inverse.
- **Other controls.** Group function choice and domain restrictions after the reflection. Keep restrictions visible when they affect existence.
- **Acceptance.** For an invertible example, the reflected point exchanges coordinates and lies on the revealed inverse.

<a id="polynomial-zeros"></a>

## Polynomial zeros and multiplicity

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/functions/polynomial-zeros) · [PolynomialZerosGraph](../../../src/graphs/functions/PolynomialZerosGraph.tsx)

- **First task.** Select a zero and change its multiplicity. Draw attention to whether the curve crosses or touches the axis.
- **Other controls.** Group adding/removing roots, coefficient and derivative display after the selected zero's controls.
- **Acceptance.** At an isolated root, changing between odd and even multiplicity changes the crossing behaviour.

<a id="rational-function"></a>

## Rational functions: zeros, poles, asymptotes

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/rational-functions) · [RationalFunctionGraph](../../../src/graphs/functions/RationalFunctionGraph.tsx)

- **First task.** Move a numerator zero onto a denominator zero and inspect the value at that x.
- **Other controls.** Group the two root editors by numerator and denominator. Keep the domain result adjacent.
- **Acceptance.** For a cancelled simple factor the excluded x is marked as a hole and is absent from the zero list.

<a id="geometric-series"></a>

## Geometric series and partial sums

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/geometric-series) · [GeometricSeriesGraph](../../../src/graphs/functions/GeometricSeriesGraph.tsx)

- **First task.** Change the ratio and number of terms while the partial sum is visible.
- **Other controls.** Group tolerance and threshold calculations after the first comparison.
- **Acceptance.** For a nonzero starting term and absolute ratio below one, increasing the term count brings the partial sums toward the displayed limit.

<a id="conic-focal"></a>

## Conics: focus, directrix, eccentricity

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/conics) · [ConicFocalGraph](../../../src/graphs/functions/ConicFocalGraph.tsx)

- **First task.** Move the marked point on the conic and compare its two displayed distances.
- **Other controls.** Place eccentricity beside the distance ratio. Group directrix and numerical setup under construction details.
- **Acceptance.** At a regular point, focus distance divided by directrix distance agrees with the displayed eccentricity.

<a id="continuity"></a>

## Continuity

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/continuity) · [ContinuityGraph](../../../src/graphs/functions/ContinuityGraph.tsx)

- **First task.** Lead with the parameter controlling the join at x = 1. Draw attention to the two one-sided values.
- **Other controls.** Group precise values and definitions after the join experiment.
- **Acceptance.** A visitor can find a parameter where both sides meet and compare it with a setting that leaves a jump.

<a id="derivative"></a>

## Derivative

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/functions/derivative) · [DerivativeGraph](../../../src/graphs/functions/DerivativeGraph.tsx)

- **First task.** Shrink the nonzero secant step while watching the same base point. Keep the tangent comparison discoverable in Display.
- **Other controls.** Group function and exact base-point setup. Keep the existing explanation of how the step skips zero beside its input.
- **Acceptance.** As the step shrinks on a differentiable example, the secant slope approaches the tangent slope without evaluating a zero denominator.

<a id="definite-integral"></a>

## Definite integral

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/functions/integral) · [DefiniteIntegralGraph](../../../src/graphs/functions/DefiniteIntegralGraph.tsx)

- **First task.** Increase the number of subintervals on the prepared example and show the sum beside the integral.
- **Other controls.** Group endpoints and choice of rule together. Preserve signed-area indications.
- **Acceptance.** For the default x² example a finer left sum approaches the exact integral. Switching rules changes the drawn pieces.

<a id="area-between-curves"></a>

## Area between curves

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/area-between) · [AreaBetweenCurvesGraph](../../../src/graphs/functions/AreaBetweenCurvesGraph.tsx)

- **First task.** Drag one endpoint across a crossing. Put signed integral and geometric area modes together.
- **Other controls.** Group exact bounds, function selection and numerical details after the comparison.
- **Acceptance.** Across a sign change the signed contributions can cancel. The geometric area counts both sides positively.

<a id="arc-length"></a>

## Arc length of a curve

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/arc-length) · [ArcLengthGraph](../../../src/graphs/functions/ArcLengthGraph.tsx)

- **First task.** Increase the segment count between two fixed endpoints and watch the inscribed polyline.
- **Other controls.** Group endpoint editing and detailed length calculations. Keep polygonal and reference lengths together.
- **Acceptance.** Refining a nested partition adds detail and its polyline length approaches the arc length from below.

<a id="unit-circle"></a>

## Unit circle

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/functions/unit-circle) · [UnitCircleGraph](../../../src/graphs/trig/UnitCircleGraph.tsx)

- **First task.** Drag the marked point around the unit circle with the angle and its two projections visible.
- **Other controls.** Group exact angle and auxiliary displays, preserving keyboard angle changes.
- **Acceptance.** At 90° and 180° the point and projections agree with the corresponding sine and cosine values.

<a id="waves"></a>

## Waves and sampling

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/functions/waves) · [WavesGraph](../../../src/graphs/functions/WavesGraph.tsx)

- **First task.** Play the default sum of two waves, then vary the relative phase with the sum visible.
- **Other controls.** Group amplitude, frequency and other mode-specific controls. Keep manual time usable.
- **Acceptance.** At matching frequency and equal amplitude, opposite phases cancel. Switching wave mode reveals the controls it uses.
