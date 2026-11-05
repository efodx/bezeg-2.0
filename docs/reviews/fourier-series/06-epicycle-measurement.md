# Epicycle rendering measurement (Fourier series 06, Batch C step 1)

Measured 2026-11-05 for [06 Batch C](../../tasks/fourier-series/06-batch-c.md) step 1, [ADR 0034 §3](../../adr/0034-fourier-series-models-handles-and-closed-loop.md#3-epicycle-rendering-batch-c-decided-by-measurement) and [F5](../../specs/fourier-series-lessons.md#f5-epicycles). Decision: [ADR 0040](../../adr/0040-epicycle-rendering.md). Full output: [06-epicycle-measurement.log](06-epicycle-measurement.log).

## Setup

- Script `scripts/epicycle-perf.cjs` (`node scripts/epicycle-perf.cjs`; env `PERF_RUNS`=3, `PERF_DRAG_MS`=2000, `PERF_ONLY` (a name substring, or `bench`), `PERF_PORT`=4330), harness `scripts/perf-harness/epicycle.{html,js}` with JSXGraph 1.14.1 from `node_modules`. Method of `scripts/euler-field-perf.cjs`: rAF stamps only inside the interaction, 15 warm-up frames dropped, 3 runs, median of the run medians and p95s, max over all runs.
- Commit `ccdb0f9a` plus the uncommitted harness; no application code is involved. Chromium 156.0.8078.4 (Playwright 1.64.0), headless, 60 Hz, `deviceScaleFactor` 1, viewports 1280×720 and 1920×1080. Device: this desktop (Ryzen 5 7600). **The classroom target device was not available**; this is the gap to report.
- Loop: closed, 6 cubic spans, six draggable anchors (the controls are fixed in the harness), equal parametrization. Coefficients \(c_k\) for \(|k|\le N\) by 16 Gauss nodes per span (formulas copied from `closedSpline.ts` and `fourier.ts`, nothing imported), chain ordered by \(|c_k|\) with \(c_0\) as centre. The trace is the full partial sum at \(S\) samples, drawn up to the current time in playback. The original loop is one curve (246 points).
- Scenes: \(N=10,25,50\); \(S=400\) and \(2000\). Approaches: **a** one circle, one segment and one point per term (\(2N\) circles and \(2N\) arms, rebuilt when N changes); **b1** the arm chain as one polyline curve plus JSXGraph circles for the first 5 terms; **b2** the arm chain as one polyline curve plus all circles as one NaN-separated curve (48 points per circle). The trace is one curve in all three.
- Cases: **play** (one time step per frame, \(2\pi/300\), 2 s), **drag** (real `page.mouse` drag of anchor 0, 2 s sine path, 120 moves; recomputes the coefficients, trace, chain and loop each move), **nsweep** (30 changes through \(N=10,25,50,25,10\), repeated; approach a rebuilds its objects, b1 and b2 only recompute).
- Threshold (precedent: Fourier 05 in [05-batch-b.md](../../tasks/fourier-series/05-batch-b.md)): p95 frame interval at most 16.8 ms and no frame over 25 ms at 60 Hz.

## Frame intervals (84 cases)

Median 16.7 ms and p95 16.7 to 16.8 ms in every case; the cap is the display, so frame intervals do not separate the approaches, as in the direction-field measurement. Maximum 16.8 ms and 0 frames over 25 ms (3 runs) in all 72 play and drag cases, both viewports, all approaches and sizes. The only cases that miss the threshold are the **N-change sweep of approach a**: 3 to 6 frames over 25 ms per run, max 50 to 67 ms, at both viewports and both trace sizes (rows `a N=10 S=… nsweep` in the log). b1 and b2 have 0 frames over 25 ms in their sweeps. The 2 s sweeps of approach a also took 147 to 163 frames against 123 for b1 and b2, so the rebuilds block the main thread.

## Main-thread cost per operation (N=50, S=2000 unless noted)

In-page, JS only, no paint, 100 operations after 20 warm-up, median of 3 runs, in ms as median / p95 (max over runs in the log). This discriminates; the budget is one 16.8 ms frame.

| Approach, viewport | Objects / DOM nodes (N=50) | Playback step | Vertex drag | N change (10→25→50→25→10) |
| --- | --- | --- | --- | --- |
| a, 1280×720 | 342 / 373 | 3.3 / 4.9 | 5.2 / 6.7 | **21.8 / 58.7** (S=400: 18.3 / 53.4) |
| a, 1920×1080 | 342 / 373 | 2.7 / 3.8 | 5.0 / 7.4 | **19.7 / 54.2** (S=400: 22.5 / 62.2) |
| b1, 1280×720 | 52 / 83 | 1.0 / 1.4 | 2.5 / 3.0 | 3.1 / 4.3 |
| b1, 1920×1080 | 52 / 83 | 0.9 / 1.3 | 2.5 / 3.3 | 3.1 / 4.4 |
| b2, 1280×720 | 43 / 74 | 1.5 / 2.1 | 3.0 / 4.2 | 2.8 / 5.7 |
| b2, 1920×1080 | 43 / 74 | 1.6 / 2.7 | 3.6 / 4.5 | 2.9 / 5.3 |

Object counts for approach a are 102, 192 and 342 at \(N=10,25,50\) (DOM 133, 223, 373); b1 stays at 52 (DOM 83) and b2 at 43 (DOM 74) for all N. The N change of a is the sweep average over rebuilds at 10, 25 and 50.

Trace size: at N=50, \(S=400\) against \(S=2000\) costs 0.3 to 0.4 ms more per playback step and about 1 ms more per drag in every approach (for example b2 drag 2.5 against 3.0 ms at 1280×720); both pass.

## Reading

- Individual objects (a) are fine for playback (3 to 5 ms) and for a drag (5 to 7 ms p95) at N=50, but each N change removes and creates up to about 340 objects, costs 18 to 22 ms (p95 54 to 62) and drops frames. It fails the threshold on that case. Hiding and showing pre-created objects instead of rebuilding was not measured and would still pay for visiting all objects on each board update.
- b1 and b2 stay at 1 to 6 ms for every operation (p95) and need no object rebuild when N changes. b2 shows all \(2N\) circles for 5.7 ms or less in the worst operation (p95), b1 only the first five.
- Not measured: the real route with its React host, touch input, the target device, drag of control points (the harness moves anchors only), circle point counts above 48 (large radii may need more), and display rates above 60 Hz.

## Host re-check

Measured 2026-11-05 on the real route `/bezeg-2.0/analysis/epicycles` (`just build`, `just preview 4330`, revision 66b8dd45 plus the F2b registration, dirty), by `node scripts/fourier-browser-perf.cjs` with `PERF_ONLY=epicycles` (new cases). Chromium headless, 60 Hz, `deviceScaleFactor` 1, viewport 1440×900 unless noted, 3 runs per case (median of the run medians and p95s; max over runs; frames over 25 ms and sample counts per run). Example `uneven`, N=50 in every case. Drags are a 2 s vertical sine path of 150 `page.mouse` moves on the first vertex handle (round) or the first cubic control handle (square). Raw log: `C:/Users/1337Hacker/.claude/jobs/cb986187/tmp/fourier-f2b/perf.log`. Threshold (ADR 0040): p95 at most 16.8 ms and no frame over 25 ms.

| Case | median ms | p95 ms | max ms | frames >25 ms per run | samples per run | Threshold |
|---|---|---|---|---|---|---|
| 1 vertex drag, N=50 | 16.7 | 50.0 | 66.7 | 145/144/145 | 493/491/490 | missed |
| 2 cubic control drag, N=50 | 16.7 | 33.4 | 50.1 | 145/145/145 | 482/488/496 | missed |
| 3 playback 5 s, N=50 | 16.7 | 16.7 | 16.8 | 0/0/0 | 301/302/302 | met |
| 4 N sweep 1 to 50 to 1 | 16.7 | 16.7 | 16.8 | 0/0/0 | 275/270/271 | met |
| 5 vertex drag, N=50, 1920 px | 16.7 | 50.0 | 83.3 | 145/145/145 | 494/493/491 | missed |

The two drag cases and the 1920 px case miss: about 30 % of frames during a drag are over 25 ms (intervals of 33 to 50 ms, so every second or third frame is dropped). Playback, including the per-frame copy of the trace slice, and the N sweep meet the threshold. No optimisation was attempted; the ADR makes this an owner matter. This re-check does not separate whether the shortfall comes from the per-move recompute of coefficients and trace, from the JSXGraph point redraw, or from the Playwright mouse itself.

Visual check: `uneven`, N=1, 1920×1080 (`C:/Users/1337Hacker/.claude/jobs/cb986187/tmp/fourier-f2b/uneven-n1-1920.png`). The largest circle is about 380 px across and the 48-segment polygon looks round, with no visible facets.

## Cause of the drag miss

The three drag cases miss the ADR 0040 threshold; playback and the \(N\) sweep pass, so drawing is not the cause. Timing each recompute stage in Node, `uneven`, \(N=50\), 60 runs after 20 warm-up runs, one throwaway script (handler, 2026-11-05):

| Stage | median ms | p95 ms |
| --- | --- | --- |
| `analyzeEpicycle` | 23.41 | 25.84 |
| `epicycleTrace` | 5.73 | 7.10 |
| `epicycleLoopSamples` | 0.42 | 0.85 |
| `maxTraceError` (cached samples) | 0.02 | 0.06 |
| `epicycleTerms` | 0.04 | 0.06 |
| Whole drag recompute | 28.17 | 33.66 |

A frame has 16.7 ms, so the coefficients alone exceed it. `coefficientsFromFunction` evaluates \(z(t)\) by de Casteljau twice per node, for each of the 101 frequencies, over breakpoints refined for that \(k\). ADR 0034 §3 called the coefficient update cheap, and the ADR 0040 harness computed 16 nodes per span without that refinement, so neither saw this cost. The host's update cadence and React table were not isolated; the Node stages are a lower bound for the browser.
