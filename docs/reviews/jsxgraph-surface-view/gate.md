# Task 01 feasibility gate: JSXGraph surface view

Date: 2026-10-29. Source: [criterion 1](../../specs/jsxgraph-surface-view.md#acceptance-criteria), [task 01](../../tasks/jsxgraph-surface-view/01-feasibility-gate.md).
Status: **passed under owner option A (2026-10-30).** The criterion's literal metric passes, but the visible-update and frame-interval evidence shows a miss for the teapot and a weaker result than the metric suggests for tensor and triangular. The owner chose option A below: [ADR 0019](../../adr/0019-jsxgraph-surface-view.md) is accepted with the `board2d` strategy, and the gate code becomes the base for task 02.

## What was measured

- Adapter: `JsxSurfaceView` at commit `92f06f6` (`src/graphs/patches/surface-view/jsx*.ts`), selected at build time by `VITE_SURFACE_VIEW` (`jsx-board2d`, `jsx-view3d`; unset keeps Three). Both strategies paint back to front, reuse elements across frames and reproject only on a camera change. Projection agrees with `view3d.project3DTo2D` to 5.7e-13 over 250 random projections.
  - `board2d`: the adapter projects triangles and segments itself and writes the SVG paths of plain 2D curves; control points stay `point3d` for JSXGraph's built-in drag.
  - `view3d`: every drawable is a `view3d` element.
- Harness: [`measure-app.mjs`](../../prototypes/jsxgraph-surface-view/measure-app.mjs), adapted from the ADR 0018 harness to drive the production app routes (`/patches/tensor`, `/patches/triangular`, `/patches/joins` teapot capstone) through the UI. Same p95 definition, 16 pointermoves per gesture, two fresh-context repetitions, desktop 1440×1000 and narrow 390×844, iso/shading 8/8 and 16/16, constructions shown. A Three build of the same revision was measured as a same-harness reference.
- Host: Windows 11 x64, AMD Ryzen 5 7600, headless Chromium 156.0.8078.4, JSXGraph 1.14.1.
- Raw records: [gate-2026-10-29/measure.json](gate-2026-10-29/measure.json), [summary.json](gate-2026-10-29/summary.json), [depth screenshots](gate-2026-10-29/depth/) (2 strategies × tensor, triangular, joins, teapot × 4 presets). 120 runs: 92 complete, 0 failed, 28 inapplicable drags skipped (teapot is read-only; Three has no DOM points).

## Results (orbit, p95 ms)

"Next rAF" is the gate metric (pointermove → next `requestAnimationFrame`). "Visible" is a proxy added in this run: pointermove → first frame after the last DOM mutation it caused. "Frame" is the active rAF interval p95.

| Strategy | Kind | Density | Next rAF (desktop / narrow) | Visible (desktop / narrow) | Frame (desktop / narrow) |
| --- | --- | --- | ---: | ---: | ---: |
| board2d | tensor | 8 | 3.3 / 2.7 | 34.0 / 33.7 | 16.7 / 16.7 |
| board2d | tensor | 16 | 3.6 / 3.4 | 49.5 / 50.0 | 16.8 / 16.7 |
| board2d | triangular | 8 | 3.2 / 2.8 | 33.8 / 33.7 | 16.8 / 16.7 |
| board2d | triangular | 16 | 3.3 / 3.3 | 49.4 / 49.4 | 16.7 / 16.7 |
| board2d | teapot | 8 | 6.3 / 6.7 | 111.5 / 128.1 | **100.0 / 100.0** |
| view3d | tensor | 8 | 3.0 / 3.2 | 49.0 / 49.5 | 16.7 / 16.8 |
| view3d | tensor | 16 | 3.7 / 3.6 | 83.1 / 83.8 | 33.4 / 33.4 |
| view3d | triangular | 8 | 3.4 / 3.1 | 49.9 / 49.7 | 16.7 / 16.7 |
| view3d | triangular | 16 | 3.5 / 4.3 | 100.7 / 100.7 | 33.4 / 50.0 |
| view3d | teapot | 8 | 7.8 / 7.9 | 332.0 / 299.1 | **166.7 / 166.7** |
| three (ref.) | all | 8, 16 | 2.1–3.1 | 17.2–18.3 (label overlay only) | 16.7–16.8 |

Drag (reported only, owner-accepted): board2d p95 6.6–12.7 ms, view3d 14.5–31.5 ms on the gate metric. In all 32 measured drags the camera stayed fixed and only the target point moved.

## Interpretation

1. **The gate metric does not see the draw.** The adapter defers drawing from `reconcile` to a `requestAnimationFrame` (`jsxSurfaceView.ts:297`), so the input handler returns quickly and the next rAF fires before the redraw. The ADR 0018 prototype drew synchronously, which is why its numbers (orbit p95 51.9 ms tensor) were comparable to the visible proxy here rather than to the gate metric. A literal pass is therefore not evidence that orbit meets the 16.7 ms budget.
2. **board2d is the better strategy** in every cell. For tensor and triangular it keeps a 60 fps frame cadence during orbit at both densities, with 2 frames of visible latency at density 8 and 3 at 16 (Three: about 1). Drawing synchronously for camera-only changes should remove one of those frames; that is unmeasured.
3. **Teapot misses.** board2d orbits the 32-patch teapot at about 10 fps (frame p95 100 ms), roughly 6× over budget, and view3d at about 6 fps. This is drawing cost, not scheduling.
4. **Depth is not yet acceptable.** At the top preset of joins (board2d) the right patch's interior `net-2` segments are cut by the surface although nothing lies above them. Tensor isometric and the teapot presets show no obvious failure. All presets frame the content at about a third of the host, smaller than Three (camera mapping; task 02).
5. **Defect:** a first press on an unselected control point never drags (32/32 cold attempts): the `select` edit (`jsxSurfaceView.ts:548`) leads to a rebuild during the gesture. A second press drags exactly. Fix before any acceptance of interaction (task 04).

## Decision needed (criterion 1)

The spec reserves this choice to the owner. Handler recommendation: option A.

- **A. Adjust budget/defaults and continue with board2d.** Accept tensor/triangular orbit at 60 fps with up to 2–3 frames of latency (to be reduced by synchronous camera redraw), and make the teapot capstone a reduced case: for example, draw the teapot at a lower tiling while orbiting and full tiling when settled, or accept ~10 fps teapot orbit as a stated limitation. ADR 0019 accepted on that basis; tasks 02–07 proceed.
- **B. Accept the misses as an explicit user-visible tradeoff** without changing defaults (teapot orbit ~10 fps, 2–3 frame orbit latency elsewhere).
- **C. Stop** and take the fallback: keep Three and restyle it with the 2D graph tokens.
