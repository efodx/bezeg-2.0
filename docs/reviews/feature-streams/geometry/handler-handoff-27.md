# Geometry stream: handler handoff 27

Written 2026-11-02 by handler 27 (Opus 5.5, auto, effort medium) at the 150k soft threshold. Continues [handoff 26](handler-handoff-26.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Branch `stream-geometry`, pushed to `master` at the commit named in the final report. No worker, preview or watcher from this session is still running (the 215k self-watcher dies with the session).
- **Done this run:**
  - **Convexity Batch 1 F6 accepted:**
    - Repair `843e8346` (it was `e9f07099` before the rebase): `initialView()` overrides on `HullTraceGraph` and `PolygonAreaGraph`, and the neutral n<3 note `hulltrace_note_output_small`.
    - Haiku recheck [f6r-smoke.md](f6r-smoke.md).
    - Record: [f6-convexity-acceptance.md](f6-convexity-acceptance.md).
    - All of this was pushed to `master` at `535925bd`.
  - **T2 task 12 accepted** (`4723a290` 12a, `3df4564b` 12b, `86a157cb` review repairs): `TriangulationGraph`, `TriangulationControls`, `triangulationPresetCollection.ts` (key `compgeo-triangulation`), the `edges` overlay name, and 38 `tri_*` keys. Evidence and gaps are at the end of the [task file](../../../tasks/triangulation-voronoi/12-point-set-triangulation-graph.md).

## Remaining, in order

1. **T2 task 13** (`docs/tasks/triangulation-voronoi/13-delaunay-graph.md`). It extends `TriangulationGraph`. The hooks are `drawTriangulation`, `drawSelectedEdge`, `readout`, `retriangulate`, `afterFlip` and `workspaceEdit`; public methods are `selectEdge`, `flipSelected`, `triangulation()`, `selectedEdge()` and `refusal()`. Transient event and selection are decided in `setState` after the write; only `addPointAt` produces `inserted`. Run one Sonnet `bezeg-worker` medium, split if the task is large, followed by the review the task names.
2. **Task 14 (T2 registration)** must also carry the **browser drag measurement at 40 points** deferred from task 12. jsdom gave about 1 ms for the state write and 75–84 ms for a full redraw (141 ms with both overlays); creating about 76 edge curves accounts for about 37 ms of that. Measure in a browser before batching the curves ([performance plan](../../../performance-plan.md)).
3. Then 15–17, one code worker at a time. **S2 kernel 14** (sweep) may interleave; it is independent of T2.
4. Keep the stream lines current. Family 2 says 12 accepted; the convexity line says Batch 1 F6 accepted. Convexity F5 media is still pending (posters wait on a Maps `linear-map` recipe).

## Checks run this run

- Convexity repair: tsc, lint, `just unit src/graphs/compgeo`, `just unit src/localization` and `just build` at the repair tree. A Haiku browser recheck on port 4313 passed. No full `just check`; the acceptance record gives the scope argument.
- Task 12: the same focused set at each of 12a, 12b and the repair, plus `just unit src/compgeo` at 12b. Logs are `docs/reviews/triangulation-voronoi/12*-*.log` (untracked).
- Hosted CI: not rechecked after this push. Check `gh run list --branch master -L 3` first; the last known failures are Maps' and Curves' `GraphTransientState.part2/part3`.

## Risks

- Memory is tight: run heavy checks one at a time.
- Write docs containing LaTeX with the Write tool, not Bash heredocs.
- Never stage `src/demonstrationMotionAssets.ts`, the smoke screenshots or JSON (`f6-convexity-smoke/`, `f6r-smoke/`), or the untracked logs.
- `TriangulationGraph.importPresetData` throws on an invalid stored list. Every BaseGraph caller goes through `collection.check`, so only direct calls can hit the throw.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet medium, one code worker at a time. Reviews: `bezeg-reviewer`, Sonnet for engineering and mathematics, Haiku for routine UI slices. Smoke: `bezeg-smoke`, Sonnet for broad runs and Haiku for narrow rechecks.
