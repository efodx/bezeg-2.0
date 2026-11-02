# 06 Batch B: trapezoid and Simpson (F2a–F6)

Gates: `G-FN`, `G-REG`. Depends on 02 and on Batch A being released. Decision: ADR 0023 §3.

- **F2a:** a quadrature Demonstration with rule `trapezoid | simpson` over the catalog functions. It offers even `n` only for Simpson (step 2, or a clear message), never rounding `n` silently. It draws parabola overlays for each subinterval pair. Its readouts are the approximation, the exact value, the absolute error, and the ratio to the error at `n/2`. Preset fields validate the rule and `n`. `DefiniteIntegralGraph` and its Presets are unchanged.
  - Status: accepted 2026-11-02 (`3d7e4770`): `QuadratureGraph` with `quadratureModel.ts`; N4 errors and ratios reproduced, ratio computed from the displayed errors (tested for every valid n), even-n hint for typed odd n under Simpson, optional `rejectedHint` on `Slider`. The `quadrature` collection is listed in `PresetCatalog.test.tsx` `PENDING_ROUTE_KEYS` until F2b.
- **F2b:** route, catalog entry in the Analysis family, and registration.
  - Status: accepted 2026-11-02 (`3d5fcf5b`, test `d84e4a8c`): route `/bezeg-2.0/analysis/quadrature` in the Analysis family, lesson parameters `quadrature-a|b|n` and choices `quadrature-function|rule` (one synchronous-sequence test), `quadrature` moved to `FILE_CONTRACT_KEYS`; poster pending until F5. Engineering review found no blocking issue; smoke on build `d84e4a8c` passed in both languages and at 390 px. `scripts/generate-guided-example-inventory.cjs` needs the new parameter names only when F3 authors lesson N4.
- **F3:** lesson N4.
- **F4:** add N4 to the chapter.
- **F5:** preview and card media.
- **F6:** the Batch B gate: existing integral Presets reopen unchanged, the errors match the spec, `just check`, smoke in both languages, and CI.
