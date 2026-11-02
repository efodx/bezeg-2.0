# Distributions, CLT and correlation: implementation tasks

Status: scheduled 2026-10-31 by the [Curves feature stream](../feature-streams/curves.md). Source: [Probability and statistics on the graph](../../specs/probability-statistics-lessons.md). Slice template: [feature streams](../feature-streams/README.md#family-template).

The spec's concept contracts and acceptance criteria are the task acceptance. Evidence goes to `docs/reviews/probability-statistics/`.

## Decisions (F0, 2026-10-31)

- **ADR** — [ADR 0027](../../adr/0027-probability-demonstration-family.md): own Probability family and Preset collections; P4/P5 reuse ADR 0026's point editing model. The convolution representation (by measurement) is decided at Batch B; the quartile/σ conventions were decided 2026-10-31 (ADR 0027 decision 4).
- **Ids and routes.** Chapter id `probability`, family route `/bezeg-2.0/probability`. Demonstrations: `prob-density` (P1, `/bezeg-2.0/probability/density`), `prob-binomial-normal` (P2, `/binomial-normal`), `prob-clt` (P3, `/clt`), `prob-summary` (P4, `/summary`), `prob-correlation` (P5, `/correlation`).
- **Gate reading.** Kernels are ungated. Every graph extends `BaseFunctionGraph`, so all F2a slices wait for `G-FN`; registration and lessons need `G-REG`. P5 also waits for interpolation IA-1b (`leastSquares.ts`).
- **Terms.** The spec's Slovenian proposals as written (one-shot rule).

## Slices

| Id | Kind | Content | Depends on | Status |
| --- | --- | --- | --- | --- |
| PS-0 | F0 | This plan, ADR 0027, spec marked scheduled | — | done |
| PS-1a | F1 | `distributions.ts`: `erf`, normal density/CDF, binomial and Poisson mass, normal approximations with and without continuity correction, trapezoid strips; P1/P2 numbers; no `Math.random` | — | done ([evidence](../../reviews/probability-statistics/ps-1a-kernel.md)) |
| PS-1b | F1 | `convolution.ts` (`GridDensity`, convolve, standardize, cdf, moments, Kolmogorov distance) and the representation measurement + ADR | PS-1a | done ([evidence](../../reviews/probability-statistics/ps-1b-kernel.md), [ADR 0031](../../adr/0031-probability-convolution-representation.md)) |
| PS-1c | F1 | `descriptiveStatistics.ts` (conventions: ADR 0027 decision 4, inclusive quartiles, population σ default); `correlation.ts` importing `leastSquares.ts` | IA-1b | done ([evidence](../../reviews/probability-statistics/ps-1c-kernel.md)) |
| PS-A-* (rest) | F2a–F6 | P1 density and area, P2 binomial to normal | `G-FN`, `G-REG`, PS-1a | planned |
| PS-A-2a | F2a | `prob-density` graph core (P1): \(\mu,\sigma\) sliders and inputs, draggable and typed \(a,b\) (drag snaps to 0.01), filled area, probability and \(z_a,z_b\) readouts, empty/point/thin status, examples N(0; 1) and N(100; 15), fit view, Presets; no route | PS-1a, `G-FN` | done ([evidence](../../reviews/probability-statistics/ps-a-2a-graph.md); handler 27; Sonnet worker (partial at budget, handler finished checks), Sonnet review no blocking, handler fixes: persistent live region, P1 acceptance 5 wording, labels. On `da1877d3` plus the diff: tsc, `just lint src/graphs src/analysis`, `just unit src/graphs/base/presets src/graphs/functions src/analysis src/localization` (141 s, before the review fixes), then the density tests, localization and presets again on the final tree, build. Browser check at registration PS-A-2b) |
| PS-A-2b | F2b | Register `prob-density` at `/bezeg-2.0/probability/density` in the new family `/bezeg-2.0/probability` (after `analysis`, `lesson: false`, chapter pending, poster pending, preview recipe N(0; 1) with a=-1, b=1; SL/EN titles and prompt; capabilities row) | PS-A-2a | done (handler 27, `02d73ff6`; worker: `just unit` over presets, functions, learning runtime, localization, demonstrations, DemonstrationsPage, Routes, preview assets, LearningPage (286.6 s), `just check-localization`, tsc, `just lint src tests`, build; handler after rebase: count tests, localization, presets, tsc, build. Handler diff review of titles, prompt and catalog entry. **Not yet done:** browser smoke of the route (sl/en, live switch, drag, typed a/b, Reset, Preset round trip, 390 px, 200 % text) and the poster capture) |
| PS-B-* | F2a–F6 | P3 CLT, P4 summary statistics | Batch A, PS-1b, PS-1c | planned |
| PS-C-* | F2a–F6 | P5 correlation | Batch B, interpolation I4 released | planned |
