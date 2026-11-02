# T3 task 19 acceptance: Voronoi graph with the Delaunay duality overlay

Accepted 2026-11-03 by geometry handler 36. Task: [19](../../tasks/triangulation-voronoi/19-voronoi-graph.md) (B4). Briefs: [19](19-brief.md), [19b](19b-brief.md). Commits on master: `6252fd5f` (graph, originally `95952dfa`, after a 19b continuation worker) and `dccd4e13` (review fixes, originally `72c70bd7`). Reviews ran under handler 35; their findings are recorded in [handoff 35](../feature-streams/geometry/handler-handoff-35.md).

## Reviews (Sonnet `bezeg-reviewer`)

- **Mathematics:** approved. Nit: sites display 1-based, so the spec's \(p_5,p_6\) are P6 and P7. Lessons 22 and 23 must name them that way.
- **Engineering:** one should-fix. An import carried over stale state. Fixed in `dccd4e13`.
- **UI and accessibility:** four should-fixes, all fixed in `dccd4e13` with mutation evidence:
  1. a stale error message stayed visible;
  2. the query result was not announced;
  3. the chosen-site marker was missing;
  4. the focus order was wrong.

## Handler decisions (handler 35)

- The drawing box follows pan and zoom (B4 acceptance 4).
- The query point moves by panel buttons and numeric fields, not by board arrow keys, because `PointSetGraph`'s selection is private.
- Optional, validated Preset fields `cellSite`, `construction` and `query` are allowed.
- Known gap, accepted: editing a field alone does not clear a refusal left by an arrow move; the next move clears it.

## Checks

- Worker, in worktree `agent-abea834710293a808`: compgeo units (617 tests before the fix round), localization, tsc, build, and lint on touched sources.
- Handler 36, after rebasing both commits onto `538ce186` (clean), at `dccd4e13`: `npx tsc --noEmit --pretty false` clean; `just unit src/graphs/compgeo src/localization src/demonstrations.test.ts src/Routes.test.tsx` (48 files, 657 tests passed, 3 skipped); eslint on every touched `.ts`/`.tsx` file, the locale catalogs included, clean; `just build` passed. Logs: `19-merge-*.log`.
- T3 20 open point (point limit) settled by handler 36: up to 40 sites in `sites` mode, exactly four in `four-point` mode; the five-collinear Preset uses `sites` mode.
- No browser smoke: the graph has no route until registration (task 21), whose smoke covers it.
