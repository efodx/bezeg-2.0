# 6. Per-curve geometry cache versions

Spec: [React architecture refactor](../../specs/react-architecture-refactor.md), finding 6. Independent of tasks 1–5; integrates after task 3.

## Goal

Derived geometry is invalidated by the curve and points it depends on, not by one global revision, and `src/bezeg` no longer imports graph-global cache state.

## Scope

- Give mutable model points (`PointImpl` and other mutable `Point` implementations in `src/bezeg/impl/point`) a monotonically increasing `version` incremented on every coordinate change. Function-backed points (whose coordinates are computed) must report a version that changes when their inputs change, or be treated as always-stale; document which.
- Give curves their own version incremented on structural changes (add/remove/replace points, weights, transforms).
- Replace `geometryCache.revision` checks (e.g. `polynomial-bezier-curve.ts`) with a cache key built from the curve's version and its points' versions. Keep the check O(n) in the number of control points with no allocation in the hot path.
- Remove every `geometryCache` import from `src/bezeg/**`. Leave `src/bezeg/cache/GeometryCache.ts` in place for the graph layer until integration; the integrator removes graph-layer calls afterwards.

## Owned files

`src/bezeg/**` and its tests only.

## Acceptance

1. `grep -r geometryCache src/bezeg` finds only the cache module itself (or nothing if it moves).
2. Tests: moving one control point invalidates that curve's cached evaluation and not an unrelated curve's; dependent curves (subdivision, elevation, PH hodograph-derived, spline segments) observe source changes; rational weight changes invalidate.
3. Existing mathematical endpoint/reference, subdivision, elevation and construction tests pass unchanged.
4. `tsc` and Jest pass. Performance measurement per [the performance plan](../../performance-plan.md) on Bézier dragging is done at integration.
