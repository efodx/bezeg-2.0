# B8b worker note

Done (captured, manifest changed only for these ids): complex-multiplication (keep Re/Im, hide only, strip empty), complex-reciprocal, complex-roots (keep `^(?:Re|Im)$`), triangle-centres (Remove), inversion (Remove), orientation (keep `^[+−]\d+`, strip `: levi zavoj$`). No verdict changed by the overlap rule; "+8" sits inside the shaded triangle, clear of lines and ticks.

Not done: linear-map. Entry tried: `{keep: [/^a₁ = /, /^[τδ]$/, /^Δ = 0$/], strip: []}`. The capture fails at the encoder: `scripts/demonstration-preview-motion.cjs:1589` "Decoded background changed at frame 0" (108 vs 107 on the sampled pixel, CRF 46; the moving grid leaves only a tiny still patch, `scripts/demonstration-clip-rows/_jump.cjs:159`). Not a stale control, so not repaired (a repair would loosen the check or need a sampler change). Entry removed from the recipes and the test list.

Tooling repairs (stale controls, now Slider/point fields):
- `scripts/demonstration-clip-rows/linear-complex.cjs`: labels `Re z` -> `z, Re`, `Re w` -> `w, Re` (PointListInput field names).
- `scripts/demonstration-clip-rows/_driver.cjs` (number-field branch): uses `numberFieldLocator`, falling back to the old locator (inversion radius is a Slider).

A run during the node_modules outage failed with "Cannot find module 'playwright'"; rerun after the reinstall succeeded.
