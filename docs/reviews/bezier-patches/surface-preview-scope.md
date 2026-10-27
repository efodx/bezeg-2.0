# Surface preview capture — scope (Haiku Explore, 2026-10-27, read-only)

Input for task 07 remaining step 3 (real `patch-tensor` preview so the master push's catalog validator passes).

- Generator `scripts/capture-demonstration-previews.cjs` (staging `.command-logs/preview-staging-<pid>`, publish via `scripts/publish-demonstration-previews.cjs`); invoked through `just preview` → `scripts/commands.cjs` (justfile:53-54).
- Recipes `scripts/demonstration-preview-recipes.cjs`: target `[intent, actions, window]` (7-54); recipe `{id, intent, actions, checkpoint, framing: {kind: 'coordinate-window'|'finite-geometry-fit', window}, annotations}` (57-61); `patch-tensor` placeholder (53-54). `outcome()` reads `board.objects` and `#jgbox` (140-151).
- Board dependencies in capture: `#jgbox` (540), `window.JXG.boards` (113, 544), resize/bbox/origin/unitX (159-166, 212-218, 309-331), axes/grid/ticks (124-127), label hiding (119), sceneBounds (239, 341-411), outOfFrameElements (341); motion camera = poster bbox (318).
- Manifest `src/images/demonstrations/catalog/manifest.json` v2: captures `{id, recipe, evidence, posterCheckpoint, sha256, image, framing{boardBoundingBox, sceneBounds, outOfFrameElements}, board, coordinateContextPolicy}`, motions.
- Validator `tests/smoke-catalog.cjs:153-333`: map exhaustiveness (168-195), version/fingerprints (202-204), recipe equality (240), frame dims (223-258), PNG sig/dims/sha (261-270), containment + empty outOfFrame (271-282), exact capture count (285-287), PNG file set (289-293), motions (318-327), coordinate policy (72, 245-251).
- `src/demonstrationPreviewAssets.ts:3,52` hand entry for the placeholder (file header says generated).

Recommended boundary: one `surface` branch keyed on `demonstration.view === 'surface'` in recipes, capture and validator; framing kind `surface-view` with camera/view bounds; capture the surface host canvas instead of `#jgbox`; validator replaces bbox containment with surface checks (non-uniform pixels, camera equals recipe/preset camera, all control points projected inside the frame) and keeps sha/dims/recipe/count checks. Do not touch the board path.
