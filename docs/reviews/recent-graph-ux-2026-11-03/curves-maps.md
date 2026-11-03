# Curves, probability, and maps UX review

**Target:** frozen production preview `http://127.0.0.1:4323/bezeg-2.0/`, revision `d2a3b6465f541c687811692f4ae1b3f720483141`. Browser: installed Playwright Chromium, headless. Focused actions used 1440×900; responsive views used 390×844 and 1920×1080. The preview served HTTP 200. No application source was changed.

## Verdict

No graph-control failure was confirmed in the focused continuation. Dataset, matrix, NURBS, B-spline control-point, de Boor, and CLT actions produced relevant graph or readout changes. Both responsive widths kept the graph and controls within the page without horizontal overflow. One low-priority lesson-layout opportunity remains: the opening B-spline recurrence is initially wider than its math block; horizontal scrolling exists, but is not visually obvious.

## Lesson route coverage

The first pass reached each final frame, used Finish, and hid the lesson overlay on all 13 routes (`route-actions.json`). The continuation reused that coverage and did not rewalk the lessons.

| Route | Final frame | Previously recorded action | Continuation |
| --- | --- | --- | --- |
| `bspline-basis` | 6/6 · 2/2 | Keyboard (t): 0.50→0.51; graph and readout changed | Opening recurrence layout inspected |
| `bspline-deboor` | 6/6 · 2/2 | Keyboard (t): 0.50→0.51; geometric change not established then | Next added level 1; Play reached level 2 and (C(t)=(1,1.5)); “Nazaj na raven 0” restored level 0 |
| `bspline-insertion` | 6/6 · 2/2 | Inserted (u=0.5); graph text changed | No geometric-equivalence check |
| `bspline-extraction` | 6/6 · 2/2 | Example changed quadratic→cubic | Dragged control (P_1): (1,2)→(1.344,2.314); Bézier segment samples changed |
| `bspline-nurbs` | 6/6 · 2/2 | Parameter slider changed; weight response unfinished | Weight 2 changed 0.70711→4; curve and circle-error readout changed |
| `prob-density` | 6/6 · 2/2 | Mean slider changed 0→0.1; graph changed | — |
| `prob-binomial-normal` | 6/6 · 2/2 | (n) changed 20→21; graph changed | — |
| `prob-clt` | 7/7 · 2/2 | (n) changed 1→2; graph changed | Play/Pause verified; curve and (K_n) changed |
| `prob-summary` | 6/6 · 2/2 | Numeric edit unfinished | Value 7 changed 8→21; plotted data/derived geometry updated; count remained 7 |
| `prob-correlation` | 6/6 · 2/2 | Dragged ((2,2))→((2.2,2.4)); graph text changed | — |
| `linear-map` | 6/6 · 1/1 | Initial matrix edit inconclusive | (a_1:x) changed 1→2; transformed vector/grid changed |
| `complex-reciprocal` | 7/7 · 1/1 | Dragged (z=(1,1))→(1.4,1.5); graph labels/readout changed | — |
| `complex-roots` | 7/7 · 1/1 | Degree changed 3→4; readout changed | — |

## Finding

### P3 — Opening recurrence extends beyond the visible math block

On `/bspline/basis`, open the guided lesson at 1440×900. The recurrence’s right-hand term extends past the 512 px notation area (MathJax content width 636 px). A horizontal-scroll container is present (`overflow-x:auto`, `scrollWidth` 648 px), so the expression can be recovered by scrolling; the initial view has no clear scroll cue and visibly cuts off the final term. Consider wrapping/alignment or an obvious scroll affordance. This is a discoverability/layout issue, not a confirmed mathematical error.

Evidence: [opening recurrence screenshot](evidence/curves-finish-bspline-recurrence.png); the earlier [first-frame capture](evidence/curves-maps-bspline-basis-first-frame.png) shows the same layout.

## Focused interaction and responsive checks

| Check | Result and evidence |
| --- | --- |
| Summary dataset edit | **Passed.** “Vrednost 7” accepted 21 after 8; the plotted data and derived graph geometry changed, while “Število vrednosti: 7” correctly stayed constant. [Screenshot](evidence/curves-finish-summary-edit.png) |
| Linear-map coefficient | **Passed.** (a_1:x) accepted 2 after 1; mapped vector (a_1) and transformed grid updated. [Screenshot](evidence/curves-finish-linear-map-coefficient.png) |
| NURBS weight | **Passed.** Weight 2 changed from (sqrt2/2) to 4; the circle visibly deformed and maximum radial error changed from approximately (2.22\times10^{-16}) to (2.73\times10^{-1}). [Screenshot](evidence/curves-finish-nurbs-weight.png) |
| de Boor levels | **Passed.** Next added level 1; Play reached level 2 and the curve point readout; reset returned to level 0. Mid-animation pause was not separately observed because playback reached its terminal level before the follow-up button check. [Next-level screenshot](evidence/curves-finish-deboor-next.png) · [Reset screenshot](evidence/curves-finish-deboor-reset.png) |
| B-spline control-point drag | **Passed.** Pointer drag moved (P_1) and changed both adjacent Bézier segment samples. [Screenshot](evidence/curves-finish-bspline-control-drag.png) |
| CLT Play/Pause | **Passed.** “Predvajaj” exposed “Premor”; (n) advanced 1→2, the density curve changed, and (K_n) changed 0.05718→0.01644. No sample points or histogram were visible in the tested state; the visible output was a density curve and reference segment. This is recorded as a coverage observation, not a defect. [Screenshot](evidence/curves-finish-clt-play-stop.png) |
| 390×844 | **Passed.** NURBS and CLT graphs fit at 364×295, controls stack below the graph, and document width remained 390 px. Keyboard ArrowRight changed NURBS (t) 0.063→0.064 and changed a graph point; ArrowRight changed CLT (n) 1→2 and changed its curve/readout. Some controls are below the initial fold and require vertical scrolling. [NURBS](evidence/curves-finish-nurbs-390x844.png) · [CLT](evidence/curves-finish-clt-390x844.png) |
| 1920×1080 | **Passed.** Graphs were 1482×680 with a 310 px tool panel; no horizontal overflow. The long tool panels extend below the viewport. Keyboard changes above also worked at this width. [NURBS](evidence/curves-finish-nurbs-1920x1080.png) · [CLT](evidence/curves-finish-clt-1920x1080.png) |

## Visual quality and limits

The cream/forest/ochre identity is consistent, titles and primary controls are clear, and graph cards remain prominent on desktop and mobile. On mobile the graph-first stacked layout avoids squeezing controls beside the plot; the long NURBS panel takes substantial vertical scrolling. No horizontal page overflow or browser page/console errors appeared in the focused runs.

The 13-route final-frame record comes from the prior pass; the continuation tested only the actions and viewports listed above. No touch-device behavior, exhaustive keyboard/accessibility behavior, insertion-equivalence math, or CLT histogram behavior was established. No deterministic detector was used. All continuation scripts exited and close their Playwright browsers in `finally`; a process check found no live `curves-finish` process. Other headless Chromium processes belonged to unrelated command lines and were left running. The handler-owned preview was not stopped.
