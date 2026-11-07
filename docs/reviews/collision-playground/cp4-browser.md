# CP4 browser smoke (handoff-v13)

Preview http://127.0.0.1:4320 (build rev 7a0987ec, dirty). Script: %TEMP%/cp4-run.cjs. Full log and screenshots: cp4-browser/.

- FAIL (visual): labels, legend, slider min/max and radio text render dark green on the dark navy harness background and are near invisible (cp4-browser/desk-sl-sweep4000.png). CSS uses `--bezeg-shell-ink` (CollisionPlayground.css:8); the harness page background is dark.
- naive 4000: 7.998.000 box tests (n(n-1)/2 = 7 998 000), 37 ms, 45 % speed. sweep 4000: about 25 000 tests, 0.7 ms, 100 %.
- Scroll round trip under naive: 18-31 ms. Back to sweep: readout changed in 296 ms.
- Touch targets (390x844 coarse): range 358x44, radio labels 171x44 / 215x44, buttons 79x44, 68x44, 158x44; radio input itself 24x24; no horizontal overflow (390/390).
- Only console warnings came from the probe's own getImageData; none from the app.
