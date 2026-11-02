# Task 19 handoff (partial)

Worktree: C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\agent-abea834710293a808 (node_modules junction made with node fs.symlinkSync; do not Remove-Item -Recurse it). Nothing committed.

## State per acceptance item
1. Extraction: DONE. `circumcircleDrawing.ts` (drawCircumcircle, drawSelectableTriangles, sortedTriple, sameTriple); `DelaunayGraph.tsx` uses it. `just unit src/graphs/compgeo/Delaunay` passed (log 19-extract.log region; tests unedited); tsc clean. Mutation of the shared module NOT yet run.
2-8. Code written, tsc clean, NOT yet tested at runtime: `VoronoiGraph.tsx`, `VoronoiControls.tsx`, `voronoiConstruction.ts` (bisectorOrder, constructionRegion, sameCyclicPolygon, parseRationalText), `voronoiPresetCollection.ts` (key compgeo-voronoi, extra optional graphState fields cellSite/construction/query validated; polygon mode refused with vor_invalid_mode).
9. Localization: `vor_*` block added after `del_tri_hull` in sl.ts and en.ts (lockstep). `just unit src/localization` NOT run.
10. Tests: NONE written yet.

## Remaining steps
1. Write `VoronoiGraph.host.test.tsx` (copy scaffolding from DelaunayGraph.host.test.tsx lines 1-90): all tests in the task's item 10 (labels are 1-based: spec p5 = "P6"; default query (4,2) is in the P6 cell). Also a small `voronoiConstruction.test.ts` (final region equals `clipCell` via sameCyclicPolygon; order ties by index; parseRationalText).
2. Run `just unit src/graphs/compgeo --maxWorkers=2`, `just unit src/localization`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`; logs to 19-*.log.
3. Mutations (cmp against backup): Delaunay shared module; wrong-triangle circumcentre; nearest ignoring ties; overlay left on after Reset.
4. Performance justification from 18-perf-raw.txt (about 9 ms for 40 sites, 2 ms for 12 in jsdom) in the final report.

## Known risks / not verified
- Drawing box is `frame` and does not follow pan/zoom.
- `diagramObjectsAlive` checks object names "voronoi-cell"/"voronoi-edges" (assumed from voronoiDrawing.ts); verify.
- `board.canvasWidth/Height` used in resetView; check typing worked (tsc clean) and behaviour in jsdom.
- A Preset lacking cellSite/construction/query keeps stale values from the previous scene.
- Query keyboard moves are panel buttons plus text inputs, not board arrow keys.
