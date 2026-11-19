# Analysis control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Use the existing iteration controller on step-based graphs. Keep equality, errors, stop reasons and intentional reveals close to their relevant actions. Continuous motion retains the shared Play/Pause and reduced-motion behaviour.

**Implementation order.** Start with Epicycles. Use Bisection as a comparison for iterative graphs, then tackle the remaining iterations, comparisons and 3D controls.

<a id="bisection"></a>

## Bisection

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/bisection) · [BisectionGraph](../../../src/graphs/functions/BisectionGraph.tsx)

- **First task.** Put Next step and the current interval together. Ask which half contains the root before stepping.
- **Other controls.** Group the function and interval endpoints under setup. Keep validity and termination messages beside the step.
- **Acceptance.** On the default first step the interval changes from [1, 2] to [1, 1.5] and its width halves.

<a id="root-finding"></a>

## Newton and secant methods

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/root-finding) · [RootFindingGraph](../../../src/graphs/functions/RootFindingGraph.tsx)

- **First task.** Choose Newton or Secant, then step once and follow the tangent or secant to the new intercept.
- **Other controls.** Group starting approximations by method. Keep any invalid derivative, denominator or termination message visible.
- **Acceptance.** For each method, one valid step updates the drawn line and approximation together. An exact root is reported as found.

<a id="quadrature"></a>

## Trapezoid and Simpson rules

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/quadrature) · [QuadratureGraph](../../../src/graphs/functions/QuadratureGraph.tsx)

- **First task.** Pick a rule, double the valid subdivision count and compare the measured error.
- **Other controls.** Group interval and integrand setup after the rule. Keep Simpson's count restrictions with its field.
- **Acceptance.** For the same smooth example, changing the count redraws the quadrature pieces and recalculates the error for that rule.

<a id="euler-method"></a>

## Direction field and Euler's method

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/euler-method) · [EulerGraph](../../../src/graphs/functions/EulerGraph.tsx)

- **First task.** Take one Euler step in the displayed direction field and keep the new endpoint visible.
- **Other controls.** Group the equation, initial coordinates and integration endpoint. Keep step size handy for a second run.
- **Acceptance.** One step follows the local slope. Halving the step and comparing at the same final x updates the approximation.

<a id="mean-value"></a>

## Mean value theorem

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/mean-value) · [MeanValueGraph](../../../src/graphs/functions/MeanValueGraph.tsx)

- **First task.** Move the candidate c until its tangent looks parallel to the endpoint secant, then use the existing reveal.
- **Other controls.** Group endpoints and function setup. Keep the two slopes beside the candidate control.
- **Acceptance.** On a suitable example the candidate tangent and secant slopes can be compared directly with the revealed solution.

<a id="accumulation"></a>

## Accumulated integral

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/accumulation) · [AccumulationGraph](../../../src/graphs/functions/AccumulationGraph.tsx)

- **First task.** Drag the upper endpoint and look at the shaded region before revealing the accumulation.
- **Other controls.** Group the base point and function settings. Keep the reveal beside the signed result.
- **Acceptance.** Moving the upper endpoint through the base point takes the accumulation through zero and updates the shading.

<a id="darboux"></a>

## Darboux sums

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/darboux) · [DarbouxGraph](../../../src/graphs/functions/DarbouxGraph.tsx)

- **First task.** Increase the partition count and compare the lower and upper rectangles over the prepared interval.
- **Other controls.** Group the interval and function settings. Keep the two sums and their gap together.
- **Acceptance.** For a nested refinement, the lower sum cannot decrease and the upper sum cannot increase.

<a id="extrema"></a>

## Local and global extrema

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/extrema) · [ExtremaGraph](../../../src/graphs/functions/ExtremaGraph.tsx)

- **First task.** Choose the closed-interval example, identify a candidate on the graph and then reveal its classification.
- **Other controls.** Group function and endpoint setup. Keep candidate type distinct from the global comparison.
- **Acceptance.** The result accounts for endpoints as well as interior candidates and identifies the highest and lowest attained values.

<a id="convexity"></a>

## Convexity and concavity

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/convexity) · [ConvexityGraph](../../../src/graphs/functions/ConvexityGraph.tsx)

- **First task.** Move a chord endpoint and compare the chord and tangent with the curve before revealing the derivative test.
- **Other controls.** Group exact positions and second-derivative details under the comparison.
- **Acceptance.** On a convex portion the curve lies below its chord and above a supporting tangent when defined.

<a id="taylor"></a>

## Taylor approximation

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/taylor) · [TaylorGraph](../../../src/graphs/functions/TaylorGraph.tsx)

- **First task.** Lead with the approximation degree at a fixed centre. Inspect what happens at the marked x.
- **Other controls.** Group centre and evaluation point together. Keep actual error separate from its bound and retain the reveal.
- **Acceptance.** Varying degree updates the polynomial and error. At the expansion centre the approximation matches the function.

<a id="sequence"></a>

## Sequence convergence

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/sequence) · [SequenceGraph](../../../src/graphs/functions/SequenceGraph.tsx)

- **First task.** Set a tolerance band and move the threshold. Keep the candidate limit and the tail visible.
- **Other controls.** Group sequence choice and exact settings. Retain the reveal for whether the entire tail qualifies.
- **Acceptance.** Changing the threshold changes which terms are tested. The verdict concerns every later term.

<a id="uniform-convergence"></a>

## Uniform convergence

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/uniform-convergence) · [UniformConvergenceGraph](../../../src/graphs/functions/UniformConvergenceGraph.tsx)

- **First task.** Choose a point and a tolerance. Compare the error at that point with the supremum after a prediction.
- **Other controls.** Group the function family and precise settings. Keep pointwise and whole-interval results distinctly named.
- **Acceptance.** On a supported example, the student can distinguish a passing pointwise test from the test over the entire domain.

<a id="fourier-series"></a>

## Fourier series

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/fourier-series) · [FourierSeriesGraph](../../../src/graphs/functions/FourierSeriesGraph.tsx)

- **First task.** Choose the existing wave example and vary the harmonic cutoff with the target and partial sum visible.
- **Other controls.** Group spectrum and error details after the approximation. Keep jump values interpretable.
- **Acceptance.** Increasing the cutoff changes the partial sum, and the original waveform stays available for a direct comparison near a jump.

<a id="fourier-coefficients"></a>

## Fourier coefficients

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/fourier-coefficients) · [FourierCoefficientsGraph](../../../src/graphs/functions/FourierCoefficientsGraph.tsx)

- **First task.** Drag a shape handle and watch the coefficient bars. Put waveform choice beside that experiment.
- **Other controls.** Group individual coefficient values and detailed calculations below the spectrum.
- **Acceptance.** A shape edit updates the bars. Two waveform examples can be compared on the same frequency axes.

<a id="epicycles"></a>

## Epicycles

**Pilot.** [Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/epicycles) · [EpicycleGraph](../../../src/graphs/functions/EpicycleGraph.tsx)

- **First task.** Move shared Play/Pause and manual time first in Edit. Use the shape chooser to compare the existing circle with a diamond.
- **Other controls.** Group parametrization, exact coordinates and coefficient/error details. Keep the cutoff's exact input and derived term count together.
- **Acceptance.** With the diamond selected, compare N = 1 and 5 at its corners. Preserve the default circle, single playback owner, lesson locks and manual reduced-motion path.

<a id="fixed-point"></a>

## Fixed-point iteration

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/fixed-point) · [FixedPointGraph](../../../src/graphs/functions/FixedPointGraph.tsx)

- **First task.** With the map and initial point prepared, press Next step and follow one cobweb iterate.
- **Other controls.** Group map choice and start value after the step. Keep stop conditions next to the result.
- **Acceptance.** The next point is T applied to the previous value and agrees with the cobweb construction.

<a id="recursion-cobweb"></a>

## Recursive formula and the cobweb diagram

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/recursion) · [RecursionCobwebGraph](../../../src/graphs/recursion/RecursionCobwebGraph.tsx)

- **First task.** Put Next step beside the current term. Compare two start values on the same recurrence.
- **Other controls.** Group recurrence selection, start and detailed iteration history. Keep the identity line visible.
- **Acceptance.** Each step takes the current term through the map to its next term. Changing the start begins a coherent new orbit.

<a id="recursion-growth"></a>

## Sequences, interest and growth

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/growth) · [GrowthGraph](../../../src/graphs/recursion/GrowthGraph.tsx)

- **First task.** Show the current term and sum together. Compare adding a fixed difference with multiplying by a fixed ratio.
- **Other controls.** Group first-term and exact parameter entry by the selected sequence type.
- **Acceptance.** For the same starting term, switching between arithmetic and geometric examples updates both the listed terms and cumulative sum.

<a id="phase-portrait"></a>

## Phase portrait

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/phase-portrait) · [PhasePortraitGraph](../../../src/graphs/dynamics/PhasePortraitGraph.tsx)

- **First task.** Move a starting point in a prepared field and follow the trajectory relative to the equilibrium.
- **Other controls.** Group system choice, matrix coefficients and eigenvalue readouts below the direct experiment.
- **Acceptance.** Changing the starting point changes the orbit consistently with the same field. Selecting a new system updates the field and classification.

<a id="logistic-map"></a>

## Logistic map and bifurcations

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/logistic-map) · [LogisticMapGraph](../../../src/graphs/dynamics/LogisticMapGraph.tsx)

- **First task.** Keep r, initial value and Step/Play together. Point to the next iterate and the corresponding bifurcation column.
- **Other controls.** Group period, multiplier and stability diagnostics below the orbit.
- **Acceptance.** One step follows the current logistic recurrence. Changing r updates the cobweb and the corresponding region of the bifurcation plot.

<a id="solids"></a>

## Solids, sections and volumes

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/solids) · [SolidsGraph](../../../src/graphs/solids/SolidsGraph.tsx)

- **First task.** Lead in section mode with the plane offset and a visible cut through the cube.
- **Other controls.** Group the three normal components together. Keep mode, solid choice and camera controls separately identifiable.
- **Acceptance.** With a fixed normal, moving the plane changes the intersection at the indicated height and updates the section readout.

<a id="contour-map"></a>

## Level curves and the gradient

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/contours) · [ContourMapGraph](../../../src/graphs/levelsets/ContourMapGraph.tsx)

- **First task.** Lead with the level value and its highlighted contour. Then move the marked point to inspect the gradient.
- **Other controls.** Group function choice, multiple contour overlays and exact values below the first contour.
- **Acceptance.** Changing the level changes the highlighted set. At a regular point of a level curve the gradient is normal to it.

<a id="linear-program"></a>

## Linear programming

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/analysis/linear-program) · [LinearProgramGraph](../../../src/graphs/levelsets/LinearProgramGraph.tsx)

- **First task.** Move the objective direction on a prepared feasible polygon and watch the supporting line.
- **Other controls.** Group individual constraints and exact coefficients under problem setup. Keep the optimum or its status visible.
- **Acceptance.** Changing direction can select a different optimal vertex or edge. Infeasible and unbounded examples retain distinct results.
