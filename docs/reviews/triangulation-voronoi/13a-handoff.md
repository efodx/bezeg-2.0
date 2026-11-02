# 13a handoff (partial)

## State
DelaunayGraph slice 13a implemented; tsc clean (13a-tsc.log, run before the last test edits). Host test: 11 pass, 2 fail (13a-unit-delaunay.log).

## Files
New: src/compgeo-adjacent graphs in src/graphs/compgeo/: delaunayRun.ts, DelaunayGraph.tsx, DelaunayControls.tsx, delaunayPresetCollection.ts, DelaunayGraph.host.test.tsx.
Edited: triangulationPresetCollection.ts (optional `key` param, default unchanged), TriangulationGraph.tsx (`anglesHidden?` on readout), TriangulationControls.tsx (hides angle lines when set), src/localization/sl.ts + en.ts (27 `del_*` keys after tri_invalid_triangulation).

## Remaining failures (both test-side, not yet diagnosed fully)
1. Example 1 test: after the flip, triangle list order is [[1,2,3],[0,1,3]]; compare as sorted set (use triangleSet helper), not exact order.
2. Edit-while-playing test: some edit step leaves [step 2, playing true, 1 callback]. Likely the manual flip: selectEdge(1,5)/flipSelected is on the displayed tri at step 2 and may be refused or not change triangles (so no reset). Check flipSelected returns true, choose a valid interior convex edge of the displayed triangulation, or assert on the returned value.

## Not done
- Mutation runs (>=0 flip with step cap; wrong-triangle circle): none run yet.
- `just unit src/graphs/compgeo --maxWorkers=2`, `just lint`, `just build`: not run.
- docs/localization.md term rows (Delaunayeva triangulacija, neustrezen/ustrezen rob, kocirkularne točke, preizkus krožnice) not added.
- Slice 13b seam: `drawExtras` / `drawCircle` / `overlayInputs` in DelaunayGraph.tsx. "Both tests -64" per edge from both sides is not shown by the trace (one test per edge): left for 13b neighbour determinants.
