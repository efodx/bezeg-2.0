# CP4 browser recheck (handoff-v13)

Preview http://127.0.0.1:4320/bezeg-2.0 (build rev 7a0987ec, dirty), stopped after the run. Route `/bezeg-2.0/harness/collision-playground?count=10&method=sweep`, Chromium 1440x900, lang `sl`. Screenshots: `cp4-browser/recheck-r1-desk-sl.png`, `cp4-browser/recheck-r3-after-steps.png`. Script outside the repo.

- R1 contrast: PASS. Slider label, fieldset legend and radio label all use text rgb(25,55,47) on the first opaque background `MAIN.chapter-page` rgb(244,240,223). Ratio 11.28:1 for each (threshold 4.5).
- R2 arrows: PASS. Count slider at 10, then ArrowRight x3 gives 11, 12, 13; ArrowLeft gives 12. Read from aria-valuetext and the Objects readout, which agree.
- R3 live region: PASS. Paused beforehand (aria-pressed false). Step 1 text ends with a no-break space (U+00A0) and differs from the initial text. Step 2 text drops the trailing space and differs from step 1, so it changed on the second press.
- R4 errors: PASS. 0 console errors, 0 page errors, 0 warnings in the run.
- Not covered: 390x844 and other viewports, English, and the naive method.
