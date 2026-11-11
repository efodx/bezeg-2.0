# Test redundancy inventory (origin/master dc746cff, read-only research; line numbers from that checkout)

Method: header/describe read of the shared tests, then grep of per-Demonstration tests (src/graphs, src/learning) by name patterns (arrow/Page/Escape/Enter/blur, reset, clamp/refus, round trip, aria-disabled/unavailable, live region, hit zone). Only matching blocks were read. About 1240 test names matched broad patterns; most are pure-model maths (src/analysis, *Model.test.ts), which are KEEP and not listed.

## 1. Shared / all-graph coverage

| File | Guarantees |
|---|---|
| src/inputs/sharedControlBehaviour.tsx | Test-only helper: one contract per control kind (placement, limit at bound, refusal in both languages, commit on Enter/blur, Escape revert, Arrow/Shift/Page keymap, Home/End inert, Reset restores value and clears refusal). |
| src/inputs/sharedControls.behaviour.test.tsx | That contract on the bare NumberInput, Slider, CountSetter, PointListInput, PointCollection. |
| src/graphs/base/sharedControls.graphs.test.tsx | The same contract on real graphs through the real host: only TWO graphs per control kind, plus 3 curve-workspace wiring tests (:123, :135, :145). Not a sweep. |
| src/inputs/*.test.tsx (NumberInput, Slider, AngleSlider, CountSetter, ChoiceSelect, BooleanField, PointListInput, RefusalChannel, ResetExampleButton, UnavailableButton, RevealButton, ControlRow.test.ts) | Per control: label/aria, clamp/step/grid, refusal channel as polite status region, aria-disabled-with-reason button stays focusable and runs nothing, Reset-example button disabled at the example. |
| src/graphs/PresetRoundTrip.contract.test.tsx | Every graph with a Preset collection (catalog plus 3 unrouted): own exported Preset passes own check, imports back through selectPreset ("full" and data-only "bare"), Reset returns the same data. MOUNT-DEFAULT data only (4 graphs moved off default via `changes`). Sampled locally, all in CI. |
| src/graphs/ExportPausesPlayback.test.tsx | Listed graphs overriding pausePlayback stop playback in beforeFigureCapture (listed graphs, not a catalog loop). |
| src/graphs/base/graphTransientStateContract.tsx and GraphTransientState.part1-4/.test.tsx | Every Demonstration: change, capture, change, restore through each scene-replacement path; Preset data, scene state, transient state, adapters, board, inspector controls equal after restore. Sampled locally, full in CI. |
| src/graphs/registrationIntegrity.test.ts, graphCollectionIdentity.test.ts, src/graphs/base/presets/PresetCatalog.test.tsx | Registration completeness/uniqueness; every Demonstration with Presets uses a file-importable definition. |
| src/graphs/base/sceneReplacementContract.test.tsx, lessonFixtureScene.test.tsx, src/learning/content/sceneContentAgainstGraphs.test.tsx, guidedExampleScenes.test.tsx | Scene replacement / lesson scenes against real graphs (catalog loops). |
| src/graphs/styles/RenderedPointRoles.test.ts, PointStyles.test.ts, GraphPalette.test.ts | Rendered appearance contracts (not read in detail; not control related). |
| eslint.config.mjs controlExemptions | Raw input/select/textarea/Form.Control|Range|Select|Check forbidden in graph code; only PresetImportDialog.tsx and PresetSelector.tsx exempt. Guarantees graphs USE shared controls, not that they pass correct props. |

Key limit: the shared behaviour sweep covers 2 graphs per kind. A per-graph test that a graph passes the right min/max/step to a shared control is not implied by any sweep, so it is KEEP.

## 2. Candidate rows

Verdicts: DELETE (fully implied), CONSOLIDATE (same assertion repeated across graphs; one table/helper; no sweep implies it), KEEP.

### DELETE (or trim)
| Test | Asserts | Shared guarantee | Verdict |
|---|---|---|---|
| src/graphs/curves/bezier/CurvatureBezierCurveGraph.test.ts:261 "preset round trip through the collection check keeps the data" | default preset through JSON and collection.check equals preset | src/graphs/PresetRoundTrip.contract.test.tsx (default data checked, imported, reset) | DELETE the first 4 lines; keep the last two asserts (collection identity, one rejection). 1 test. |
| src/graphs/curves/parametric/parametricCatalogue.test.ts:114 "default Preset round trips through JSON and the check" | default Preset through JSON and check | same | LIKELY DELETE, NOT READ; confirm it uses the graph default. 1 test. |

### CONSOLIDATE
| Group (N tests) | Where | Proposal |
|---|---|---|
| Handle touch hit zone, at least 44 px across, narrower mouse zone (8) | src/graphs/combinatorics/LatticePathGraph.test.tsx:412, compgeo/CircleConstructionGraph.test.tsx:317, isometry/IsometryGraph.test.tsx:391, lines/LineGeometryGraph.test.tsx:376, trig/TriangleSolverGraph.test.tsx:228, trig/UnitCircleGraph.test.tsx:255, mechanics/DescentGraph.test.tsx:397, dynamics/PhasePortraitGraph.test.tsx:313 | One helper `expectHandleHitZones(graph, handles)`, or a sweep over every handle of every graph. Nothing implies it today. |
| Board arrow key moves the selected point one grid step, no selection does nothing (about 10) | src/graphs/compgeo/CurvePairGraph.host.test.tsx:104, FortuneGraph.host:592, DegenerateSitesGraph.host:271, PointInPolygonGraph.host:211, PointSetGraph.host:130; projective/CrossRatioGraph.host:94, FivePointGraph.host:73, PascalGraph.host:167, PolePolarGraph.host:110, ThreeViewsGraph.host:64 | pointKeys.test.ts only tests the key map. A shared selected-point key behaviour helper (like sharedControlBehaviour) taking the step and Ctrl/Shift rules leaves each graph one table row. |
| Focused control that becomes unavailable keeps focus, aria-disabled never disabled, click does nothing (3 identical, 3 near) | src/graphs/functions/BisectionGraph.host.test.tsx:116, FixedPointGraph.host:152, SequenceGraph.host:148; near: compgeo/FortuneGraph.host:231, BezierClippingControls.host:135, BezierHullsControls.host:89 | The generic half is src/inputs/UnavailableButton.test.tsx:6. Parametrise the three identical bodies; keep the end-of-trace condition as graph wiring. |
| Live region carries status only; an arrow step announces just the position (3) | projective/CrossRatioGraph.host:172, PascalGraph.host:324, PolePolarGraph.host:228 | One table. RefusalChannel.test.tsx:23 covers the refusal region only. |
| Selecting a handle from the inspector moves focus to the board (3) | projective/CrossRatioGraph.host:197, PascalGraph.host:346, PolePolarGraph.host:251 | One table. |
| Typed value outside range or fractional is refused, not clamped (7) | combinatorics/CountingTreeGraph.test.tsx:397, :421, :668; LatticePathGraph.test.tsx:371, :570; projective/FivePointGraph.host:251; isometry/IsometryGraph.test.tsx:511 | Generic refusal is sharedControlBehaviour "refusal". Per graph only the ranges are graph-specific: reduce to a (field, min, max) table; drop generic behaviour assertions inside. |
| Reset unavailable at origin, available after edit, unavailable again (6) | curves/bspline/BSplineExtractionGraph.test.tsx:311, BSplineInsertionGraph:340, BSplineNurbsGraph:204; curves/kinematics/KinematicsGraph.test.tsx:238; dynamics/PhasePortraitGraph.test.tsx:587; curves/bezier/DecasteljauAnimationControls.test.tsx:36 | The aria-disabled half is src/inputs/ResetExampleButton.test.tsx:12; the "differs from example" predicate is graph logic, so keep one assertion each, in one table. |

### KEEP (examined, not implied)
- Arrow/Page step values per field: CountingTreeGraph:447, LatticePathGraph:393, CircleConstructionGraph:296, IsometryGraph:370, LineGeometryGraph:349, TriangleSolverGraph:202, UnitCircleGraph:225, SimulationGraph:239 (seed, Escape), SolidsGraph:148, FourierCoefficientsGraph.host:115, EpicycleGraph.host:218, BSplineBasisGraph:295, InscribedAngle and SimsonLine host (t field plus arrows), FivePoint:107 and PolePolar:126 ("wiring: an arrow in a point field steps by one grid unit"). They prove the step/Shift/Page values each graph hands to the shared control; sharedControls.graphs covers only 2 graphs per kind. Could become a (graph, field, step, big step) table; no deletion.
- Preset tests with NON-default data (the sweep is default-only): HermiteGraphReal:323, InterpolationGraphReal:140, ParametricCurveGraph:67, ComplexRoots/Reciprocal/Multiplication (:377/:405/:557), UniformConvergence:510, LeastSquares:272, RungeInterpolation:207, DensityArea:242, LinearProgram:200, BezierClipping:197, BezierHulls:109, Delaunay:304, EarClipping:325, HullTrace:201, PointSetIntervals:205, PointSetSegments:203, Triangulation:415, Voronoi:594, EulerCircle:378, DegenerateSites:305, batch2PresetCollections:51, Kinematics:525, BSplineBlossom:312, SubdivisionCurve:416. They also test stale-step clamping and collection validation messages, which the sweep does not. Only the "export equals import" lines could be trimmed.
- "a multi-action lesson scene runs in one synchronous sequence" (5 function graphs): required by AGENTS.md, graph specific.
- Reset restores default: GraphPresetsAndDisplay.test.tsx:89, GraphSceneReload.test.tsx:42/66, PartialPresetDefaults.test.tsx:160/210/222/234 (host mechanics and chosen-example Reset, beyond the sweep).
- PlaybackButtons.test.tsx, PatchPointEditor.test.tsx, TensorPatchPanels.test.tsx:85, PointSet.sharedControls.test.tsx, all src/analysis/*Model tests.
- Not touched: src/learning/content/lessonMathNotation.test.ts.

## 3. Totals and time
- DELETE: 1 confirmed, 1 likely and unread (2).
- CONSOLIDATE: about 43 tests in 7 groups; they reduce to about 7 helper/table tests plus one row per graph. This saves repeated mount cost and maintenance, not coverage.
- KEEP: about 60 listed, plus all unexamined.
- Timing: the only full local log (.command-logs/2026-11-07T11-10-35-946Z-11272-2b1cfca3.log) gives totals only (612 files, 12071 tests, 1817 s, 3 workers). CI shard 1 of 4 (ci-42997099435.log) lists per-file times but none of the candidate files are in it. No per-test durations, so counts only. A guess of 0.3-1 s per real-graph test puts the CONSOLIDATE savings at roughly 10-30 s of 1800 s; unmeasured.

## Not yet covered / uncertain
- parametricCatalogue:114 and most host test bodies were not read; "implied" judgements for arrow-key and live-region tests rest on names and on pointKeys.test.ts being a key-map test.
- Rendered appearance contracts, the 195 unmount/dispose tests and 84 language-switch tests in src/graphs, and non-graph src/learning tests were not assessed.

## Slice 4 assessment (2026-11-11)

Part A done: `src/graphs/base/typedRefusalBehaviour.ts` (`expectTypedRefusals`: one row per field with min, max, whole, optional edit path; drives max+1, min-1 and a fraction through the edit path, and checks nothing is stored or clamped) now replaces the ad hoc out-of-range lines in CountingTreeGraph (2 tests), LatticePathGraph (1), FivePointGraph.host (1) and IsometryGraph (1). The two typed-fraction cases are edit-path only: the field itself rounds a fraction to its grid, and Isometry's edit path clamps, so its row has no edit. Both DELETE rows were already done in earlier slices (CurvatureBezierCurveGraph keeps only the collection identity and rejection asserts; parametricCatalogue has no default round trip test). The names LatticePath :570 and CountingTree :668 no longer exist.

Part B (name-pattern counts by grep over src/graphs test files; they are rough: 256 unmount/dispose/cleanup/teardown names, 307 language/English names, many with `test.each` expanding further):

| Group | Count (approx) | Covering catalogue-wide test | Verdict |
|---|---|---|---|
| "StrictMode mounts, unmounts and mounts again" without duplicating board objects (identical or near-identical names) | 16 (11 + 5 names) | none: graphTransientStateContract and GraphTransientState.part* only call `unmount()` to clean up and compare restored state, they do not count objects or listeners | KEEP; propose sweep |
| "a scene change and unmount pause playback and leave no board objects, listeners or timers" / "Back ... state restore and unmount leave no scheduler callback" | about 12 | none (sceneReplacementContract checks replacement, not teardown) | KEEP; propose sweep |
| "unmount releases objects, listeners and board label"; "generated objects disposed and not duplicated" | about 25 | none; the object lists are graph-specific | KEEP |
| Language switch: "caption follows the language" (14), "switching the language renames board, labels, captions" (6+), "no NaN/Infinity/undefined in either language" (6), lesson action refusals localized (9) | about 35 repeated names | none: no all-graph language sweep exists (only DemonstrationsPage catalogue copy and shared input tests) | KEEP; propose sweep |

Deleted in Part B: none. Every group asserts graph-specific objects, texts or counts, and no all-graph test implies them.

Proposed sweeps (not built): (1) `graphTeardownContract`: for every catalogue Demonstration, mount in StrictMode, snapshot board object count and listener spies, change state, unmount, assert the board holds no object of the graph, no listener remains and the object count after StrictMode equals a plain mount. This would let the 16 StrictMode and about 12 scene-change tests shrink to graph-specific extras. (2) `graphLanguageContract`: for every Demonstration, mount in Slovenian, switch to English, assert the board text and the controls change, no NaN/Infinity/undefined appears in the visible text in either language, and unmount leaves no language subscription. It would cover the roughly 35 repeated tests plus the 27 unmount names mentioning language.
