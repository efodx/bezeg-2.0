# 07 — Polygon area and lattice-count kernel

Status: planned. Source: [spec A2](../../specs/convexity-hulls-lessons.md#a2-polygon-area-and-picks-theorem), [correctness notes](../../specs/convexity-hulls-lessons.md#correctness-notes), [batch-wide gate](../../specs/convexity-hulls-lessons.md#batch-wide-acceptance-gate). Kind: F1, mathematical review. Depends on 02. Batch 1, not gated.

Pure TypeScript in `src/compgeo/` (suggested `polygonMeasures.ts`), independent of React, JSXGraph and localization. Inputs are `GridPoint` vertex lists in order, polygon closed. Reuse `orientValue`, `onSegment` and `polygonSimplicity` from `predicates.ts`; do not change their contracts.

1. **Doubled signed area** (shoelace sum without the \(\tfrac12\)) as an exact integer, plus the per-triangle doubled areas of the fan from vertex 0 (they sum to the shoelace value; the A2 fan overlay draws them). State the exactness bound for the accepted grid range (`GRID_COORD_LIMIT`) and at most 40 vertices; if a double can exceed \(2^{53}\) there, accumulate exactly (for example in `bigint`) or refuse with a reason. Do not return a rounded value.
2. **Boundary count** \(B=\sum \gcd(|\Delta x|,|\Delta y|)\) over the closed edges.
3. **Interior count** \(I\): lattice points strictly inside, counted on the bounding box with an exact point-in-polygon test (crossing rule with a half-open \(y\) rule, using integer predicates) that excludes points on an edge (`onSegment`). It must not use \(B\) or Pick. Refuse (typed reason, not a throw) when the bounding box holds more than a stated number of lattice points, so the scan stays cheap. A3 (Batch 2) owns the general point-in-polygon kernel; keep this helper small and named so A3 can replace or reuse it.
4. **Result type** for the readout: a discriminated union. Simple polygon (`polygonSimplicity` says simple, \(n\ge3\)): doubled signed area, orientation (CCW / CW / degenerate zero), \(B\), \(I\) and Pick's value \(2I+B-2\) compared with the doubled area (a boolean computed by comparison, never by derivation). Non-simple: only the doubled signed sum, with a kind that the UI labels "signed sum of winding number times area"; no \(B\)/\(I\)/Pick. \(n<3\) or open polygon: a kind with no area claim.
5. Tests (`polygonMeasures.test.ts`):
   - Hull pentagon \((-1,3),(0,0),(4,0),(5,3),(2,5)\): doubled area \(42\), \(B=8\), \(I=18\), Pick \(42\). Notched pentagon \((0,0),(6,0),(6,4),(3,2),(0,4)\): doubled \(36\), \(B=16\), \(I=11\). (Numbers checked by two independent scripts on 2026-10-31.) If the kernel disagrees, stop and report rather than adjusting either side.
   - Reversing the vertex order negates the signed area, keeps \(|A|\), \(B\) and \(I\); rotating the start vertex changes nothing.
   - Crossed quadrilateral \((0,0),(6,0),(0,6),(3,6)\): non-simple kind, doubled signed sum \(18\) (lobes \(+12\) and \(-3\), so \(2(12-3)\)). Symmetric bow-tie \((0,0),(4,4),(4,0),(0,4)\): \(0\).
   - Pick holds on a few hundred random simple lattice polygons (generate, keep those `polygonSimplicity` accepts), with \(I\) from the scan; boundary points never counted in \(I\); a polygon with collinear consecutive vertices.
   - Exactness at the extreme corners of the grid range (or the refusal), degenerate zero-area polygon, \(n\in\{0,1,2\}\), the interior-scan refusal.
   - Observed failure under a mutation (for example counting boundary points as interior, or dropping the half-open rule).

Checks: `just unit src/compgeo --maxWorkers=2`, `just lint src/compgeo`, `npx tsc --noEmit --pretty false`.
