# CG-B2-1: curvature comb measurement

Spec: [performance gate](../../specs/curve-geometry-lessons.md#testing-decisions); protocol and report template in [performance-plan.md](../../performance-plan.md). Script: `scripts/comb-browser-perf.cjs`. Decision: [ADR 0041](../../adr/0041-curvature-comb-drawing.md).

## Scene configuration

Production preview of `9f736678`, Chromium 156.0.8078.4 headless, AMD Ryzen 5 7600 desktop on Windows 11, viewport 1440×900 unless stated, device scale 1, mouse input, 60 Hz frames. Gesture: a three-quarter circular drag of one point, 150 steps over 2000 ms; a closed path would end where it began and defeat the check that the comb moved. Cases are interleaved across runs. The machine was shared with other jobs, which is why interleaving matters.

The comb does not exist yet, so the script injects each approach into the live page through `window.JXG`. Control points are read from the board on every update. Each tooth does the kernel's work: de Casteljau value, r′, r″, κ, normal, clamped tip, singular samples omitted. Tips and bases equal `sampleComb(splineSpanSource(...))` exactly (largest difference 0) on 200 random cubics at 8, 32, 64 and 256 teeth, 18 000 teeth in all.

- **A:** one JSXGraph curve for all teeth (base, tip, NaN), plus one for the tip polyline, both refilled in `updateDataArray`.
- **B:** one segment per tooth, plus the tip polyline. Function-valued endpoints add two hidden points per tooth.
- **C:** one SVG layer in the board container with two paths, rebuilt right after `board.update`, inside the timed span.
- **D:** A with one tooth per 8 CSS px of the control polygon's bounding-box diagonal, capped at 256.

A case fails the run, reporting no time, unless at both drag ends the DOM holds the expected teeth and the drawn tips match a fresh kernel run within 1.5 px, and the tips moved more than 2 px during the drag. With `COMB_MUTATE=1` (comb not redrawn) lesson A and spline C failed that check with a 0 px shift, and lesson B and C failed the earlier freshness check; spline A and B were not rerun under the mutation.

## Results, 3 runs

Frame median was 16.7 ms in every case, so it is left out. At normal CPU no case had a frame over 25 ms. "Over 25" lists frames per run.

| Case | Frame p95 ms | Update median ms | Update p95 ms | Board objects |
| --- | --- | --- | --- | --- |
| Plain `/bezier/curve`, comb off | 16.7 | 1.50 | 2.90 | 48 |
| Lesson cubic, comb off | 16.7 | 1.80 | 3.20 | 61 |
| Cubic A 32 / 64 / 128 / 256 | 16.8 / 16.8 / 16.7 / 16.7 | 1.80 / 2.00 / 2.40 / 2.30 | 3.30 / 3.60 / 3.90 / 3.70 | 63 |
| Cubic B 32 / 64 / 128 / 256 | 16.7 / 16.8 / 16.7 / 16.7 | 2.05 / 2.95 / 4.10 / 5.50 | 4.00 / 4.40 / 6.60 / 7.00 | 158 / 254 / 446 / 830 |
| Cubic C 32 / 64 / 128 / 256 | 16.7 / 16.7 / 16.8 / 16.8 | 1.85 / 1.80 / 2.40 / 2.30 | 3.40 / 3.30 / 3.90 / 3.60 | 61 |
| Cubic D (25 teeth) | 16.7 | 1.95 | 3.30 | 63 |
| C2 spline, comb off | 16.7 | 3.40 | 4.60 | 72 |
| Spline A 64 / 256 | 16.7 / 16.8 | 2.80 / 3.50 | 4.80 / 5.40 | 74 |
| Spline B 64 / 256 | 16.8 / 16.7 | 3.95 / 6.40 | 5.80 / 8.60 | 265 / 841 |
| Spline C 64 / 256 | 16.7 / 16.7 | 3.40 / 3.70 | 5.40 / 5.90 | 72 |
| 1920×1080: cubic A / B / C at 256 | 16.7 | 2.65 / 5.70 / 2.50 | 4.30 / 8.20 / 3.90 | 65 / 832 / 63 |

Differences under about 0.5 ms are noise: A 256 reads below A 128, and spline A 64 below the spline with no comb.

At CPU ÷4, 3 runs separated the approaches but not the tooth counts:

| Case | Frame p95 ms | Over 25 | Update median ms | Update p95 ms |
| --- | --- | --- | --- | --- |
| Cubic B 64 / 256 | 33.4 / 66.7 | 146/136/146, 146/146/146 | 17.95 / 30.60 | 28.50 / 40.80 |
| Cubic C 64 / 256 | 16.8 / 33.3 | 88/10/17, 118/69/38 | 10.90 / 12.05 | 18.70 / 22.10 |
| Spline B 64 / 256 | 50.1 / 83.4 | all about 146 | 25.80 / 39.55 | 37.30 / 52.40 |
| Spline C 64 / 256 | 50.0 / 50.0 | all about 146 | 21.20 / 20.90 | 33.00 / 33.60 |

The A rows gave p95 33.3, 16.8, 33.4 at 32, 64, 128 teeth, which is not monotonic, and run 1 was far worse than later runs. They were rerun for the default.

## Results at CPU ÷4, approach A, 7 runs

| Case | Frame p95 ms | Over 25 per run | Median of those | Update median ms | Update p95 ms |
| --- | --- | --- | --- | --- | --- |
| Lesson cubic, comb off | 16.8 | 46/35/7/8/4/12/31 | 12 | 9.55 | 18.70 |
| A 32 | 33.3 | 18/38/26/15/48/71/57 | 38 | 11.30 | 20.00 |
| A 64 | 33.2 | 15/31/16/29/14/58/69 | 29 | 10.95 | 19.10 |
| A 128 | 33.4 | 63/104/56/31/92/124/133 | 92 | 12.80 | 20.90 |
| A 256 | 33.4 | 91/143/68/74/71/140/143 | 91 | 14.15 | 21.90 |
| C2 spline, comb off | 33.4 | about 146 every run | 146 | 17.70 | 29.20 |
| Spline A 64 | 50.0 | about 146 every run | 146 | 18.25 | 31.30 |

## Budget

The performance plan sets no numeric tolerance; it asks for budgets after a baseline. This report uses the threshold of [ADR 0037](../../adr/0037-direction-field-drawing.md) and the Fourier 05 precedent: on the desktop, frame p95 at most 16.8 ms and no frame over 25 ms. Update time decides between cases, since frame intervals sit at the display cap.

## Decision

Draw the comb with approach A at a fixed default of 64 teeth; details and alternatives are in the ADR. Every approach and count meets the desktop budget, so the budget alone would allow 256. The default comes from the CPU ÷4 stand-in: long frames triple from 64 to 128 teeth.

## Limits

- The comb on a weak device is not free. At CPU ÷4 every comb count takes the cubic's p95 from 16.8 to about 33 ms, and the 64-tooth spline comb takes it from 33 to 50 ms, on a spline drag that already misses 60 Hz with no comb. No real touch or classroom device was used.
- The harness comb sits outside the app's React and graph lifecycle, so disposal and React commits are not measured. Input-to-visible delay and allocation are not measured.
- C2 joins are computed, so the spline drag moves the middle de Boor point, which moves the neighbouring joins, rather than a join itself. Only the C2 spline was measured, not C1 or G1.
- Gain is fixed at 0.4 of the control polygon's extent. The clipped-tooth marker of the spec is not drawn.
- Spline spans are rebuilt from the order of the board's points; setup fails if the count is wrong or sampled bases leave the board's curve.
