# Task 4 base smoke (production build, d07f58c8 dirty)
Suite: 494 passed, 1 failed (bspline-nurbs sl walk: net::ERR_NO_BUFFER_SPACE, panel never appeared). Isolated rerun `SMOKE_PORT=4318 just smoke-lesson bspline-nurbs` passed.
Browser checks (scripts in .claude/jobs/pw/, preview on 4320): routes linear, binomial-normal, taylor, fourier-series, complex-reciprocal/roots/multiplication, linear-map, bisection, geometric-series: edit, drag, language, reset OK, no console errors.
Preset round trip + export (flat graphState, no model key; extra top-level "data" key present) + import OK on linear and binomial-normal. Lesson Next/Back/exit OK on linear, taylor. Remount OK on 5 pairs.

## Repair recheck
Build: production build in `build/` at ef8144bc (provenance reports dirty at build time); not rebuilt. Served with `just preview 4318` (stopped after the run). Browser: Playwright Chromium, 1400x900, English, one context. Script and log: `.claude/jobs/repair/repair.cjs`, `.claude/jobs/repair/repair.log`.
Flow per route: fresh load (default), edit a value by +2 (bisection: edit the `b` field, since `a` +2 would cross `b` and be rejected; then Next step), in-app navigation via the Demonstrations link to another route and back via its card (no reload: `window.__noReload` marker survived both hops). Compared fields, board signature and readout with the fresh-load default.
- functions/linear: edit changed fields; after return fields, board and readout equal default. PASS.
- probability/binomial-normal: edit changed fields; after return fields, board and readout equal default. PASS.
- analysis/bisection: edit changed fields; Next step moved readout from `step 0, width 1` to `step 1, width 1.5`; after return readout is `step 0, width 1`, fields and board equal default. PASS.
- functions/linear preset: edited (+1), saved preset `repair-t4-linear`, edited (+3), selected the preset: fields equal the saved values (the only difference is the trailing Presets combobox name). Left to binomial-normal and back: fields and board equal the default scene, not the preset and not the edit. The Presets select was not in view after return, so its selection was not captured. The previous smoke note did not record leave/return behaviour, so no before/after comparison is available from it.
Console and page errors across all scenarios: none.
Gaps: one browser, one viewport, English only; no Slovenian run; the Presets selection after return not observed; no screenshots taken; the pre-change build was not run, so the leak was not reproduced as a control.
