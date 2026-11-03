# Direction-field drawing measurement (numerical methods 07, step 1)

Measured 2026-11-03 for [07 Batch C](../../tasks/numerical-methods/07-batch-c.md) step 1 and [N5](../../specs/numerical-methods-lessons.md#n5-direction-field-and-eulers-method). Decision: [ADR 0037](../../adr/0037-direction-field-drawing.md). Full output: [07-field-measurement.log](07-field-measurement.log).

## Setup

- Script `scripts/euler-field-perf.cjs` (`node scripts/euler-field-perf.cjs`; env `PERF_RUNS`=3, `PERF_DRAG_MS`=2000, `PERF_ONLY`, `PERF_PORT`=4330), harness `scripts/perf-harness/euler-field.{html,js}` with JSXGraph 1.14.1 from `node_modules`. Method of `scripts/fourier-browser-perf.cjs`: rAF stamps only inside the interaction, 15 warm-up frames dropped, 3 runs, median of the run medians and p95s, max and counts over all runs.
- Commit `b6b4dc66` plus the uncommitted harness; no application code is involved. Chromium 156.0.8078.4 (Playwright 1.64.0), headless, 60 Hz, `deviceScaleFactor` 1. Device: this desktop (Ryzen 5 7600). **The classroom target device was not available**; this is the gap to report.
- Problem: \(y'=x-y\) on \([-5,5]\times[-3,3]\); Euler polyline from a draggable point (\(h=0.125\), to the right edge) and the exact curve dashed, both JSXGraph. Field nodes on an \(n_x\times n_y\) grid, each a short segment of fixed screen length (no arrowheads in the harness).
- Approaches: (a) one `segment` plus two hidden points per arrow; (b) one `curve` whose data hold all segments separated by NaN; (c) a `<canvas>` under the transparent board svg, redrawn on every board update; (d) approach (a) on an 11×8 grid.
- Cases: **drag** (real `page.mouse` gesture, 2 s sine path, 120 moves), **step** (30 changes through \(1,0.5,0.25,0.125,0.0625\), repeated), **view** (60 zoom/pan changes; the field is regenerated for the new window).
- Threshold (precedent: Fourier 05 in [05-batch-b.md](../../tasks/fourier-series/05-batch-b.md)): p95 frame interval at most 16.8 ms and no frame over 25 ms at 60 Hz.

## Frame intervals

Median 16.7 ms and p95 16.7 to 16.8 ms in every one of the 42 cases. The cap is the display, so this test does not separate the approaches. Frames over 25 ms (per run, 3 runs):

- Drag and step: 0/0/0 in all 28 cases, both viewports. View at 1280×720: 0/0/0 in all 7 rows.
- View at 1920×1080: a 21×15 5/4/3; a 41×29 2/0/4; b 21×15 4/2/3; b 41×29 4/3/2; c 21×15 4/3/2; c 41×29 3/3/2; d 11×8 4/3/3 (max 33 to 83 ms). Every approach, including the cheapest, shows these spikes, so they come from the full-size repaint and `page.evaluate` round trips of this harness rather than from the drawing approach. Strictly, all approaches fail "no frame over 25 ms" in the 1920×1080 zoom/pan case, so that case does not discriminate and must be re-checked on the target device and in the real route (F6).
- The same 2 s drag gesture (120 moves) needed 338 to 347 frames for a 41×29, against 234 to 262 for all other rows: the gesture took about 40% longer because each pointer move blocked the main thread.

## Main-thread cost per operation

In-page, JS only (no paint), 100 operations after 20 warm-up, median of 3 runs, in ms as median / p95. This is the discriminating measurement: the work a drag event, a step change or a view change adds before paint, against a 16.8 ms frame.

| Approach, grid, viewport | Objects / DOM nodes | Drag | Step | View | Notes |
| --- | --- | --- | --- | --- | --- |
| a, 21×15, 1280×720 | 952 / 983 | 4.6 / 6.2 | 2.9 / 5.0 | 2.8 / 3.6 | |
| a, 21×15, 1920×1080 | 952 / 983 | 2.1 / 2.5 | 2.0 / 3.1 | 3.3 / 4.9 | |
| a, 41×29, 1280×720 | 3574 / 3605 | 9.9 / 14.0 | 8.9 / 14.0 | 14.3 / 17.2 | max 100 to 137 |
| a, 41×29, 1920×1080 | 3574 / 3605 | 12.2 / 16.1 | 9.1 / 11.8 | 16.6 / 21.5 | view over budget |
| b, 21×15, both | 8 / 39 | 0.6 / 0.9 | 0.5 / 0.8 | 0.6 / 0.8 | 1920×1080 within 0.1 |
| b, 41×29, 1280×720 | 8 / 39 | 0.9 / 1.4 | 0.8 / 1.1 | 1.0 / 1.4 | |
| b, 41×29, 1920×1080 | 8 / 39 | 0.9 / 1.4 | 0.8 / 1.3 | 1.0 / 1.8 | max 4.0 |
| c, 21×15, both | 7 / 38 | 0.6 / 1.0 | 0.5 / 0.9 | 0.6 / 0.9 | |
| c, 41×29, both | 7 / 38 | 0.8 to 0.9 / 1.3 to 1.5 | 0.8 / 1.1 to 1.2 | 0.9 / 1.2 to 1.3 | |
| d (a on 11×8), 1280×720 | 271 / 302 | 0.9 / 1.2 | 0.9 / 1.2 | 1.2 / 1.4 | |
| d (a on 11×8), 1920×1080 | 271 / 302 | 1.0 / 1.5 | 0.9 / 1.4 | 1.3 / 2.0 | |

## Reading

- Per-segment objects (a) scale with the object count because each board update visits all elements even when the field does not move. At 41×29 a drag costs 10 to 12 ms and a view change 14 to 17 ms, which uses the whole frame (p95 up to 21.5 ms of pure JS); it fails the threshold. At 21×15 it is 3 to 5 ms. The coarse grid (d) is cheap but offers only 88 arrows.
- One curve (b) and an overlay (c) stay near 1 ms at 41×29 in all cases and viewports, over ten times below the budget. They are indistinguishable here, so the choice rests on integration: (b) adds no DOM layer, resize handling or disposal beyond the board.
- Not measured: arrowheads (a curve cannot carry them per segment), target-device timings, touch input, the real route with its React host.
- 41×29 nodes exceed `EULER_FIELD_MAX = 40` in `src/analysis/odeEuler.ts` (a per-direction cap). F2a decides whether the cap counts cells or nodes; 40×28 would behave like 41×29.
