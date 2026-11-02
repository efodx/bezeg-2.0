# 11 — Point insertion into a triangulation and boundary counts (T2 kernel, F1)

Status: open (task file written 2026-11-02, geometry handler 25). Source: spec [B2](../../specs/triangulation-voronoi-lessons.md#b2-triangulating-a-set-of-points) (capabilities "add-point-and-retriangulate by the T0 insertion rule", acceptance 2, 4, 5), [triangulation structure](../../specs/triangulation-voronoi-lessons.md#triangulation-structure), [Delaunay construction](../../specs/triangulation-voronoi-lessons.md#delaunay-construction). Kind: F1 (pure kernel), mathematical review. Depends on 03 (`src/compgeo/triangulation.ts`) and 04 (`src/compgeo/delaunay.ts`), both accepted.

The accepted kernels build a triangulation from scratch (`incrementalTriangulation`) and flip edges, but B2 step 5 adds a point to the **current** triangulation, which may have been flipped away from the T0 start. Pure TypeScript beside the existing functions (no React, JSXGraph, localization or graph state).

1. **`insertPoint(tri, q)`** returns `{ok: true, value, change}` or a typed refusal, never mutating `tri`. `q` is a grid point (validated as the other kernels do); the result has `tri.points` plus `q` as the last index and must pass `createTriangulation`.
   - `q` strictly inside a triangle: that triangle becomes three (\(+2\) triangles).
   - `q` in the relative interior of an interior edge: both neighbouring triangles split in two (\(+2\)).
   - `q` in the relative interior of a hull edge: the one triangle splits in two (\(+1\)); `q` becomes a collinear boundary point.
   - `q` outside the boundary: joined to every boundary edge it sees strictly (`orient(a, b, q) < 0` for the counter-clockwise boundary), the same rule `incrementalTriangulation` uses for a new lexicographic maximum; an edge collinear with `q` is not joined, so no degenerate triangle arises. Visible edges of the (weakly convex) boundary are contiguous; assert this and throw an internal error otherwise. Share the visibility code with `incrementalTriangulation` instead of copying it, without changing its output (its tests stay green unmodified).
   - Refusals: `duplicate-point` (q equals an existing point) and `too-many-points` (above `DELAUNAY_MAX_POINTS`).
   - `change` reports which case applied (`inside`, `interior-edge`, `hull-edge`, `outside`) so the graph can explain the count change.
2. **`boundaryCount(tri)`** returns `{k, corners, collinear}`: `k` is the number of points on the hull boundary (hull edges of the triangulation, so collinear boundary points count), `corners` the strict hull vertices and `collinear = k − corners`. The B2 readout uses it for \(2n-2-k\) and \(3n-3-k\) and the "collinear boundary points are counted" note (acceptance 5).
3. **Tests** (`triangulation.test.ts` or a new `pointInsertion.test.ts`):
   - B2 example \(p_0..p_6\) in T0 (the spec's triangle list, built with `createTriangulation`): 7 triangles, 13 edges, 8 interior, `boundaryCount` \(k=5\), no collinear. The spec's sample 1 (nine hull-lesson points): \(k=6\), one collinear, 10 triangles.
   - Each insertion case on a hand example, with the exact triangle count change and validity.
   - Random general-position and random collinear-rich grid sets (\(n\le15\), bounded attempts, at least a few hundred): build `incrementalTriangulation`, apply random legal flips (`flip` until a bounded number succeed), then insert random grid points; after every step the counts equal \(2n-2-k\) triangles and \(3n-3-k\) edges with `k` from `boundaryCount`, every triangle is strictly counter-clockwise, the triangle areas sum to the hull area, and no point lies strictly inside a triangle it is not a vertex of (B2 acceptance 2 and 4).
   - Refusals; the input triangulation is unchanged after every call (deep-equal snapshot).
   - Observed failures under two deliberate mutations, for example: joining collinear-visible hull edges (creates a degenerate triangle or a refusal from `createTriangulation`) and treating an on-edge point as inside one triangle.

Not in scope: graphs, routes, Lawson changes (04 is accepted as is).

Checks: `just unit src/compgeo --maxWorkers=2`, `just lint src/compgeo`, `npx tsc --noEmit --pretty false`.
