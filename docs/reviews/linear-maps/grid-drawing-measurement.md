# Linear maps: grid drawing measurement (task 04, acceptance 1-3)

Raw results for the harness in `scripts/linear-map-benchmark/` (see its README for method). Run: `just linear-map-bench 5 results.json` (or `node scripts/linear-map-benchmark/build.cjs` then `node scripts/linear-map-benchmark/run.cjs 5 results.json`). The ADR is not part of this file.

## Environment

| Item | Value |
| --- | --- |
| Commit | a23fa74 (harness files uncommitted; `src/` unchanged) |
| Build | production Vite bundle of `scripts/linear-map-benchmark/` |
| Browser | Chromium 156.0.8078.4, Playwright 1.64.0, headless |
| Device | AMD Ryzen 5 3600 (6 cores / 12 threads), 16 GB, NVIDIA GeForce GTX 1070, Windows 11 10.0.26200 |
| Viewport | 1280 x 800, board 900 x 700 px |
| Refresh rate | 60 Hz (idle `requestAnimationFrame` median 16.7 ms; headless, not read from a display) |
| Input | Playwright mouse: press on e1, 60 warm-up + 240 recorded moves around a fixed 70 px-radius circle, one rAF wait per move |
| Repeats | 5 fresh pages per configuration; other agents' test runs were sharing the machine |

## Results (240 drag moves per run, 5 runs)

`update` is the duration of `board.update` per move (model plus synchronous SVG work, no paint). Median is the median over runs of the per-run median; p95 is the median of per-run p95 (worst run in brackets). Board update counts were 240 per run (one per move) and `gridImage` evaluations 242 in every run, for all configurations. Frame intervals were vsync-quantized: median 16.7 ms and p95 16.7-16.8 ms in all 20 runs; frames over 20 ms: 0-2 of about 485 per run (5 of about 9700 overall), so no sustained dropped frames.

| Variant | Ellipse | JSXGraph elements | Update median (ms) | Update p95 (ms) | Update counts |
| --- | --- | --- | --- | --- | --- |
| (a) 26 `segment` elements | no | 122 | 7.5 (runs 7.3-7.8) | 9.1 (worst 9.4) | 240 / 242 grid |
| (b) one NaN-break `curve` | no | 45 | 6.4 (runs 6.3-6.5) | 7.6 (worst 7.9) | 240 / 242 grid |
| (a) 26 `segment` elements | yes (101 pts) | 123 | 7.4 (runs 7.3-8.1) | 8.7 (worst 9.6) | 240 / 242 grid |
| (b) one NaN-break `curve` | yes (101 pts) | 46 | 6.4 (runs 6.1-6.8) | 7.8 (worst 8.3) | 240 / 242 grid |

The ellipse adds about 0 ms (within run noise). The single polyline is about 1.1 ms (15 %) faster than per-line segments and uses a third of the elements. Both variants include axes and JSXGraph's own source grid and the Bezier fixture, so most of the 6-7 ms is shared base cost; the difference between variants is the grid image itself. Raw per-run values: the JSON written by `run.cjs`.

## Clipping

`gridImage` does not clip. It returns the images of the window endpoints (window [-6, 6]^2, 13 + 13 lines), so each image line is a finite segment of length up to 12 times the largest column norm. Both variants draw those finite endpoints directly (no infinite `line` elements, no division); JSXGraph/SVG clips to the viewport. The bench shows `lines` mode with segments extending far past the 16 x 12 view without issue at |e1| = 1e6 and 1e12.

## Singular and far-out matrices

For each of the four configurations, after each case the harness counted non-finite values in handles, `gridImage` endpoints, curve data arrays and every SVG `d`/`x1..y2` attribute (searching for `NaN`, `Infinity`, `null`, `undefined`):

- e2 on e1 (matrix [[2,2],[1,1]]), e2 = 2*e1, zero matrix, e1 = 0, |e1| of 1e6 and 1e12, and a real mouse drag of e2 onto e1.
- Result: 0 non-finite values in all 7 cases x 4 configurations (about 250-470 values plus 18-42 SVG nodes each). In `poly` mode the 26 NaN values are only the intentional break separators in `dataX`; they are counted separately and are not drawn. Collapsed lines draw as zero-length segments, and the zero matrix collapses every line to the origin.
- The check confirms values handed to JSXGraph and SVG attributes; it does not verify visual correctness of degenerate output (for example how a zero-length stroke renders).

## Not verified

- Classroom/projector device, touch input, integrated or low-end GPU, Firefox/Safari, a 120/144 Hz display, or a throttled CPU (open gap for F6).
- Paint, compositing and input-to-visible delay; headless frame timing is vsync-quantized and therefore uninformative beyond "no dropped frames".
- Hand-drawn elements beyond the fixture: labels, MathJax text, the app's React chrome and the analysis curves are not in the board.
