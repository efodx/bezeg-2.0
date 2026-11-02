# 14 — Point-set triangulation and Delaunay registration (T2, F2b)

Status: accepted 2026-11-02 (geometry handler 29; task file written by handler 25), except item 5: posters are still pending. Evidence at the end. Source: spec [implementation decisions](../../specs/triangulation-voronoi-lessons.md#implementation-decisions), [placement](../../specs/triangulation-voronoi-lessons.md#placement), [batch gate](../../specs/triangulation-voronoi-lessons.md#batch-wide-acceptance-gate) item 1. Kind: F2b. Depends on 12 and 13. Template: [08](08-ear-clipping-registration.md).

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `point-set-triangulation` | `/bezeg-2.0/compgeo/point-set-triangulation` | `TriangulationGraph` | `compgeo-triangulation` |
| `delaunay` | `/bezeg-2.0/compgeo/delaunay` | `DelaunayGraph` | `compgeo-delaunay` |

1. `src/demonstrations.ts`: both definitions after `ear-clipping` in family `computational-geometry`, `lesson: false` until 15 and 16. Two prompts each.
2. `src/graphs/graphFactories.ts`: one factory each.
3. Presets: both collections join `compgeoPresetCollections` and the accepted key list in `PresetCatalog.test.tsx`; both ids join `PRESET_DATA_STATE_KEYS` in `graphTransientStateContract.tsx`.
4. Locale keys (titles, prompts) in the shared compgeo registration block, same position in `sl.ts` and `en.ts`. Titles: *Triangulacija množice točk* / *Triangulating a point set*; *Delaunayeva triangulacija* / *Delaunay triangulation*.
5. Posters: a static preview per route (gate item 1). Capture them as handler 23 did for the T1/S1 routes (`docs/reviews/feature-streams/geometry/posters-brief.md`); until captured, the ids join `POSTER_PENDING` in `src/demonstrationPreviewAssets.test.ts`.
6. Enumerating tests that list ids; `docs/capabilities.md` route rows and `docs/current-architecture.md` where it lists compgeo graphs.

Impact: two new routes only; existing routes and stored Presets unchanged.

Checks: `npx tsc --noEmit --pretty false`, `just lint` on touched files, full unit suite once, `just build`; handler: a smoke of both routes (load, reload, catalog, Next/Play/Reset on `delaunay`, flip on `point-set-triangulation`, SL/EN live switch, Preset round trip, 390 px).

## Evidence (handler 29, 2026-11-02)

- Commits:
  - `0447e7a4`: registration, items 1–4 and 6 (handler 28's worker; rebased onto master).
  - `831a1958`: smoke repairs.
  - `d42fd99a`: the drag measurement.
- Rebase conflict: `lessonCatalog.test.ts`. Master gave `projective-pascal` a lesson. The resolution keeps both new ids in the list of ids without lessons.
- Handler decision: the Preset key stays `compgeo-triangulation`, as task 12 accepted it (the table row was corrected by handler 28). No route existed before, so no stored data changes.
- Smoke (Sonnet `bezeg-smoke`, preview of `3296b119`, Chromium 156, 1440x900 and 390x844). Nine checks passed:
  - load and reload;
  - catalog;
  - Next/Play/Reset (Play steps about every 1.25 s);
  - flip from the edge list;
  - live SL/EN switch, including the board label *neustrezen rob* / *illegal edge*;
  - Preset round trip on both routes;
  - 390 px with no horizontal scroll;
  - keyboard Enter and Space on the triangle list;
  - a real board click inside a triangle.
- The smoke found two problems:
  - **Page error.** A second board press on `delaunay` threw `Cannot read properties of undefined (reading 'hasPoint')`. The press handler rebuilt the overlays inside JSXGraph's pointer-down dispatch.
    - Repair (`831a1958`): `PointSetGraph.afterBoardPress` runs the selection in a microtask. It is dropped if the board was torn down or locked meanwhile. Both the triangle press and the triangulation edge press use it; panel and keyboard selection stay synchronous.
    - Browser A/B on the smoke worker's click sequences with the old view: the pre-fix handler errors in 2–3 of 5 sequences; the deferred handler errors in none. Both give the same selection results. The rebuilt `831a1958` preview shows no errors.
    - The new host test fails with the synchronous handler (mutation log `14-fix-mut.log`).
  - **Default view too small.** The inherited view showed the default quad at 22% × 23% of the board.
    - Repair: `DelaunayGraph.initialView()` is `[-2, 6, 7, -1.5]`, which keeps the circumcircle of `abc` (y up to about 5.4) in view.
    - The quad now spans 33% × 33% at 1440x900.
- Drag measurement at 40 points ([record](../../reviews/triangulation-voronoi/14-perf.md)):
  - The frame median and p95 are one 60 Hz tick in every case.
  - The worst frames are 83 ms by default and 233 ms with edge numbers and angles on.
  - No curve batching for now.
- Checks:
  - At `3296b119`: tsc, the full unit suite (1081 s, passed) and `just build`.
  - At `831a1958`: tsc, lint on the touched files, `just unit src/graphs/compgeo --maxWorkers=2` and `just build`.
  - Logs are `docs/reviews/triangulation-voronoi/14-r-*.log` and `14-fix-*.log` (untracked).
- Gaps:
  - Item 5: posters are pending, and both ids stay in `POSTER_PENDING`.
  - A real board click on an edge of `point-set-triangulation` was not completed in the smoke; it was checked only by the host test and the A/B run.
  - Pressing the same point twice near the shared diagonal of the quad left the triangle selected in both the pre-fix and the fixed build. That point is probably inside both triangles within tolerance. It is not a regression and was not investigated.
  - The full unit suite was not rerun after `831a1958`; that change touches only `src/graphs/compgeo`, and those tests were rerun.
  - No touch device.
