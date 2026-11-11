# F2b simulation and kinematics registration (families-prep)

## Done
- Rows `prob-simulation` (/bezeg-2.0/probability/simulation) in src/graphs/random/ and `curve-kinematics` (/bezeg-2.0/curve-geometry/kinematics) in src/graphs/curves/kinematics/: registration.ts, collections.ts, runtime.ts, <x>PresetCollection.ts (+ .test.tsx), registrationComposition.test.ts. `lesson: false`. Error mapping as the circle note (not-boolean -> invalid_option for kinematics; no new key); graphState only `initialized`.
- Graph wiring (second generic, presetCollection, defaultPreset, exportPreset, exportPresetData, importPresetData, figurePresetGraphState) in SimulationGraph.tsx and KinematicsGraph.tsx.
- Root spreads: demonstrations.ts, graphLoaders.ts, PresetImport.ts, probe-demonstration-clip-routes.cjs, registrationIntegrity realFamilies. Locale `prob_simulation_*`, `curve_kinematics_*` (sl and en, after the last random_graph_/kinematics_graph_ key). Titles: "Simulacija naključnih poskusov", "Kinematika točke na krivulji".
- Pending lists: POSTER_PENDING, MOTION_PENDING, familyChapters CHAPTER_LINK_PENDING, lessonCatalog, lessonLookup.characterization, PresetCatalog.test (keys), graphTransientStateContract PRESET_DATA_STATE_KEYS.
- Graph fixes from the sweep (SimulationGraph.tsx, KinematicsGraph.tsx): buildScene no longer frames; syncReplacedScene builds a changed scene, then marks the frame key drawn (stored view kept); Simulation initialView is the default scene frame. Kinematics: boardUpdate override calls fullUpdate when any function-valued `visible` result changed (visibilityProbes), else update.
- Markers: Simulation plus marks are stroked curve layers; Kinematics only a stroked hollow square. No change needed.

## Observed failures
- Composition tests: removing the loader and collection spreads failed 2 tests per family (4); restored.
- Sweep before the fix: GraphTransientState.part2 (checkpoint, figure batch) and PresetCatalog failed for prob-simulation (view refit / label count). After the fix those were not rerun.
- New tests failed with the fixes removed: Simulation "restoring a checkpoint taken before another mode keeps the stored view", Kinematics "a switch redraws with fullUpdate..." and "restoring a checkpoint keeps the stored view". The Kinematics "restore shows the trace again" test passed even without fullUpdate (weak).

## Open at the first handoff (resolved in Completion and Fix pass below)
1. KinematicsGraph.test.tsx "disposal removes every owned object..." still fails (54 vs 52 board objects after rebuild; axis ticks added by the frame applied in the rebuild). Fix the test baseline or frame inside the rebuild sync.
2. Re-run the sweep filtered to the two ids (BEZEG_TRANSIENT_STATE=prob-simulation,curve-kinematics just unit src/graphs/base/GraphTransientState.part*) and src/graphs/base/presets/PresetCatalog.test.tsx; both were failing for prob-simulation before the graph fix.
3. A same-mode rows-change restore test for Simulation was dropped (jsdom box readback drifted, not a refit); mount with a view-less non-default Preset is not framed (initialize does not frame).
4. Opening view at 1280x800 and 390x844 (not done; no screenshots). tsc (only error seen: IsometryGraph.test.tsx INITIAL_VIEW_HALF, not mine), just lint, just check-changed, just build, git diff --check not run.
5. Other files in the tree (docs/specs/analytic-lines-lessons.md, src/graphs/lines/LineGeometryGraph*) are changed by someone else.
Logs: .command-logs/f2b-rk-*.log.

## Completion (worker 2)
- Disposal test: cause was `buildScene`/`disposeScene` resetting `drawnFrame`, so every rebuild re-ran `setBoundingBox` and added tick labels (54 vs 52). Removed both resets in KinematicsGraph.tsx (a rebuild keeps the board frame; mount frames through the first sync). The original test is unchanged; passes.
- Restore test: a lesson/checkpoint restore passes without the graph's fullUpdate because BaseGraph already full-updates there and the jsdom renderer re-evaluates `visible` on update(); no jsdom test can fail on it. The guard is "a switch redraws with fullUpdate, a time change does not" (failed with the fix removed, observed). The restore test now compares all element kinds and spies fullUpdate (documents the behaviour, not a guard). fullUpdate runs only when a probed `visible` result changes (visibilityProbes key), not per time step or drag.
- Simulation view: `equalAxisUnits` is false (frames are exact), and `initialize()` frames once (a mount otherwise showed the canvas-aspect box, y +-4 instead of +-0.37; found by the sweep reset test). Kinematics `initialize()` must NOT frame (the reset sweep then fails: mount-framed view differs from showInitialView's fit box).
- Doubt 4: importPreset without boardState frames correctly (tests for both graphs pass, written after the fact and not observed failing: the behaviour was already right).
- Captions (simulationScene.ts): Galton captions moved right of the y axis, path caption under the axis labels; logAxis title under the tick labels (frequency, markov). Both tests failed first.
- Sweep (BEZEG_TRANSIENT_STATE=prob-simulation,curve-kinematics) + PresetCatalog + random + kinematics dirs: pass.
- Open: kinematics figure is small (frame keeps one full arrow of margin plus 0.9 extent on top; cycloid fills about a third of the width at 1280); at 390 px the v/a captions wrap into the next row (KinematicsGraph.tsx caption rows are a fixed 20 px); frequency/markov captions at 390 px sit over the data lines; walk caption "Kje se sprehodi koncajo" is struck by the heap axis. Shots: .command-logs/f2b-rk-shots/.

## Fix pass (handler 8)
- Walk (simulationScene.ts walkScene): the four caption rows (and seed rows) now stand in the top left, left of the heap axis; beside the axis the column is too narrow (English wrapped over the next row at 390 px). Test: "walk captions".
- Frequency and markov: caption rows live in their own band above the plot (CAPTION_ROW 0.11, PLOT_TOP; frame top grows by the rows, +2 with the second seed), the log-axis title at LOG_TITLE_Y -0.17 under the ticks, diff captions and the markov diagram (DIAGRAM_DROP 0.12) moved down below it. Test: "captions on the narrowest board" (pairwise rows >= 15 px at 440 px plot height). Observed before (constants set back): row gap 12.5 px, 14.6 px, title/diff overlap.
- Kinematics (KinematicsGraph.tsx): frameFor top room 0.9 -> CAPTION_ROOM 0.25 of the extent (cycloid fill 0.38 -> about 0.5 of the board width at 850x530; arrow margin unchanged); caption rows add up the lines each takes (captionLines, 7.5 px per character, board.canvasWidth), so a wrapped caption pushes the next down. Tests failed first: fill 0.33 to 0.47, row gap 20 px < 40.
- The simulationScene test for the second plot now expects the frame top above 1.08 (rows above the plot).
- Doubts: the wrap estimate is conservative (an extra blank line below a caption that just fits); fill threshold 0.45 (spiral 0.47); y axis tick labels sit behind the captions at the top left (pre-existing); markov "Stanje A (začetek)" overflows its box at 390 px (pre-existing). English verified in the browser via stored language (first run used the locale only and stayed Slovenian).
- Shots: .command-logs/f2b-rk-fix-shots/ (simulation-N, kinematics-N, seed2-N; sl and en, desk and mob). Logs .command-logs/f2b-rk3-*.log.

## Handler acceptance (handler 8)
- Engineering review (Sonnet): no blocker. Should: this note's partial-handoff lines were stale (relabelled above); `KinematicsGraph.initialize()` deliberately does not frame (`initialView()` is already the frame of the default state). The view-less Preset tests and the kinematics "restore shows the trace" test document behaviour and never failed; they are not regression guards. The guard for the visibility fix is "a switch redraws with fullUpdate, a time change does not".
- Handler run: `just check-changed` passed (whole tree, build included).
- Owed to F3: kinematics captions sit over the y-axis tick labels at the top left (pre-existing); the markov "Stanje A (začetek)" box overflows at 390 px; the browser timings owed by randomness task 03 (first frame at 10^4 and 10^5 trials, phone playback, BigInt vs two halves, SVG vs canvas) and kinematics task 02 (redraw).
