# 09 Bentley-Ottmann endpoint drag: measurement (task 09b)

Date 2026-11-01, base commit 9817fd72 plus the uncommitted 09b changes. Per [the performance plan](../../../performance-plan.md) measurement protocol, scoped down.

## Method

`src/graphs/compgeo/BentleyOttmannGraph.perf.test.tsx` (vitest, jsdom, the board shims of the host tests, so this is not a browser).
Scene: 12 grid segments (24 endpoints), 80 events, 57 crossings (a dense stress case; the 12 segment limit). One endpoint is dragged
through 40 positions by calling the point's own `drag` handler (`moveTo` then `triggerEventHandlers(['drag'])`), so each update
runs the real path: snap, model edit, trace recompute (`runBentleyOttmann`), overlay redraw on the board, and the React panel render
including the 57 item crossing list and both side lists. Each update is timed with `performance.now()` around the `act`.
The trace recompute alone is timed 40 times on the same segments.

## Numbers (ms, three runs of the drag test; the last run also timed the trace)

| Run | drag median | drag max | drag min |
|---|---|---|---|
| 1 | 20.03 | 37.68 | 15.42 |
| 2 | 19.54 | 28.95 | 15.86 |
| 3 | 19.61 | 29.00 | 15.06 |
| 4 | 20.27 | 38.34 | 14.78 |

Trace recompute alone (run 4): median 5.93, max 9.77. The first updates of a run are the slowest (28 ms), as the JIT warms up.

## Reading

About 20 ms per drag update (median) in jsdom, of which the trace is about 6 ms; the rest is the redraw and the panel render.
That is roughly one 60 Hz frame and a bit over, in a worst case with 57 crossings; a typical 12-segment classroom scene has far fewer.
jsdom with shims is not a browser, so the figure is an upper-level indication, not a frame time. No optimisation was made: the
graph redraws on drag as the hull graph does.

## Not measured

A browser measurement (production build, real frame timing, touch device) waits for registration of the Demonstration. Allocation
pressure, board update counts and dropped frames were not measured.
