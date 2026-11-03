# Fortune beach-line drawing: measurement (sweep task 23a)

## Method

- Script: `scripts/fortune-browser-perf.cjs <label>` (modelled on `scripts/triangulation-browser-perf.cjs`). Raw output: `23-perf-raw.txt`.
- Chromium 156.0.8078.4 headless, viewport 1440x900, device scale factor 1, production build served by `just preview 4323`.
- Page `/compgeo/fortune`, the random 12-site example (seed 1), advanced to the step with the longest beach line (read from the beach readout: step index 12 of the run, 11 arcs). One site (the one nearest the board centre) dragged with the mouse for 60 moves, 50 ms apart (about 3 s), two sine periods of 90 x 60 px, so it crosses several grid cells and the whole trace is recomputed on each cell change.
- Frame interval from a `requestAnimationFrame` loop active only inside the drag; first 3 intervals discarded. Move-to-frame latency: each `pointermove` event time to the next rAF callback (first 3 events discarded). 3 runs per approach, fresh browser context each; the table gives the median of the per-run medians and p95s, and the maximum over runs.
- Approaches (switch `BeachDrawing` in `src/graphs/compgeo/fortuneDrawing.ts`, passed as the `beachDrawing` option of `FortuneGraph`; one production build per approach): `arcs` = one JSXGraph curve per arc, each 24 samples; `polyline` = one curve for the whole beach line (the same samples concatenated), updated in place. Both draw the same lower envelope.
- Commit measured: a02ff282 plus the uncommitted temporary route below (the scene code is identical for both builds).
- **Temporary route.** `/compgeo/fortune` exists only in these measurement builds: one `definitions` entry in `src/demonstrations.ts` (`lesson: false`, borrowed Voronoi title key) and one factory line in `src/graphs/graphFactories.ts`. Both were reverted (`git diff` shows none of it) and the preview on port 4323 was stopped. The route is not part of this slice (task 24 adds it).

## Result

| approach | frames/run | median ms | p95 ms | max ms | move-to-frame median ms | move-to-frame max ms | board objects for the beach line |
|---|---|---|---|---|---|---|---|
| arcs | 275 / 266 / 272 | 16.7 | 16.8 | 33.3 | 8.3 | 16.7 | 11 |
| polyline | 273 / 273 / 275 | 16.7 | 16.7 | 16.8 | 7.6 | 16.5 | 1 |

Both approaches sit at the 60 Hz frame cap of headless Chromium (16.7 ms), so the median meets the 16.7 ms bar with either; the bar does not separate them. Differences are small: `arcs` dropped one frame (33 ms) in two of its three runs, `polyline` in none; the move-to-frame medians differ by 0.7 ms, which is within run-to-run spread (7.0 to 8.8 ms across `arcs` runs, 7.5 to 7.7 ms for `polyline`).

## Recommendation

Keep `polyline` as the default beach-line drawing: equal median, no dropped frame in the runs, a little lower latency, and one board object instead of one per arc (so the object count and the disposal surface do not grow with the number of arcs). `arcs` stays behind the internal switch. The 12-site limit keeps the beach line short (at most about 23 arcs), so the choice is not performance-critical.

Limits of this evidence: headless Chromium on one machine; mouse input only; frame times are quantised to the vsync, so a difference under one frame is invisible; no CPU-throttled run (a classroom laptop could separate the two); a single site count and seed. The default in `FortuneGraph` is still `arcs`; switching it to `polyline` is the recommended one-line follow-up for task 24.
- Chosen: polyline (handler 44); arcs path removed in 23b.

## Rerun on the registered route (task 24, handler 45)

`node scripts/fortune-browser-perf.cjs registered` against `just preview 4323`: the production build of `165448ba` plus the uncommitted task 24 registration (the route is now real; polyline beach line). Same machine, same browser, same method. Raw output: [24-perf-raw.txt](24-perf-raw.txt).

| build | frames/run | median ms | p95 ms | max ms | move-to-frame median ms | move-to-frame max ms | board objects for the beach line |
|---|---|---|---|---|---|---|---|
| registered (polyline) | 270 / 273 / 267 | 16.7 | 16.8 | 16.8 | 8.5 | 16.6 | 1 (1 after the drag) |

Matches the task 23 polyline row: at the 60 Hz cap, no dropped frame, beach line still one board object after the drag.
