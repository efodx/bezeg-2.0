# 21 — Voronoi and degenerate-sites registration (T3, F2b)

Status: planned 2026-11-02 (geometry handler 34). Source: spec [implementation decisions](../../specs/triangulation-voronoi-lessons.md#implementation-decisions), [placement](../../specs/triangulation-voronoi-lessons.md#placement), [batch gate](../../specs/triangulation-voronoi-lessons.md#batch-wide-acceptance-gate) item 1. Kind: F2b. Depends on 19 and 20. Template: [14](14-t2-registration.md).

Two Demonstrations, one per lesson (B5 is served by `DegenerateSitesGraph`, see 20):

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `voronoi` | `/bezeg-2.0/compgeo/voronoi` | `VoronoiGraph` | `compgeo-voronoi` |
| `voronoi-degenerate` | `/bezeg-2.0/compgeo/voronoi-degenerate` | `DegenerateSitesGraph` | `compgeo-voronoi-degenerate` |

1. `src/demonstrations.ts`: both definitions after `delaunay` in family `computational-geometry`, `lesson: false` until 22 and 23, as T2 did. Two prompts each.
2. `src/graphs/graphFactories.ts`: one factory each.
3. Presets: both collections join `compgeoPresetCollections` and the accepted key list in `PresetCatalog.test.tsx`; both ids join `PRESET_DATA_STATE_KEYS` in `graphTransientStateContract.tsx`.
4. Locale keys (title, prompts) in the shared compgeo registration block, same position in `sl.ts` and `en.ts`. Titles: *Voronojev diagram* / *Voronoi diagram*; the B5 title is chosen by the worker under [choosing new terms](../../localization.md#choosing-new-terms) and reported to the handler.
5. Posters: a static preview per route (batch gate item 1). Follow T2's precedent: both ids join `POSTER_PENDING` in `src/demonstrationPreviewAssets.test.ts` and the poster comes from the next joint capture (`docs/reviews/feature-streams/geometry/posters-brief.md`), together with T2's pending ones.
6. Enumerating tests that list ids; `docs/capabilities.md` route row and `docs/current-architecture.md` where it lists compgeo graphs.

Impact: two new routes only; existing routes and stored Presets unchanged. The route is registered before its lesson (T2 precedent); there is no hiding mechanism.

Checks: `npx tsc --noEmit --pretty false`, `just lint` on touched files, full unit suite once, `just build`; handler: a smoke of the route (load, reload, catalog, overlay toggle, query point and Reset view, the four-point mode and the collinear Preset, SL/EN live switch, Preset round trip, 390 px) and a drag at 40 sites in the browser against the numbers of 18.
