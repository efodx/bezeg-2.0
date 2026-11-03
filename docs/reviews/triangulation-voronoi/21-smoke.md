# Browser smoke: T3 task 21 (voronoi, voronoi-degenerate) — partial, handed off at budget

- URLs: http://localhost:4317/bezeg-2.0/compgeo/voronoi and http://localhost:4317/bezeg-2.0/compgeo/voronoi-degenerate (served at 127.0.0.1:4317)
- Revision: e9b36ce2 (worktree dirty at build time; production build from `just build`, preview from `just preview 4317`)
- Browser: Playwright Chromium (headless), fresh context per check
- Viewports: 1366x768 (desktop), 390x844 (narrow), plus 200 % root font-size at 1366x768
- Scripts and captures: C:\Users\1337Hacker\.claude\jobs\d4e3ed85\tmp\smoke21\ (checksA.cjs, checksB.cjs, checksC.cjs, checksD.cjs, focus-voronoi.txt, PNGs)

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 1a | Direct load and reload, voronoi | pass | h1 "Voronojev diagram" before and after reload; 3 svg; no console errors |
| 1b | Direct load and reload, degenerate | pass | h1 "Izrojena mesta" before and after reload; no console errors |
| 2a | Catalog link to voronoi, click, Back | pass | Links to both routes exist in /demonstrations; click reached /compgeo/voronoi with h1 "Voronojev diagram"; Back returned to /demonstrations |
| 2b | Catalog link to voronoi-degenerate, click, Back | pass | Click reached route with h1 "Izrojena mesta"; Back returned to /demonstrations |
| 3a | Overlays, query point, zoom/pan, Reset view, voronoi | pass (with warnings) | Delaunay overlay shows 8 triangle buttons; grid on; query set to (3/2, -1/2) and readout gave nearest P1 and 5 unbounded cells. Zoom x2 plus pan, then Reset view. Screenshots v-3c-zoomed.png (zoomed, clipped by view as expected) and v-3d-reset.png (full diagram, V1 to V5 listed, unbounded-cell edge arrows visible, no visibly missing cells). Visual check only. Console: 16 `WARNING: gridX/gridY is deprecated. Please use majorStep instead.` (JSXGraph, from src/graphs/compgeo/PointSetGraph.tsx; not yet confirmed as pre-existing). No page errors. |
| 3b | Overlays, zoom, Reset view, degenerate | pass (with warnings) | Same gridX/gridY deprecation warnings. Overlays on, zoom x2 plus pan, Reset view; d-3b-reset.png shows the full diagram. |
| 4 | Degenerate: four-point mode, then collinear example | pass | mode-four-point gives "D = 0; P4 leži na krožnici ... točke so kocirkularne", 1 Voronoi vertex, degree 4. Collinear example ("Pet točk na premici") gives Mest 5, Voronojevih oglišč 0, Premic 4, Neomejenih celic 5; mode returns to sites. No page errors. |
| 5a | SL/EN switch, voronoi | pass | EN h1 "Voronoi diagram", EN prompt and "Reset view" shown; SL h1 "Voronojev diagram" with SL prompt; readout unchanged after SL to EN to SL round trip. |
| 5b | SL/EN switch, degenerate | pass | EN h1 "Degenerate sites" with EN prompt; SL h1 "Izrojena mesta" with SL prompt; readout kept across round trip. |
| 6 | Preset round trip (edit site, save temp preset, change, reload, delete) | Not completed (failed in harness) | Save flow located: "Shrani" tab, then "Shrani prednastavitev"; list in discD-save.txt. The test script hit a locator click timeout (30 s) at an unidentified step; not resolved. No defect is established from this. |
| 7 | Layout at 1366x768 and 390x844, both routes | pass | scrollWidth equals clientWidth in all four runs; 0 controls offscreen horizontally; no errors. |
| 8a | Tab focus order, voronoi | pass (listed) | 70 Tab presses, 67 unique stops, all with visible focus styling. Full list in focus-voronoi.txt. Starts with header links, SLEN select, Demonstracije, Računska geometrija, mode buttons, graph pan buttons, then the Uredi/Prikaz/Shrani tabs and controls. |
| 8b | Keyboard reach of P4 position, degenerate | pass | Tab to mode-four-point, Enter; focus on "Točka 4: x", ArrowDown then Enter changed x 0 to -1; panel moved from "na krožnici" (D = 0) to "zunaj krožnice" (D = -2). Keys only. The "on-circle position control" was interpreted as the P4 coordinate input; the page has no separate slider. |
| 8c | 200 % root font-size, both routes | pass | scrollWidth equals clientWidth at 1366 px; 42 visible buttons, none offscreen; no clipped text detected. Measures root font-size only; it does not prove every rem-based element scaled. |
| 9 | Performance, 40 sites, 3 s drag | Not run | Not reached. |

## Defects and notes

- No functional defect found in the checks run.
- Console warnings: JSXGraph "gridX/gridY is deprecated" logged on both routes whenever the grid overlay is on. Not an error. Whether it predates this task is not verified.
- Check 6 harness failure is a test-script problem, not an app defect so far. Reproduce with checksD.cjs, which failed on a locator click in the preset flow.

## Coverage gaps

- Check 6 and check 9 are incomplete.
- Reset-view "no missing cells" is verified by visual inspection of two captures only.

## Cleanup

- Preview on port 4317: stop attempted with PID 47956 from preview.pid. taskkill reported "process not found", but the port returned HTTP 000 afterwards, so the server is down.
- No source files edited. No commits. Temp presets: none saved to the shared store by the completed checks; check 6 may have saved "smoke-21-tmp" in the browser context, but each run used a fresh context, so nothing persists.
- Scripts and captures remain in the smoke21 job directory.
