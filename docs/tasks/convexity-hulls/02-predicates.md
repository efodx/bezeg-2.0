# 02 — Predicate module

Status: accepted 2026-10-31. Math review: no blocking findings; deferred: `polygonSimplicity` has hand-picked cases only, no brute-force reference (low risk; revisit if a dependent family relies on its offending-pair output). Full unit suite runs at task 06. Source: [spec §1 predicate module](../../specs/convexity-hulls-lessons.md#1-predicate-module-and-robustness-policy), [ADR 0021](../../adr/0021-exact-grid-predicates.md), A5 acceptance 1. Kind: F1, mathematical review.

Pure TypeScript in `src/compgeo/`, no React, JSXGraph, localization or graph-global state. Builds on `src/compgeo/grid.ts` (`GridPoint`, `GRID_COORD_LIMIT`, `assertGridPoint`; do not change its exports).

1. `predicates.ts`:
   - `orientValue(a, b, c): number`, the exact determinant \((b_x-a_x)(c_y-a_y)-(b_y-a_y)(c_x-a_x)\); `orient(a, b, c): -1 | 0 | 1`, positive for a counter-clockwise turn. Both reject non-grid input (`assertGridPoint`).
   - `onSegment(p, a, b): boolean` — \(p\) on the closed segment \(ab\) (degenerate \(a=b\) allowed).
   - `segmentIntersection(a, b, c, d)` returning a discrete outcome: `'none' | 'proper'` (interiors cross at one point) ` | 'touch'` (one segment's endpoint lies on the other, not overlapping) ` | 'overlap'` (collinear with a common sub-segment of positive length). Never returns coordinates.
   - `polygonSimplicity(vertices, closed)` returning `{simple: true}` or `{simple: false, edges: [i, j]}` naming the first offending pair of edges (by edge index). Non-adjacent edges must not meet at all; adjacent edges may share only their common vertex (no overlap); repeated consecutive vertices are non-simple. Fewer than 3 vertices in a closed polygon is non-simple; an open chain is checked as a polyline.
   - Module doc comment: exactness bound per predicate (degree two, \(|c|\le 2^{25}\)), and the reserved `incircle` extension point (degree four, exact in doubles up to \(2^{11}\), `BigInt` above; implemented by the triangulation family — do not implement it here).
2. `inexactOrientation.ts` (A5 teaching only): `orientNaiveDouble(px, py, qx, qy, rx, ry): number` evaluating the same formula in doubles on arbitrary numbers (no grid check), and `orientExactDyadic(...)` returning the exact sign for dyadic inputs via `BigInt` scaling. Doc comment: inexact by design, never used by an algorithm.
3. Tests (`predicates.test.ts`, `inexactOrientation.test.ts`) against an independent `BigInt` reference written in the test:
   - `orientValue` equals the reference over a grid sweep (for example all triples on \([-3,3]^2\) plus random triples near \(\pm 2^{25}\)); swapping two arguments negates; the bound itself is exact (`a`, `b`, `c` at \(\pm 2^{25}\)); \(2^{25}+1\), \(0.5\), `NaN` throw.
   - Spec A1 values: \(p=(0,0), q=(4,0)\) with \(r=(3,2)\to+8\), \((3,-2)\to-8\), \((2,0)\to0\).
   - `segmentIntersection` and `onSegment` against a brute-force rational reference on all segment pairs over a small grid (include collinear, shared endpoints, \(T\) junctions and zero-length segments).
   - `polygonSimplicity`: square, notched pentagon \((0,0),(6,0),(6,4),(3,2),(0,4)\) simple; bow-tie and a pentagram non-simple; a polygon that doubles back along an edge non-simple.
   - Kettner (handler-verified 2026-10-31 with `node`): \(q=(12,12)\), \(r=(24,24)\), \(p=(0.5+i\,2^{-53},0.5+j\,2^{-53})\), \(0\le i,j<64\), evaluated as `orient(p, q, r)` (pivot \(p\)). Exactly 112 cases where the double sign is nonzero and differs from the exact sign, and 2052 false zeros; \(i=41,j=48\) has exact value \(\approx+9.3259\times10^{-15}\) and double value \(\approx-5.6843\times10^{-14}\). Other pivots give different counts, so keep \(p\) as the pivot.
   - Record an observed failure of the new tests under a deliberate mutation (for example `<=` for `<` in `onSegment`, or a sign swap in `orientValue`).

Checks: `just unit src/compgeo`, then the full unit suite once; `npx tsc --noEmit --pretty false`. No UI, no smoke.
