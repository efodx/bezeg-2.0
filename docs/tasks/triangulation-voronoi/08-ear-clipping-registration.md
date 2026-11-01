# 08 — Ear-clipping registration (T1 F2b)

Status: accepted 2026-11-01 (geometry handler 15): Sonnet worker registered `ear-clipping`, `interval-sweep`, `segment-intersections` together; handler added the three ids to `PRESET_DATA_STATE_KEYS` in `graphTransientStateContract.tsx` (full unit had 3 failures there, then 6961 passed); lint, build; Sonnet smoke of the three routes passed (load/reload, catalog, Next/Play/Reset, edit to step 0, SL/EN live switch, Preset round trip, side lists at 1366 and 390 px, exact crossings), no console errors, shots in `docs/reviews/feature-streams/geometry/10-shots/`. Follow-up: the default view `[-5, 5, 5, -5]` puts the C2 example's upper endpoints at \(y=5\) on the board's top edge (screenshot `segment-intersections-sidelists-1366.png`); give these graphs a fitting default view. Planned 2026-11-01 (geometry handler 15). Source: [spec placement](../../specs/triangulation-voronoi-lessons.md#placement), B1 capabilities, testing decisions (route and Preset import). Kind: F2b, engineering review. Depends on 07 (`EarClippingGraph`) and `G-REG` (open). Template: [convexity 12](../convexity-hulls/12-batch1-registration.md). Done in one worker together with [sweep 10](../sweep-algorithms/10-sweep-registration.md), which edits the same shared registration files ([shared files](../feature-streams/README.md#shared-files)); keep the edit minimal and push promptly.

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `ear-clipping` | `/bezeg-2.0/compgeo/ear-clipping` | `EarClippingGraph` | `compgeo-ear-clipping` |

1. `src/demonstrations.ts`: the definition after `convex-hull` in family `computational-geometry`, `lesson: false` (the T1 lesson slice removes it). Two prompts.
2. `src/graphs/graphFactories.ts`: one factory.
3. Presets: `earClippingPresetCollection` joins `compgeoPresetCollections` (the importer's list) and the accepted key list in `PresetCatalog.test.tsx`; the Demonstration owns that one module-level collection.
4. Locale keys (title, two prompts) in the shared registration block of sweep 10, same position in `sl.ts` and `en.ts`. Title: *Triangulacija z rezanjem ušes* / *Ear-clipping triangulation* (spec terms *rezanje ušes*, *uho*).
5. Poster: the id joins `POSTER_PENDING` in `src/demonstrationPreviewAssets.test.ts` (posters are F5, as for convexity 12); no recapture.
6. Enumerating tests that list ids, and `docs/current-architecture.md` where it says the graph has no route.

Not in scope: the T1 lesson, chapter, posters.

Impact: a new route only; existing routes and stored Presets unchanged.
