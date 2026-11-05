# 27 — Batch 3 registration (Batch 3, F2b)

Status: planned 2026-11-05 (geometry handler 52). Template: [20](20-batch2-registration.md). Kind: F2b, engineering review. Depends on 26.

| Id | Path | Graph | Preset key |
| --- | --- | --- | --- |
| `bezier-hulls` | `/bezeg-2.0/compgeo/bezier-hulls` | `BezierHullsGraph` | `compgeo-bezier-hulls` |

1. In `src/demonstrations.ts`, add the Demonstration to family `computational-geometry`, after `hull-robustness`, with `lesson: false` and two prompts. Add its factory to `graphFactories.ts`.
2. Add the Preset key to `PresetCatalog.test.tsx` and to the importer's list.
3. Locale: the title and prompts in one block. Title from the spec's term table or by [choosing new terms](../../localization.md#choosing-new-terms).
4. Poster: a recipe in `scripts/demonstration-preview-recipes.cjs` showing the crossing pair after several Next steps, at depth 3 or 4. The window must match the 720×440 aspect (about 1.64). Add the id to `POSTER_PENDING` until its capture.
5. Update the enumerating tests and `docs/current-architecture.md`. Resolve rebase conflicts in those lists as unions, then recount, including counts git merged silently.

The placement condition in the spec's release table is met: `computational-geometry` shipped with Batch 1.

Checks: the focused unit gate in the background, `just lint`, tsc, production build, and a route smoke of `/bezeg-2.0/compgeo/bezier-hulls` with a drag, Next step and refresh.
