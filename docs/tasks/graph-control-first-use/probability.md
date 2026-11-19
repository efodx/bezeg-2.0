# Probability and statistics control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Keep the random simulation distinct from the deterministic CLT demonstration. Label sample results and theoretical references separately. Preserve reproducibility when hiding seed fields.

**Implementation order.** Start with Simulation, then the audited Density and CLT routes, followed by the sample and distribution editors.

<a id="prob-density"></a>

## Density and probability as area

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/probability/density) · [DensityAreaGraph](../../../src/graphs/functions/DensityAreaGraph.tsx)

- **First task.** Drag one boundary of the shaded interval and show its probability as a percentage beside the action.
- **Other controls.** Group mean, standard deviation and standardized bounds after the area comparison.
- **Acceptance.** Dragging a boundary changes the probability consistently with the shaded area. The default one-standard-deviation interval is about 68%.

<a id="prob-binomial-normal"></a>

## From binomial to normal

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/probability/binomial-normal) · [BinomialNormalGraph](../../../src/graphs/functions/BinomialNormalGraph.tsx)

- **First task.** Compare the binomial bars with the normal approximation and increase n at a fixed interior p.
- **Other controls.** Group probability and continuity-correction details after the distribution comparison.
- **Acceptance.** Both plots use the chosen n and p. Changing the correction changes the interval comparison while preserving the binomial masses.

<a id="prob-clt"></a>

## The central limit theorem without randomness

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/probability/clt) · [CltGraph](../../../src/graphs/functions/CltGraph.tsx)

- **First task.** Keep Add another copy prominent alongside the standardized sum and the reference normal curve.
- **Other controls.** Group the five custom density heights, distribution-function options and distance calculations below the run.
- **Acceptance.** One press increments the number of summands and updates the standardized density. Returning to one copy restores the starting comparison.

<a id="prob-summary"></a>

## Mean, median, standard deviation and the box plot

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/probability/summary) · [SummaryStatisticsGraph](../../../src/graphs/functions/SummaryStatisticsGraph.tsx)

- **First task.** Drag the largest observation farther out and keep mean and median visible together.
- **Other controls.** Group exact observations, spread measures and optional bands below the comparison.
- **Acceptance.** With the same largest observation still largest, the mean moves while the median stays fixed for a suitable sample.

<a id="prob-correlation"></a>

## Correlation and the regression line

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/probability/correlation) · [CorrelationGraph](../../../src/graphs/functions/CorrelationGraph.tsx)

- **First task.** Drag an influential point while the scatter plot, fitted line and r are visible.
- **Other controls.** Group exact point entry and the list of examples below the comparison.
- **Acceptance.** Moving one point updates both r and the fit. A symmetric nonlinear example can show structure even when r is near zero.

<a id="prob-simulation"></a>

## Simulation of random experiments

**Pilot.** [Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/probability/simulation) · [SimulationGraph](../../../src/graphs/random/SimulationGraph.tsx)

- **First task.** On the Galton board, lead with experiment and ball count so the visitor can compare the observed histogram with its prediction.
- **Other controls.** Make the count a `CountSetter` whose −/+ buttons step through 1–2–5 values, with a typed exact field. Put the seed, comparison and second seed in a visible “Seeds” group, not a closed disclosure, because lessons tell students to type into the field Generator seed. Show the stored second seed only for an eligible mode with comparison on. Group timing with playback.
- **Acceptance.** At a fixed seed, pressing − on the count (1000 → 500) updates the histogram and deviation. Restoring the original settings reproduces the run, including the second seed when enabled. The randomness lessons' seed steps still find their field.
