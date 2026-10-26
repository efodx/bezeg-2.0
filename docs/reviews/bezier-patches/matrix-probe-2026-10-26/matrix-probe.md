# Three matrix probe diagnosis — 2026-10-26

Status: the three reported failure groups are harness targeting/probe errors in the checked cells. The original 192-case matrix remains unchanged; the handler owns the corrected matrix rerun.

## Findings

The red reproduction used one Three triangular desktop drag cell (Chromium 156.0.8078.4, Three r180, iso 8, tiling 8). The old harness failed with `moved=true`, `dragCameraFixed=true`, `surfaceFaces=64`, and `patchInteriorPixels=0`, because the occluded `P(u,v)` label had a zero-sized rectangle and the geometry branch returned zero without sampling. The red record is [measure.json](red-triangle-drag/measure.json). The first launch attempt used no inherited port and got `ERR_CONNECTION_REFUSED`; it is not counted as a repro.

For the narrow tensor drag, the old point-0 label target was also invalid: its projected center is x=400.3 in the 390px viewport, its label rect is 0×0 with `display:none`, and `elementFromPoint` returns no target. The old harness then dragged from the viewport origin. The new harness scans control points and requires an in-frustum projected center, a ray hit on that exact point, and no nearer surface or other control point under the existing 0.12-unit occlusion tolerance. It uses a browser pointer drag and requires exactly the selected indexed point to move. The narrow tensor cell selected index 1; JSXGraph’s old matrix target remains index 0, so these focused timings do not support a strict cross-renderer point-edit speed ratio.

The Three surface check now uses the active camera and actual mesh owners. It raycasts the projected interior point against the surface mesh, reads pixels with the owner visible, hides only that mesh, renders again, restores visibility in `finally`, and counts changed pixels. It does not use a label or count non-white canvas pixels. The teapot path samples its first actual patch mesh and checks all 32 owners.

## Focused evidence

All current sources served by the isolated preview matched their local files. Each final run used Chromium 156.0.8078.4, Three r180, iso 8 and tiling 8.

| Case | Result | Ownership and rendered geometry |
| --- | --- | --- |
| Triangular, desktop, drag | Pass | Point 0 ray hit; only index 0 changed; camera fixed; 64-face surface owner; `surface` ray hit; 434/451 pixels changed when hidden |
| Triangular, desktop, orbit and UV | Pass | Each has a 64-face owner, `surface` ray hit and >400 pixel differences |
| Triangular, narrow, drag and UV | Pass | Drag selected point 0 and changed only index 0; 64-face surface owner and >380 pixel differences |
| Tensor, narrow, drag | Pass | Point 0 is out of viewport; point 1 ray hit and only index 1 changed; camera fixed; 128-face owner and 409/451 pixel differences |
| Teapot, desktop, orbit | Pass | 32 actual teapot owners, 4096 triangles, `teapot` ray hit, 453/453 sampled pixels changed |

Detailed records: [desktop triangle drag](occlusion-triangle-desktop-drag/measure.json), [narrow tensor drag](occlusion-tensor-narrow-drag/measure.json), [desktop teapot orbit](occlusion-teapot-desktop-orbit/measure.json), [desktop triangle drag/orbit/UV](focused-with-diagnostics/measure.json), and [narrow triangle UV](narrow-triangle-uv/measure.json). [triangle-canvas.png](triangle-canvas.png) is a separate scene screenshot from before the owner-difference probe and shows the rendered triangle.

The temporary Three diagnostic hook is read-only: it reports the real camera projection, the actual control ray owner and occlusion result, and a surface-owner pixel diff. It restores mesh visibility after each diagnostic render. The pointer gesture timing remains driven by Playwright mouse input.

## Validation

- `node --check docs/prototypes/bezier-patches/measure.mjs` — passed.
- `node --check docs/prototypes/bezier-patches/three-prototype.js` — passed.
- `git diff --check` — passed (only existing LF/CRLF normalization warnings).
- Focused browser cells above — passed; served/local asset hashes match in each run.

No full matrix, cross-renderer budget comparison, or renderer acceptance claim is made here.

## Handler review and later verification

The handler found and corrected a teapot diagnostic coordinate-read typo after these focused runs: the first triangle centroid used `getX` for all three axes. It now averages `getX`, `getY`, and `getZ` respectively. The earlier teapot record still demonstrates 32 actual owners and a nonempty differential at its sampled ray, but does not establish that the ray used the intended first-triangle centroid. Later matrix evidence must identify the corrected source hash.

Two handler matrix attempts stopped on intermittent Windows `UNKNOWN` errors opening the frequently rewritten `measure.json`/`progress.json`: [first attempt](../matrix-corrected-2026-10-26/measure.json), [second attempt](../matrix-corrected-rerun-2026-10-26/measure.json). These are retained as file-output failures, not accepted timings or renderer failures. A bounded Windows-only retry handles that exact error, records retries, and still throws after six total attempts; it does not retry unrelated errors. [Fault-injection checks](write-retry-check.json) cover recovery, exhaustion, an unrelated error and another platform. Retry waits are outside the timed operation but can inflate the already caveated continuous rAF series.
