# Prototype repair report — 2026-10-26

Phase closeout timestamp: 2026-10-26T18:57:17Z. Acceptance remains partial. The handler needed an exclusive browser window for the final drag timing, so I stopped the functional run and local server before cleanup, touch, and final export checks completed.

The verified browser page was served at `http://127.0.0.1:4181/docs/prototypes/bezier-patches/` from `.command-logs/patches-acceptance`; its `node_modules/jsxgraph/package.json` reports 1.14.1. The page loaded that copy's `../../../node_modules/jsxgraph/distrib/jsxgraphcore.js`. All prototype edits remain in `docs/prototypes/bezier-patches/`.

Repairs made:

- Rebuilds use `view3d.removeObject()` for 3D elements and retain the edited net across same-kind display rebuilds.
- Triangular mesh faces rebuild on point release, so the rebuild does not destroy the projected point during its drag.
- SVG and PNG export serialize visible JSXGraph HTML labels into SVG text. PNG waits for encoding and reports failure if encoding returns no blob.
- `verify-functional.mjs` checks nonempty rendering, actual pointer movement and surface output, camera stability, inset construction, exports, resize/presentation, lifecycle/listener counts and touch input.

Observed browser evidence on JSXGraph 1.14.1: tensor mouse drag moved point 0 from `[-3, 3, 0.1475589]` to `[-1.9346780, 4.2910666, 0.1475589]`; the rendered surface path changed and the camera stayed fixed. XY-mode preserved height. z-mode changed height while preserving horizontal coordinates and camera. Mouse orbit, keyboard orbit, tensor and triangular inset drags, their `P(u,v)` constructions, the 64-face triangular mesh, and a mesh control-point drag all passed their assertions after repairs.

SVG export initially failed the acceptance check: the 740,329-byte SVG contained surface fill but no labels because JSXGraph placed its labels in sibling `.JXGtext` elements. The export now copies visible labels into SVG text. The rerun reached export and then remained active past the handler's 18:57 window; it was stopped. Export after the repair, PNG pixel content, presentation/resize, three dispose/remount cycles, listener stability, and touch orbit/z drag remain unverified. No performance measurements were taken.

Checks: `node --check` passed for `prototype.js`, `server.mjs`, and `verify-functional.mjs`. The interrupted browser command was `node docs/prototypes/bezier-patches/verify-functional.mjs`. Server session 92728 and Playwright session 62038 were stopped; port 4181 is free.
