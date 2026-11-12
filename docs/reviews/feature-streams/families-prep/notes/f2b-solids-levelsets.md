# F2b solids and level sets registration (families-prep) - PARTIAL, handoff at the budget signal

## Done
- Rows (all `lesson: false`, keys = ids), analysis family after `logistic-map`: `solids` (/bezeg-2.0/analysis/solids, `view: 'surface'`), `contour-map` (/analysis/contours), `linear-program` (/analysis/linear-program). Files: src/graphs/solids/{registration,collections,runtime}.ts and src/graphs/levelsets/{registration,collections,runtime}.ts; composition tests in both dirs (with placement tests). Spec/ADR fixed no route or family; decision recorded as "F2b decisions" in both specs.
- Preset collections reused (solidsPresetCollection, contourPresetCollection, lpPresetCollection; `check` delegates to the model parsers). `CONTOUR_PRESET_KEY` changed `contour` -> `contour-map` (key = id; no stored Presets existed).
- Root spreads: demonstrations.ts, graphLoaders.ts, PresetImport.ts, probe script, registrationIntegrity realFamilies (after dynamics). Pending lists: POSTER_PENDING, MOTION_PENDING (3 lines), lessonCatalog.test, familyChapters.test, lessonLookup.characterization.test, PresetCatalog keys, PRESET_DATA_STATE_KEYS, demonstrations.test.ts (surface list now includes `solids`).
- Locale keys `solids_*`, `contour_map_*`, `linear_program_*` (title, prompt) after logistic_map_prompt in sl.ts/en.ts.
- Framing in ContourMapGraph and LinearProgramGraph: buildScene no longer frames or resets the key; initialize() resets and frames once; syncReplacedScene builds then marks the key; importPreset override + keepImportedView marks the imported data's view. New src/graphs/levelsets/levelSetsPresetFile.test.tsx (4 tests). Observed failing before the fix: .command-logs/f2b-sl-view1.log (stored view replaced for contour and LP); pass after (view3).
- Test harness (needed so the sweep can change these scenes): realGraphTestHarness.tsx createGraph gives `solids` a fake surface view; realGraphScenes.ts perturbModel cases for the three ids.
- Docs: F2b decisions, done lines (solids/04, level-sets/05), rows 8 and 10 of families-prep.md.

## Checks observed
- tsc --noEmit: 0 errors (after the harness edit).
- Sweep BEZEG_TRANSIENT_STATE and BEZEG_PRESET_ROUNDTRIP = three ids: passed (.command-logs/f2b-sl-sweep2.log; the first run f2b-sl-sweep.log failed 18 tests until the harness cases and PRESET_DATA_STATE_KEYS were added).
- Targeted unit run (levelsets, solids, registrationIntegrity, presets, lesson lists, demonstrations): one failure (surface list in demonstrations.test.ts), fixed; not rerun.

## Not done
- Rerun of targeted unit after the last edits; `just lint`; `just build`; `git diff --check`; `just check-changed` (not started).
- Negative runs for the composition tests, placement tests, registrationIntegrity entries (not observed failing).
- The solids stored-camera import test (solids keeps the camera in `data`; not written).
- Visibility (`fullUpdate` for function-valued `visible`) review of contour/LP; captions, markers review.
- Opening-view shots (12) and overlap fixes; no build/preview done.
- The contour sweep "Preset export" check passes with PRESET_DATA_STATE_KEYS lists I wrote; solids list includes `camera` (unverified that it is needed).

## Completion (worker 2)
- Targeted unit rerun with BEZEG_TRANSIENT_STATE/BEZEG_PRESET_ROUNDTRIP = three ids: 31 files passed, 759 tests (.command-logs/f2b-sl2-unit1.log).
- `camera` in the solids PRESET_DATA_STATE_KEYS entry: not needed. Removed; sweep passed without it (.command-logs/f2b-sl2-nocam.log). The contour-map `camera` entry was not tested.
- Solids: new test "keeps the stored camera when a Preset file with non-default data is imported" (SolidsGraph.test.tsx, Preset). The graph needed no fix; with the import line forced to the default camera the test fails (f2b-sl2-cam-neg.log), restored byte-identically.
- Negative runs, all observed failing and restored: composition (PresetImport spread, f2b-sl2-neg-composition.log), placement (rows swapped in demonstrations.ts, neg-placement.log), realFamilies entry (neg-realfam.log), levelsets loaders spread (neg-levelsets.log).
- Visibility: JSXGraph `board.update()` re-evaluates function-valued `visible`; guard tests (levelSetsPresetFile.test.tsx, "drawn at once") show contour modes and the LP region changes commit the same curves as a following `fullUpdate()`. No graph change needed. Not observed failing (no mutation found that reproduces a stale hidden curve). Markers: stroke-only "[]" and "x" stroke in the label colour; fine.
- Captions: the legend rows of both graphs stacked at a fixed 20 px and ran into each other when a row wrapped at 390 px (shot lp-en-mob). New `src/graphs/levelsets/legendLines.ts` (6.2 px a character, measured) and `legendRowOffset` used by both legends; tests "the legend on a narrow board" fail (3 of 4 variants) with the old fixed stacking (f2b-sl2-legend-neg.log).
- Shots: .command-logs/f2b-sl2-shots/ (12, script shots.cjs, preview port 4361, stopped; shots taken before the 7.5 to 6.2 px constant change). Clean: solids (4), contour desktop (2). Not fixed: LP opening view (drawn square -10..VIEW_HIGH by design, lpScene.ts viewBox) leaves the small feasible region in a corner and the 8 legend rows run over constraint lines and labels (desktop) and over the region (390 px); contour at 390 px, legend crosses the circle and the Probe label; solids plane is cropped at the lower edge (surface view, out of scope).
- Checks: tsc 0 errors; just lint passed; just build passed; git diff --check clean; check-changed log f2b-sl2-check-changed.log.
