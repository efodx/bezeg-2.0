# 08 round 2 fuzz and probe (worker)

- I5: a parameter the step did not touch changes (per-frame samples of sliders, number fields, puck aria-valuenow).
- arc-length, area-between, continuity: tooling. The sampler counted the element-size slider inside a closed `details` as visible; its focus() fails, so the arrow keys went to the still-focused puck. Fixed in scripts/fuzz/fuzz.cjs (vis ignores closed details).
- linear: (a) k drags move the point fields n0..n3 (y1,y2) by definition: COUPLED_FIELDS in fuzz.cjs. (b) real: rewriting points rounds to 1e-9, so n drifted 1.1904761904761905 -> 1.19047619 on a k drag; LinearFunctionGraph parameterBindings read now rounds to 1e-6.
- probe "valueWidthDrift null": always an n/a row (probe.cjs:291, no measurement implemented). The failure was the wrong route: graph-check defaulted to functions/definite-integral, a not-found page (real route functions/integral). `just probe --route functions/integral`: 14 checks, 0 failed. Pass --route functions/integral.
