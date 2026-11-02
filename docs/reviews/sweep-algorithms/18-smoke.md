# Smoke 18: monotone-partition and monotone-triangulation routes

- URL: http://localhost:4313/bezeg-2.0/compgeo/monotone-partition and .../monotone-triangulation (production preview via `just preview 4313`, handler-requested; worker-started)
- Revision: 538ce186 (only untracked doc logs dirty). Production build, not dev code. Local preview does not establish GitHub Pages behaviour.
- Browser: Playwright Chromium, fresh context per stateful check. Viewports 1366x768 and 390x844. About 15 minutes elapsed.
- Scripts and screenshots: C:\Users\1337Hacker\.claude\jobs\dfe6274f\tmp\smoke18\ (run.cjs, run2.cjs, run3.cjs, c5-*, c7-*, c8-ex*.png)

| # | Check | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Direct load and refresh | Passed | Both: h1 "Razdelitev na monotone večkotnike" / "Triangulacija monotonega večkotnika", 3 svg (board), inspector "Orodja"; no console or page errors after load and reload. |
| 2 | Catalog | Passed | /demonstrations has links to both routes (3 anchors each); clicking opened the right route and heading; Back returned. Family breadcrumb "Računska geometrija" shown. Zero errors. |
| 3 | SL/EN live | Passed | At step 2: SL "Korak 2 od 14/43 ... Oglišče v6 je začetno" -> EN "Step 2 of 14/43 ... Vertex v6 is a start vertex", h1 "Monotone partition"/"Monotone triangulation"; back to SL identical step and note. |
| 4 | Next, Play, Reset | Passed | Step 0 -> Next 1; Play advanced 4 -> 6 over ~1 s with button "Premor"; Pause stopped at 6 and stayed; Reset -> 0. Same on both routes (14 and 43 steps). |
| 5 | Edit and refusal | Passed, with note | Edit P2 y 3->1: board changed, sweep returned to step 0 (by design). P2 -> (10,10): alert "Razdelitev je zavrnjena: roba e1 in e5 se sekata ali dotikata. Premakni oglišče..." and Next/Play disabled. NOTE: the invalid polygon is NOT reverted; the coordinates stay at 10,10 and the refusal message replaces the readouts. This differs from the brief's "keeps previous valid state" but matches the code (refusal shown, user fixes the vertex). Pointer drag was not exercised; edits were via the numeric point fields. |
| 6 | Preset | Passed | Per route: edit y=2, 2 steps, save `smoke-18-<timestamp>`; changed y=7; selected preset -> y=2 restored; deleted via confirm dialog; list back to only "Privzeta". Only the temp preset was touched. |
| 7 | Layout 1366x768 and 390x844 | Passed | scrollWidth == clientWidth (1366, 390) on both routes. Side lists and vertex labels render; at 390 the board is above the tools, lists readable (screenshot c7-390-monotone-triangulation-mid.png), no horizontal overflow. 1366 screenshots: c7-1366-*.png. |
| 8 | Dense piece, chain labels | Observation | Triangulation example 3 (8-vertex piece, step 57/57, c8-ex3.png): "leva/desna veriga" labels are legible and do not overlap each other. Minor: each label text prints over its own point name ("P6", "P4", "P2" overprinted by "v6 leva veriga" etc.), and the top label "zgornje oglišče" is clipped at the board's top edge at the default view. Same overprinting of "P6" by "v6 začetno" on the partition board. Not unreadable. |

Cleanup: preview on port 4313 stopped by PID (netstat shows no listener afterwards). Temp presets deleted; contexts were isolated, so no shared storage changed. No source files edited.

Limits: no pointer drag or touch tests, no keyboard Tab pass, no EN-at-390 check, no Back/Forward filter checks in the catalog, only SL/EN checked at step 2, 390 viewport screenshotted mid-run only.
