# Capture activity return diagnosis

The reported section jump did not reproduce after the return scroll settled. The failure was an in-flight smooth-scroll measurement in the browser probe, so no application change is justified.

The retained ignored probe, `.command-logs/capture-return-repro.cjs`, starts at the Bézier chapter, sets root text to 200%, lets MathJax settle, reaches the parameter activity link with Tab, and activates it with Enter. The link is visible in the 900px viewport when focused. It then returns with Enter and waits until `scrollY` remains stable. Invocation: `node .command-logs/capture-return-repro.cjs` (200%) and `$env:BEZEG_CAPTURE_RETURN_TEXT='100%'; node .command-logs/capture-return-repro.cjs` (100%). Both returned to the exact pre-launch section top and scroll position, with focus restored and no page errors: 200% `-1292.16px / 5792px` before and after; 100% `-522.34px / 2845px` before and after.

The paired 200% run with `$env:BEZEG_CAPTURE_RETURN_SETTLE='no'; node .command-logs/capture-return-repro.cjs` sampled after 300ms and showed `-1292.16px / 5792px` before versus `1388.84px / 3111px` after. The page had already called `scrollTo(0, 5792)`; the observed scroll was still advancing. Waiting for stable scroll restored the original offset exactly. The earlier browser report's focused link at y=1340.5 in a 900px viewport is also outside the viewport, unlike natural Tab focus here, so that focus setup was not representative of keyboard traversal.

No app files changed and no tests were rerun. The existing 18-test standalone-learning result remains the prior browser report's evidence; this diagnosis only resolves the focused return-offset symptom. Task 4 still needs its full acceptance review.
