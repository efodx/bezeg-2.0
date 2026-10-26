# 04 — Extend points to 3D with planar guards

Status: complete (2026-10-26, accepted18:58UTC). Independent mathematical/engineering reviews, full `just check` (3773tests), and pinned-runtime matched drag checks pass; see [evidence](../../reviews/bezier-patches/3d-points.md). The apparent baseline sketch failure was a dependency mismatch, resolved in isolated verification without changing the assertion. Source: [spec P4, D5](../../specs/bezier-patches.md#shared-geometry-contract). Dependencies: 03 merged. Role: geometry owner.

Let polynomial and rational curves hold 3D control points, so patches can reuse them for boundaries and iso-curves. Planar-only code must not silently lose `z`. No rendering, routes, Presets or UI change.

1. Add an optional `Z(): number` (absent means `0`) to `Point` (`src/bezeg/api/point/point.ts`). `PointImpl` gets an optional `z`, numeric or function-backed like `x`/`y`. A `z` change stamps the point's version. `FixedPoint` follows the same rules. Prefer a type split, with `Point3` for 3D-aware APIs and planar APIs keeping `Point`, if it gives compile-time guards without widespread casts. Record the choice in the review file.
2. Carry `z` through the curve edges that task 03 left in the curve classes: row extraction in `eval`/`evaluatePoint`, `decasteljauScheme`, `subdivide`, `extrapolate` and `elevate`. 2D inputs must still take the 2D fast path and produce identical results.
3. Guard the planar-only entry points so a point with nonzero `z` is rejected by type or with a clear runtime error:
   - PH curves (`ph-bezier-curve.ts`, `ph-math.ts`);
   - `convexHull`, `chordKnots`, `boundingBoxOf`, `distance` in `geometry.ts`, unless trivially generalised with tests;
   - spline schemes;
   - curve DTO conversion and `ClassMapper`;
   - `ModelPointBinding` and the JSXGraph curve adapters.

   List each guarded entry point in the review file.
4. Tests:
   - 3D polynomial and rational curves: evaluation vs the Bernstein sum, subdivision, extrapolation and elevation in 3D;
   - `z` edits invalidate caches through version stamps, and function-backed `z` behaves like function-backed `x`/`y`;
   - each guard rejects a nonzero `z`;
   - all existing 2D tests pass with unchanged expectations.

Completion:
- `just check` passes;
- the guard inventory and test evidence are in `docs/reviews/bezier-patches/3d-points.md`;
- the drag measurement shows no 2D regression;
- `docs/current-architecture.md` is updated: points may carry `z`, planar-only code is guarded;
- the 3D-points item is recorded in `docs/roadmap.md` as delivered.

No smoke test is needed. One commit, `feat: optional z coordinate for Bézier control points`.
