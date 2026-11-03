# Functions graph UX audit — handoff

## Target and current state

- Assigned slice: 14 finalized functions, numerical-methods, Fourier and projective-conics lessons in `scope.md`; geometric-series and conic-focal excluded.
- Tested immutable production preview: `http://127.0.0.1:4323/bezeg-2.0/`, snapshot `d2a3b6465f541c687811692f4ae1b3f720483141`, Chromium/Playwright, headless.
- First fresh-context check rendered the homepage (HTTP 200). Preview belongs to the handler; it was left running.
- The build checkout already had unrelated `.claude/jobs/` and `debug.log` changes. I made no app-source changes. My report/evidence is under this review folder; audit scripts are under `.command-logs/graph-ux-audit-2026-11-03/functions/`.
- Work stopped at the handler's explicit `HANDOFF` after the worker usage watcher signaled 135,829 input tokens. No audit script/browser remained running; every script used `finally` to close Chromium. Do not stop the handler's preview server.

## Completed review and coverage

All assigned routes were opened in fresh browser contexts, their guided lessons were advanced to the final frame, and `Opazuj na grafu` was used where available. Screenshots of final frames exist in `evidence/functions-<route>-final-frame.png`. Counts retained in output are below; for the rows marked `run`, the all-routes command output was truncated after seven rows, so the exact counter was not retained. Later corrected runs re-confirmed the noted routes.

| Route | Final frame | Visible action/control exercised and result |
| --- | --- | --- |
| `function-transformation` | 7/7, 13 frame advances | `a`: −2→−1.5 via numeric entry + Enter; formula and parabola changed. Full-page before/after evidence: `functions-transformation-before-action.png`, `functions-transformation-after-action-control.png`. |
| `function-inverse` | 7/7, 13 | Point abscissa (x_0): 2→2.5 via numeric entry + Enter. |
| `polynomial-zeros` | 7/7, 13 | Root coordinate: −3→0 via numeric entry + Enter; readout now reports the root at 0. Separately, an unobstructed default graph mouse drag moved a free zero from (x=-2) to (x=-0.9). The first in-lesson drag attempt did not move, but the no-lesson retry worked; treat the first attempt as setup uncertainty, not a defect. |
| `rational-function` | 7/7, 13 | Numerator coefficient (k): 1→1.5. 390×844 had no horizontal overflow (390/390 CSS px; graph 364×295); at 1920×1080 graph was 1482×680. |
| `root-finding` | 20/20, 39 | Clicked `Naslednji korak`; readout advanced to `korak 1, napaka 0,08088022904`. |
| `quadrature` | 7/7, 13 | Lower limit (a): 0→0.5. |
| `euler-method` | 7/7, 13 | Initial (x_0): 0→0.5. |
| `fourier-series` | 13/13, 25 | Harmonic count (N): 11→12; readout correctly explains that even harmonics are zero, so this square-wave curve is unchanged. Correct graph screenshots: `functions-fourier-series-board-before.png` / `-after.png`. |
| `fourier-coefficients` | Final-frame run; exact counter/action not retained | Initial all-route pass only; inspect screenshot and exercise a coefficient/spectrum control if continuing. |
| `projective-cross-ratio` | 7/7, 13 | Default exact readouts agreed at (3/2); no numeric/range control existed, and a point drag was not completed. |
| `projective-pascal` | 7/7, 13 | Changed conic selector to parabola; displayed Pascal line changed to (y+1=0), with the construction/readout updating. Correct board screenshots: `functions-projective-pascal-board-before.png` / `-after.png`. |
| `projective-pole-polar` | 7/7, 13 | Final scene reviewed; no point drag/control change completed. |
| `projective-five-point` | 9/9, 17 | Final scene reviewed; no point drag/control change completed. |
| `projective-three-views` | 7/7, 13 | Dragged slider (c) from −1.5 to 0.1; readout changed ellipse to hyperbola and discriminant from −80 to 39600, with points at infinity/asymptote directions. Correct board screenshots: `functions-projective-three-views-board-before.png` / `-after.png`. |

No console/page errors were recorded on the corrected projective/Fourier runs. Responsive captures were taken at 390×844 and 1920×1080 for `rational-function`, `projective-pascal`, and `projective-three-views`; only `rational-function` scroll width was logged numerically. Review physical touch, Tab-focus sequence/visibility, and broader accessibility were not covered.

## Evidence integrity correction

The initial audit script indexed generic SVG elements to select the graph. DOM changes shifted those indices, and some `*-board0-after.png` files were only the inspector collapse icon. The handler independently confirmed this on Fourier coefficients and three-views. I invalidated that whole indexed-capture set and removed 28 `functions-*-board*-*.png` files, then recaptured the representative boards from `#jgbox` (`#jgbox > svg` is the board SVG in this app). The two `functions-polynomial-board-*-drag.png` files from the failed first drag were also removed. Earlier `markupLengthChanged` values are invalid and must not be used as evidence. Full-page final-frame screenshots were retained; Pascal and pole-polar loading-screen captures were overwritten after waiting for `window.JXG` and the board to settle.

## Design judgment to carry forward

- **Candidate P2, mobile readability:** at 390×844, `projective-three-views` keeps source and image boards side by side, leaving each around 170 CSS px wide. Axes and conic details are too small to compare comfortably, although the page has no horizontal overflow and its slider stays reachable. Screenshot: `evidence/functions-projective-three-views-narrow-390.png`. Consider stacking the two panels or adding a focused-panel switch below the desktop breakpoint.
- **Candidate P3, mobile visual hierarchy:** `projective-pascal` packs the hexagon, multiple long construction lines, intersection labels and coordinates into the narrow graph. The mobile screenshot shows a dense crossing field that is hard to trace. Screenshot: `evidence/functions-projective-pascal-narrow-390.png`. Consider making the active hexagon/Pascal line more prominent and muting optional constructions. This is a polish opportunity, not a verified control failure.
- **Strengths:** transformation and root-finding keep a large central graph beside understandable controls and readable mathematical readouts; Fourier series makes dense construction legible with separated panels and a useful legend; the elderflower palette is consistent and calm.
- No reproducible functional defect was confirmed. The centered lesson card is hideable/observable as designed; do not report it as an obstruction.

## Exact continuation steps

1. Write the assigned final `functions.md` using this note and the corrected evidence. Keep the two mobile observations separated from functional failures and include a row for all 14 routes.
2. Inspect `functions-fourier-coefficients-final-frame.png` and `functions-projective-pole-polar-final-frame.png`; finish one visible control/point action on `projective-cross-ratio`, `projective-pole-polar`, and `projective-five-point` if time permits. Use a read-only `JXG.boards` inspection only to locate a real SVG handle, then drag through `page.mouse`; the rendered board is `#jgbox`. Do not claim board changes from whole-SVG inequality.
3. Confirm any remaining screenshots cited by the final report exist; all old `functions-*-board*-*.png` indexed captures were removed. Preserve the handler-owned server and unrelated worktree files. The final report should state incomplete physical-touch, broad keyboard and accessibility coverage.
