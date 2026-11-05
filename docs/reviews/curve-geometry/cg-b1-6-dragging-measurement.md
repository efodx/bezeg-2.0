# CG-B1-6: L2 dragging measurement

Spec: [Batch 1 gate](../../specs/curve-geometry-lessons.md#testing-decisions); protocol and report template in [performance-plan.md](../../performance-plan.md). Script: `scripts/curvature-browser-perf.cjs` (rAF frame intervals, plus the time inside `board.update`, since a frame interval cannot show work that fits inside a frame).

## Scene configuration

Code at `bdfee9aa` (the tree differed only by this script), production preview, Chromium 156.0.8078.4 headless, AMD Ryzen 5 7600 desktop on Windows 11, viewport 1440×900 unless stated, device scale 1, mouse input, 60 Hz frames. Gesture: a circular drag of one reachable control point, 150 steps over 2 s, 3 runs per case, first 15 frames dropped; values are medians of runs. The lesson card is hidden first, as a learner does to drag. Other streams may have been using the machine.

## Results

| Case | Frame median ms | Frame p95 ms | Frames >25 ms per run | Update median ms | Update p95 ms | Free points | Board objects |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline `/bezier/curve`, default | 16.7 | 16.7 | 0/0/0 | 1.90 | 3.40 | 4 | 48 |
| Lesson cubic, overlay hidden | 16.7 | 16.7 | 0/0/0 | 2.10 | 3.90 | 4 | 61 |
| Lesson cubic, frame and circle shown | 16.7 | 16.7 | 0/0/0 | 2.45 | 3.90 | 4 | 61 |
| Free route parabola, frame and circle shown | 16.7 | 16.8 | 0/0/0 | 2.35 | 4.40 | 3 | 59 |
| Baseline, CPU ÷4 | 16.7 | 33.3 | 50/64/130 | 11.15 | 21.10 | 4 | 48 |
| Lesson cubic, overlay hidden, CPU ÷4 | 16.7 | 33.4 | 101/116/103 | 13.50 | 23.30 | 4 | 61 |
| Lesson cubic, frame and circle shown, CPU ÷4 | 16.7 | 33.4 | 135/132/139 | 14.10 | 23.60 | 4 | 61 |
| Lesson cubic, frame and circle shown, 1920 px | 16.7 | 16.8 | 0/0/0 | 2.50 | 4.40 | 4 | 63 |
| Free route \(t\) sweep 0 to 1 (keyboard) | 16.7 | 16.8 | 0/0/0 | 2.10 | 2.90 | 3 | 59 |

## Decision

Keep the overlay as built; no optimization is needed. On the desktop every case holds the frame rate with no frame over 25 ms. On the same cubic the overlay adds 0.35 ms per update (0.6 ms at CPU ÷4), and the whole Demonstration adds 0.55 ms over plain Bézier. At CPU ÷4 every case, the plain baseline included, already sits near the frame budget (update p95 over 20 ms). The overlay's extra late frames there (about 135 per run against 101–116) are small next to the baseline's own 50–130 spread.

## Limits

No real touch device, so the CPU ÷4 rows stand in for a weak one. The plan's input-to-visible delay, allocation and React commit counts were not measured. No mathematical check changed; tangency during a drag is covered by `CurvatureBezierCurveGraphReal.test.tsx`.
