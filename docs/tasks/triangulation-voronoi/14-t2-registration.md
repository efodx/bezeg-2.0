# 14 — Point-set triangulation and Delaunay registration (T2, F2b)

Status: open (task file written 2026-11-02, geometry handler 25). Source: spec [implementation decisions](../../specs/triangulation-voronoi-lessons.md#implementation-decisions), [placement](../../specs/triangulation-voronoi-lessons.md#placement), [batch gate](../../specs/triangulation-voronoi-lessons.md#batch-wide-acceptance-gate) item 1. Kind: F2b. Depends on 12 and 13. Template: [08](08-ear-clipping-registration.md).

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `point-set-triangulation` | `/bezeg-2.0/compgeo/point-set-triangulation` | `TriangulationGraph` | `compgeo-point-set-triangulation` |
| `delaunay` | `/bezeg-2.0/compgeo/delaunay` | `DelaunayGraph` | `compgeo-delaunay` |

1. `src/demonstrations.ts`: both definitions after `ear-clipping` in family `computational-geometry`, `lesson: false` until 15 and 16. Two prompts each.
2. `src/graphs/graphFactories.ts`: one factory each.
3. Presets: both collections join `compgeoPresetCollections` and the accepted key list in `PresetCatalog.test.tsx`; both ids join `PRESET_DATA_STATE_KEYS` in `graphTransientStateContract.tsx`.
4. Locale keys (titles, prompts) in the shared compgeo registration block, same position in `sl.ts` and `en.ts`. Titles: *Triangulacija množice točk* / *Triangulating a point set*; *Delaunayeva triangulacija* / *Delaunay triangulation*.
5. Posters: a static preview per route (gate item 1). Capture them as handler 23 did for the T1/S1 routes (`docs/reviews/feature-streams/geometry/posters-brief.md`); until captured, the ids join `POSTER_PENDING` in `src/demonstrationPreviewAssets.test.ts`.
6. Enumerating tests that list ids; `docs/capabilities.md` route rows and `docs/current-architecture.md` where it lists compgeo graphs.

Impact: two new routes only; existing routes and stored Presets unchanged.

Checks: `npx tsc --noEmit --pretty false`, `just lint` on touched files, full unit suite once, `just build`; handler: a smoke of both routes (load, reload, catalog, Next/Play/Reset on `delaunay`, flip on `point-set-triangulation`, SL/EN live switch, Preset round trip, 390 px).
