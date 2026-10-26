# Three.js label depth and figure export

Task 02 prototype correction, scoped to the isolated three.js spike. The prototype remains unselected; this evidence does not recommend a renderer.

## Behavior

One label-layout helper now projects each label through the current camera, clips it to the camera frustum, and raycasts from the camera against the rendered surface meshes and other control-point spheres. It excludes a control point's own sphere and uses a 0.12 scene-unit depth tolerance so a label on a tessellated patch is not rejected by small surface discretization error. Results are cached and invalidated by camera, model, resize, or label changes instead of raycasting every animation frame. On-screen labels, PNG text, and SVG text use that same visibility result.

SVG export now renders the live WebGL scene and embeds its PNG canvas as an SVG `<image>`, then overlays only visible SVG `<text>` labels. This preserves the exact surface, points, lines, shading, and depth order of the current view. The tradeoff is explicit: scene geometry in SVG is raster and cannot be edited as vector paths; text remains vector. PNG export renders the same scene and draws only visible labels. This prototype still uses plain text labels, so MathJax font rendering remains future adapter work.

## Evidence

Preview source: three.js r180, served source SHA-256 `4a88d4443ffdbdb88154f624033fa37d507e990f15f16575ded40e84a2c4341b`.

The browser check exercised tensor and triangular patches in front, top, side, and isometric views. Every SVG's embedded PNG matched the current WebGL canvas byte-for-byte, decoded to non-white rendered geometry, and carried exactly the labels visible in the page. Every PNG download also decoded with rendered geometry. Visible label counts by view were tensor `12/17/12/17` and triangular `9/11/10/10` in front/top/side/isometric order.

The prior triangular overlap was reproduced with its full interaction sequence: after dragging point 1 and moving point 2 by `(58, 20)` screen pixels, point 2's projected center ray hit control index 5 (zero-based; displayed label 6) first at distance `12.891`; point 2's label was suppressed. A separate visible point completed an XY touch edit followed by a z-only touch edit (`Δz = 0.4978`), with the camera fixed. No browser page errors occurred.

Screenshots, downloaded SVG/PNG files, and `results.json` are retained in [the artifacts](three-export-depth-artifacts/). Representative screenshots are [the overlap](three-export-depth-artifacts/triangular-point2-occlusion.png) and [isometric view](three-export-depth-artifacts/triangular-isometric.png). The handler inspected the tensor-isometric and triangular-top exported PNGs: both contain substantive patch and construction geometry with labels.

## Checks

- `node --check docs/prototypes/bezier-patches/three-prototype.js`
- `node --check docs/prototypes/bezier-patches/verify-three-export-depth.mjs`
- `node docs/prototypes/bezier-patches/verify-three-export-depth.mjs` — passed occlusion, owner-sphere exclusion, frustum clipping, embedded-raster SVG and vector-label checks; removing depth or SVG visibility filtering made the corresponding assertion fail.
- `node docs/prototypes/bezier-patches/verify-three-lifecycle.mjs` — passed listener/remount/disposal and raycaster regression checks.
- `BEZEG_THREE_EXPORT_BROWSER=1 node docs/prototypes/bezier-patches/verify-three-export-depth.mjs` (PowerShell equivalent sets the environment variable) — passed eight view/export combinations and touch regressions on port 4181.

An independent engineering/spec reviewer found no actionable current-code issues in label invalidation, ownership, export freshness or disposal, and reran the focused verifier. The handler reran syntax, export/depth, lifecycle, fidelity and teapot verifiers; all passed. Two initial handler command names were incorrect (`verify-renderer-fidelity.mjs` and `verify-teapot-data.mjs` do not exist); the actual `verify-fidelity.mjs` and `verify-teapot.mjs` then passed. Independent browser smoke remains a separate result.

The browser check is prototype-only and used the prepared pinned preview; no dependencies changed. The 0.12 depth tolerance is in prototype world units and needs calibration against production scene scales. Non-surface construction markers and lines are not raycast occluders. Renderer choice, performance measurement, and the production MathJax adapter remain outside this slice.
