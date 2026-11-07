# fineGrid via preset: stopped, route not viable

Status: no files changed. Nothing captured.

Findings (observed with a throwaway playwright script on port 4319, orientation example):
- After the example opens and "Skrij" is pressed, the workspace is still `lessonActive` (lessonOpen stays true in explore mode). The preset
  Save button (`button.preset-save`) is `disabled`; PresetSelector disables reset, save, delete and import while `lessonActive`
  (`src/graphs/base/PresetSelector.tsx:236-244`, `DemonstrationWorkspace.tsx:134`). So the Save/Import route cannot run on the example scene.
- Closing the lesson calls `session.close({restoreCompleted: true})`, which restores the pre-lesson checkpoint (`GuidedLesson.tsx:100,421`), so the
  example scene (overlays, selection, lesson camera) is lost, which is what the preset would have had to carry.
- A preset does carry: `data` (model: mode, points, closed, gridStepExponent), `graphState` (saved base state without model), `boardState`
  (bounding box). It would very likely carry overlays and the camera; it does not carry transient state (selection, add mode). Not tested
  beyond the disabled button.
- No inspector control changes `gridStepExponent` (PointSetGraph.tsx only reads it; lines 202, 562, 581).

Alternatives (need a handler decision):
1. Build the scene on the plain demonstration route (no ?example) by UI, save/import a preset with fine grid. Not the lesson's example scene, so
   poster/first-frame checks no longer describe the example; high drift risk.
2. Allow presets in explore mode or add a row-only hook (src change, forbidden here).
3. Add a lesson scene action or example state with a finer grid (lesson edit, changes lesson meaning "Korak mreže: 1").
4. Accept hopping for point-set rows and make the row motion `discrete-exact-steps`-like for grid drags (a schedule on grid targets; changes the checks).

## Second assignment (capture-only fine-grid hook): PARTIAL, stopped on budget

Done and observed:
- `src/compgeo/pointSetModel.ts`: `rescaleToFinerGrid` (pure; same object back when not finer, invalid, or out of range). Tests in `pointSetModel.test.ts`; failure seen with the guard broken.
- `src/graphs/compgeo/PointSetGraph.tsx`: `clipGridStepExponent()` (the one read site of `window.__bezegClipGridStepExponent`), used in `dragPoint` (rescale on first drag), in `dragPoint`/`syncScene` (point stays under the pointer when the model is on the clip grid; without this `syncScene` snapped it back), and a point `up` handler that clears the selection only when the global is set (without it the last frame kept the selection ring and the loop did not close). Sites left: `PointInPolygonGraph.dragQuery` (query point, not a model point, no clip needs it), Orientation/PolygonArea lines (drawing only, no snapping).
- Host tests in `PointSetGraph.host.test.tsx` (global set: rescale, smooth board point, up clears selection; absent: existing snap test plus up keeps selection); failure seen once with the guard removed.
- Schema: optional `fineGrid` (-8..-1, pointer-drag board point) + tests; rows orientation, polygon-area, triangle-centres, euler-line carry `fineGrid: -8`. Driver sets the global with `addInitScript`; the schedule stays RAW (the offline validator in demonstration-preview-motion.cjs requires target == pathAt, so no snapped schedule).
- `_examples.cjs` (not in the owned list; deviation): readiness now also accepts `segment`, since euler-line/triangle-centres scenes have no curve or line and timed out.
- `just typecheck`, lint, tooling-test passed earlier (before the last src and driver edits; rerun needed). Item 3 observed: orientation without fineGrid failed the state check (0.6004 at frame 38); field restored.
- orientation captured and passed (about 26 s). Contact sheet, bytes, crf not read.

Open: polygon-area (and likely euler-line, triangle-centres) fail the offline check `the point is not under the pointer` (1e-6, demonstration-preview-motion.cjs:1388, not editable). Cause: mouse coordinates are float32, giving up to about 1.3e-6 board units of error on a 30 px/unit board; the point tracks the pointer, the pointer lattice is the limit. `refinePointer` in `_driver.cjs` (closed loop nudging) does NOT fix it (errors stay 1e-6 to 1.9e-6, the lattice spacing); remove it or replace it. Ideas: choose pointer pixels so the board point is within 1e-6 by searching float32 neighbours in both axes, or the handler decides on a 1e-6 limit change in the validator.
Not run: euler-line, triangle-centres, polygon-area captures passing, contact sheets, README, `just typecheck`/lint/build after final edits (the preview on 4319 serves a build made after the last src edit; no src edit since).
Capture output: orientation changed manifest/assets; check `git status` and manifest diff.

## Third assignment (pixel pointer tolerance): orientation and polygon-area done; euler-line and triangle-centres stopped

- `boardDragTolerance(motion)` in `scripts/demonstration-clip-rows/_driver.cjs` (0.001 CSS px in board units: camera width / (motion.width / 2)); used at `scripts/demonstration-preview-motion.cjs:1381`. `refinePointer` and its call removed; polygon-area passes without it.
- Proof the tolerance bites: `_rows.test.cjs` ("a board drag may sit one thousandth of a CSS pixel...") accepts a 0.0005 px offset of `actual.x` at frame 40 and rejects 0.01 px with "the point is not under the pointer at frame 40".
- `_examples.cjs` `segment` readiness: euler-line/triangle-centres example scenes hold no curve or line, so the readiness wait timed out; a segment now counts as a drawn scene.
- euler-line and triangle-centres fail before the drag, in the recipe poster evidence (`scripts/demonstration-preview-recipes.cjs:379` and `:409`): the example scene shows only P1-P3, H/G/O (euler-line lacks N, midpoints, feet), so the poster expects points the example scene does not draw. Not a pointer failure; no check weakened. Needs a handler decision (poster recipe vs example scene).
- orientation 222184 B crf 10; polygon-area 230072 B crf 10. Manifest `motions` and `captures` differ from HEAD only for those two ids. `src/demonstrationMotionPending.ts`: both removed (inscribed-angle was not listed).
