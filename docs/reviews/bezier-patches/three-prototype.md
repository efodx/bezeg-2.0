# Isolated three.js renderer fallback prototype

This is a task-02 fallback prototype in `docs/prototypes/bezier-patches/three.html`. It is a separate page and imports three.js only when the page mounts; it does not add a project dependency or change the production renderer. The existing JSXGraph prototype remains the source of its control values and UI control IDs.

## Implemented surface

The page draws bicubic tensor and canonical-order cubic triangular Bézier patches with a WebGL depth buffer, shaded triangle meshes, 8/16 iso grids, boundaries, control nets, draggable control points, the de Casteljau construction, and a draggable square/triangle parameter inset. It provides front/top/side/isometric/reset views, empty-space pointer orbit, wheel zoom, focused arrow-key orbit, XY and visible z-drag modes, presentation sizing, resize handling, SVG and PNG download buttons, and a dispose/remount API. The `BezierPatchSpike` facade exposes `ready`, `snapshot`, `pointInfo`, `editPoint`, `setParameter`, `camera`, `counts`, `dispose`, `remount`, `assertMath`, `exportSvg`, and `exportPng`.

The optional teapot selection resolves all 32 explicit bicubic patches from the pinned Utah teapot tables (512 indices and 290 xyz vertices). It retains source coordinates and z-up orientation; it does not apply three.js `TeapotGeometry`'s fit-lid, Blinn-height, centering or y-up presentation transforms. Editing is disabled while the combined teapot is selected. Net point labels are live HTML overlays. PNG export composites those labels into a copied WebGL canvas. SVG export projects the triangle mesh, curves and labels; it painter-sorts faces by mean projected depth and draws curves after faces, so it is a useful figure export but not a faithful replacement for the WebGL depth buffer in every overlap.

This is an investigation prototype, not a renderer decision. It has not been opened in a browser. WebGL availability, visual depth ordering, drag hit targets, touch interaction, camera behavior, export output, resizing, presentation sizing, and repeated disposal/remount remain unverified. No performance run or physical-device run was made. The implemented `counts()` values are object/triangle statistics, not latency measurements. Do not use this report as evidence that the renderer passes task 02.

## Pinned source and local fixture

`fetch-three.mjs` fetches the official three.js build, `three.core.js`, source teapot tables, and MIT license from immutable commit `0af9729d0c143a86a1d725d6e2c3ad83301f3f34`. It writes the vendored files, generated `teapot-data.json`, and `SHA256SUMS.json` under ignored `.command-logs/patches-three-vendor/`; no package or lock file is changed. The downloaded source retains the three.js copyright and MIT notice, with the Utah teapot / Martin Newell / SPD attribution in `TeapotGeometry.js`. The local source-derived fixture dimensions and sentinels match the reviewed guidance: 32 patches, 512 indices, 290 vertices, first vertex `(1.4, 0, 2.4)`, final vertex `(1.5, -0.84, 0.075)`.

SHA-256 values from the pinned fetch:

| File | SHA-256 |
| --- | --- |
| `three.module.js` | `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a` |
| `three.core.js` | `eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20` |
| `TeapotGeometry.js` | `31ce94a5efe7ff4dbda886b258bcab5a16e2d0e329c9f041eddf3007d2783401` |
| `LICENSE` | `bfe119ea4fd413f5f7ca3fcd63adb0c4a073ed39daa2fe7d3e6b769e21272601` |
| extracted `teapot-data.json` | `e4119319d6eae8caa244ccce20234f624b747ed134a2ea28cbc7a897ae823620` |

## Checks run

- `node --check docs/prototypes/bezier-patches/three-prototype.js` — passed.
- `node --check docs/prototypes/bezier-patches/fetch-three.mjs` — passed.
- A Node math check of tensor Bernstein versus nested de Casteljau gave maximum coordinate error `3.33e-16`; triangular endpoint checks passed.
- Teapot JSON dimension and first/last-vertex checks passed.
- `node docs/prototypes/bezier-patches/fetch-three.mjs` — completed against the pinned commit; generated the local manifest and MIT license copy. Network permission was needed because the default sandbox could not resolve GitHub.

Browser review should start only after the handler grants the exclusive browser window and serves this prototype from an isolated working directory that can serve `.command-logs/patches-three-vendor/` at the matching URL. Compare the same scenes and configurations as the JSXGraph prototype; this implementation has not yet been matched to its full functional harness or performance protocol.
