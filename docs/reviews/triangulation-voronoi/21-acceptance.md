# T3 task 21 acceptance: `voronoi` and `voronoi-degenerate` registration

Accepted 2026-11-03 by geometry handler 38. Registration commits `31dd48eb` and `b3300199` (handler 37), plus this run's drawing fix (21d, same push as this record).

## Evidence

| Item | Result | Source |
| --- | --- | --- |
| Registration diff, full unit, tsc, build, engineering review | passed (handler 37) | [handoff 37](../feature-streams/geometry/handler-handoff-37.md) |
| Smoke 1–5, 7, 8 (load/reload, catalog, overlays, query, Reset view, four-point and collinear, SL/EN, 390 px, Tab order, keyboard on-circle control, 200 % text) | pass | [21-smoke.md](21-smoke.md) |
| Smoke 6, Preset round trip, both routes | pass. The earlier timeout was the delete confirm modal blocking the harness. | [21c-smoke.md](21c-smoke.md) |
| Reload with no stored Preset (review's open path) | pass. `importFigurePresetData({id:""})` imports `defaultPreset()`, which equals `exampleModel()` on both graphs; the smoke saw every site inside the view. | code reading and [21c-smoke.md](21c-smoke.md) |
| Smoke 9, 40-site drag | **failed first, then fixed** (below) | `21c-perf-raw.txt`, `21d-perf-after-raw.txt` |

## Defect found by smoke 9 and fixed (21d)

With the Delaunay overlay on at 40 sites, a press on a site took 16 s, and a move that changed the triangulation took about 4 s. The first run measured a 4150 ms worst frame.

- **Cause 1, quadratic removal.** `PointSetGraph.removeObjects` removed the overlay objects in one `board.removeObject(array)`. However, JSXGraph's `Line.remove` calls `removeAllTicks`, which runs a full `board.update()`. Some nested removals do the same. So each removed edge or border re-rendered the whole board and re-measured every label (`offsetWidth`). A CPU profile showed 15.5 s inside `redrawOverlays` → `removeObjects`.
  - Fix: suspend board updates during the removal, keeping any outer suspension.
  - This is in the shared point-set graph, so it also speeds up every compgeo overlay redraw, including the T2 `delaunay` and `point-set-triangulation` routes.
- **Cause 2, a site press selected a triangle.** The selectable triangle polygons react to `down`, so pressing a site at a triangle corner also selected that triangle. That rebuilt the overlay, which is why the press was slow. Seen on `voronoi`; the `delaunay` default scene has no draggable site to probe.
  - Fix: `drawSelectableTriangles` ignores a press when a visible point is under the pointer, the same test `onBoardDown` uses.
- **Tests:** two new tests in `DelaunayGraph.host.test.tsx`.
  - One checks that no board render happens inside the overlay removal.
  - One checks that a press on a point over a triangle selects nothing, while a press beside it selects.
  - Both fail with the fixes reverted (`21d-mut.log`).
- **Checks:** `just unit src/graphs/compgeo` passed, and tsc, eslint and `just build` passed (`21d-*.log`).

### 40-site drag after the fix

Same script and case as 21c: 1440×900, 3 runs × 40 moves, production preview.

| Case | frame median | p95 | worst frame | move→frame median | move→frame worst |
| --- | --- | --- | --- | --- | --- |
| default overlays | 16.7 | 16.8 | 50.0 | 8.6 | 16.7 |
| Delaunay overlay on | 16.7 | 16.8 | 133.4 | 8.0 | 116.5 |
| grid on | 16.7 | 16.8 | 66.7 | 8.9 | 49.9 |

All times are in ms.

- The typical frame is one 60 Hz tick in every case.
- The worst frames are within the range accepted for T2 (14-perf: up to 83 ms by default, up to 233 ms with overlays).
- The 18 jsdom figures (about 9 ms draw plus 5 ms kernel per step at 40 sites) agree with typical browser frames.
- A site press with the overlay on now takes about 0.45 s (probe): about 0.2 s of JS for the overlay rebuild, plus native work. That is acceptable at the limit of 40 sites. Revisit if a lesson drags with the overlay on.

## Gaps

- The perf runs used headless Chromium and the mouse only. There was no touch input and no CPU throttling.
- The JSXGraph "gridX/gridY is deprecated" console warning, seen with the grid on, was not traced. It is not an error.
- The `delaunay` route's site-press behaviour is fixed by the shared code, but it was not browser-checked.
