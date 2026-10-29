# Task 13 guided surface capture runner handoff

## Runner repairs

`capture-guided-example-previews.cjs` keeps the JSXGraph path intact and fingerprints `resizeSurfaceCaptureHost`. After resizing, surface capture checks every projected control point is in the camera frustum and inside the frame, then measures each actual visible `[data-label-id]` DOM box relative to `#jgbox` and rejects boxes crossing the frame edge. The saved scene record carries live WebGL type, camera/frame, exact owner geometry samples, projected control points, and visible label bounds.

Retained and published manifest validation rechecks the prepared first-frame and captured records against independently authored `expected.surface` camera and owner samples. It also rejects missing or changed crop evidence, initial-frame evidence, output dimensions, overlay state, and browser/build provenance. It never infers geometry from screenshots.

## Remaining producer gap

The teapot deliberately publishes no projected control points. Its 32 owner samples establish geometry identity but cannot prove that the merged mesh fits inside the capture frame. The runner now rejects this view with an actionable missing mesh crop framing error. Do not capture or publish the teapot until the producer publishes trustworthy projected mesh bounds (or equivalent evidence) and the runner validates them. The handler did not authorize a producer change during this bounded repair; no `src` files were changed.

## Checks and limits

- Focused Node suites: 24/24 passed across the capture runner, surface evidence adapter, and preview API.
- `just lint` on the six changed scripts/tests: passed.
- `node --check` on all three implementation scripts: passed.
- Mocked resize evidence confirms the host is resized before an outside-frustum point is rejected; the same path rejects the 32-owner point-free teapot. Manifest mutations reject changed owner samples, missing first-frame owners, changed label bounds/frustum flags, wrong image dimensions, and invalid served-build provenance. Resize-helper mutation changes the presentation fingerprint.
- No app build or browser capture was run. No assets or manifests were changed. Authored surface inventory entries remain absent, and teapot crop proof remains a capture blocker.
