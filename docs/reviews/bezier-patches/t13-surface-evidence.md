# Task 13 surface evidence seam

## Evidence available in the current app

The surface host `#jgbox` publishes `data-surface-framing` from `ThreeSurfaceView.publishFraming` (`src/graphs/patches/surface-view/threeSurfaceView.ts`). Its JSON contains CSS-pixel `width` and `height`, the current camera (`az`, `el`, `distance`, `target`), and projected control points (`id`, `x`, `y`, `inFrustum`). The catalog capture runner already reads this attribute, checks its camera against the recipe, and validates projected control-point framing. The live host also contains the WebGL canvas, whose context can be read by the browser harness.

`SurfaceScene.meshOwners` now carries explicit logical ownership for visible tensor, triangular, join and teapot mesh triangles. After a successful render, `ThreeSurfaceView` publishes `data-rendered-surface-owners` on `#jgbox` as `{id, kind, geometrySamples}` records. Samples are xyz values read from the rendered mesh's uploaded Float32 position attribute: the first vertices of the first, middle and last drawable triangles in each owner's face range. Expected samples must account for Float32 rounding; the validator's `1e-6` default tolerance covers scene coordinates. Optional boundary lines never establish mesh ownership. The Utah teapot's merged mesh has 32 explicit, contiguous patch face ranges, including patches whose degenerate cusp triangles were omitted. Publication clears on scene reconciliation before validation, hidden or empty owners, render failure, context loss and disposal. The reader and runner now consume this attribute; no successful authored surface capture is claimed.

## Adapter contract

`scripts/guided-example-surface-evidence.cjs` exports:

- `readPublishedSurfaceEvidence(page)`: reads the actual `#jgbox` framing attribute and existing canvas WebGL context through Playwright's page API.
- `validateSurfaceEvidence({framing, webglContextType, renderedOwners, expected})`: validates the page-read framing together with explicit rendered-owner evidence. Each owner is `{id, kind, geometrySamples}`, where `kind` is `tensor`, `triangular`, `join`, or `teapot`, and each sample is a finite xyz tuple. `expected.owners` defines the exact owner identity/kind/sample set. Optional `geometryTolerance` and `cameraTolerance` default to `1e-6`.

The validator rejects absent framing/camera/WebGL, empty owner or geometry arrays, duplicate or wrong identities/counts, non-finite values, geometry mismatches, and camera mismatches. Projected control points are required for ordinary patch owners and validated whenever present. The current Utah teapot scene intentionally publishes no control points, so the empty list is accepted only alongside exactly 32 expected and rendered `teapot` owners, each with nonempty geometry samples. The validator pins 32 because that is the current `TEAPOT_PATCH_COUNT` capstone contract; the authored expected owner list still names every required patch identity and sample, while the validator ensures it covers the complete set. It does not infer geometry from screenshots or from the control-point framing attribute.

## Next integration seam

The producer and reader are connected to the surface branch of `capture-guided-example-previews.cjs`. Inventory entries supply independent `expected.surface` camera and owner samples. The runner validates initial-frame stability, resizes only the host, checks projected control points and visible label rectangles, preserves the authored camera, and retains observed samples for manifest revalidation. The existing JSXGraph branch and served-build freshness checks remain. See [runner contract and checks](t13-runner-worker-handoff.md) and [review disposition](t13-runner-review.md).

Point-free views (including the teapot and default subdivision scene) fail capture until a producer mesh-framing extension proves their crop bounds. Ordinary examples must author visible control points and suitable camera framing; labels required by an example still need an authored expected label set and visual review. No authored surface inventory or browser capture was produced in these slices. Node test records are fixtures, not production capture evidence. [Producer browser checks](t13-producer-smoke.md) exercise the live publication and controls, not the capture runner or published media.

## Handler verification, 2026-10-29

Producer engineering review found no blocking defect; camera-only cache and missing-owner-list regression coverage remain limited ([review](t13-producer-review.md)). No formula, evaluator, drawing coordinates or construction changed, so this slice used engineering review rather than a separate mathematical review. Producer smoke passed the six routes, 32-owner teapot without boundaries, shading, orbit, parameter, geometry Reset, language, narrow keyboard controls, legacy drag/slider baselines and the focused repeated SPA-navigation follow-up.

Handler reran the five focused suites and all 24 capture-tool Node tests. `just check` passed on HEAD `9983277` with these producer/runner edits: 239 unit files / 4803 tests, typecheck, lint, and production rebuild. Logs: `.command-logs/2026-10-29T15-35-50-591Z-20068-adfe09f8.log` and build `2026-10-29T15-39-00-425Z-20068-6c3e0c81.log`; build warnings remain recorded there. Runner engineering re-review accepted the local repairs, with actual end-to-end surface capture and required label-set checks still open. This is acceptance of bounded tooling slices only; all authored task13 examples/media and task14 remain outstanding.
