# 20 — Batch 2 registration (Batch 2, F2b)

Status: planned 2026-11-03 (geometry handler 48). Source: spec [Implementation Decisions](../../specs/convexity-hulls-lessons.md#implementation-decisions), template [12](12-batch1-registration.md). Kind: F2b. Depends on 18, 19 and `G-REG`.

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `point-in-polygon` | `/bezeg-2.0/compgeo/point-in-polygon` | `PointInPolygonGraph` | `compgeo-point-in-polygon` |
| `hull-robustness` | `/bezeg-2.0/compgeo/hull-robustness` | `HullRobustnessGraph` | `compgeo-hull-robustness` |

1. In `src/demonstrations.ts`, add both Demonstrations to family `computational-geometry`, after `convex-hull` and in this order, each with `lesson: false` and two prompts. Add their factories to `graphFactories.ts`.
2. Presets: each Demonstration owns one module-level collection.
   - The point-in-polygon Preset stores the polygon and the query point.
   - The robustness Preset stores the point set, the mode, the pop rule, the duplicates choice and the selected Kettner cell.

   Validate imports and reject, with an actionable error, a non-integer or out-of-range value, too many points, a wrong mode or an unknown rule. Add the keys to `PresetCatalog.test.tsx` and to the importer's list.
3. Locale: the two titles and four prompts in one block. Choose the Slovenian titles from the spec's term table by [choosing new terms](../../localization.md#choosing-new-terms).
4. Posters: add recipes for both ids to `scripts/demonstration-preview-recipes.cjs`:
   - `point-in-polygon`: the pentagon with \(q=(3,1)\) and the ray overlay on;
   - `hull-robustness`: chain mode on sample 1 after a few Next steps.

   Each window must match the poster's 720×440 aspect (about 1.64), or the id joins the capture's equal-units list, so that circles and squares are not distorted. Add both ids to `POSTER_PENDING` until their capture.
5. Update the enumerating tests and `docs/current-architecture.md` as in 12. Resolve rebase conflicts in those lists as unions, then recount.

Checks: as 12. Smoke (separate worker), in SL and EN with a live language switch:
- both routes directly and after refresh, and their catalog cards;
- a keyboard drag of the query point, and touch add on the polygon;
- the mode switch and a cell selection on the robustness route.

Impact: new routes only; existing routes and stored Presets are unchanged.
