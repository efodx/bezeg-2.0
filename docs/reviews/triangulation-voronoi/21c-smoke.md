# Smoke 21c: T3 task 21 remaining checks (preview of master 77399949, http://127.0.0.1:4313/bezeg-2.0)

Chromium (Playwright) headless, fresh contexts, 1366x768 (checks 6, 2) and 1440x900 (check 9). Scripts: C:\Users\1337Hacker\.claude\jobs\32081cc6\tmp\smoke21c\ (c6.cjs, perf.cjs, c6.out). Save flow locators: tab "Shrani" -> "Shrani prednastavitev" opens a modal (label "Ime prednastavitve", footer "Shrani"). Delete opens a confirm modal "Izbriši prednastavitev?" with Da/Ne (this modal intercepted clicks and caused the earlier 21 timeout).

## Check 6, Preset round trip
| Route | Result | Evidence |
| --- | --- | --- |
| voronoi | pass | Edited P1 x=2 and added site (6,5): readout 7 sites/7 vertices/5 unbounded -> 8/9/5. Saved smoke-21c. Switched to Privzeta: readout back to 7/7/5. Loaded smoke-21c: 8 sites, 9 vertices, 5 unbounded, all 16 coordinates identical. After page reload the select shows Privzeta (selection not restored by reload); picking smoke-21c gave the same readout and coordinates. Deleted (Da): option list ["Privzeta"]. |
| voronoi-degenerate | pass | Edited P1 x=2: 4 sites, vertices 1 -> 2, edges 0 -> 1, unbounded 4. Save, switch to Privzeta (1 vertex), load smoke-21c: 2 vertices, coordinates identical. Reload then pick: identical. Deleted: ["Privzeta"]. |

## Check 2, No stored Preset reload
| Route | Result | Evidence |
| --- | --- | --- |
| voronoi | pass | Fresh load and reload: bbox [-11.97, 12.25, 20.07, -5.25], P1..P7 and query all inside. After deleting smoke-21c and reloading: same view, nothing outside. |
| voronoi-degenerate | pass (note) | Fresh load, reload, and reload after delete: bbox [-2.92, 2.37, 3.92, -1.37]; all 4 sites inside. Default query marker (4,2) lies outside the view (x>3.92); it is not a site. |

## Check 9, 40 sites drag on voronoi (3 runs x 40 moves, 50 ms)
Verified 40 sites (P1..P40) each run, drag moved 50 px.
| Case | frames/run | median ms | p95 ms | worst frame ms | move->frame median | move->frame worst |
| --- | --- | --- | --- | --- | --- | --- |
| default overlays | 208/208/203 | 16.7 | 16.8 | 66.7 | 8.1 | 32.8 |
| Delaunay overlay on | 218/221/208 | 16.7 | 16.8 | 4149.9 | 8.2 | 3033.2 |
| grid on (rerun) | 206/204/197 | 16.7 | 16.8 | 66.8 | 7.9 | 16.3 |
(Medians/p95 are medians of per-run values; worst is max over runs. First grid attempt: runs 1-2 similar, worst 66.7, then killed by the script's 300 s cap, hence the rerun.)

Finding: with Delaunay overlay on, every run had a single frame gap of 3.7-4.1 s (vs <=67 ms otherwise). In 2 of 3 runs the move-latency stat missed it (first 3 moves are discarded), so it probably happens at drag start or the first moves; run 3 had a 3033 ms move delay. Location not isolated. Medians are unaffected.

## Console
No errors or warnings in the check 6 and 2 runs (the grid deprecation warning is not triggered there). Page errors during perf: none (script would fail).

## Gaps
- Delaunay hitch cause not investigated (no profile). Perf is headless mouse only, one machine.
- Preset selection is not restored after reload (select returns to Privzeta); treated as existing behaviour, not checked against spec.
- Zoomed-out/other viewports not checked for check 2.
