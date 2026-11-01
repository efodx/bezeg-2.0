# 10 — Sweep registration (S1 F2b)

Status: accepted 2026-11-01 (geometry handler 15): Sonnet worker registered `ear-clipping`, `interval-sweep`, `segment-intersections` together; handler added the three ids to `PRESET_DATA_STATE_KEYS` in `graphTransientStateContract.tsx` (full unit had 3 failures there, then 6961 passed); lint, build; Sonnet smoke of the three routes passed (load/reload, catalog, Next/Play/Reset, edit to step 0, SL/EN live switch, Preset round trip, side lists at 1366 and 390 px, exact crossings), no console errors, shots in `docs/reviews/feature-streams/geometry/10-shots/`. Follow-up: the default view `[-5, 5, 5, -5]` puts the C2 example's upper endpoints at \(y=5\) on the board's top edge (screenshot `segment-intersections-sidelists-1366.png`); give these graphs a fitting default view; done 2026-11-01 (geometry handler 16): `BaseGraph.initialView()` lets an equal-unit graph start from its default example's extent, fitted to the canvas aspect at board creation and on reload (a Preset's own `boardState` still wins; graphs without the override and function graphs are unchanged); `compgeoDefaultView.host.test.tsx` (mutation removing an override fails); browser check of the three routes at 1366 and 390 px, no console errors. Ear-clipping example 2 (\(x\) 0–18) still loads in the current view; Fit shows it. Planned 2026-11-01 (geometry handler 15). Source: [spec placement](../../specs/sweep-algorithms-lessons.md#placement), C1 and C2 capabilities, testing decisions (route and Preset import). Kind: F2b, engineering review. Depends on 08, 09 and `G-REG` (open). Template: [convexity 12](../convexity-hulls/12-batch1-registration.md). Done in one worker with [triangulation 08](../triangulation-voronoi/08-ear-clipping-registration.md) (same shared files).

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `interval-sweep` | `/bezeg-2.0/compgeo/interval-sweep` | `IntervalSweepGraph` | `compgeo-interval-sweep` |
| `segment-intersections` | `/bezeg-2.0/compgeo/segment-intersections` | `BentleyOttmannGraph` | `compgeo-bentley-ottmann` |

The second id names the problem, not the algorithm, after the syllabus term *presečišča daljic*; the graph and preset key keep the algorithm name (the key is new, so nothing stored changes).

1. `src/demonstrations.ts`: both definitions after `ear-clipping`, family `computational-geometry`, `lesson: false` (the S1 lesson slices remove it). Two prompts each.
2. `src/graphs/graphFactories.ts`: one factory each.
3. Presets: `intervalSweepPresetCollection` and `bentleyOttmannPresetCollection` join `compgeoPresetCollections` and the accepted key list in `PresetCatalog.test.tsx`.
4. Locale keys: one registration block for the three titles and six prompts (with triangulation 08's), same position in `sl.ts` and `en.ts`. Titles: *Pometanje intervalov* / *Interval sweep*; *Presečišča daljic* / *Segment intersections*. Prompts use the spec's term table (*pometalna premica*, *dogodek*, *stanje*, *presečišče*).
5. Posters: both ids join `POSTER_PENDING` (F5).
6. Enumerating tests and `docs/current-architecture.md` (the interval and segment modes and both graphs are described as unregistered).

Not in scope: the C1 and C2 lessons and the `set-points` fix they need (`applyPointSetAction` must pass `this.allowsIntervals()`/segments), chapter, posters.

Checks (both tasks): tsc 0; `just lint` on touched paths; `just unit src/graphs/compgeo src/graphs/base/presets src/demonstrations.test.ts src/demonstrationPreviewAssets.test.ts src/Routes.test.tsx src/learning/runtime`; full unit once; build. Smoke (handler, separate worker): the three routes direct and after refresh, catalog cards, SL and EN with a live switch, Next/Play/Reset, an edit, a Preset save and restore on each; first sight of the side-list CSS (tint, left bar, ≤400px wrapping) and the board marks.

Impact: new routes only; existing routes and stored Presets unchanged.
