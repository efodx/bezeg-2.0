# CP7 smoke: collision playground and Bezier playgrounds

Target: http://127.0.0.1:4320/bezeg-2.0 (production preview of c549783b, not verified by me beyond the user's statement). Playwright Chromium, headless. SL and EN (via `#bezeg-language`) at 1440x900 and 390x844 touch. Scripts in the OS temp dir (`pw/run.cjs`, `bz.cjs`, `d5.cjs`). Screenshots: `cp7-smoke/{sl,en}-{1440,390}-{run,inspect,focus}.png`, `focus-radio-sl-1440.png`, `bz-*-pg{0,1}.png`.

## Results
1. Load/placement: PASS. 0 console/page errors in all 4 runs. Run block and "Look underneath" (`section.collision-playground.collision-inspect`) render. No horizontal overflow (scrollWidth == innerWidth) at 1440 and 390.
2. Play/Pause/Step/New: PASS. Starts playing in view (canvas hash changes untouched); Pause -> label "Predvajaj/Play", canvas stable; Step changes canvas and readout; New resets readout (Box tests 0, pairs 0).
3. Method/live/slider: PARTIAL FAIL.
   - Readout updates on method switch (naive shows "Vsi pari, n(n-1)/2"). Slider End: sweep 5000, naive 4000; ArrowLeft/Home work. Default method is sweep.
   - FAIL: while paused, switching method does not update `.collision-playground__live` (stays empty or keeps the earlier text, e.g. still "Sweep and prune" with naive selected, even after 3 s). It updates when playing (naive text appeared ~1 s after click) or after a Step. So a paused user gets no announcement of the new method, and the region can hold the old method. Selector `.collision-playground__live` (role status) in the Run block.
   - Minor: the first output reads 299 while the readout says Objects 300 (initial state, slider position 547/1000).
4. Keyboard: PASS with a gap. Tab order slider -> radios -> Play/Step/New; Space/Enter toggle Play; radio ArrowRight changes method; focus outline solid 3px on radios, slider and buttons. There is no number field in the Run slider (only an `<output>`); "its number field" does not exist there. Inspect block has a text field (88x40).
5. i18n: PASS. All visible text in EN and SL matches its language; no leftovers. Math: the blocks contain no MathJax; n(n-1)/2 is plain text. Chapter prose typesets (166 SL / 92 EN MathJax containers).
6. Look underneath: PASS. Next/Prev change the event text and the svg, the slider changes n (21), Play motion toggles and advances ("Resume motion" label initially in EN, "Predvajaj gibanje" in SL), New reseeds (event count 59 -> 52).
7. Touch targets at 390: buttons 44 px high; radio labels 44 high (inputs 24x24); range 44. Known gap: Inspect number field 88x40 (and its Run counterpart does not exist). PASS except the known gap.
8. Bezier chapter (/learn/bezier-curves): PASS. Two playground blocks: draw in `motivation`, inspect in `next-ideas`, 780x488 at 1440 and 358x224 at 390, both languages. Draw: 3 clicks add 3 anchors, dragging the last anchor moves it (-30,+40) and changes the path. Inspect: 6 anchors, first checkbox of 4 and an anchor drag change the svg; segment buttons present. 0 console errors, no overflow. Draw/inspect `.playground__live` was empty throughout (not compared with the previous build).

## Coverage gaps
Reduced motion not tested; physical touch not tested (emulated); no screen reader; dev tools perf not measured; Bezier checks compare no baseline build.
