# CG-B2-6: shipped comb and evolute performance gate

Gate: [ADR 0041](../../adr/0041-curvature-comb-drawing.md) ("the Batch 2 gate re-measures the shipped graph, including a C1 or G1 spline"); protocol in [performance-plan.md](../../performance-plan.md); approaches and reference figures in [CG-B2-1](cg-b2-1-comb-measurement.md). Script: `scripts/comb-gate-perf.cjs`. Raw runs: the script's `--json` output.

## Scene configuration

Production preview of `90b048d3` on `http://127.0.0.1:4314/bezeg-2.0`, Chromium 156.0.8078.4 headless, AMD Ryzen 5 7600 desktop on Windows 11, viewport 1440×900, device scale 1, mouse input, 60 Hz frames. Nothing is injected: the script drives the real pages `/curve-geometry/comb` and `/curve-geometry/evolute` through their own controls ("Krivulja" select, "Glavnik ukrivljenosti" switch, "Parameter t" slider). The comb ran with its shipped defaults (64 teeth, 128 tooth points, 64 tip points; 63 for G1).

Gesture, method and noise handling are those of CG-B2-1: a three-quarter circular drag of one control point (the last free point for the cubic and the evolute, the middle free point for the splines), 150 steps over 2000 ms; for case 7 a straight drag of the t slider from 10 % to 90 % of its width. Frame intervals come from `requestAnimationFrame` only inside the gesture, the first 15 dropped; update time is time inside `board.update`. Medians over 3 runs (5 at CPU ÷4); cases interleaved across runs. The machine was shared with other jobs (two read-only reviewers were running).

Every run asserts it is real from the board's own objects, and a failed assertion fails the run. Comb-on cases: the tip and teeth curves have points at the drag start and end, and both change by more than 0.001 units between them. Comb-off cases: both are empty. Evolute cases: the trace has points; in case 6 the trace changes during the drag, in case 7 (where the full trace does not depend on t) the evolute point E moves. All runs passed these checks and raised no page error.

## Results at normal CPU, 3 runs

Frame median was 16.7 ms in every case. No run of any case had a frame over 25 ms.

| Case | Frame p95 ms | Update median ms | Update p95 ms | Board objects |
| --- | --- | --- | --- | --- |
| 1 Cubic, comb off | 16.7 | 1.85 | 3.70 | 52 |
| 2 Cubic, comb on | 16.8 | 2.00 | 3.80 | 52 |
| 3 C1 spline, comb off | 16.8 | 2.80 | 5.10 | 62 |
| 4 C1 spline, comb on | 16.7 | 3.15 | 5.40 | 62 |
| 5 G1 spline, comb on | 16.7 | 2.95 | 5.50 | 58 |
| 6 Evolute, control point drag (full trace, normal, circle) | 16.7 | 2.90 | 4.70 | 61 |
| 7 Evolute, t slider drag | 16.8 | 3.00 | 3.90 | 61 |

The comb adds about 0.15 ms (cubic) and 0.35 ms (C1) to the median update; differences under about 0.5 ms are noise at this sample size. The G1 spline with the comb is not slower than the C1 spline without it, so that difference is also within noise. Case 3 was run only as the C1 baseline; G1 has no comb-off case.

## Results at CPU ÷4, 5 runs

Chromium `Emulation.setCPUThrottlingRate` 4, set after the page loaded.

| Case | Frame p95 ms | Over 25 ms per run | Update median ms | Update p95 ms |
| --- | --- | --- | --- | --- |
| 2 Cubic, comb on | 33.3 | 68/118/63/59/83 | 11.35 | 22.20 |
| 4 C1 spline, comb on | 50.0 | 146/147/146/145/146 | 17.20 | 30.60 |
| 6 Evolute, control point drag | 50.0 | 145/146/145/146/145 | 17.60 | 29.40 |

Comparison with CG-B2-1 at CPU ÷4 (injected approach A, 64 teeth, 7 runs, lesson cubic): frame p95 33.2 ms, update median 10.95 ms, update p95 19.10 ms, a median of 29 frames over 25 ms; C2 spline with the comb: p95 50.0 ms, update median 18.25 ms, update p95 31.30 ms, about 146 frames over 25 ms. The shipped graph reads the same on frame p95 and update median (cubic 33.3 against 33.2 and 11.35 against 10.95; C1 50.0 against 50.0 and 17.20 against 18.25, though C1 is not the spline kind CG-B2-1 measured, C2). Cubic update p95 is 22.2 against 19.1 ms and its frames over 25 ms were higher, a median of 68 against 29; the machine was shared and that count varied from 59 to 118 between runs, as CG-B2-1's 4 to 71 did, so this is not shown to be a regression, and the 7-run median reference is not a like-for-like sample. The scene also differs: the shipped route is not the lesson cubic and has 52 board objects.

The evolute drag at ÷4 has no CG-B2-1 reference. Its update median (17.6 ms) matches the C1 comb case; its frame p95 is 50.0 ms, with about 146 of 146 frames over 25 ms.

## Budget verdict

Budget (CG-B2-1, ADR 0037's desktop threshold): frame p95 at most 16.8 ms and no frame over 25 ms.

| Case | Normal CPU | Verdict |
| --- | --- | --- |
| 1 to 7 | p95 16.7 to 16.8 ms, 0 frames over 25 ms in every run | within the desktop budget |
| 2, 4, 6 at CPU ÷4 | p95 33.3 / 50.0 / 50.0 ms, many frames over 25 ms | over the threshold, but ÷4 is a weak-device stand-in; no budget applies to it |

No case misses the desktop budget, so nothing is reported to the owner as a miss. The ÷4 figures say what a slow device would see: the shipped C1 comb and the evolute drag fall to about 20 fps at the worst frames, and the cubic comb to 30 fps.

## Limits

- Shared machine, headless Chromium, one desktop CPU. No real touch device or classroom projector was used, and no separate weak-device budget exists; CPU ÷4 is an emulation, and 3 (normal) or 5 (÷4) runs bound the confidence.
- Only the comb defaults (64 teeth, default gain) were measured. Other tooth counts, the gain slider, and the 1920×1080 viewport were not.
- Dragging a control point in the C1 and G1 cases was measured on the middle free point only; the G1 beta sliders and C2 were not driven. G1 has no comb-off baseline and C2 was not measured.
- The evolute was measured at its default (parabola, full trace, normal and circle shown). The other trace modes and presets were not.
- Input-to-visible delay, memory and allocation, and the React commit cost of the comb controls are not measured; the frame and update figures are those of the drag only.
- The tip and teeth curves are identified by stroke width 2.5 and 1.5 among the overlay's own data curves, and the evolute trace by width 2. A style change would fail the assertions rather than pass silently.
