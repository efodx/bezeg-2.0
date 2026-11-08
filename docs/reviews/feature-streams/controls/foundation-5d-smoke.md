# Foundation 5d browser smoke (CSS: number-field height, bool label wrap, Display grid)

Preview: http://127.0.0.1:4327/bezeg-2.0 (handler-run, not stopped by this worker). Language: Slovenian (sl-SI). Playwright 1.64.0 Chromium, headless.
Screenshots: test-results-4327/5d/ (mobile-edit-geometric-series.png, mobile-edit-lagrange.png, desktop-display-geometric-series.png, desktop-display-lagrange.png).

1. Mobile 390x844, hasTouch/isMobile, Edit tab ("Uredi"): PASS.
   - geometric-series: 4 visible `.number-input input`, heights 44,44,44,44.
   - lagrange: 9 visible (10 in DOM), heights all 44.
2. Desktop 1440x900, Edit then Display ("Prikaz"): PASS.
   - Number fields remain 40 px: geometric-series 4/4 at 40; lagrange 9/9 at 40.
   - No horizontal scroll: scrollWidth 1440 = clientWidth 1440 on both.
   - `.workspace-inspector` maxDescendantRight 1385 vs container right 1386 on both routes.
   - `.inspector-display-graph` NOT present on either route, so the `minmax(0,1fr)` grid change was not exercised.
3. Mobile 390x844 layout (lagrange screenshot inspected): PASS for sanity. Graph cropped at top; below, the "Orodja" panel with tabs Uredi (active) / Prikaz / Shrani, the "Ukazi na grafu" section, a parameter dropdown, a point-count stepper, and x/y coordinate rows with full-height inputs. No overflow (scrollWidth 390 = clientWidth 390) on either route.

Console: zero console errors or page errors captured on both routes during load and tab clicks.

Not covered:
- `.inspector-display-graph` grid fix (needs a graph whose Display tab renders graphDisplay; `src/graphs/base/BaseGraph.tsx` line 443 is the only producer found).
- Bool-field label wrap (`.bool-field-label`) not exercised on any route.
- Display tab at 390 px not checked; no physical-device, touch-target-tap, or Slovenian-vs-English text checks.
- Full smoke checklist not run (not required by brief).
- Workaround note: first run's geometric-series mobile Edit click failed on role-based lookup; rerun used exact-text button match and passed. Not a product failure as far as observed.

Cleanup: scripts in %TEMP%\smoke5d; browser closed in finally; no server started or stopped by this run.
