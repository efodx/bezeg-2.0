# 18 — S2 registration (F2b)

Status: planned 2026-11-02 (geometry handler 26). Source: [spec placement](../../specs/sweep-algorithms-lessons.md#placement), C3 and C4 capabilities, testing decisions (route and Preset import). Kind: F2b, engineering review. Depends on 16, 17. Template: [task 10](10-sweep-registration.md).

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `monotone-partition` | `/bezeg-2.0/compgeo/monotone-partition` | `MonotonePartitionGraph` | `compgeo-monotone-partition` |
| `monotone-triangulation` | `/bezeg-2.0/compgeo/monotone-triangulation` | `MonotoneTriangulationGraph` | `compgeo-monotone-triangulation` |

1. `src/demonstrations.ts`: both definitions after `segment-intersections`, family `computational-geometry`, `lesson: false` (tasks 19 and 20 remove it). Two prompts each.
2. `src/graphs/graphFactories.ts`: one factory each.
3. Presets: both collections join `compgeoPresetCollections` and the accepted key list in `PresetCatalog.test.tsx`; both ids join `PRESET_DATA_STATE_KEYS` in `graphTransientStateContract.tsx` (task 10 missed this at first and the full unit run caught it).
4. Locale keys: one registration block for the two titles and four prompts, same position in `sl.ts` and `en.ts`. Titles: *Razdelitev na monotone večkotnike* / *Monotone partition*; *Triangulacija monotonega večkotnika* / *Monotone triangulation*.
5. Posters: both ids join `POSTER_PENDING` (F5). Chapters: both ids join `CHAPTER_LINK_PENDING` in `familyChapters.test.ts` until task 21.
6. Default view: both graphs override `initialView()` to frame their default example, as task 10's follow-up did (`compgeoDefaultView.host.test.tsx` gains both).
7. Enumerating tests and `docs/current-architecture.md`.

Not in scope: lessons, chapter, posters.

Checks: tsc 0; `just lint` on touched paths; `just unit src/graphs/compgeo src/graphs/base src/demonstrations.test.ts src/demonstrationPreviewAssets.test.ts src/Routes.test.tsx src/learning/runtime`; full unit once; build. Smoke (handler, separate worker): both routes direct and after refresh, catalog cards, SL and EN with a live switch, Next/Play/Reset, an edit, a refusal, Preset save and restore, side lists and the vertex-type labels at 1366 and 390 px.

Impact: new routes only; existing routes and stored Presets unchanged.
