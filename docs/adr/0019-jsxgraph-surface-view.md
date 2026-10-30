# JSXGraph behind the surface-view adapter

Status: accepted, 2026-10-30 (owner, gate option A). Supersedes [ADR 0018](0018-three-surface-view-adapter.md). Source: [JSXGraph surface view](../specs/jsxgraph-surface-view.md), [task 01 gate](../reviews/jsxgraph-surface-view/gate.md).

Draw Bézier patch views with JSXGraph 1.14.1 instead of Three.js, behind the unchanged `SurfaceView` adapter interface, so 2D curves and 3D patches share one renderer, look and interaction feel (owner decision, 2026-10-29). ADR 0018's interface and ownership rules stay in force; only the renderer behind them changes. Three remains the default until [task 07](../tasks/jsxgraph-surface-view/07-switch-over.md) switches over and removes it.

## Decision

Use the `board2d` strategy: one JSXGraph board per attachment. The adapter projects mesh triangles, planes and line segments itself from `SurfaceCamera` and writes the paths of reused 2D curve elements in painter's order. Control points and markers are `view3d` `point3d` elements, so picking, dragging (vertical with Shift) and touch are JSXGraph's built-in behaviour. The adapter's projection agrees with `view3d.project3DTo2D` (5.7e-13 over 250 random projections at the gate).

## Alternatives

- **`view3d` for every drawable.** Measured slower in every gate cell: frame p95 33–50 ms at density 16 and about 6 fps teapot orbit, against 16.7 ms and about 10 fps for `board2d`.
- **Keep Three and restyle it** with the 2D tokens. Cheaper and inside budget, but it keeps two renderers with different interaction and export. This remains the fallback if later tasks fail.

## Accepted tradeoffs (gate option A)

The gate's literal metric passed, but the visible-update evidence did not fully meet the 16.7 ms orbit budget. The owner accepted:

- Tensor and triangular orbit at a 60 fps cadence with up to 2–3 frames of visible latency (Three: about 1). Tasks 02–03 draw camera-only changes synchronously to remove the deferred frame and re-measure.
- The 32-patch teapot orbits at reduced detail and redraws at full detail once the camera settles. Full-detail orbit measured about 10 fps.
- Drag latency is recorded, not gated. JSXGraph's touch drift is a known limitation; the numeric x/y/z editor stays the exact path.

## Consequences

Patch views export through the 2D SVG → PNG path without a tainted canvas, and can export vector surfaces. `AttachOptions.onContextLost/Restored` and the `three` dependency go away in task 07. Painter's order is approximate: segments are split at mesh resolution, and depth is accepted per preset by an automated and a screenshot check (criterion 3).
