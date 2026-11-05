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
