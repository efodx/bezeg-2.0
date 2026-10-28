# Task 08 browser smoke (R3), commit 66efc0c

Chromium (Playwright, default WebGL worked), preview on port 4196 from `just build` (dirty tree, revision 66efc0c). Scripts and screenshots: `.claude/scratch/smoke08b/`. Slovenian unless noted.

| # | Check | Result | Observed |
|---|---|---|---|
| 1 | Inset drag inside | Passed | Dot (u,v) tracks the pointer; w readout correct (e.g. 0,44 / 0,24 -> w 0,32). |
| 1 | Beyond hypotenuse | Passed | Pointer at u=.503, v=.561 -> 0,47 / 0,53 (w 0); u=1.08, v=.95 -> 0,57 / 0,43. Both equal the orthogonal projection onto u+v=1. |
| 1 | Beyond vertices / edges | Passed | v-vertex -> 0/1; u-vertex -> 1/0; w-vertex -> 0/0 (w 1); left edge -> u 0, v follows (0/0,49 for expected 0,50); bottom edge -> v 0; (215,100) -> 0,81 / 0,19 (nearest hypotenuse point). |
| 1 | Sliders | Passed | u=0,2 and v=0,5 set; dot moved, w 0,3. Slider max is capped to 1 - other (u max 0,5 at v 0,5). |
| 2 | Index select | Passed | 10 valid cubic triples offered ("Brez izbire" first); picking (1, 1, 1) shows P111 label, blue highlight lines through the point in the view. Only a small 3D view, so line parallelism not measured. |
| 2 | Bernstein weight | Passed | P111 of the cubic at (1/3,1/3): 0,2222. P300 at that point: 0,037 (1/27). |
| 2 | xyz editor | Passed | Inputs are `type=number`, accessible names "b111 x/y/z". z=2.5 + "Uporabi koordinate" applied (z 2 -> 2.5). Typing "abc" is blocked by the browser (value stays empty); an empty field is stopped by native validation ("Please fill out this field"). The app-level error message path was therefore not reached in the browser (gap). |
| 3 | Comparison switch on | Passed | Teal tensor patch drawn on the same net, boundary edges coincide on two sides; inset gains the dashed teal unit square around the triangle; help and domain note visible. Screens 3-on-graph, 3-inset-on. |
| 3 | Switch off | Passed | Tensor patch, square and domain note removed (note count 0). |
| 3 | Preset | Passed | Saved with comparison on and P111 selected; after reload and restore, comparison off and index select empty. A plain reload also has comparison off. |
| 4 | Tensor route inset | Passed | Drag inside works (0,45/0,55); beyond the square corners clamps to 1/1 and 0/0, edges clamp. Observation: a single pointer jump straight outside the inset board (steps=1) is not tracked (value unchanged); continuous movement clamps correctly. Not compared with the baseline. |
| 5 | English | Passed | Title, tabs, labels, compare help, "Weight of point P111 0.2222" all English, decimal point. |
| 5 | 390x844 touch | Passed | scrollWidth 390 = clientWidth before and after; CDP touch drag from the dot beyond the hypotenuse -> 0,57 / 0,43. |
| 5 | Console | Passed | 0 console or page errors in every script. |

## Timing (software GL, 1440x1000, de Casteljau on, comparison on, split on; page-side rAF, 40 moves, 8 ms apart, two runs)
| Gesture | next-rAF med / p95 (run 1; run 2) | second-rAF med / p95 | frame p95 |
|---|---|---|---|
| XY control-point drag (P300) | 10.2 / 13.8 ms; 10.6 / 14.7 | 20.7 / 26.8; 20.8 / 24.5 | 16.7 ms |
| Orbit | 5.9 / 7.4; 5.9 / 7.6 | 22.6 / 26.1; 22.2 / 25.6 | 16.7-16.8 ms |
| Inset drag | 7.6 / 10.1; 9.3 / 10.5 | 18.4 / 24.6; 18.0 / 24.0 | 16.7-16.8 ms |

ADR 0018 budgets: drag next-rAF p95 <= 60 ms passes (14.7 max); orbit <= 16.7 ms passes on next-rAF (7.6) but second-rAF p95 is 25.6-26.1 ms (budget metric reading ambiguous; stated honestly); active frame p95 <= 50 ms passes (16.8). Frame duration is vsync-bound at about 16.7 ms.

## Observations and gaps
- Graph canvas is small (about 200 px wide in the 1000 px viewport at default camera), so the highlight lines and comparison are hard to judge visually; this was not compared with commit 45f6914.
- Triangle highlight line directions and the shared-boundary exactness were judged by eye only.
- Software GL only; touch via CDP emulation; keyboard-only operation (Tab/arrow) of the inset and index select not exercised; lessons, other routes and the automated smoke suite not run.
- Preview stopped after the run.
