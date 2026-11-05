# 24 — Curve pair subdivision model (Batch 3, F1)

Status: built 2026-11-05 (geometry handler 52, Sonnet high worker), mathematical review pending; not on `master` yet ([handoff 52](../../reviews/feature-streams/geometry/handler-handoff-52.md)). Planned by handler 52. Source: spec [A6](../../specs/convexity-hulls-lessons.md#a6-back-to-bézier-hulls-of-control-polygons) (numbers, acceptance 1–3), [ADR 0036](../../adr/0036-conservative-hull-separation-for-off-grid-bezier-pieces.md), [ADR 0028](../../adr/0028-advanced-bezier-objectives-and-owners.md) (D2 reuses this model). Kind: F1, mathematical review. Depends on 11. Consumers: the A6 graph and the Curves D2 graph.

Pure TypeScript in `src/compgeo/curvePairSubdivision.ts`. No React, JSXGraph, localization or graph state.

1. **Input.** Two nets of integer grid points (`GridPoint[]`), both of degree 2 or both of degree 3, with \(|c|\le 2^{13}\). Anything else is a `RangeError`. Export `CURVE_PAIR_MAX_DEPTH = 4`.
2. **Pieces.** `curvePieces(net, depth)` returns the \(2^{depth}\) pieces, halving at \(t=\tfrac12\) with `subdivide` from `src/bezeg/impl/kernels/bezier-kernels.ts`, left to right. Piece control points are dyadic and exact in doubles, since a net of degree \(d\) at depth \(k\) has denominator \(2^{dk}\).
3. **Run.** `curvePairRun(a, b)` returns a `Trace` (`src/compgeo/trace.ts`) with kinds `phase`, `split`, `discard`. Payloads hold depths and piece index pairs, never coordinates.
   - Event 0 (`phase`) tests the pair at depth 0.
   - For each depth \(k=1..4\), a `split` event lists the candidates (the four children of each kept pair) and a `discard` event lists the kept and discarded ones. The test is `hullsSeparated`.
   - The trace ends after depth 4, or at the first event that keeps no pair.
   - Fold it with `stateAt`: depth, candidates, kept, discarded, cumulative tests, and `phase` (`split` means the verdicts are not known yet).
4. **Drawn hulls.** `pieceHull(piece, depth, degree)` returns the hull's vertex indices in order. It scales the piece by \(2^{dk}\) to integers (at most \(2^{25}\), which is why the input bound is \(2^{13}\)) and uses the exact monotone chain in `src/compgeo/monotoneChain.ts`. No off-grid hull is built, so ADR 0021 and ADR 0036 stand. Handle collinear pieces and repeated points (a segment or a point is a valid result).

## Checked numbers

Exact rationals, handler script 2026-11-05 (`python -I`). Each row gives overlapping pairs, then tested pairs, at depths 0–4. "Tested" counts the candidates at that depth.

| Pair | Control points | Overlapping | Tested |
| --- | --- | --- | --- |
| Crossing (default) | \(A\) and \(B=(0,3),(2,-1),(4,3)\) | 1, 2, 8, 8, 8 | 1, 4, 8, 32, 32 |
| Tangent | \(A\) and \((0,4),(2,0),(4,4)\) | 1, 4, 4, 4, 4 | 1, 4, 16, 16, 16 |
| Offset | \(A\) and \((0,4.5),(2,0.5),(4,4.5)\) | 1, 0 | 1, 4 |
| Crossings inside pieces | \(A\) and \((0.5,3),(2.5,-1),(4.5,3)\) | 1, 2, 2, 2, 2 | 1, 4, 8, 8, 8 |
| Near miss | \((4,0),(8,2),(2,6)\) and \((5,0),(7,4),(3,6)\) | 1, 3, 3, 1, 1 | 1, 4, 12, 12, 4 |
| Cubic | \((0,0),(1,4),(3,-4),(4,0)\) and \((0,1),(1,-3),(3,5),(4,1)\) | 1, 1, 2, 2, 2 | 1, 4, 4, 8, 8 |

\(A=(0,0),(2,4),(4,0)\). The offset and inside-pieces rows have half-integer points: test them doubled, on the integer grid, which is what the graph does at `gridStepExponent` \(-1\).

The near-miss curves are disjoint: every pair is discarded at depth 5 (overlapping 0 of 1024, exact), and the gap is about \(0.0108\) near \((5.57,1.63)\). Depth 4 keeps a pair although the curves do not meet.

## Tests (`curvePairSubdivision.test.ts`)

- Every row of the table, at every depth.
- Hierarchical kept pairs equal an all-pairs check at each depth, on these rows and on seeded random integer nets.
- Acceptance 2: for every discarded pair of the crossing row, dense sampling of both pieces finds no two points closer than the margin, and no pair containing \(t=\tfrac14\) or \(t=\tfrac34\) on both curves is discarded.
- Acceptance 3: every piece's control points lie in the parent's hull, checked with `orient` on scaled integers. Hulls of pieces are correct on a collinear net and on repeated points.
- The trace ends early when nothing is kept (offset row: three events). `stateAt` is pure, and a `split` state has no verdicts.
- Piece control points scaled by \(2^{dk}\) are integers at depth 4 for degree 3 at the coordinate bound.
- `RangeError` for mixed degrees, a wrong degree, off-grid points, and a coordinate over the bound.
- Observed failures under two mutations, for example discarding on `separated: false`, and dropping one child from the candidates.

Checks: `just unit src/compgeo --maxWorkers=2`, `just lint src/compgeo`, tsc.
