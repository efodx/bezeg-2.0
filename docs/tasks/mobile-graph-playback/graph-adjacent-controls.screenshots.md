# Graph-adjacent controls: phone playback "before" screenshots

**Status:** measurements and press complete for 41 viewport runs (2026-11-09). The press rerun finished after the worker's handoff: all 41 runs pressed the playback button (`"pressed":true` in `.command-logs/w3-s6-shots/run.log`; per-run `afterPlaying` in `results.json`). The handler checked the log; the open gaps under "Remaining" other than the press column still apply.

**Preview:** production build of `fc9680af` (handler-served, `just preview 4327` from the clean publish worktree; build provenance recorded that revision) at `http://localhost:4327/bezeg-2.0/`.
**Browser:** Chromium 156.0.8078.4, headless, Playwright 1.64.0 (repo `node_modules`, Chromium from the installed `chromium-1248`).
**Emulation, not a phone:** Playwright device emulation with `isMobile`, `hasTouch`, `deviceScaleFactor` 2, locale `sl-SI`. Scrolling was done by `scrollIntoView` with `behavior: 'instant'`. No real device, no real rotation, no pinch zoom.
**Script and raw data:** `.command-logs/w3-s6-shots/shoot.cjs`, `.command-logs/w3-s6-shots/results.json` (rewritten by the rerun), `.command-logs/w3-s6-shots/run.log`.

## Measurement definitions

- Board: the inline SVG inside `section.workspace-graph` (the `.jxgbox` selector used in the brief does not exist on these routes). Top and height are in CSS px at scroll 0.
- Button: `[data-action="play-pause"]` in the playback group, or `next-step` on euler-method.
- Scroll: the scroll container is `document` on all routes. The button is scrolled to the bottom edge of the viewport with `scrollIntoView({block: 'nearest'})` from scroll 0. "Scroll to reach button" is that resulting `scrollTop`.
- "Graph + button together": the button is fully on screen and at least 120 px of the board is visible at that same scroll position. Because the minimal-scroll position is the lowest board overlap that still shows the button, a "no" here means no scroll position shows both.
- Readout: `[data-step-counter]`. It was found only on convex-hull and interval-sweep. Other routes have no such element; their status text appears only when a block reason is shown.

## Results

Screenshot names: `<route>__<viewport>-1-initial.png`, `-2-button-view.png`, `-3-board-top.png`, `-4-after-press.png` in `.command-logs/w3-s6-shots/`. The rerun overwrites these files with the same names.

Button top is measured from page top (scroll 0). Overlap is the board's visible height at the button-view scroll position.

| Route | Viewport | Board top / height (px) | Button top from page top (px) | Scroll to reach button (px) | Graph + button together | Board overlap at button view (px) | Readout in view | Screenshot prefix |
|---|---|---|---|---|---|---|---|---|
| fixed-point | 390x844 | 305 / 295 | 1362 | 562 | no | 39 | n/a (no readout found) | fixed-point__390x844 |
| bisection | 390x844 | 305 / 295 | 1323 | 523 | no | 78 | n/a | bisection__390x844 |
| geometric-series | 390x844 | 355 / 295 | 1655 | 855 | no | 0 | n/a | geometric-series__390x844 |
| deboor | 390x844 | 305 / 295 | 1409 | 609 | no | 0 | n/a | deboor__390x844 |
| interp-subdivision | 390x844 | 327 / 295 | 1539 | 739 | no | 0 | n/a | interp-subdivision__390x844 |
| decasteljau | 390x844 | 305 / 295 | 1516 | 716 | no | 0 | n/a | decasteljau__390x844 |
| bezier-arc-length | 390x844 | 305 / 295 | 1487 | 687 | no | 0 | n/a | bezier-arc-length__390x844 |
| epicycles | 390x844 | 305 / 295 | 1319 | 519 | no | 82 | n/a | epicycles__390x844 |
| parametric | 390x844 | 355 / 295 | 1382 | 582 | no | 68 | n/a | parametric__390x844 |
| convex-hull | 390x844 | 305 / 295 | 1026 | 226 | yes | 295 | no (readout at 1013, below) | convex-hull__390x844 |
| voronoi | 390x844 | 305 / 295 | 1727 | 927 | no | 0 | n/a | voronoi__390x844 |
| interval-sweep | 390x844 | 305 / 295 | 930 | 130 | yes | 295 | no (readout at 1166, below) | interval-sweep__390x844 |
| euler-method (next-step) | 390x844 | 333 / 295 | 1659 | 859 | no | 0 | n/a | euler-method__390x844 |
| fixed-point | 360x640 | 361 / 260 | 1422 | 826 | no | 0 | n/a | fixed-point__360x640 |
| bisection | 360x640 | 361 / 260 | 1363 | 767 | no | 0 | n/a | bisection__360x640 |
| geometric-series | 360x640 | 411 / 260 | 1676 | 1080 | no | 0 | n/a | geometric-series__360x640 |
| deboor | 360x640 | 361 / 260 | 1429 | 833 | no | 0 | n/a | deboor__360x640 |
| interp-subdivision | 360x640 | 383 / 260 | 1559 | 963 | no | 0 | n/a | interp-subdivision__360x640 |
| decasteljau | 360x640 | 361 / 260 | 1536 | 940 | no | 0 | n/a | decasteljau__360x640 |
| bezier-arc-length | 360x640 | 383 / 260 | 1530 | 934 | no | 0 | n/a | bezier-arc-length__360x640 |
| epicycles | 360x640 | 361 / 260 | 1360 | 764 | no | 0 | n/a | epicycles__360x640 |
| parametric | 360x640 | 411 / 260 | 1403 | 807 | no | 0 | n/a | parametric__360x640 |
| convex-hull | 360x640 | 361 / 260 | 1047 | 451 | yes | 170 | no (readout at 809, below) | convex-hull__360x640 |
| voronoi | 360x640 | 361 / 260 | 1747 | 1151 | no | 0 | n/a | voronoi__360x640 |
| interval-sweep | 360x640 | 383 / 260 | 972 | 376 | yes | 260 | no (readout at 982, below) | interval-sweep__360x640 |
| euler-method (next-step) | 360x640 | 389 / 260 | 1699 | 1103 | no | 0 | n/a | euler-method__360x640 |
| fixed-point | 844x390 landscape | 337 / 460 | 922 | 546 | yes | 251 | n/a | fixed-point__844x390-landscape |
| bisection | 844x390 landscape | 337 / 460 | 863 | 517 | yes | 280 | n/a | bisection__844x390-landscape |
| geometric-series | 844x390 landscape | 337 / 460 | 1126 | 545 | yes | 252 | n/a | geometric-series__844x390-landscape |
| deboor | 844x390 landscape | 337 / 460 | 949 | 546 | yes | 251 | n/a | deboor__844x390-landscape |
| interp-subdivision | 844x390 landscape | 337 / 460 | 1037 | 545 | yes | 252 | n/a | interp-subdivision__844x390-landscape |
| decasteljau | 844x390 landscape | 337 / 460 | 1036 | 545 | yes | 252 | n/a | decasteljau__844x390-landscape |
| bezier-arc-length | 844x390 landscape | 337 / 460 | 1028 | 546 | yes | 251 | n/a | bezier-arc-length__844x390-landscape |
| epicycles | 844x390 landscape | 337 / 460 | 859 | 513 | yes | 284 | n/a | epicycles__844x390-landscape |
| parametric | 844x390 landscape | 337 / 460 | 853 | 507 | yes | 290 | n/a | parametric__844x390-landscape |
| convex-hull | 844x390 landscape | 337 / 460 | 547 | 201 | yes | 254 | no (readout at 578, below) | convex-hull__844x390-landscape |
| voronoi | 844x390 landscape | 337 / 460 | 1247 | 545 | yes | 252 | n/a | voronoi__844x390-landscape |
| interval-sweep | 844x390 landscape | 337 / 460 | 450 | 104 | yes | 157 | no (readout at 752, below) | interval-sweep__844x390-landscape |
| euler-method (next-step) | 844x390 landscape | 337 / 460 | 1191 | 546 | yes | 251 | n/a | euler-method__844x390-landscape |
| fixed-point | 390x844 + 200% text | 532 / 295 | 2285 | 1490 | no | 0 | n/a | fixed-point__390x844__text200 |
| decasteljau | 390x844 + 200% text | 534 / 295 | 2916 | 2121 | no | 0 | n/a | decasteljau__390x844__text200 |

Press column: not in the table. The press step ran in the first pass with the strict condition, so it fired only where the button was fully on screen. The rerun with the relaxed condition was still in progress at handoff.

## Observations

- At 390x844 and 360x640 the button and graph are never visible together on 11 of 13 routes. The exceptions are convex-hull and interval-sweep. This is a portrait-only result; it does not cover phone rotation.
- The button sits about 620 to 1420 px below the board top at 390 px wide, so the reachable scroll position already pushes the board out of view. At 390x844 the button lands flush with the bottom edge (zero margin).
- Landscape (844x390) shows the button and at least 157 px of graph together on all 13 routes.
- At 200% text, fixed-point and decasteljau need 1490 and 2121 px of scroll to reach the button, and the board is out of view there.
- Readout: `[data-step-counter]` was found only on convex-hull and interval-sweep, and it is below the button view on both. Other routes were not checked for an equivalent readout element.
- Interval-sweep is the interval-sweep demonstration. It is not the collision run of the sweep chapter; the brief asked for that run, and it was not checked.
- Euler-method (next-step) was used as the shared-shell regression route. Its portrait results match the playback routes, so the nonanimated route shows the same placement.

## Remaining and gaps

- Press column for all 41 runs: pending the rerun. The background run writes `results.json` and `run.log` in `.command-logs/w3-s6-shots/` and overwrites the screenshots of the same names. Its completion line is `DONE 41 runs`. When it is done, read the `pressed` and `afterPlaying` fields from `results.json`.
- Not covered: the `/patches/tensor` Guided lesson sweep, the collision run and inspect in the sweep chapter, Presentation mode, keyboard focus, English language, and real devices.
- No separate after-press screenshot exists for the first pass; the rerun regenerates `-4-after-press.png` for every run.
- No browser console errors were recorded on any run (`errs` 0).
