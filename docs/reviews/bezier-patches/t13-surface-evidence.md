# Task 13 surface evidence seam

## Evidence available in the current app

The surface host `#jgbox` publishes `data-surface-framing` from `ThreeSurfaceView.publishFraming` (`src/graphs/patches/surface-view/threeSurfaceView.ts`). Its JSON contains CSS-pixel `width` and `height`, the current camera (`az`, `el`, `distance`, `target`), and projected control points (`id`, `x`, `y`, `inFrustum`). The catalog capture runner already reads this attribute, checks its camera against the recipe, and validates projected control-point framing. The live host also contains the WebGL canvas, whose context can be read by the browser harness.

There is no page-readable publication of rendered geometry owners or their geometry samples. `SurfaceScene` is authoritative typed data inside the app, and Three objects carry some internal identifiers, but neither is exposed as a supported page contract. The Utah teapot scene merges all 32 patch meshes into one mesh; patch-indexed boundary lines are conditional and do not prove those mesh owners. Consequently, current DOM evidence cannot truthfully satisfy guided-example owner assertions. This slice does not capture or claim a successful example.

## Adapter contract

`scripts/guided-example-surface-evidence.cjs` exports:

- `readPublishedSurfaceEvidence(page)`: reads the actual `#jgbox` framing attribute and existing canvas WebGL context through Playwright's page API.
- `validateSurfaceEvidence({framing, webglContextType, renderedOwners, expected})`: validates the page-read framing together with explicit rendered-owner evidence. Each owner is `{id, kind, geometrySamples}`, where `kind` is `tensor`, `triangular`, `join`, or `teapot`, and each sample is a finite xyz tuple. `expected.owners` defines the exact owner identity/kind/sample set. Optional `geometryTolerance` and `cameraTolerance` default to `1e-6`.

The validator rejects absent framing/camera/WebGL, empty owner or geometry arrays, duplicate or wrong identities/counts, non-finite values, geometry mismatches, and camera mismatches. Projected control points are required for ordinary patch owners and validated whenever present. The current Utah teapot scene intentionally publishes no control points, so the empty list is accepted only alongside exactly 32 expected and rendered `teapot` owners, each with nonempty geometry samples. The validator pins 32 because that is the current `TEAPOT_PATCH_COUNT` capstone contract; the authored expected owner list still names every required patch identity and sample, while the validator ensures it covers the complete set. It does not infer geometry from screenshots or from the control-point framing attribute.

## Next integration seam

Before wiring this into `capture-guided-example-previews.cjs`, the app needs a deliberately narrow read-only surface evidence producer sourced from the authoritative scene/renderer state. It must identify logical owners and publish nonempty geometry samples tied to those owners for tensor, triangular, join, and teapot scenes. The capture runner can then read that published record beside `data-surface-framing`, construct each expected record from the authored example, call this adapter, and preserve existing served-build freshness checks. Keep the existing JSXGraph capture path intact. Teapot publication needs explicit patch ownership through its merged mesh; counting optional boundary polylines alone is insufficient.

No browser capture was run for this slice. All test records below are unit fixtures, not production capture evidence.
