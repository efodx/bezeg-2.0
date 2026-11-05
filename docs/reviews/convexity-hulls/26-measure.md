# Task 26 measurement: Bezier hulls at depth 4

Source: `src/graphs/compgeo/BezierHullsGraph.perf.test.tsx` (opt-in: `BEZEG_PERF=1 just unit src/graphs/compgeo/BezierHullsGraph.perf`), raw numbers in `26-perf-raw.txt`. Unit run in jsdom with the board shim, 2 workers, revision c127a05c plus the task 26 working tree; browser frames will differ.

Worst case: a cubic pair with B = A (control points (0,0),(1,6),(5,6),(6,0)). No pair is separated early, the run has 9 steps, 88 candidate pairs at depth 4, and all 32 pieces (16 per curve) are drawn with hull and control polygon.

| Measure | Median | Max |
| --- | --- | --- |
| `curvePairRun` alone (30 runs) | 0.81 ms | 5.37 ms |
| Drag move of A_1 (model edit, run, redraw at step 0; 40 moves) | 12.8 to 13.7 ms | 19.0 to 40.1 ms |
| Draw step 6 (discard, depth 3) | 52 ms | 72 ms |
| Draw step 7 (split, depth 4) | 157 ms | 193 ms |
| **Draw step 8 (discard, depth 4, the last)** | **114 ms** | 149 ms |
| Play pass through 8 steps (no waiting) | 523 to 717 ms | 599 to 819 ms |

Board objects at steps 0..8: 82, 120, 102, 178, 142, 294, 222, 526, 382. The last step holds 382.

## Verdict

The last step costs 114 ms, about 7 frames of 16.7 ms, so the fallback applies. The drag move is near one frame (about 13 ms median) and `curvePairRun` is under 1 ms; the cost is drawing.

Isolated on the live board, 32 hull polygons cost 36 ms to create; 2 curves with NaN breaks holding the same 32 rings cost 1.1 ms (create and update). Hull polygons are therefore about a third of the 114 ms; the rest (32 control-polygon curves, overlay teardown and rebuild, the panel render) is not yet split. The grouped curve was NOT yet put into the graph: the `pieces` overlay still draws one polygon per piece, and the host tests read pieces by name and vertex. Switching means one curve per (curve, look) group (4 per step) and rewriting those tests.

## Fallback applied (task 26b)

The `pieces` overlay now draws a fixed set of JSXGraph curves with NaN breaks: per curve (A, B) and look (candidate, parent, kept, faded) one curve of closed hull rings, and one curve of control polygons per look except the parent. Nothing is drawn per piece, and no polygon or point is created per piece.

Fill across NaN breaks works in the real SVG renderer (JSXGraph 1.14.1, `node_modules/jsxgraph/src/renderer/svg.js` `updatePathStringPrim`): a point with a NaN screen coordinate is a pen-up, so the next point starts a new `M` subpath; every ring is its own subpath, and the SVG `fill` of the one path fills each subpath (an unclosed one is closed implicitly for the fill). Curves default to `fillColor: 'none'`, so the group sets `fillColor` and `fillOpacity` itself. Overlapping rings of one group union rather than stack their opacity. Not looked at in a browser here; the jsdom shim only reads the curve data.

| Measure (same worst case, jsdom shim, 2 workers) | Before (polygons) | After (grouped curves) |
| --- | --- | --- |
| Draw step 8 (discard, depth 4, last) median / max | 114 / 149 ms | 9.3 / 11.0 ms |
| Draw step 7 (split, depth 4) median | 157 ms | 11.4 ms |
| Play pass through 8 steps median | 523 to 717 ms | 78 ms |
| Drag move of A_1 (redraw at step 0) median / max | 12.8 to 13.7 / 19.0 to 40.1 ms | 8.1 / 13.2 ms |
| Board objects at steps 0..8 | 82 120 102 178 142 294 222 526 382 | 62 68 66 68 66 68 66 68 66 |
| Isolated, 32 polygons vs 2 NaN-break curves | 37.0 ms | 1.0 ms |

Kept path: grouped curves, 66 board objects at the last step (was 382), 9.3 ms (about half a frame), so the per-kept-piece polygon alternative is not needed. Raw numbers: `26-perf-raw.txt`, log `26b-perf.log`.
