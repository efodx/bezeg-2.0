# Idempotent "Fit to points"

Scope: make the graph workspace "Fit to points" action (`navigateBoard('fit')` in `src/graphs/base/BaseGraph.tsx`) produce the same view when pressed repeatedly, without changing curve mathematics, routes, or preset contracts.

## Problem

The action delegates to JSXGraph 1.9.2 `board.zoomAllPoints()`, which is not idempotent:

- The 50px margin is converted to user units with the scale *before* the fit (`border / this.unitX`), so each press uses a different margin until the view converges.
- With `keepaspectratio`, `setBoundingBox` chooses the axis to fit by comparing the requested box's width and height instead of comparing the box's aspect ratio with the canvas aspect ratio, so points can be clipped on the other axis.
- The min/max accumulators start at 0, so the origin is always included even when no point is near it.

## Behavior

- The fitted bounding box is a pure function of the visible points' user coordinates and the canvas size in pixels. The current view does not affect it, so pressing the button repeatedly produces the same box.
- Every visible point lies inside the view with a fixed pixel margin (50px, reduced on small canvases so the content area stays positive).
- The x and y axes keep equal scale (the board uses `keepAspectRatio: true`). The limiting axis is chosen by comparing the point extent with the available canvas area, and the points are centered on the other axis.
- The origin is not forced into the view. This is a deliberate behavior change: the fit now frames only the points.
- A single point or coincident points use a minimum extent so the fit does not zoom to an unbounded scale.
- With no visible points, the action does nothing, as it does now.

## Acceptance

- A pure helper, independent of React and JSXGraph, computes the box and has unit tests covering: idempotence (applying the fit to its own output gives the same box), wide and tall point sets on wide and tall canvases with no clipping and the expected margin, origin exclusion, single-point and collinear inputs, and small canvases.
- `navigateBoard('fit')` uses the helper and applies the box so that a second press does not change `board.getBoundingBox()`.
- `npx tsc --noEmit --pretty false`, the focused unit tests, and the production build pass.
