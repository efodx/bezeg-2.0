# Parametrization browser acceptance

Checked 2026-10-26 against `http://127.0.0.1:4396/bezeg-2.0/learn/parametrization#worked-timing` in a fresh Chromium 156.0.8078.4 context. The handler-owned local production preview used the final build recorded in `.command-logs/2026-10-26T02-13-25-737Z-40460-c44a985b.log`. Checkout revision: `319ca9b`; task changes were `src/learning/content/familyChapters.ts` and its test, plus evidence. The final browser run took 16.8 seconds. The browser context was closed; the handler-owned preview remains running.

| Check | Result and evidence |
| --- | --- |
| Deep links, language, figures | **Passed.** The reader returned HTTP 200; `#worked-timing` survived refresh in Slovenian and English. All three 720×440 assets decoded, every figure had alt text and a typeset caption, the worked formulas typeset, with no MathJax errors or mounted board. All seven rendered graph-link prompts changed language and named their supported actions and observations. |
| Reader layout | **Passed.** English had no horizontal document overflow at 1440, 1024, and 390 CSS pixels, including 390 pixels with root text at 200%. Each image fit its figure without `object-fit: cover`. |
| Guided entries and return | **Passed.** All seven `?learn=1` link occurrences opened their guided lessons. **Exit lesson → Exit and restore graph** closed each lesson and restored a visible graph with accessible alpha and sample-count fields. The mode selector was reachable on the comparison graph. |
| Spline controls | **Passed.** α changed from 0.5 to 0.7 and samples from 25 to 12. Curve samples remained finite and the sampled spline trace changed by up to 0.701, consistent with knot allocation changing reconstructed geometry. |
| Weighted single curve | **Passed.** α changed from 0.5 to 0.25; samples moved up to 2.388 while the sampled source trace and control points stayed fixed. |
| Weighted/uniform comparison | **Passed.** Switching to uniform moved samples up to 1.779; the source trace was unchanged and its readout stayed `Arc length: 16.717`. An independent 4096-segment polyline estimate measured 11 successive arc gaps with maximum relative deviation 0.251% from their mean (under the 1% check tolerance). |
| Browser errors | **Passed.** No page or console errors. |

Keyboard, physical-device, and comprehensive accessibility checks were outside this targeted run. I reused the accepted unchanged PH browser evidence in [ph-browser.md](ph-browser.md) instead of repeating that baseline.

Script: `.command-logs/param-browser.cjs`. Machine-readable results: `.command-logs/param-browser.json`.

Saved reader screenshots: `.command-logs/param-browser-sl-worked-timing-1440.png`, `.command-logs/param-browser-en-worked-timing-1440.png`, `.command-logs/param-browser-en-desktop-1440.png`, `.command-logs/param-browser-en-projection-1024.png`, `.command-logs/param-browser-en-narrow-390.png`, `.command-logs/param-browser-en-narrow-390-200.png`. Figure screenshots: `.command-logs/param-browser-sl-figure-1.png`, `.command-logs/param-browser-sl-figure-2.png`, `.command-logs/param-browser-sl-figure-3.png`, `.command-logs/param-browser-en-figure-1.png`, `.command-logs/param-browser-en-figure-2.png`, `.command-logs/param-browser-en-figure-3.png`. Interaction screenshots: `.command-logs/param-browser-spline-alpha-0.7-samples-12.png`, `.command-logs/param-browser-weighted-alpha-0.25.png`, `.command-logs/param-browser-uniform-mode.png`.
