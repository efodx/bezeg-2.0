# 06 Batch B: trapezoid and Simpson (F2a–F6)

Gates: `G-FN`, `G-REG`. Depends on 02 and on Batch A being released. Decision: ADR 0022 §3.

- **F2a:** a quadrature Demonstration with rule `trapezoid | simpson` over the catalog functions. It offers even `n` only for Simpson (step 2, or a clear message), never rounding `n` silently. It draws parabola overlays for each subinterval pair. Its readouts are the approximation, the exact value, the absolute error, and the ratio to the error at `n/2`. Preset fields validate the rule and `n`. `DefiniteIntegralGraph` and its Presets are unchanged.
- **F2b:** route, catalog entry in the Analysis family, and registration.
- **F3:** lesson N4.
- **F4:** add N4 to the chapter.
- **F5:** preview and card media.
- **F6:** the Batch B gate: existing integral Presets reopen unchanged, the errors match the spec, `just check`, smoke in both languages, and CI.
