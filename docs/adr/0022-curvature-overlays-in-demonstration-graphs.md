# 0022 Curvature overlays live in Demonstration graphs

Status: accepted, 2026-10-31. Context: [Geometry of curves lessons](../specs/curve-geometry-lessons.md#implementation-decisions), [tasks](../tasks/curve-geometry/README.md).

## Context

The curve-geometry lessons draw curvature quantities (Frenet frame, osculating circle, comb, evolute, offset) over Bézier and spline curves. The shared graphs `BezierCurveGraph`, `C1SplineGraph`, `C2SplineGraph` and `G1SplineGraph` serve existing routes, lessons and Presets, and Platform tasks A4/A6 are changing the spline adapter and curve-editing gestures at the same time.

## Decision

Each curve-geometry Demonstration has its own graph class that subclasses the shared graph it reuses and composes one overlay object. The overlay owns its JSXGraph elements, reads curvature only through `src/bezeg/impl/curve/curvature.ts`, and is disposed by the graph on unmount, graph switch and lesson exit. The shared graph classes are not edited.

## Alternatives

- **Overlay mixin on the shared graphs** (a toggle available on every Bézier and spline route). Rejected: it changes classes that existing users and Platform A4/A6 depend on, adds per-drag cost or branches to every route, and its disposal would need checking on routes outside this family.
- **Standalone graphs without subclassing** (re-implementing curve editing). Rejected: duplicates point editing and spline rules that the shared graphs already own.

## Consequences

- Existing routes and stored Presets are unchanged; dragging cost on them cannot change.
- If a later need puts curvature on the shared routes, the overlay object moves as-is; only the attachment point changes.
- Subclasses rebase over Platform's A4/A6 changes; spline subclasses wait for `G-CURVE`.
