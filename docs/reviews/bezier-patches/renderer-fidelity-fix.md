# Renderer fidelity correction

Applied the mathematical findings from [the renderer math review](renderer-math-review.md) to both prototype renderers.

- The JSXGraph tensor control-net sampler now returns the fourth control at `s = 1`. The previous formula returned control 2 at that endpoint.
- Both renderers now draw the three independent triangular iso-curve families: constant `u`, constant `v`, and constant `w`. The old JSXGraph parameterizations were two traversals of the same constant-`w` line; three.js drew only that family.
- The JSXGraph teapot mode now resolves the reviewed source fixture into exactly 32 bicubic patches. It uses raw xyz, z-up coordinates with `fitLid: false` and `blinn: true`, and draws the same optional first-patch control net as the three.js teapot mode. Selecting it suppresses the editable preset net and construction; returning to the default restores the original tensor preset. No 33rd default surface is added.

The two teapot scenes now use the same patch data, source coordinate flags, tiling control, and optional first-patch net. A later renderer benchmark must select teapot mode in both renderers and match tiling and net visibility. Triangular iso counts must account for three curve families in each renderer.

`node docs/prototypes/bezier-patches/verify-fidelity.mjs` passes. Its pure assertions check first and last tensor-net endpoints; each triangular family's interior identity and six simplex-edge endpoints in both source files; and 32 distinct, finite teapot control nets from the reviewed dataset. It also preserves explicit pre-fix counterexamples for the tensor endpoint omission and duplicate triangular family. `node --check` passes for both prototype scripts and the verification script. No browser or performance result is claimed here.

Handler review added a guard against rebuilding a single-patch construction over the capstone's empty editable net, and hides its inapplicable parameter inset. These capstone transitions still require browser verification. Functional and timing evidence from prototype commit `3e1bbc1` predates these corrections and does not verify the corrected source.
