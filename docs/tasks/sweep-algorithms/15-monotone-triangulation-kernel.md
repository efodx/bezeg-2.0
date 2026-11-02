# 15 — Monotone triangulation kernel (C4)

Status: accepted 2026-11-02 (geometry handler 33); planned 2026-11-02 (geometry handler 26). Source: [spec C4](../../specs/sweep-algorithms-lessons.md#c4-triangulating-a-monotone-polygon) (example, steps 6–7, acceptance 1–4), [implementation decisions](../../specs/sweep-algorithms-lessons.md#implementation-decisions) (the ear-clipping trace reused for the comparison), [correctness notes](../../specs/sweep-algorithms-lessons.md#correctness-notes). Kind: F1, mathematical review. Depends on 14 (`monotonePartitionTrace`, `isYMonotone`, the event order) and triangulation 06 (`earClippingTrace`, accepted).

Pure TypeScript in `src/compgeo/sweep/monotoneTriangulation.ts`, free of React and JSXGraph. Reference: dBCKO §3.3 (`TriangulateMonotonePolygon`).

## Decisions (handler 26, 2026-11-02)

- **Stack as status.** The stack is the sweep state's `status` list, bottom to top, so `sweepStateAt` folds it with no new event kind: a push is `status-insert` at the end, a pop is `status-remove`. Each vertex is a `pop` event (queue order of task 14); each visibility test is a `neighbour-test` between the new vertex and the stack vertex it would connect to, with outcome `visible` or `blocked`, decided by one `orient` call; each diagonal is a `report` item `[i, j]` in input indices.
- **Chains.** Each vertex of the piece gets `left`, `right` or `top`/`bottom` from the counter-clockwise order between the top and bottom vertices; returned as `chains` for the side list.
- **Combined trace for free exploration (step 7).** `partitionAndTriangulate(vertices)` runs task 14 and then this kernel on each piece in the order task 14 lists them, and returns both traces with their offsets in one sequence, plus the final triangles and the diagonal count. A monotone input yields zero partition diagonals and one piece, so "partition first" costs nothing visible (acceptance 3).
- **Comparison counts** are the totals of `predicateCount` over each trace: the combined monotone total (partition plus triangulation) and `earClippingTrace` on the same polygon. A count on small inputs illustrates; the module comment and the lesson do not claim it proves the growth rates.

## Scope

1. `monotoneTriangulationTrace(vertices, piece?)`: triangulates a \(y\)-monotone polygon (or one piece given as input indices) and returns `{ok: true, trace, triangles, diagonals, chains}` or a refusal (`not-monotone` when `isYMonotone` fails; the refusals of task 14 for the polygon itself). Triangles are counter-clockwise triples of input indices.
2. `partitionAndTriangulate(vertices)` as decided, returning `{partition, pieces: [{piece, result}], triangles, diagonals, counts: {monotone, earClipping}}`.
3. Tests:
   - C3's pieces \((0,0),(4,3),(8,5),(4,8)\) and \((4,3),(8,0),(12,8),(8,5)\): two triangles and one diagonal each. Record each step's stack (the spec leaves the exact stack contents to the trace) and recheck it by hand in the report.
   - The whole C3 polygon through `partitionAndTriangulate`: \(4\) triangles, \(3\) diagonals in the final triangulation (one from the partition, one per piece), doubled areas summing to \(80\).
   - Random simple grid polygons (the generator of task 14): every piece gives \(m-2\) triangles for its \(m\) vertices; triangle areas sum to the piece's area; no triangle contains another polygon vertex (strictly inside or on an open edge); the union is a valid triangulation of the polygon with \(n-2\) triangles, the same count as `earClippingTrace` (validity and count, not identical triangles; acceptance 2).
   - A non-monotone polygon given to `monotoneTriangulationTrace` is refused with `not-monotone`; the same polygon through `partitionAndTriangulate` succeeds.
   - The counts returned equal the sums of `predicateCount` read back from the traces (acceptance 4), on the C3 example and on random polygons.
   - The trace ends in `done`; its length matches the formula in the module comment.
   - Observed failures under deliberate mutations: the visibility test's sign reversed; the opposite-chain case not popping the whole stack; one piece skipped in the combined run.

Checks: `just unit src/compgeo/sweep --maxWorkers=2`, `just lint src/compgeo/sweep`, `npx tsc --noEmit --pretty false`.

## Evidence (handler 33, 2026-11-02)

- Worker (Sonnet, high effort: exact predicates): `monotoneTriangulation.ts`, `monotoneTriangulation.test.ts`, and `testPolygons.ts`, which holds task 14's generator, moved byte-identical (`monotonePartition.test.ts` only imports it). API: `monotoneTriangulationTrace(vertices, piece?)` returns `piece`, `order`, `chains`, `trace`, `diagonals`, `triangles`. `partitionAndTriangulate(vertices)` returns `partition`, `pieces`, a combined `trace` with `offsets`, `triangles`, `diagonals` and `counts`.
- Trace length per piece: \(6m-9+T\), with \(T\) visibility tests, and `predicateCount` at `done` equals \(T\). The stack is empty at `done`.
- C3 pieces: stacks \([P_5],[P_5,P_4],[P_5,P_1],[\,]\) (0-based input indices 5, 4, 1). The visibility test gives orient \(20>0\), so diagonal 1–5. The second piece's test gives orient \(-4\), blocked, and diagonal 2–4 is added at the bottom. Whole polygon: 4 triangles, diagonals 1–4, 1–5, 2–4, doubled area 80. Worker and reviewer each checked this by hand. Counts on C3: monotone 11 (partition 9 + 1 + 1) against ear clipping 21; these are observed values, not a growth-rate claim.
- Random: 250 polygons, 132 blocked and 567 visible tests (floors asserted). The reviewer's throwaway stress run of about 5970 polygons found no failure.
- Mutations, each observed failing then reverted: visibility sign reversed (6 tests); opposite-chain case leaving the bottom on the stack (3, caught by an added hand-checked zigzag test); one piece skipped (6); chain swapped (6); non-strict visibility (1); diagonal to the adjacent bottom vertex (7); monotone count omitting the partition (3).
- Checks: `just unit src/compgeo/sweep --maxWorkers=2` 121 passed; lint and `npx tsc --noEmit` clean.
- Mathematical review (Sonnet `bezeg-reviewer`): nothing blocking. Low notes, left as caller contracts: the `piece` argument is not checked to be a simple sub-cycle (`partitionAndTriangulate` only passes valid pieces); the throw on an `earClippingTrace` refusal is unreachable within the 20-vertex sweep limit.
