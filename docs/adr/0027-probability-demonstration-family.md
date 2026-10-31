# 0027 Probability Demonstrations form their own family

Status: accepted, 2026-10-31. Context: [Probability and statistics on the graph](../specs/probability-statistics-lessons.md#decisions-needing-an-adr) (decisions 1 and 3), [tasks](../tasks/probability-statistics/README.md).

## Context

The distributions lessons need densities (normal, binomial, Poisson, convolved sums) that have no place in the closed function catalogue: `FUNCTION_IDS` is a type that stored Presets and released lessons use, and the normal density has no elementary antiderivative for `exactIntegral`. P4 and P5 edit data points.

## Decision

1. A new **Probability** Demonstration family (`/bezeg-2.0/probability`) with its own Preset collections. Its kernels (`distributions.ts`, `convolution.ts`, `descriptiveStatistics.ts`, `correlation.ts`) live in `src/analysis/`; its graphs extend `BaseFunctionGraph` with their own models. `FUNCTION_IDS` and the Analysis Preset types are not changed.
2. P4 and P5 use the point editing model of [ADR 0026](0026-interpolation-editing-model-and-solver.md) (draggable points plus a typed list); P4 constrains points to one axis. No second editing decision is taken.

Decisions 2 (convolution representation, by measurement) and 4 (quartile and standard-deviation conventions, after a source check of the Slovenian matura convention) stay open until Batch B.

## Alternatives

- **Join the Analysis family.** Shares registration, but stretches `FunctionId` and the Analysis Preset types that released content depends on.
- **Fixed point count with numeric entry for P4/P5.** Rejected in ADR 0026 for the same reasons.

## Consequences

- Existing routes, Analysis Presets and the function catalogue are unchanged.
- The family registers its own chapter and catalog family; the regression line in P5 imports `src/analysis/leastSquares.ts` from the interpolation family.
