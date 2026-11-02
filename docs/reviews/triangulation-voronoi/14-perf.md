# Triangulation 40-point drag, browser frame times

Measurement per [performance-plan.md](../../performance-plan.md) "Measurement protocol". Raw output: `14-perf-raw.txt`.
Script: `scripts/triangulation-browser-perf.cjs` (3 runs per case, 40 mouse moves per run, 50 ms apart).

- Commit: a175648b (production preview of this checkout at `http://127.0.0.1:4313/bezeg-2.0`, started by the handler; build freshness not re-checked by the worker).
- Browser: headless Playwright Chromium 156.0.8078.4, Windows 11, viewport 1440x900, deviceScaleFactor 1.
- Input: Playwright mouse, `mouse.down` on the interior point nearest the board centre, then 40 `mouse.move` calls on a sine path (about 40 px by 25 px amplitude, one full cycle), `mouse.up`.
- Scene: `/compgeo/point-set-triangulation`, the 7-point default plus 33 integer points typed into the "new point" inputs (page verified to hold 40 draggable points before and after toggling overlays).
- Overlays by default: triangulation on; grid, edge numbers ("edges") and smallest angle ("angles") off.
- Measured: rAF intervals inside the drag (first 3 discarded); move-to-frame = time from each `pointermove` event to the next rAF callback.

| Case (visible constructions) | frames per run | frame median ms | p95 ms | worst frame ms (all runs) | move to next frame, median ms | move to next frame, worst ms |
|---|---|---|---|---|---|---|
| Default: triangulation only | 199/202/203 | 16.7 | 16.8 | 83.4 | 8.3 | 49.4 |
| All optional overlays off (triangulation off too) | 191/196/196 | 16.7 | 16.8 | 33.4 | 8.1 | 32.4 |
| Edges + angles on (triangulation on) | 222/247/245 | 16.7 | 16.8 | 233.4 | 8.2 | 165.4 |

(Median and p95 are medians of the three per-run values; worst values are maxima over the three runs.)

Per-run worst frames: default 83.3/83.4/66.7; off 16.8/33.3/33.4; edges+angles 200/216.6/233.4 (p95 of one run was 33.3).

## Reading

- The headless display ticks at 60 Hz (16.7 ms). The median and p95 frame interval is one tick in every case, so typical frames in this run did not drop.
- Long frames are occasional, not typical. With triangulation only, the worst frames were 67 to 83 ms; with everything off 17 to 33 ms; with edges and angles on, 200 to 233 ms (about 12 to 14 ticks).
- Frame count in the edges+angles case is higher (222 to 247 vs 191 to 203) only because the drag lasts longer: the page took more wall time per move there.
- Move-to-next-frame medians (about 8 ms) are about half a tick, so they match the average wait for the next tick when a move is handled quickly; the worst values (up to 165 ms with the overlays) match the long frames.

## Decision (geometry handler 29, 2026-11-02)

The edge curves are not batched now. At the 40-point maximum the typical frame stays at one 60 Hz tick in every case; the cost is
occasional long frames (up to 83 ms by default, up to 233 ms with edge numbers and angles on), so the jsdom redraw figure of
75–141 ms per update does not describe typical browser frames. Revisit batching if lesson 15 or 16 shows the overlays during a
drag at this size, or if a touch device or a throttled CPU shows long frames by default. Comparable reruns: the same script and case.

## Gaps

- Headless Chromium on one machine, mouse only; no touch, no non-headless GPU path, no CPU throttling.
- Only the drag of one point; no adding, removing or flip operations, no Voronoi route.
- Slow frames are counted by the worst value only; with 3 runs there is no distribution of the long frames.
- "All off" disables the triangulation overlay as well; a case with only the triangulation hidden is the same as that case.
