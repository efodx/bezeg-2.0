# Task 07 browser smoke (patch-tensor)

- URL: http://127.0.0.1:4310/bezeg-2.0 (production preview; provenance: checkout and build revision d7dcffd, dirty = untracked debug.log only)
- Browser: Playwright Chromium; WebGL works with default launch and with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` (software GL; all scripted runs used swiftshader args). Viewports 1440x1000 and 390x844 (touch via CDP Input.dispatchTouchEvent).
- Screenshots and downloads: `.command-logs/task07-smoke/` (tensor-*.png, export.svg/png, export-svg-render.png, preset-from-zip.png, slike.zip, automated-suite.log).

## Checks
| # | Check | Status | Evidence |
|---|---|---|---|
| 1a | Curve routes bezier, decasteljau, rational, spline-c1, ph-cubic load | Passed | each: heading, one #jgbox board with circles, no overflow, 0 console errors |
| 1b | Bezier point drag | Passed | point (358,521)->(398,471), path changed |
| 1c | De Casteljau slider | Passed | keyboard slider to 0.55, construction changed |
| 1d | Rational weight change | Incomplete | could not locate weight control (not a plain inspector slider; guess failed); not verified manually. Automated suite passed rational route load |
| 1e | PH editor | Partial | PH route shows 1 board plus hodograph editing mode text; generating-point editor not exercised manually |
| 1f | Nav bezier<->ph x2 | Passed | 1 workspace, 1 #jgbox, 0 errors |
| 1g | Curve SVG/PNG export | Passed | curve-izvoz.svg 51 KB (JSXGraph svg, no change), PNG 1002x660 RGBA 32 KB |
| 1h | Language/preset/lesson/narrow baseline | Covered by automated suite | `npm run test:smoke:built` (port 4311): 241 passed, 3 failed (see below); not repeated manually |
| 2 | patch-tensor WebGL renders | Passed | canvas non-white 19106/661320 px, surface+net visible (tensor-desktop.png) |
| 2 | Orbit drag | Passed | dot layout changed |
| 2 | Pick selects point | Passed | click top dot -> editor index 22, x/y/z 0.5/0.5/2.5; labels S(u,v), P22 |
| 2 | XY drag | Passed | y -0.5 -> -0.874, x 0.5 -> 0.505, z unchanged |
| 2 | Shift z-drag | Passed | z 2.5 -> 3.29, x/y unchanged |
| 2 | z-mode toggle drag | Passed | z 3.29 -> 3.42 on picked P21, x/y unchanged |
| 2 | Wheel zoom | Passed | dot span 195 -> 285 px |
| 2 | Touch drag | Passed | touch orbit changed view; tap selected point; touch drag with z toggle OFF moved x,y (0.5,-0.5 -> 1.67,-1.96), z unchanged. Prikaz hint says touch drag changes only z; that is evidently tied to the z toggle |
| 3 | 390x844 fit | Passed | scrollWidth 390 = clientWidth; canvas 364x295; editor 3 inputs 89 px each inside 390 |
| 3 | (u,v) inset | Passed with note | 218x218 px square, visible; touch drag u,v 0.5/0.5 -> 0.79/0.79; mouse drag -> 0.44/0.56; S(u,v) label moved (203,387)->(196,388). Inset keeps fixed 218 px at 320/390/600 widths (recentres, does not scale), no overflow at 320/600 |
| 4 | Keyboard | Passed | Prikaz/Shrani/Uredi buttons focus + Enter/Space; camera buttons Space/Enter changed az/el; az/el sliders Arrow/PageUp (-52 -> -14; 28.8 -> 26.8); index selects ArrowDown selected P12; coordinate input typing works (2.5 -> 2.51; an "Uporabi koordinate" apply button follows; applying not tested); u slider ArrowRight 0.5 -> 0.52. Focus: 3 px solid outline on all |
| 5 | Labels | Passed | S(u,v) and P_ij overlay; P22 position moved on orbit (559,566 -> 528,582); P22 display:none when viewed from below (el -88.2, occluded) and when zoomed out of frame; S(u,v) stayed visible (on surface) |
| 6 | Export SVG | Passed | izvoz.svg 1002x660, exactly 1 `<image>` (PNG data URI), group `bezeg-math-labels` with 2 nested label svgs (surface-point at 509,305.8; selected-point at 499.5,155.5). Rendered SVG visually identical to PNG; label positions match on-screen labels within about 3 px (screen: S at rel 509,312 top-left; P22 504,242 before view reset, 499,153 at export) |
| 6 | Export PNG | Passed | 1002x660 RGBA, non-blank, S(u,v) and P22 labels present (export.png) |
| 6 | Preset batch zip | Passed with UX note | slike.zip contains smoke-t07.png 1002x660. NOTE: the batch dialog opens with NO preset checked for a preset saved after the page mounted (selection initialised once at mount in `ImageGenerationModal`); confirming then yields an empty 22-byte zip with no message. Shared code path, likely not introduced by task 07 (not compared) |
| 7 | Timing (software GL, swiftshader) | See below | |
| 8 | Console errors | Passed | 0 console errors / page errors on every visited route (patch-tensor, 5 curve routes, demonstrations) |
| - | Automated suite failures | Failed (3) | see below |

## Automated suite failures (npm run test:smoke:built, 241 passed / 3 failed)
1. `demonstrations.smoke.spec.cjs:251 patch-tensor renders its heading, graph, and inspector`: `expectRenderedWorkspace` waits for visible graph elements (predicate at line 31-33) and gets 0 for 20 s. The page renders correctly in my runs (canvas + labels), and default Chromium has WebGL, so this is most likely the helper's selector not recognising the Three canvas. Not diagnosed further.
2. `demonstration-motion.smoke.spec.cjs:47` and 3. `:60` (clip decode / 390 px preview): `#demonstration-card-patch-tensor video[src]` count 0. The catalog card uses a still `<img class="demonstration-preview-poster" src=".../assets/patch-tensor-*.png">` (the real catalog preview), so tests expecting a video fail. Test or catalog expectation needs reconciling; the card does render a poster.

## Timing (software rendering, 1440x1000, default density; page-side rAF)
- XY drag (33 pointermoves): pointer->next rAF median 4.0 / p95 6.3 ms; pointer->second rAF median 16.8 / p95 17.9 ms; frame duration median 16.6 / p95 22.4 ms.
- Orbit (33 moves): next rAF median 2.8 / p95 3.6 ms; second rAF 16.7 / 17.8 ms; frame duration median 16.4 / p95 20.3 ms.
- ADR 0018 budgets: drag next-rAF p95 <= 60 ms, orbit p95 <= 16.7 ms, active frame p95 <= 50 ms. All met on this host (note: next-rAF may run before the app's render so the second-rAF value is the closer visible-update proxy; neither is true presentation latency).
- Per-reconcile: selection change handler dispatch (sync React+store+scene rebuild trigger) median 4 ms; through 2 rAF median 27.2, max 33.3 ms (12 samples). u-slider keypress -> 2 rAF median 32.8 / p95 33.7 ms (about 2 frames; no isolated rebuild cost measured: board side effects run after commit, performance.now around user actions only).

## Minor observations
- Camera "Zgoraj" gave el 87.76 (slider max 88.2) and "S strani" el 3.76 (not 0); az 0 / 90. Values not compared to spec.
- P_ij label overlaps its own point marker slightly in the export (cosmetic).
- Inset does not scale with viewport (fixed 218 px).

## Coverage limits
Software GL only; no physical touch device (CDP touch emulation); rational weight and PH generating-point editor not manually exercised; guided lessons, language switch and preset round trip for curves rely on the automated suite; EN locale of patch-tensor not checked; coordinate-editor apply button not tested; timing is single-run on a software renderer. Preview stopped (port 4310 closed); isolated contexts, no persistent data left.
