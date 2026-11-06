# AB-B-2b drag measurement (Bezier clipping, `/bezier/clipping`)

- Commit: 8f6fb8fbab559cb5a7c6ea699f28c60d6690aec2 (the preview at `http://127.0.0.1:4314/bezeg-2.0` served this revision; the build was the handler's, not rebuilt here).
- Chromium 156.0.8078.4 (Playwright), viewport 1440x900, deviceScaleFactor 1. Script: `scripts/clipping-gate-perf.cjs`; raw data: `ab-b-2b-perf-raw.json`.
- Method (as `offset-gate-perf.cjs`): real page; tolerance select and preset import dialog; Next pressed 3 times before the gesture; drag of control point B_1 along the offset script's path (150 steps over 2000 ms, span 12% of board height); rAF intervals only inside the gesture, first 15 dropped; time inside `board.update`; cases interleaved; median over 3 runs (3 throttled at CPU/4).
- Asserts (all held in all 18 runs): B_1 moved; counter returned to step 1 (step 0); the step-0 view (counter with run length, clip readout, inset hull path, table) differs from before the gesture; stepping forward 3 times gives the same counter as before; at least 60 frames and 60 board updates; no page error. Early steps can coincide between old and new run (default pair, step 4), so the new run is compared at step 0.
- Cases: 1 default crossing pair, 1e-6; 2 tangent pair B=(0,4),(2,0),(4,4), 1e-10 (run 505 steps before the drag, 35 after, so the drag leaves the cap case; the reset at the first move recomputes up to the cap); 3 cubic pair A=(0,-3),(3,-1),(6,1),(9,3), B=(1,-4),(3,7),(6,-7),(8,5), 1e-10 (3 crossings; run 46 steps, 51 after).

| case | frame median ms | frame p95 ms | frames >25 ms per run | update median / p95 ms |
|---|---|---|---|---|
| crossing, 1e-6 | 16.7 | 16.8 | 0/0/0 | 0.50 / 0.80 |
| crossing, 1e-6, CPU/4 | 16.7 | 16.8 | 6/6/6 | 3.40 / 5.80 |
| tangent, 1e-10 | 16.7 | 16.8 | 0/0/0 | 0.50 / 0.80 |
| tangent, 1e-10, CPU/4 | 16.7 | 16.8 | 7/6/6 | 3.30 / 5.60 |
| cubic x3, 1e-10 | 16.7 | 16.7 | 0/0/0 | 0.70 / 1.10 |
| cubic x3, 1e-10, CPU/4 | 16.7 | 16.8 | 13/14/14 | 4.00 / 7.00 |

Verdict: no case exceeds the 16.7 ms frame median or the 33 ms p95. Unthrottled, the longest frame is 17 ms. At CPU/4 there are isolated slow frames (6 to 14 of 350 to 430 sampled frames per run exceed 25 ms, under 5%, so p95 holds; longest 83 to 117 ms). The first move (reset of a mid-run view, recompute of the run up to the cap in case 2) is inside these figures; p95 board update at CPU/4 is at most 8.5 ms in any run.

## Handler reading (curves handler 64)

The gate's measurement is recorded and no optimization is called for. Read the figures with these limits:

- **The board update time excludes most of the run.** The drag snaps to the grid, and the point travelled 1.4 to 2.8 units, so the run recomputes only when the point enters a new grid cell. The update median is therefore not the cost of a recompute. The isolated slow frames at CPU/4 are probably those recomputes; no per-frame attribution was taken.
- **The capped run is paid once.** The tangent case runs 505 steps before the gesture and 35 after it, so the first move leaves the cap. A drag that stays near a tangency, recomputing a capped run in every cell, was not measured. Its likely worst frame is the 83 to 117 ms seen at CPU/4.
- Mouse input in Chromium on a desktop only. No touch device.
