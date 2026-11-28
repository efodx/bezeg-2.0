# Lane L53 notes (solids; owns BaseSurfaceGraph)

## Surface recipe (derived from the Coons pilot, `23422415a` + `34506d720` + `9654e98eb`)

For a `BaseSurfaceGraph` subclass (the 3D surface view; L53 solids, L55, L58):

1. Parity first: a `SAMPLES` entry in `parity.test.tsx` with custom `apply` steps calling the graph's own setters under
   `runAs('learner', ...)` (no arbiter keys exist yet), one or more states per mode; record with `BEZEG_PARITY_ID`.
2. Ids union `<Graph>Ids` exported beside the graph. No `marks`, no `view`, no `followView`: a surface view has no
   `ViewAdapter`, so the view director never runs; the camera (view buttons, azimuth/elevation sliders, reset) stays the
   graph's own `workspaceDisplay()` panel in Orodja, undeclared. Cards rely on placement (task 08 "3D camera").
3. `declaration()`: readout rows from the same values and catalog keys the old panel used (`FunctionReadout` rows), notes
   from the panel's notes, `status` for state sentences, a legend with one entry per drawn role of the surface scene.
4. `drawnObject(id)`: colour from `surface-view/jsxStyles` (`polylineStyle(role).stroke`, `MESH_STYLE.fill`,
   `markerColor(role)`, `cssColor(SURFACE_COLORS.x)`), visible = the scene holds it now `&& !surfaceUnavailable`.
5. `performAction(id)` for switches and choices without an arbiter key (Coons: shown surface, linked corners as board
   pucks; display switches as Orodja actions), run under `runAs('learner')`, throw on unknown id.
6. Parameters (task 08 addition, Coons had none): a stored value a lesson asks the learner to set gets an arbiter key via
   `parameterBindings()` (read the state, apply = the panel's setter, refuse with `DomainError(message(...))`) and a
   `placement: 'board'` declaration; the Orodja control is wrapped in `PuckOwned`/`PuckOwnedGroup` so it disappears
   while the puck exists. Setup stays in Orodja undeclared.
7. The old readout panel is wrapped in `data-declared-panel` (hidden while the cards show).
8. Declaration test `<Id>Graph.declaration.test.tsx` with `mountGraph` + `surfaceViewOf(graph).last` to check each legend
   entry's visibility against the scene the fake surface view was given.
9. No base change was needed for Coons (`BaseSurfaceGraph` untouched).

## Progress — session 1 PARTIAL (budget HANDOFF at ~177k), started 05:20

### Done
- Parity recorded first: `SAMPLES` entry `solids` in `parity.test.tsx` (after patch-coons; 11 cumulative states over all four modes,
  setters under `runAs('learner')`), new `src/graphs/solids/__parity__/solids.json` (`.command-logs/l53-parity-rec.log`).
- New `src/graphs/solids/solidsDeclaration.ts`: arbiter keys (`solids-offset`, `solids-normal-x|y|z`, `solids-shear`, `solids-cursor`,
  `solids-discs`, `solids-axis`), action `pyramids`, `SolidsIds`, `captionKeys`/`approximate`/`meshNoteKey` (moved from the panel),
  `solidsReadoutDeclaration` (rows/notes = old panel, same keys and rounding), `solidsLegend` (one entry per "Kaj vidiš" caption, the
  caption's own words), `solidsDrawnObject` (colour from `jsxStyles`, visibility from the drawing's scene).
- `SolidsGraph.tsx`: `parameterBindings` (display units, snaps to the stored grid; zero normal, failing-pair shear, sphere y-axis
  refused with `DomainError(message(...))`), `solidsParameters()` per mode, `declaration()` (no marks/view: surface recipe),
  `performAction('pyramids')`, `drawnObject`. BaseSurfaceGraph NOT changed (not needed).
- `SolidsPanels.tsx`: sliders/select/switch in `PuckOwned`, groups in `PuckOwnedGroup`; failing-pair shear reason moved above the stack
  group (stays visible); readout + captions in `data-declared-panel`.
- Fragment `src/localization/fragments/solids.ts` (4 keys `solids_decl_*`), registered in `fragments/index.ts` (import + 3 spreads).
- Parity check PASS (`BEZEG_PARITY_CHECK=1 BEZEG_PARITY_ID=solids`, 8 tests). tsc clean for my files after the cast fix (rerun needed).
- `SolidsLifecycle.test.tsx`: line 51 wrapped in `runAs('learner')` (not yet rerun).

### Placement judgements
- Pucks: section offset `d` + normal components n1..n3 (SV1 tilt/argument, SV2 ask to set them); stack shear (omitted for the
  cone/cylinder pair), slice height, slabs (SV3); volume switch "Tri piramide" (SV4 split, cube only, else omitted so no locked puck);
  revolve axis choice puck (SV5 axis; omitted for the sphere, select stays in Orodja with its reason) and discs (SV4/SV5).
- Orodja: mode and solid choice (setup; volume has 8 solids > 4), camera (surface recipe).

### Not done / next
1. `SolidsLessonActions.host.test.tsx` (4 fail, `.command-logs/l53-unit1.log`): wrap direct setter calls at ~lines 103, 151, 242 in
   `runAs('learner')`; the pyramids test looks up label "Razreži kocko na tri piramide" — check why it is gone (likely the
   `PuckOwnedGroup`/render path, or the test mounts the workspace so the switch became the puck: then use the puck).
2. `solidsVolumesGuidedLessons.test.ts` SV3 + SV4 "named controls exist in the rendered page" (4 fail): the prompts name
   "Višina primerjane rezine" / "Razreži kocko na tri piramide"; decide: update the test's page lookup to pucks, or update prose to
   the puck names ("s krmilnikom Višina rezine", "krmilnik Tri piramide") as the CLT lane did; en in lockstep.
3. Declaration test `src/graphs/solids/SolidsGraph.declaration.test.tsx` (copy `PatchCoonsGraph.declaration.test.tsx`; states per
   mode; legend visible vs `surfaceViewOf(graph).last`; snap test: write 0.3 to `solids-offset` reads 0.25; refusals) + break once.
4. Lesson frames (legacy `step(...)` builders in the three lesson files: add optional `declare` to StepContent and frames).
5. Checks: graph-check solids --route (see `runtime.ts`), golden, own tests + declarationContract, FirstTask, preset round trip,
   `src/graphs/patches` (base untouched, so only if base edited), lint, tsc, shots 1440x900/1280x720, build, smoke-lesson.

## Session 2

- Prose (handler decision): SV3/SV4 name pucks as seen: "krmilnik Višina rezine" / "the Slice height control", "krmilnik Tri piramide" /
  "the Three pyramids control" (mechanical-curves "krmilnik Pokaži cikloido", CLT "the Copies control"); every "drsnik"/"slider" in the
  three lessons became "krmilnik"/"control". Lesson test looks up `solids_decl_cursor_name` / `solids_decl_pyramids_name`.
- Host test: setter calls under `runAs('learner')`; the pyramids case clicks the puck (`waitForPucks` + `puckControl`).
- SolidsGraph.test.tsx (17 failing, not in session 1's list): `learn()` helper for setter/setState/import; panel-slider block
  rewritten as puck tests (keyboard steps, typed snap 1,4 -> 1 and 0,3 -> 0,25, range refusals, zero-normal reason).
- New `SolidsGraph.declaration.test.tsx` (16 tests): green; red observed once (pyramids visibility broken, 2 fail), reverted.
- solids dir: 6 files / 120 tests pass (`.command-logs/l53-s2-unit3.log`).
- Lesson frames: `declare` on StepContent + `frameDeclarer<SolidsIds>()` in the three lesson files (observation frames; highlights
  present at open, `uses` = pucks; sv4-split uses `pyramids` only since its rows appear after the switch; sv5-solid,
  sv4-square-pyramid no declare). declarationContract `-t solids` PASS; red seen once (seeded `pyramid-0` on sv4-split), reverted.
- tsc clean (`.command-logs/l53-s2-tsc.log`); eslint clean on 12 changed files (`.command-logs/l53-s2-eslint.log`).

### Session 2 PARTIAL (HANDOFF at 175k)
- Unverified: broad `just unit src/graphs/solids src/graphs/patches src/learning/content src/localization src/graphs/base`
  was running at handoff -> `.command-logs/l53-s2-unit-broad.log` (read its `unit:` line and the referenced log for FAIL).
- Next: graph-check solids --route /analysis/solids; golden (`BEZEG_PARITY_GOLDEN_CHECK=1 just unit
  src/graphs/base/declare/parityGolden.test.tsx -t solids`, per-state diff, never re-record); `just unit FirstTask`; preset round
  trip `-t solids`; `just build`; `just smoke-lesson solids --port 4391 --workers=1` (only smoke row is `solids`; SV2..SV5 have
  none); per-step shots 1440x900/1280x720 for the 5 solids lessons (SV2 `?example=lesson.solids.pyramid-sections.solids`).
- Scratch to delete by name: `.command-logs/l53-prose.cjs`, `l53-splice.cjs`, `l53-pucktests.txt`, `l53-frames.cjs`.

## Session 3
- Prose: every krmilnik/control in the three solids lesson files names a puck (offset, shear, slice height, slab/disc count, Three pyramids); no sentence names camera or setup sliders, so nothing restored.
- PASS: broad unit (.command-logs/l53-s3-unit-broad.log), graph-check solids --route /analysis/solids (l53-s3-gc.log), golden check solids 1 passed (no diff), preset round trip -t solids (l53-s3-rt.log), build (l53-s3-build.log), smoke-lesson solids (l53-s3-smoke.log), FirstTask after fixing AnalysisFirstTask.test.tsx (solids section-mode test expected the offset slider in Edit; now asserts it is a puck, not in Edit) (l53-s3-first.log).
- Shots: 1440x900 and 1280x720 for all 5 solids lessons (SV1 13 frames, SV2 13, SV3 10, SV4 12, SV5 12), in .command-logs/shots-l53/ (sheets reviewed): no "Prizora ni mogoče pripraviti", solid visible, pucks readable.
- Scratch scripts deleted.
