# JSXGraph behind the surface-view adapter

Status: accepted, 2026-10-30 (owner, gate option A); implemented and the only surface view since 2026-10-30 (task 07, `3ea1645`), amended below. Supersedes [ADR 0018](0018-three-surface-view-adapter.md). Source: [JSXGraph surface view](../specs/jsxgraph-surface-view.md), [task 01 gate](../reviews/jsxgraph-surface-view/gate.md).

Draw Bézier patch views with JSXGraph 1.14.1 instead of Three.js, behind the unchanged `SurfaceView` adapter interface, so 2D curves and 3D patches share one renderer, look and interaction feel (owner decision, 2026-10-29). ADR 0018's interface and ownership rules stay in force; only the renderer behind them changes. [Task 07](../tasks/jsxgraph-surface-view/07-switch-over.md) removed the Three view and the `three` dependency.

## Decision

Use the `board2d` strategy: one JSXGraph board per attachment. The adapter projects mesh triangles, planes and line segments itself from `SurfaceCamera` and writes the paths of reused 2D curve elements in painter's order. Control points and markers are `view3d` `point3d` elements, so picking, dragging (vertical with Shift) and touch are JSXGraph's built-in behaviour. The adapter's projection agrees with `view3d.project3DTo2D` (5.7e-13 over 250 random projections at the gate).

## Amendment (2026-10-30, task 03D)

Two parts of the decision changed during task 03; the [03D record](../reviews/jsxgraph-surface-view/measure-2026-10-30-03d.md) has the measurements.

- **Drawables are adapter-owned SVG nodes, not 2D curve elements.** Meshes, planes and segments are `<polygon>`/`<polyline>` nodes that the adapter creates in JSXGraph's layer group and writes through `points`. In Chromium a path's `d` is a CSS property, so writing it cost about 4 µs of style recalculation per element (46 ms per teapot frame). Each drawable has one fixed-order slot; a frame writes the k-th farthest drawable into slot k instead of reordering nodes. Control points and markers stay `view3d` `point3d` elements, as decided.
- **Camera redraws are drawn in the next animation frame, not synchronously.** The gate tradeoff planned a synchronous draw to remove the deferred frame. On the same revision, visible latency was equal (1 frame at density 8, 2 at density 16, median), while the synchronous draw held the pointermove task for 10–17 ms; the frame-aligned draw also coalesces wheel input. Teapot orbit now reaches about 29 draws/s, the probe's input ceiling (about 10 fps at the gate).

## Alternatives

- **`view3d` for every drawable.** Measured slower in every gate cell: frame p95 33–50 ms at density 16 and about 6 fps teapot orbit, against 16.7 ms and about 10 fps for `board2d`.
- **Keep Three and restyle it** with the 2D tokens. Cheaper and inside budget, but it keeps two renderers with different interaction and export. This remains the fallback if later tasks fail.

## Accepted tradeoffs (gate option A)

The gate's literal metric passed, but the visible-update evidence did not fully meet the 16.7 ms orbit budget. The owner accepted:

- Tensor and triangular orbit at a 60 fps cadence with up to 2–3 frames of visible latency (Three: about 1). Tasks 02–03 re-measured; camera-only changes stay frame-aligned (see the amendment).
- The 32-patch teapot orbits at reduced detail and redraws at full detail once the camera settles. Full-detail orbit measured about 10 fps at the gate; after task 03D the reduced-detail orbit reaches about 29 draws/s.
- Drag latency is recorded, not gated. JSXGraph's touch drift is a known limitation; the numeric x/y/z editor stays the exact path.

## Consequences

Patch views export through the 2D SVG → PNG path without a tainted canvas. Figure SVG export still embeds the captured raster with vector labels ([task 05](../reviews/jsxgraph-surface-view/labels-export.md)); a vector surface remains possible. `AttachOptions.onContextLost/Restored` and the `three` dependency were removed in task 07. Painter's order is approximate: segments are split at mesh resolution, and depth is accepted per preset by an automated and a screenshot check (criterion 3).
