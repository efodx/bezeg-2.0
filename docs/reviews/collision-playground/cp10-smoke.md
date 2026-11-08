# CP10 smoke (production preview http://127.0.0.1:4320, Playwright Chromium, HEAD 692a50a1 + dirty tree; checkout match not independently verified)

Viewports: 1440x900 and 390x844 touch (isMobile, DSF 2). Languages: sl, en (set via localStorage, plus live switch with #bezeg-language).
Scripts/screens: %TEMP%/cp10-smoke (run.cjs, k*.cjs, z3-ov0..2.png at DSF 3, crops.png, B1-*.png).

| Check | sl desk | sl mob | en desk | en mob |
|---|---|---|---|---|
| A1 renders, invitation ("Preizkusi sam"/"Try it yourself") before, "hull as proxy" paragraph after; 0 console errors/failed requests | PASS | PASS | PASS | PASS |
| A2 keyboard: radios (arrows), overlay radios, slider (End/PageUp), Play (Space/Enter), Step, New operable; 3px solid outline focus | PASS | n/a | PASS | n/a |
| A3 touch taps (method, overlay, Play, Step, New, slider); targets >=44px (labels/buttons/slider 44 high); scrollWidth 390=390 | n/a | PASS | n/a | PASS |
| A4 slider End: naive 3000, sweep 3500 (readout and aria-valuetext) | PASS | PASS | PASS | PASS |
| A5 overlay outlines (boxes dashed, hulls dotted, pieces solid), touching ring centred (checked en desk, DSF 3, 82 bodies, 4 touching) | - | - | PASS | - |
| A6 readouts named; live region 0 mutations during Play, speaks after method/count/Step/New; after Pause+PageUp box tests 54,285 (n=330) | PASS | PASS | PASS | PASS |
| A7 live language switch (legends and dt change, no reload, same URL) | PASS | PASS | PASS | PASS |
| B sweep-algorithms: Run block End naive 4000 / sweep 5000, plays, 0 errors | PASS | - | PASS | - |
| B "Look underneath" block (SVG inspector, no canvas): Resume/Pause toggles, runs to end (Next disabled), 0 errors | PASS | - | PASS | - |

Observations (not failures)
- Play autostarts when the block scrolls into view; the first Space press then pauses (expected).
- Overlapping touching bodies show two near-concentric rings; each ring is centred on its body.
- Tab from the overlay radios reaches Play, Step, New, then MathJax containers (existing behaviour).

Gaps: touch ring/overlay screenshots only at en desktop (sl/mob shots are DSF1/2 canvas captures, not inspected); no mobile B; B count at ~300 only approximated (187/330/82 used); keyboard test on mobile skipped; "Look underneath" event text not re-read after play (button state and disabled Next used as evidence); no real device.
