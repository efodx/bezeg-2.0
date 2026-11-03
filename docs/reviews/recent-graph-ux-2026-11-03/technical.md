# Technical/browser review

**Target:** frozen local production preview, [http://127.0.0.1:4323/bezeg-2.0/](http://127.0.0.1:4323/bezeg-2.0/), revision `d2a3b6465f541c687811692f4ae1b3f720483141`. The preview returned HTTP 200 on the cross-ratio route. **Browser:** Playwright Chromium 156.0.8078.4, headless, Slovenian locale. Interaction runs used a fresh context, 1440×1000; responsive captures used 390×844 and 1920×1080. The board was `#jgbox` with a direct-child SVG. I waited 900 ms after navigation before each board interaction.

## Findings

**[P2] Cross-ratio point labels collide at 390×844.** Open `/projective/cross-ratio` at 390×844 with the default example. The responsive page has no horizontal document overflow (390 px scroll width; board 364×295 px), but the point labels around the origin compress together: A/A′, B/B′, C/C′, D/D′, M and N are difficult to distinguish in the graph. Expected: point labels remain individually readable at the supported narrow viewport. Evidence: [390×844 projective capture](evidence/technical-projective-mobile.png).

## Selected checks

| Check | Status | Evidence |
| --- | --- | --- |
| Cross-ratio: drag editable D | **Passed** | Dragged from SVG center (685,745) to (717,745). Readout changed from `D = 4`, cross-ratio `9/8` to `D = 5`, `6/5` (1.2); D became selected. [Capture](evidence/technical-cross-ratio-drag.png) |
| Pole-polar: drag P | **Passed** | Dragged from (583,542) to (609,526). P changed from `(1, 21/5)` to `(2, 24/5)`; polar and tangent equations updated. [Capture](evidence/technical-pole-polar-drag.png) |
| Five-point: drag a defining point | **Passed** | Dragged the rightmost defining point from (689,654) to (711,638). The conic changed from `9x² + 25y² − 225 = 0` to `969x² + 723xy + 1085y² − 1446x + 7230y − 31455 = 0`; the derived weight and Farin points updated. [Capture](evidence/technical-five-point-drag.png) |
| Keyboard control on projective graph | **Passed** | Focused “Premakni pogled desno” and pressed Enter; an editable graph point shifted from x=556 to x=406 and the plotted path changed. |
| Fourier coefficient control by keyboard | **Passed** | Focused “Izbrani koeficient”, pressed ArrowDown and Enter. Selection changed from (a_1) to (b_1); the graph readout changed from (a_1=-1.27324) to (b_1=0), and plotted paths changed. [Capture](evidence/technical-fourier-projection-after.png) |
| Fourier coefficient-decay view | **Passed** | Switched “Pogled” to “Pojemanje koeficientov”; the view changed to three spectrum panels. [Capture](evidence/technical-fourier-decay.png) |
| 390×844 responsive layout | **Failed** | No horizontal overflow on either representative graph. The cross-ratio label collision above is the only observed responsive defect. Fourier controls stack and remain within the viewport width. [Projective](evidence/technical-projective-mobile.png), [Fourier](evidence/technical-fourier-mobile.png) |
| 1920×1080 layout | **Passed** | Both graphs and controls fit the 1920 px page width (document scroll width 1920 px); page height exceeded the viewport normally. On Fourier, the right inspector had 1,671 px of content in a 658 px scroll area; a wheel scroll moved it to scrollTop 550 and exposed readouts and spectrum. [Scrolled controls capture](evidence/technical-fourier-wide-controls-scroll.png). [Projective](evidence/technical-projective-wide.png), [Fourier](evidence/technical-fourier-wide.png) |
| Page/runtime errors | **Passed** | No page errors or console errors during the completed route checks. |

## Blocked and skipped

- **Impeccable detector — Blocked:** made the requested attempt: `C:/Users/1337Hacker/.codex/skills/impeccable/scripts/impeccable.cmd detect --json src/graphs/projective .`. Exit 127: `impeccable: engine 0.1.17 is not installed; cannot create cache directory: "C:\Users\1337Hacker\.impeccable\bin\0.1.17"`; the launcher says setup requires network access and write permission to that directory. I did not install or repair it; detector counts are unavailable.
- **Browser overlay — Skipped:** no injection was attempted, so no overlay is claimed.
- **Enlarged text — Skipped:** tried Chromium’s Ctrl+Shift+Equal shortcut at 390×844; computed heading size stayed 27.2 px. No usable browser zoom change occurred.
- **Coverage skipped:** other routes, lessons/prose, physical touch devices and screen-reader accessibility were outside this technical slice.

## Visual note and cleanup

The elderflower palette, subdued grid and copper control points look cohesive, and the graph remains prominent on desktop. The cross-ratio label collision is more noticeable than any broader visual inconsistency in these captures.

All audit scripts had a 120-second deadline and closed Chromium in `finally`; the scripts exited and a process query found no remaining audit script process. I did not start or stop a server, alter app state outside fresh browser contexts, or edit source. Screenshots and bounded logs/scripts are under `evidence/` and `.command-logs/graph-ux-audit-2026-11-03/technical/`. The initial combined interaction script stopped at a strict-mode Playwright label match on Fourier; projective checks had completed. I reran the Fourier/layout checks using an exact label, and those completed.
