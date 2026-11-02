# 14 — Monotone partition kernel (C3)

Status: accepted 2026-11-02 (geometry handler 33); planned 2026-11-02 (geometry handler 26). Source: [spec C3](../../specs/sweep-algorithms-lessons.md#c3-partitioning-a-polygon-into-monotone-pieces) (both examples, capabilities, acceptance 1–4), [trace model](../../specs/sweep-algorithms-lessons.md#event-queue-and-status-trace-model-batch-s0), [correctness notes](../../specs/sweep-algorithms-lessons.md#correctness-notes), [ADR 0035](../../adr/0035-sweep-coordinates-and-exact-event-order.md). Kind: F1, mathematical review. Depends on 02 (`sweepTrace.ts`, `eventOrder.ts`), `limits.ts`, convexity `predicates.ts` (`orient`, `polygonSimplicity`) and `polygonMeasures.ts` (`doubledSignedArea`). Independent of the triangulation T2 tasks.

Pure TypeScript in `src/compgeo/sweep/monotonePartition.ts`, free of React and JSXGraph. Reference: dBCKO §3.2 (`MakeMonotone`).

## Decisions (handler 26, 2026-11-02)

- **Order and "below".** Events are the polygon's vertices in the family order (decreasing \(y\), ties by increasing \(x\)), through `compareEventPositions` on `RationalPoint`s with denominator 1. Vertex \(p\) is *below* \(q\) when it comes later in that order. Vertex types use this relation, so equal-height vertices follow the tie rule (acceptance 4) without a separate case.
- **Orientation.** A clockwise polygon is processed as its counter-clockwise reversal, as `earClippingTrace` does; every index in the output (vertices, edges, diagonals, pieces) is an **input** index, and the result says `reversed`. Edge \(e_i\) runs from vertex \(i\) to its counter-clockwise successor.
- **Status.** The status holds the edges that have the polygon's interior to their right, left to right at the sweep line. Ordering compares the edges' \(x\) at the current sweep height exactly (cross-multiplication of integers, or `rational.ts`); no double is compared. Status ids are edge ids.
- **Helpers.** `SweepState` has no helper field, so the result carries `helperChanges`: one entry `{event, edge, helper}` per assignment, where `event` is the trace index after which it holds. A pure `partitionStateAt(result, index)` returns `sweepStateAt` plus the helper of every status edge and the current vertex's type. The vertex type is also the `pop` event's note key, so the graph needs no second lookup.
- **Diagonals** are `report` items `[i, j]` (input indices, \(i<j\)), reported in processing order. Pieces are computed after the sweep by walking the planar subdivision of polygon edges plus diagonals, each piece a counter-clockwise list of input indices starting from its top vertex.

## Scope

1. `monotonePartitionTrace(vertices)` returns `{ok: true, trace, types, diagonals, pieces, helperChanges, reversed}` or a typed refusal. Trace kinds: `phase` (start), `pop` per vertex, `status-insert`, `status-remove`, `report` per diagonal, `done`. Each event's `predicateCount` counts its `orient` calls and exact edge comparisons, so the total feeds C4's comparison.
2. Refusals before any trace, in this order: fewer than three vertices, more than `SWEEP_MAX_POLYGON_VERTICES` (20), coordinate refusals (`checkSweepPoints`), non-simple (`polygonSimplicity(vertices, true)`), three consecutive collinear vertices (named vertex index). Never clip or repair.
3. `classifyVertices(vertices)` (exported for the graph and tests): start, end, split, merge, regular, using the order above and `orient` for the interior angle.
4. `isYMonotone(piece, vertices)`: an independent check (one local \(y\)-maximum and one local \(y\)-minimum in the order above, walking the cycle), not derived from the classification code.
5. Tests:
   - The spec's first example \(P=(0,0),(4,3),(8,0),(12,8),(8,5),(4,8)\): types end, split, end, start, merge, start; processing order \((4,8),(12,8),(8,5),(4,3),(0,0),(8,0)\); one diagonal \((4,3)(8,5)\); pieces \((0,0),(4,3),(8,5),(4,8)\) and \((4,3),(8,0),(12,8),(8,5)\), each of doubled area \(40\) (area \(20\)). The merge vertex \((8,5)\) is the helper of the edge to its left before the split vertex is processed (read through `partitionStateAt`).
   - The second example \((4,0),(10,2),(8,5),(12,9),(7,7),(5,12),(3,7),(0,9),(2,4)\) (area \(58\)): types end, regular, regular, start, merge, start, merge, start, regular; no split; each merge vertex gets a diagonal; pieces equal diagonals \(+1\) and areas sum to \(58\). Record the diagonals the kernel finds and recheck them by hand in the report.
   - The same examples given clockwise give the same diagonals in input indices and `reversed: true`.
   - Random simple grid polygons (\(n\le15\), \(|c|\le10\), seeded, bounded attempts as in `earClipping.test.ts`): pieces partition the polygon (doubled areas sum to the shoelace value; pieces \(=\) diagonals \(+1\)); every piece passes `isYMonotone`; every diagonal lies inside the polygon (midpoint strictly inside, no proper crossing or touch with an edge other than at its endpoints) and no two diagonals cross; start\(+\)split equals end\(+\)merge. Require that at least a stated number of the checked polygons contain a split and a merge vertex, so the random set exercises them (star-shaped generation alone may not).
   - Equal heights: a polygon with two vertices at the same height processes them in increasing \(x\) and classifies by the tie rule (one hand-checked case where the rule decides between split and regular).
   - Each refusal, with the named vertex for the collinear case. The trace ends in `done` and its length equals the formula in the module comment.
   - Observed failures under deliberate mutations: ties ordered by decreasing \(x\); the merge-helper rule dropped (no diagonal from a vertex to a merge helper); split and merge swapped in the classification.

Checks: `just unit src/compgeo/sweep --maxWorkers=2`, `just lint src/compgeo/sweep`, `npx tsc --noEmit --pretty false`.

## Evidence (handler 33, 2026-11-02)

- Worker (Sonnet, high effort: exact predicates): `monotonePartition.ts`, `monotonePartition.test.ts`. API: `monotonePartitionTrace`, `classifyVertices`, `isYMonotone`, `partitionStateAt`; the result also carries `order` (the `pop` ids). Trace length \(n+2L+d+2\), with \(L\) the edges whose tail is processed before their head and \(d\) the diagonals; the test recomputes \(L\) independently.
- Spec correction: the first example's processing order ends \((0,0),(8,0)\) by the spec's own tie rule; the spec line 98 and this file listed \((8,0),(0,0)\) and were fixed. Types, diagonal and pieces were unaffected.
- Second example: diagonals \((4,6)\) and \((2,4)\) in input indices; pieces of doubled area 20, 84, 12 (sum 116, area 58). Worker and reviewer each checked this by hand.
- Random: 250 polygons (star and 2-opt generators), 113 with a split, 106 with a merge, 51 with both; floors asserted. The reviewer's throwaway stress run of 8739 small-grid polygons found no failure.
- Mutations, each observed failing then reverted: ties by decreasing \(x\) (6 tests); merge-helper rule dropped (3); split/merge swapped and status sign flipped (suite load failure); split diagonal only to merge helpers (2); no clockwise reversal (4).
- Checks: `just unit src/compgeo/sweep --maxWorkers=2` 109 passed; `just lint src/compgeo/sweep` and `npx tsc --noEmit` clean.
- Mathematical review (Sonnet `bezeg-reviewer`): nothing blocking. **For task 16 (graph):** `setHelper` records the trace index `events.length-1`, so for a regular vertex with interior to its left and no diagonal, `partitionStateAt` shows the new helper already at that vertex's `pop`, one step before its status search. This is acceptable; the graph should know it.
