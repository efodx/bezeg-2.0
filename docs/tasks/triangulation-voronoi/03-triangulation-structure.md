# 03 — Triangulation structure and flip

Status: planned. Source: [spec T0 triangulation structure](../../specs/triangulation-voronoi-lessons.md#triangulation-structure) (option A), [B2](../../specs/triangulation-voronoi-lessons.md#b2-triangulating-a-set-of-points) acceptance 1–3 and 5, [correctness notes](../../specs/triangulation-voronoi-lessons.md#correctness-notes). Kind: F1, mathematical review. Depends on 02.

Pure TypeScript in `src/compgeo/triangulation.ts`, immutable values, no React, JSXGraph or localization.

1. Value: points (`GridPoint[]`), triangles `[v0, v1, v2]` counter-clockwise, and for each triangle `nbr[i]` = the triangle across the edge opposite vertex \(i\) or `-1` on the hull. A constructor from points and a triangle list validates: indices in range, every triangle strictly counter-clockwise, every interior edge shared by exactly two triangles with opposite directions, no edge used more than twice, and that the triangles cover the convex hull with every point used as a vertex (Euler check \(T=2n-2-k\) with \(k\) the hull-boundary count including collinear points, plus area sum equal to the hull's doubled area by `doubledSignedArea`). A typed refusal names the first failure; this is the validator later Preset imports use.
2. Queries: `edges()` (each undirected edge once, flagged interior or hull), `neighbourAcross(t, i)`, `hullEdges()`, counts.
3. `flip(tri, edge)`: succeeds only when the two triangles around the interior edge form a strictly convex quadrilateral (both new triangles strictly counter-clockwise); otherwise a typed refusal (`hull-edge`, `not-convex`), never a degenerate triangle. Returns a new value with neighbours updated; the input is unchanged.
4. `illegalEdges(tri)`: interior edges whose opposite vertex is strictly inside (`incircle > 0`), in lexicographic order of the sorted vertex-index pair.
5. Tests:
   - B2 example \(p_0..p_6=(0,0),(8,0),(9,6),(4,8),(-1,5),(3,3),(6,3)\) with T0 triangles \((1,2,6),(1,5,4),(1,6,5),(2,3,4),(4,0,1),(4,5,6),(6,2,4)\): 7 triangles, 13 edges, 8 interior, 5 hull; illegal edges \(p_1p_4, p_2p_4, p_4p_6\) (spec B3 example 2; counts, orientation and illegal edges rechecked by a handler script 2026-10-31). If the code disagrees with these spec numbers, stop and report.
   - Sample 1 of convexity (nine points, six on the hull boundary): any valid triangulation has \(10\) triangles.
   - Random general-position grid sets: start from a fan or any constructed triangulation, apply random legal flips; counts stay \(2n-2-k\) and \(3n-3-k\), the validator accepts every intermediate value.
   - Flip refusal on a non-convex quadrilateral and on a hull edge; a quadrilateral with three collinear corners counts as not strictly convex.
   - Validator refusals: clockwise triangle, missing point, overlapping triangles, wrong count.
   - Observed failures under two deliberate mutations.

Checks: `just unit src/compgeo --maxWorkers=2`, `just lint src/compgeo`, `npx tsc --noEmit --pretty false`.
