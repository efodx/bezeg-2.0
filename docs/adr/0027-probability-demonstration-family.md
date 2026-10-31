# 0027 Probability Demonstrations form their own family

Status: accepted, 2026-10-31. Context: [Probability and statistics on the graph](../specs/probability-statistics-lessons.md#decisions-needing-an-adr) (decisions 1 and 3), [tasks](../tasks/probability-statistics/README.md).

## Context

The distributions lessons need densities (normal, binomial, Poisson, convolved sums) that have no place in the closed function catalogue: `FUNCTION_IDS` is a type that stored Presets and released lessons use, and the normal density has no elementary antiderivative for `exactIntegral`. P4 and P5 edit data points.

## Decision

1. A new **Probability** Demonstration family (`/bezeg-2.0/probability`) with its own Preset collections. Its kernels (`distributions.ts`, `convolution.ts`, `descriptiveStatistics.ts`, `correlation.ts`) live in `src/analysis/`; its graphs extend `BaseFunctionGraph` with their own models. `FUNCTION_IDS` and the Analysis Preset types are not changed.
2. P4 and P5 use the point editing model of [ADR 0026](0026-interpolation-editing-model-and-solver.md) (draggable points plus a typed list); P4 constrains points to one axis. No second editing decision is taken.

Decision 2 (convolution representation, by measurement) stays open until Batch B.

### Decision 4: quartile and standard-deviation conventions (resolved 2026-10-31)

Source check: the general-matura formula sheet (RIC, [Zbirka kratkih nalog 2021](https://www.ric.si/mma/Zbirka_kratkih_nalog_SM_matematika_2021.pdf/2021042916082181/), section 3) lists no statistics formulas, so the convention comes from school materials. The national e-textbook *Matematika 9*, as quoted by ZRSS ([Sirnik 2023](https://www.zrss.si/wp-content/uploads/2023/07/04_MatejaSirnik.pdf)), defines \(Q_1\) and \(Q_3\) as the medians of the lower and upper halves: for odd \(n\) the median belongs to both halves, and for even \(n\) the data split without it. ZRSS's gimnazija worked solutions agree: for 11 rainfall values \(Q_1=145,\ Q_3=192.5\), and for 15 matura scores \(Q_1=16.5,\ Q_3=22\). The exclusive rule would give 141, 197 and 16, 22. The [ZRSS dispersion key](https://zrss.si/digitalnaknjiznica/posodb-pouka-gimn-mat-cd/24_STATISTIKA/04_Razprsenost-podatkov/rul_razprsenost_podatkov.pdf) divides by \(N\): for 15, 12, 25, 22, 20 it gives \(\sigma=4.7\), where the \(n-1\) version would give 5.26.

- **Quartiles:** the inclusive median-of-halves rule (the school rule) is the default. The convention panel compares it with the exclusive rule.
- **Standard deviation:** the population \(\sigma\) (divide by \(N\)) is the default, and the sample \(s\) (divide by \(n-1\)) is available as a toggle, as the spec asks.
- **Rejected alternatives:** the exclusive rule, which the spec's draft used and which contradicts the school sources above. Linear interpolation (`QUARTILE.INC`) is not a school definition and coincides with the inclusive rule whenever \(n\equiv3\pmod 4\), so it makes a poor contrast.
- **Impact:** the spec's P4 numbers are amended (fences 2.75 and 8.75), and fence comparisons work in quarter tenths. No code or Presets exist yet.

## Alternatives

- **Join the Analysis family.** Shares registration, but stretches `FunctionId` and the Analysis Preset types that released content depends on.
- **Fixed point count with numeric entry for P4/P5.** Rejected in ADR 0026 for the same reasons.

## Consequences

- Existing routes, Analysis Presets and the function catalogue are unchanged.
- The family registers its own chapter and catalog family; the regression line in P5 imports `src/analysis/leastSquares.ts` from the interpolation family.
