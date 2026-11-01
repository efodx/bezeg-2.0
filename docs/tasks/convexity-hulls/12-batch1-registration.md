# 12 — Batch 1 registration (F2b)

Status: accepted 2026-11-01 (handler 10). Full unit 6693 tests green after one exemption fix; lint, tsc, build clean; smoke of the three routes in SL/EN with live switch and Preset save/restore passed. Posters deferred to F5: the capture script requires a recipe for every shipped id and `linear-map` (Maps) has none, so the three ids join `POSTER_PENDING`; their recipes are already in place. Source: [spec placement](../../specs/convexity-hulls-lessons.md#placement), [batch-wide acceptance gate](../../specs/convexity-hulls-lessons.md#batch-wide-acceptance-gate) item 1 (route and static preview; the lesson comes in F3). Kind: F2b, engineering review. Depends on 09, 10 and `G-REG` (Platform A10 derived registration). Shared registration files: keep the edit minimal and push promptly ([shared files](../feature-streams/README.md#shared-files)).

Register the new family **Računska geometrija / Computational geometry** and the three Batch 1 Demonstrations, with no lessons yet.

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `orientation` | `/bezeg-2.0/compgeo/orientation` | `OrientationGraph` | `compgeo-orientation` |
| `polygon-area` | `/bezeg-2.0/compgeo/polygon-area` | `PolygonAreaGraph` | `compgeo-polygon-area` |
| `convex-hull` | `/bezeg-2.0/compgeo/convex-hull` | `HullTraceGraph` | `compgeo-hull-trace` |

1. `src/demonstrations.ts`: family `{id: 'computational-geometry', title: 'computational_geometry'}` after `analysis`; the three definitions after `fixed-point`, each with `lesson: false` (F3 removes it when the lesson lands, as A10's two-way lesson test requires). Two prompts per Demonstration.
2. `src/graphs/graphFactories.ts`: one factory per id.
3. Presets: each Demonstration owns one module-level collection (the Preset catalog test rejects shared collections and compares identity). `OrientationGraph` and `PolygonAreaGraph` stop inheriting `compgeo-point-set`. The keys join the accepted key list in `PresetCatalog.test.tsx` and the importer's collection list. `compgeo-point-set` itself was never registered, so no stored Preset changes.
4. Locale keys (family title, three titles, six prompts) in one block at an anchor of their own, same position in `sl.ts` and `en.ts`. Terms from the spec table: *orientacija treh točk*, *ploščina večkotnika*, *konveksna ovojnica*.
5. Static posters: recipes in `scripts/demonstration-preview-recipes.cjs` for the defaults (orientation: the spec's \(r=(3,2)\) left turn or the default model; polygon area: the hull pentagon; hull: sample 1 at step 0 or after a few Next steps). Selective recapture `PREVIEW_RECAPTURE_IDS=orientation,polygon-area,convex-hull` against `just preview 4313` (`PREVIEW_BASE_URL`), regenerating `src/demonstrationPreviewAssets.ts` and the manifest by script, never by hand.
6. Update the enumerating tests (`Routes.test.tsx`, `demonstrations.test.ts`, `realGraphTestHarness.tsx`, `lessonCatalog.test.ts` or others that list ids) and `docs/current-architecture.md` (the point-set row says "no route yet").

Not in scope: lessons, `algorithm-trace` animation id, Learn chapter, clips beyond what selective recapture writes.

Checks: tsc 0; `just lint` on touched paths; `just unit` for `src/graphs/compgeo src/graphs/base/presets src/demonstrations.test.ts src/demonstrationPreviewAssets.test.ts src/Routes.test.tsx src/learning/runtime`; full unit suite once; production build. Smoke (handler, separate worker): the three routes direct and after refresh, catalog card with poster, in Slovenian and English including a live switch, Next/Play/Reset on the hull route, keyboard point nudge.

Impact: new routes only; existing routes and stored Presets unchanged.
