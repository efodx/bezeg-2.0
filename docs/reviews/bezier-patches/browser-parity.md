# JSXGraph upgrade browser parity

Status: complete. Three fresh default area-route capture pairs match exactly; the original label shift also occurs between baseline captures. See [area diagnosis](area-parity.md) and [release audit](jsxgraph-upgrade.md).

## Matched runtime comparison

Clean baseline commit 819f737 uses JSXGraph 1.9.2; the isolated upgrade uses 1.14.1 with the scoped sampling and board-ownership compatibility fixes. Production previews at ports 4398 (baseline) and 4396 (upgrade) were checked against their served JS/CSS hashes. Both captures use headless Playwright Chromium **156.0.8078.4**, Windows x64, viewport **1440×960**, DPR 1, locale sl-SI, reduced motion and fresh contexts.

The idle captures cover Bezier, De Casteljau, rational Bezier, C1 spline, PH cubic and area between curves. Five full-page screenshots have **zero differing RGBA pixels**. The area route has **419 differing pixels**, confined to its intersection labels. Curves, shading, controls and layout match. The same shift was reproduced within 1.9.2, and three fresh default baseline/upgrade pairs match exactly. See [resolved diagnosis](area-parity.md); no product difference was waived.

Raw reports and screenshots: [baseline](browser-parity/baseline-idle/results.json), [upgrade](browser-parity/after-idle/results.json), [comparison](browser-parity/idle-comparison.json). The [runner](browser-parity-runner.cjs) records geometry, browser/build provenance, errors and drag samples; [comparison tool](compare-parity.cjs) decodes PNG pixels in the browser.

## Idle drag measurements

Three fresh contexts per version dragged the same free point on /bezier/curve through 12 mouse moves totaling 42 by -24 pixels, with 20 ms between moves. All six gestures moved (-4,-3) to (-3.33754,-2.62145).

| Measurement | 1.9.2 | 1.14.1 |
| --- | ---: | ---: |
| Synchronous board update median / p95 | 1.7 / 3.4 ms | 2.9 / 5.4 ms |
| Update samples | 76 | 76 |
| Animation-frame median / p95 | 16.7 / 16.7 ms | 16.7 / 16.7 ms |
| Frame intervals | 93 | 102 |

Update cost increased in this desktop sample. These are synchronous update and frame intervals, not input-to-paint latency or physical-phone measurements. P1 defines no performance budget, and no renderer optimization was selected. Earlier measurements overlapping test jobs are superseded by these idle trials.

## Exports and interactions

Default Bezier and De Casteljau SVG exports contain typeset formula labels and render to pairwise byte-identical PNGs on the two library versions. The earlier report of missing SVG MathJax labels was a mistaken inspection, corrected by handler image review and pixel comparison. PNG export also contains formulas. See [export and interaction evidence](browser-followup.md).

Emulated touch at 390 by 844 moved the actual free point with no horizontal overflow. Pan and zoom changed the board bounds. The full production smoke passed **243/243**, including PH child-board point editing, Presentation, keyboard and guided-lesson enter/exit/restoration. No physical-phone latency claim is made. Existing published preview validation passed for 45 posters / 45 motions and capture/provenance API checks passed 49/49; no previews were regenerated.
