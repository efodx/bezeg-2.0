# Task 13 surface motion recipes

## Implemented

Added surface orbit motion for `patch-tensor`, `patch-decasteljau`, `patch-derivatives`, `patch-subdivision`, `patch-joins`, and `patch-triangular`. The runner waits on published WebGL camera/owner evidence, resizes the host to 360×220, applies the surface recipe, orbits from a clear canvas corner through pointer input, then uses the supported reset-view control. It records actual PNG dimensions, published camera and rendered mesh owners on each frame. Checks compare every owner and its sampled xyz vertices against default-fixture samples, require stable camera target/distance, actual camera movement and return, and a seamless first/last PNG.

Surface evidence logic lives in `scripts/patch-surface-motion.cjs`; integration is limited to `scripts/demonstration-preview-motion.cjs` and the capture API. No image or clip was generated. Existing build and source provenance checks remain with the production capture caller.

## Verification and gaps

`node --test scripts/patch-surface-motion.test.cjs scripts/demonstration-preview-motion-runner.test.cjs` passed: 7 tests. Regression checks cover surface readiness without SVG, actual PNG IHDR dimensions, empty owners, wrong owner identity, incorrect geometry samples, a stationary camera, and failure to return. Scoped `just lint` passed for the changed JavaScript files.

The assigned handler owns build and browser capture, so no production route orbit was exercised here. The default fixture constants and physical orbit/reset sequence still need confirmation in the handler's production capture. Clip encoding, source/build provenance, and end-to-end camera/mesh evidence remain unverified by this slice.
