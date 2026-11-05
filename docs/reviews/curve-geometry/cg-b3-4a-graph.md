# CG-B3-4a: curve-envelope graph and registration

Spec: [L6](../../specs/curve-geometry-lessons.md); tasks: [curve geometry](../../tasks/curve-geometry/README.md). Route `/bezeg-2.0/curve-geometry/envelope`, `lesson: false`, poster pending. Written by curves handler 55 on 2026-11-05 from [handoff 54](../feature-streams/curves/handler-handoff-54.md).

## Accepted work

| Commit | Work |
| --- | --- |
| `04a7d821` | Kernel, graph, overlay, Preset collection, lesson actions, registration, localization |
| `70c21746` | Review and smoke fixes below, Preset rejection tests, `scripts/envelope-gate-perf.cjs`. This commit alone fails five tests; do not bisect to it as good |
| `8c5b99aa` | Corrects `70c21746`: the one-pixel slack applies only to a board with a size |

## Acceptance

| Spec item | Status | Evidence |
| --- | --- | --- |
| 1. Touching point equals the de Casteljau point to 1e-9 | Passed | Kernel tests; in the browser, \(t=0, 0.25, 0.75, 1\) and a moved control point match \(B(t)\) to 6 decimals |
| 2. At most 200 lines, measurement attached | Passed | 200 lines give 200 segments; slider and number box clamp at 200; [measurement](#measurement) |
| 3. Collinear controls show the segment, not an envelope | Passed after fix | Note reaches the live region after a real mouse drag at 390, 1280 and 1440 px on `8c5b99aa` |
| 4. Both languages | Passed | English labels and readout in the browser, no raw keys |

## Review and smoke findings

Review by `bezeg-reviewer` Sonnet; first browser check by `bezeg-smoke` Sonnet at 1440×900 and 390×844 on `df6ba5dd`: 9 of 10 checks passed.

- **Fixed: the hidden curve could reappear.** A scene that showed the curve and an action that hid it in the same batch left it drawn, since `onStateChange` compared only the state before the batch. The graph now records the visibility it last applied. Found by review, reproduced by a test that failed first.
- **Fixed: a language switch dropped the collinear note** for the 500 ms quiet period. The overlay now replaces the readout at once.
- **Fixed: the collinear note was out of reach by dragging.** Smoke saw it fail at 390 px. The cause was not the width: the test needed collinearity to 1e-9, and a pointer aimed at the line lands about 1e-7 away. 1440×900 worked only because 190 px per unit makes the coordinates exact. `isCollinear` keeps its tolerance and takes a `slack`; the overlay passes one screen pixel, within which the curve looks like the segment.
- **Kept: the family draws the segments \(Q_0Q_1\), not lines extended to the view.** The spec's lines join corresponding de Casteljau points, and the segments form the swarm. With high-degree or nearly collinear controls they are short. Revisit only if L6's text needs infinite lines.
- **For the gate:** the board caption crosses a y-axis tick label, at 390 px on "2.5" and at 1440 px on "2" with the collinear line.

Coverage limits: the browser checks 1 to 10 ran on `df6ba5dd`; on `8c5b99aa` only the collinear drag and the measurement were rerun. Mobile drags used mouse events, not real touch. The drag recheck used fractional pointer positions; whole-pixel pointers rely on the one-pixel slack and were not run. Six of the smoke screenshots were not opened.

## Measurement

`node scripts/envelope-gate-perf.cjs` on a production preview of `8c5b99aa`: Chromium 156, 1440×900, 3 runs per case, 150 steps over 2000 ms, cases interleaved. Every case asserts the family holds two points per line and changes during the gesture.

| Case | Frame median ms | Frame p95 ms | Frames over 25 ms per run | Update median ms | Update p95 ms |
| --- | --- | --- | --- | --- | --- |
| Control point, 16 lines | 16.7 | 16.7 | 0/0/0 | 2.10 | 4.20 |
| Control point, 200 lines | 16.7 | 16.8 | 0/0/0 | 2.30 | 4.70 |
| \(t\) slider, 200 lines | 16.7 | 16.7 | 0/0/0 | 2.10 | 3.20 |
| Line count slider, from 100 up | 16.7 | 16.7 | 0/0/0 | 2.00 | 3.10 |
| Control point, 16 lines, CPU/4 | 16.7 | 33.3 | 55/47/42 | 11.95 | 25.30 |
| Control point, 200 lines, CPU/4 | 16.7 | 33.4 | 63/62/60 | 13.30 | 28.10 |
| \(t\) slider, 200 lines, CPU/4 | 16.7 | 16.8 | 21/14/13 | 10.80 | 17.70 |
| Line count slider, from 100 up, CPU/4 | 16.7 | 16.8 | 36/20/21 | 11.90 | 18.50 |

The 200-line family needs no optimisation: it adds about 0.2 ms to an unthrottled update. The throttled control point drag drops frames at 16 lines too, so its cost is not the family. The project has no budget for weak devices, so CPU/4 is a record, not a pass.
