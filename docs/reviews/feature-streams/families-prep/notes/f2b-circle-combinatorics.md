# F2b circle construction and combinatorics registration (families-prep)

## Evidence
- Rows: `circle-construction` (/bezeg-2.0/circle-constructions, plane-geometry) in src/graphs/compgeo/circleConstruction/registration.ts (own subdirectory, `compgeo` is legacy-registered; graph file not moved); `lattice-paths` (/bezeg-2.0/combinatorics/lattice-paths) and `counting-tree` (/bezeg-2.0/combinatorics/counting), new catalog family `combinatorics`, in src/graphs/combinatorics/registration.ts. No id or path existed. All `lesson: false`.
- New per family: registration.ts, collections.ts, runtime.ts, a Preset collection file with test (circleConstructionPresetCollection, combinatoricsPresetCollection), registrationComposition.test.ts. Keys equal ids; `check` delegates to parseCircleConstructionState / parseLatticeState / parseCountingState; `graphState` is only `initialized`. Error mapping: not-an-object -> invalid_state, not-boolean -> invalid_option, others invalid_value (names the field); no new key.
- Graph wiring as UnitCircleGraph/LineGeometryGraph (second generic, presetCollection, defaultPreset, exportPreset, exportPresetData, importPresetData, figurePresetGraphState) in CircleConstructionGraph, LatticePathGraph, CountingTreeGraph.
- Root spreads: src/demonstrations.ts (imports, `definitions`, family entry after probability), src/graphs/graphLoaders.ts, PresetImport.ts, scripts/probe-demonstration-clip-routes.cjs, registrationIntegrity.test.ts realFamilies.
- Locale: family key `combinatorics` (no earlier key of that name) after `probability_and_statistics`; `circle_construction_title/_prompt` after `circle_construction_readout_distance2`; `combinatorics_lattice_title/_prompt`, `combinatorics_counting_title/_prompt` after `combinatorics_counting_cap_multiset`; sl.ts and en.ts at matching positions.
- Pending lists extended: POSTER_PENDING, MOTION_PENDING, CHAPTER_LINK_PENDING, triangleGeometryChapter.test.ts (circle-construction not linked), lessonCatalog.test.ts, lessonLookup.characterization.test.ts, PresetCatalog.test.tsx, graphTransientStateContract.tsx PRESET_DATA_STATE_KEYS, demonstrations.test.ts family id/title lists, LearningPage.test.tsx FAMILY_CHAPTER_PENDING = ['combinatorics'] (existing mechanism; found by check-changed).
- Sweep: GraphTransientState parts filtered to the three ids: 24 tests passed, no graph defect, no perturbModel change needed.
- Markers: combinatorics graphs use only filled faces ("o", "square"); no cross or plus marker. CircleConstruction already fixed in 680dbc37.
- Observed failures: removing `...circleConstructionGraphLoaders` from graphLoaders.ts and `...combinatoricsCollections` from PresetImport.ts failed one composition test each; restored (cmp identical).

## Opening view (1280x800, board 848x528 px)
| Route | Board box | Default figure | Verdict |
| --- | --- | --- | --- |
| circle-constructions | -13.83, 11.1, 21.83, -11.1 | x -5..13, y -6.5..6.5 | fills about half the width and height; fine |
| combinatorics/lattice-paths | -16.45, 27.62, 36.45, -5.32 | grid 0..5 by 0..3 | small, about 10% of width, 10% of height; the board is aspect-widened |
| combinatorics/counting | -14.75, 27.65, 38.75, -5.65 | no points; text table x 1..20, y 3..25 | table overlaps itself: "Variacije s ponavljanjem" runs into the formula column, last row formula overlaps the count |
Screenshots and script: .command-logs/f2b-cc-shots/. Views not changed. Counting-table label overlap is a F3 candidate.

## Checks
Observed: tsc exit 0; targeted `just unit` (20 files, 661 tests) passed; sweep filtered passed; lint passed; `just check-changed` (491 files) had one failure, LearningPage.test.tsx (combinatorics family without chapter), fixed with FAMILY_CHAPTER_PENDING and that file rerun passed; `just build` passed after the fix (warnings in log, not inspected); `git diff --check` clean; preview served and stopped. Not rerun: the full `just check-changed` after the LearningPage fix, lint of LearningPage.test.tsx, tsc after that edit. Not done: browser smoke beyond the opening view.

## Handoff
Complete apart from the unrerun items above. Logs: .command-logs/f2b-cc-*.log.

## Fix pass
- Counting table (CountingTreeGraph.tsx): the three fixed-x columns are gone. Each row is two single-text lines, the kind name and "formula = count", so no label can run into another column in either language; the long note and title wrap into lines of at most 38 / 34 characters (wrapWords); fonts 12-13 so the stack fits the 390 px board (about 9 px per unit). The Kind/Formula/Count header captions are no longer drawn (their locale keys stay, unused). The legend moved (4, or -2 with the grouped-orderings panel). The graph now starts with the axes off (AxisSelect.NONE in the constructor; the user can switch them on): none of its scenes is a coordinate plane. The text stays board text (DOM); no HTML table added.
- Lattice paths (LatticePathGraph.tsx): initialView is now pathsBox of the default target, and frameBoard (same pattern as the triangle solver) refits only when the frame key (grid size in paths, "fixed" in the other views) changes; not while dragging, and a drag that ends outside the box refits once on "up". A replacement keeps its stored view. The three captions are now relative to the target row (b + 3.4 / 2.4 / 1.4) and start at x 0.3, right of the y axis.
- Tests: CountingTreeGraph.test.tsx (overlap boxes at 9 px per unit, sl and en; width; axes off) failed 4 before the fix, LatticePathGraph.test.tsx (fill share, larger grid refit, fixed box restore, no refit while dragging) failed 2 before; both pass. Older table assertions adapted (row y, note joined from lines).
- Screenshots .command-logs/f2b-cc-fix-shots/ (1280x800 and 390x844, sl and en): both routes legible, grid fills about a quarter of the board. Not verified: the grouped-orderings panel (combinations, k 2..4) at 390 px, where its 0.62-unit row step is tight (pre-existing).

## Handler review repairs (handler 7)

- Engineering review (Sonnet): no blocker. Should 1 fixed by the handler: `LatticePathGraph.syncReplacedScene` marked the view framed before a view switch rebuilt the scene, and the build cleared the mark, so restoring a checkpoint taken in another view refitted over the stored view. The scene is now built first; test "restoring a checkpoint taken in another view keeps the stored view instead of refitting" failed before the fix (box refitted to about [-5.06, 8.38, 12.56, ...]) and passes after.
- Should 2 left as a doubt: `dragging` is cleared only on the point's "up" (or a rebuild). If a cancelled touch ever skipped "up", later grid-size changes would not refit until the next drag ended. JSXGraph ends a drag on pointer cancel through the same up path; no failing case was found, and a board-mode guard would break the jsdom drag test. Revisit if F3 smoke shows a stuck view.
- Nits kept: the " = " joiner between formula and exact count is mathematical notation, not prose; the status reads only the current row (as before the fix).
- Removed the three `combinatorics_counting_cap_table_*` keys the table rewrite left unused (typecheck passed).
