# Smoke 03 acceptance (commit 466f15ea)

Target http://127.0.0.1:4483/bezeg-2.0/ (handler dev server; revision not verified by worker). Scripts 03-acc12.cjs, 03-acc5.cjs; log 03-acceptance.log; fuzz output .command-logs/fuzz03.out, fuzz03b.out; shots .command-logs/shots-03-accept/. localStorage bezeg-2.0:board-layout removed at start and end of each context.

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Frame sampling, first show | Pass | Per-frame rects until 2 s after first show (about 120 frames). Cold and warm on Taylor (readouts, legend), linear map (readouts, legend), De Casteljau (legend): 0 size changes (max dW/dH 0.00), 0 glides, position constant. Cold first show: Taylor 3620 ms, linear map 1184, De Casteljau 947; warm 763 / 1081 / 807. |
| 2 | 3440x1440 vs 1440x900 | Pass | Taylor 3440: cards x 2014..2346 (width 332); linear map 1834..2346 (width 512). Board centre 1554, band 754..2354 (1600): inside. #jgbox 998x594 at 1440 vs 2998x720 at 3440 (not smaller). Grip drag of Odcitki to board right edge (3053): dropped at 2713..3045 (8 px gap), after reload identical; stored as docked anchor tr. Note: at 1440 default card is at x 726..1045 (width 319). |
| 3 | Fuzz, 5 seeds x 8 routes | Pass, one not run | taylor, linear-map, decasteljau, triangle-centres, phase-portrait, transformations, cross-ratio: 5/5 each, 0 invariant failures. patches/coons: 5/5 INVALID at launch (page.waitForSelector timeout 20 s; fuzz.cjs:52 waits for `[data-navigation], canvas`); not an invariant failure, likely harness mismatch on that route, coons not fuzzed. No HMR/500 observed. First run was cut by my own timeout after taylor/linear-map; remaining six re-run. |
| 4 | Inspector at 310 px | Pass | Taylor, linear map, phase portrait (286 px wide crops): no empty gaps, no orphan headings; each section heading is followed by its controls; the inspector reads cleanly. |
| 5 | Phone 390x844, 8 routes | Pass | HTTP 200 and 0 page errors on all eight; cards mounted on each (2,2,1,2,2,3,2,2). Layout not judged. |
