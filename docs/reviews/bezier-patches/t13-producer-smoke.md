# T13 rendered-owner producer smoke

Target: local production preview `http://127.0.0.1:4391/bezeg-2.0/` (GET 200 confirmed by handler at 16:23:45). Chromium headless, Playwright; desktop viewport 1440×1000, narrow viewport 390×844. HEAD `9983277`; the worktree was already dirty with the T13 producer source/tests and handoff notes. Handler build `just build` passed at 16:23:02 (log `.command-logs/2026-10-29T15-23-02-071Z-16756-5919e3a8.log`). Smoke elapsed about 10 minutes.

| Selected check | Status | Evidence |
|---|---|---|
| Six patch routes: owner samples, WebGL, framing | Passed | Each route rendered one `three.js r180` canvas (1002×660) and three finite xyz samples. Tensor, de Casteljau, derivatives, subdivision owners: `tensor-patch-0`; joins: `join-patch-a`, `join-patch-b`; triangular: `triangular-patch-0`. Camera framing metadata was present throughout. Subdivision hides control-point markers (zero framing markers); its shaded surface was visible in the retained screenshot. Other routes reported 10–32 in-frustum points. |
| Teapot through inspector UI with boundaries hidden | Passed | Selected “Čajnik iz Utaha”; all 32 `teapot-patch-0…31` owners remained after turning boundary curves off. |
| Shading toggle | Passed | On tensor, disabling shading removed the owner attribute; re-enabling restored the exact owner samples. |
| Parameter and orbit | Passed | Parameter u changed 0.50→0.51 with samples unchanged. Empty-space drag changed camera azimuth −0.90→−0.26 and elevation 0.50→0.10; samples stayed identical. |
| Geometry edit and Reset | Passed | Selecting the bilinear patch changed its three published xyz samples; Save → Reset restored the exact starting samples. |
| Language | Passed | Slovenian → English → Slovenian changed the heading each way; owner samples stayed identical. |
| Narrow keyboard access | Passed | At 390 px, page and body widths stayed 390 px; Tab reached “Senčena krpa” after 5 presses, Space toggled it, and a second Space restored it. |
| Legacy Bézier baseline drag | Passed | Dragged a visible control point by about 36×24 px; SVG path data changed. |
| Legacy de Casteljau slider | Passed | Slider changed 0.50→0.51 and SVG path data changed. |
| Tensor ↔ triangular SPA navigation twice | Passed | The visible demo switcher completed two cycles. Every transition had one canvas and one finite-sampled expected owner (`triangular-patch-0` or `tensor-patch-0`); after the last return, parameter u changed 0.50→0.51. No browser errors. |
| Browser errors | Passed | No page errors, console errors, or failed requests captured. |

Focused follow-up used the same preview/build/source; no app files changed. Cleanup: all browser contexts closed; no preset was saved and no app/source file was changed. Temporary Playwright scripts were removed from `.claude/scratch`; the subdivision screenshot remains there as visual evidence. Local production preview evidence does not establish hosted deployment behavior.

