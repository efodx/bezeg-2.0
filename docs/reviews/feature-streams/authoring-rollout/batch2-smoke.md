# Batch 2 smoke: interpolation scenes and registration of basics, PH and parameterization

Production build from `a9569fed` (clean). Command: `just build`, then `just smoke-built --port 4331 --workers=2 --grep` with the 10 IDs and three catalog tests. Port 4323 was held by the Families-prep preview. Haiku `bezeg-smoke`, recorded by the handler from the worker's report.

Result: 44 passed, 0 failed, 0 skipped.

- `interp-lagrange`, `interp-hermite`, `interp-subdivision`: Demonstration load, Slovenian lesson walk and English 390px walk all pass.
- `bernstein`: the same three pass. The shared-runtime, Bernstein extras and curve-ownership preset regeneration tests also pass.
- `complex-multiplication`, `ph-cubic`, `ph-quintic`, `spline-parameterization`, `weighted-parameterization`, `uniform-parameterization`: the same three pass. The `ph-cubic` exit and re-entry test passes.
- Catalog: basics lists bernstein then complex-multiplication; PH lists ph-cubic then ph-quintic; parameterization lists spline, weighted, uniform. The registered paths equal the removed legacy rows.
- No page or console errors. Lesson walks fail on runtime errors, but Demonstration load tests do not capture console errors.

Not covered: drag or slider on these routes; a route A-B-A lifecycle for the interpolation graphs (the host lifecycle unit tests cover remount); the Preset menu outside the Bernstein test; the `ph-quintic` preview-motion test.
