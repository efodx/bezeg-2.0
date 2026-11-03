# Task 21 handoff (partial)

State: items 1-6 are implemented and committed on the worktree branch; two transient-state test families fail on both new ids, and `just build` was not run.

Files: src/demonstrations.ts, graphs/graphFactories.ts, graphs/base/graphTransientStateContract.tsx, graphs/base/presets/PresetCatalog.test.tsx, graphs/compgeo/compgeoPresetCollections.ts, demonstrationPosterPending.ts, localization sl/en (6 keys each), tests (demonstrations, Routes, DemonstrationsPage, lessonCatalog, familyChapters), docs/capabilities.md, docs/current-architecture.md, and src/graphs/compgeo/VoronoiGraph.tsx (outside the slice, see below).

Open failures (full suite, log 21-unit-full.log: 4 failed, 9716 passed):
- GraphTransientState.part3 `voronoi` and part4 `voronoi-degenerate`: "the lesson default scene drops every earlier change" and "Preset replacement (reset to the default scene) matches a newly mounted graph". After the reset the board is drawn from a stale diagram (a cell polygon at integer 9,3 / 7 instead of 9.1,2.9, and a curve with NaN,NaN points). Suspect VoronoiGraph drawing cache (`drawing.scale` / `drawnFor`) after a scene reset that changes the grid step or points. Without my VoronoiGraph change the same tests fail, plus a third (figure batch). 21-part3-orig.log vs 21-part3-new.log.
- My VoronoiGraph.tsx change (`startBox`, followView): a view that returns to the board's starting box draws the exact frame, so PresetCatalog default Preset round trip passes (it failed before: the Preset load re-applied the recorded view and re-clipped to the visible box).
Remaining: fix the stale-diagram reset in VoronoiGraph, rerun part3/part4 voronoi tests, `just build`, full unit once.
