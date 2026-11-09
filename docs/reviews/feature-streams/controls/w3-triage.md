# Wave 3 blocker triage (task 4, remaining controls)

Surveyed at HEAD (050612c4), read-only, 2026-11-09. Evidence is `file:line` in `src/`. "Not verified" marks what was read only by grep.

Capability names (unblocking column) are defined in the capabilities table. Slices are task 4 items 1-6; this triage proposes: 1 = C11 reveal + C13 angle, 2 = C9/C20 local resets and camera, 3 = C10/C25/C26 stragglers, 4 = C12/C24 playback, 5 = C15/C27 operations and readouts, 6 = C29/C30 clean-up.

## Sites table

| ID | Cap | file:line | Current state | Blocker | Unblocking capability | Slice |
|---|---|---|---|---|---|---|
| C12-01 | C12 | graphs/curves/bezier/DecasteljauAnimationControls.tsx:38-52 (used at DecasteljauGraph.tsx:190, DecasteljauGraph2.tsx:197) | Own four buttons Play, Pause, Stop, Replay; native `disabled` (blocked buttons lose focus, no reason) | `PlaybackButtons` always renders Next step; has no Stop or Replay | PB-VARIANT | 4 |
| C12-02 | C12/C21/C28 | DecasteljauAnimationControls.tsx:36 | `<output aria-live="polite">t = 0,50` re-read on every tick, also while playing; formats `toFixed(2)` | No mute-during-Play readout bound to a playback | PB-READOUT | 4 |
| C12-03 | C12 | graphs/curves/arclength/ArcLengthParametrizationGraph.tsx:404-411 | Raw Play toggle (`aria-pressed` plus a changing `aria-label`), native `disabled={reduced}`, reason in a separate `<p id="arc-reduced-motion-reason">` (l.412) | `PlaybackBlock` has no `reduced-motion` reason; Pause-only (no Next, Reset) | PB-VARIANT + PB-REASON | 4 |
| C12-04 | C12 | graphs/curves/parametric/ParametricCurveGraph.tsx:289-291 | react-bootstrap `Button` toggling "roll" Play/Stop, no reasons, no reduced-motion check (not verified: grep for `reducedMotion` finds none there) | Same single-toggle variant | PB-VARIANT | 4 |
| C12-05 | C12 | graphs/functions/EulerGraph.tsx:303-307 | Raw Next step and Show all, `aria-disabled` with no reason; no Play (a reveal, not a run) | `PlaybackButtons` has no "Show all" and no reasons for a reveal | PB-VARIANT (Show all as a `children` button with `UnavailableButton`) | 4 |
| C12-06 | C12 | graphs/functions/EpicycleGraph.tsx:583-586 | react-bootstrap Play/Pause `Button`, no reasons; time `Slider` beside it | Single-toggle variant | PB-VARIANT | 4 |
| C12-07 | C12 | graphs/compgeo/VoronoiControls.tsx:222-228 | On `PlaybackButtons` and `TracePlayback` (VoronoiGraph.tsx:132) | none | none | - |
| C12-08 | C12 | learning/playground/collisions/CollisionPlayground.tsx:402-411 | Raw Play (`aria-pressed`), Step once (native `disabled={playing}`), New arrangement | Not an iteration; native disabled; no reason text; New is a restart, not Reset | PB-VARIANT (+ decision D-NEW) | 4 |
| C12-09 | C12 | learning/playground/collisions/CollisionInspect.tsx:232-238 | Raw Previous/Next/Play/New, native `disabled={playing \|\| ...}` | `PlaybackButtons` has no Back | PB-VARIANT | 4 |
| C12-10 | C12 | 19 other controls on `PlaybackButtons` (compgeo 11 files, DeBoorGraph.tsx:352, SubdivisionCurveGraph.tsx:381, Bisection/Clt/FixedPoint/GeometricSeries/RootFinding/Sequence) | Shared | none (see C24 for wiring) | none | - |
| C24-01 | C24 | graphs/functions/IterativeFunctionGraph.tsx:79-93, 144-148 | Own `exportBusy` guard, `controller.pause()` before `nextStep`, own pause on scene removal and figure capture; used by Bisection, FixedPoint, GeometricSeries, RootFinding, Sequence (CLT calls `nextStep`/`play` at CltGraph.tsx:233-234, base not verified) | Policy lives in `compgeo/tracePlayback.ts` (step index in `SceneStore`); function graphs keep the index in the model | TRACE-POLICY-SHARED | 4 |
| C24-02 | C24 | graphs/curves/bspline/DeBoorGraph.tsx:206-225, 241-245 | Hand-copied `exportBusy` + `controller.pause()` + `nextStep`; pause on every edit (comment l.177: "Any edit ends playback; the revealed level stays") | Same | TRACE-POLICY-SHARED | 4 |
| C24-03 | C24 | graphs/curves/subdivisionCurves/SubdivisionCurveGraph.tsx:207-224, 246, 259, 276, 292, 306, 334 | Same copy; pauses on every accepted edit (six call sites) | Same; also the pause-on-edit rule (see below) | TRACE-POLICY-SHARED | 4 |
| C24-04 | C24 | graphs/compgeo/{BentleyOttmann,Delaunay,EarClipping,Fortune,HullTrace,IntervalSweep,MonotonePartition,TraceCurvePair}Graph.tsx (e.g. DelaunayGraph.tsx:172-182) | On `TracePlayback`; each still declares the same three one-line `nextStep/play/pause` delegates (+ `TraceControls` interface in each `*Controls.tsx:~14`) | none for behaviour; the delegate trio is boilerplate only | none (optional TRACE-DELEGATES) | 6 |
| C24-05 | C24 | graphs/compgeo/VoronoiGraph.tsx:132, 324, 724 | `TracePlayback`; Play/Pause toggled in the graph (l.324) | none | none | - |
| C24-06 | C24 | learning/playground/collisions (CollisionPlayground.tsx:402, `send({type:'play'})`) | Worker-driven loop (`collisionLoop.ts`), own pause rules | Not iteration; no scheduler contract | decision D-NEW | 4 |
| C24-07 | C24 | graphs/functions/EpicycleGraph.tsx:107-161, 444 | Own frame loop, `playingValue`; pauses only on a changed model (l.114) | Continuous loop; not step playback | decision D-PAUSE | 4 |
| C24-08 | C24 | graphs/curves/arclength/ArcLengthParametrizationGraph.tsx:150, 250, 333 | Pauses on board `down`, on mover moved, on mode change; Reset stops (l.160) | Continuous loop | decision D-PAUSE | 4 |
| C24-09 | C24 | graphs/curves/parametric/ParametricCurveGraph.tsx:199-262 | Roll via `rollDriver`; stops on lesson step change only (l.218); edit behaviour not verified | Continuous loop | decision D-PAUSE | 4 |
| C24-10 | C24 | graphs/curves/bezier/DecasteljauGraph.tsx:197-232 / DecasteljauGraph2.tsx:192, 264-279 | Own `animation` driver; `pausePlayback` is host-called; edit behaviour not verified | Continuous loop | decision D-PAUSE | 4 |
| C15-01 | C15 | graphs/base/CurveWorkspaceControls.tsx:12-88 | Panel one: raw `<button>` Preview/Apply, own `operationPreview`, three sliders, raw Elevate (l.88) | Two panels, two preview states | OP-PANEL | 5 |
| C15-02 | C15 | graphs/base/controls/BezierCurveControls.tsx:57-139 | Panel two: `Button` pressed preview per tool (l.102), `Slider` per op, `Button` Subdivide/Extrapolate/Shorten/Elevate | Same | OP-PANEL | 5 |
| C15-03 | C15 | graphs/base/controls/RationalBezierCurveControls.tsx:33-50 | Weight stepper (`rational-weight-*` classes, no CSS) with raw `Button` prev/next/reset weight | Needs stepper + "reset weight" scope | OP-PANEL + C30 hook removal | 5 |
| C15-04 | C15 | graphs/base/controls/PhBezierCurveControls.tsx:55-80 | `Slider` offset distance, display controls | none beyond OP-PANEL consumption | OP-PANEL | 5 |
| C15-05 | C15 | graphs/curves/bezier/ExtrapolationGraph.tsx:72-79; rational/RationalExtrapolationGraph.tsx:53 | Raw `Slider` + `Button` Extrapolate in `getGraphCommands` | OP-PANEL | OP-PANEL | 5 |
| C15-06 | C15 | graphs/curves/bezier/ElevationGraph.tsx:105; rational/RationalElevationGraph.tsx:32 | Raw `Button` Elevate (own arrow icon span) | OP-PANEL | OP-PANEL | 5 |
| C15-07 | C15 | graphs/curves/bezier/SubdivisionGraph.tsx:120; rational/RationalSubdivisionGraph2.tsx (not surveyed) | Raw `Button` Subdivide | OP-PANEL | OP-PANEL | 5 |
| C27-01 | C27 | graphs/compgeo/DelaunayControls.tsx:145-151, 163 | `ul aria-label` with `data-readout` items (sentence per item); neighbours `ul` | READOUT-LIST (+ StepCounter) | READOUT-LIST | 5 |
| C27-02 | C27 | graphs/compgeo/TriangulationControls.tsx:104-123 | `ul data-triangulation="readout"`, `data-readout` items, event paragraph, hidden `role=status aria-live=polite data-triangulation="live"` (l.123) | READOUT-LIST + live to `LiveReadout` | READOUT-LIST + LIVE-HIDDEN | 5 |
| C27-03 | C27 | graphs/compgeo/VoronoiControls.tsx:195-209 | `ul`s with `data-readout`; four-point block `role=group` with paragraphs | READOUT-LIST | READOUT-LIST | 5 |
| C27-04 | C27 | graphs/compgeo/{EulerLine,NotablePoints,Simson}Panel.tsx:26,33,40,47 (`role=status` chips), InversionPanel.tsx:59, EulerLinePanel.tsx:35/46/55, InscribedAnglePanel.tsx:32/44/56 and the other `inspector-reveals-title` h3 (NotablePoints:35/43, PointSet:95/128, Simson:49/62/72/134, Voronoi:119, BaseFunctionGraph) | Visible `role=status` chips plus `h3.inspector-reveals-title` | READOUT-HEADING; chip `role=status` is decision-39 style (visible title) so a ruling is needed | READOUT-HEADING (+ D-STATUS) | 5 |
| C27-05 | C27 | graphs/compgeo/EarClippingControls.tsx:96; HullRobustnessControls.tsx:142 | `role=status` paragraphs; HullRobustness kept by decision 39, EarClipping `reversed` is a persistent state, not a settle | D-STATUS | READOUT-HEADING (D-STATUS) | 5 |
| C27-06 | C27 | graphs/projective/{CrossRatio:53,61; FivePoint:66,75; Pascal:67,74; PolePolar:65,73; ThreeViews:43} | Visible `role=status` block per graph (`data-projective-status`) plus hidden `role=status` nudge paragraph (`data-projective-nudge`) in four | LIVE-HIDDEN (hidden nudge to `LiveReadout`) + D-STATUS (visible block) | LIVE-HIDDEN, D-STATUS | 5 |
| C27-07 | C27 | graphs/complex/{Multiplication:493,Reciprocal:521,Roots:403}; linear/LinearMapGraph.tsx:403,460 | `div.demo-status role=status aria-live=polite` re-reads every line; linear notice at 403 | LIVE-HIDDEN / functions `FunctionReadout` | FUNCTION-STATUS | 5 |
| C27-08 | C27 | graphs/functions/FunctionReadout.tsx (`data-readout`, `dl`, `role=note`); RootFindingGraph.tsx:352 (`role=note`); EpicycleGraph.tsx (`role=note`, scroll table); FourierDecaySpectra.tsx (2 `role=note`) | Functions family readout; Epicycle scroll table has `tabIndex`, Bezier clipping's (BezierClippingControls.tsx, 1 hit) is not focusable per catalogue (not re-verified) | READOUT-TABLE, READOUT-HELP | READOUT-TABLE, READOUT-HELP | 5 |
| C27-09 | C27 | graphs/patches/{Coons:80, TensorJoin:135, TensorPatch:131, TensorSubdivision:32, TriangularPatch:135,155,156}Panels.tsx | `p.inspector-help role=note` (7 sites, six files); not through a shared help element | READOUT-HELP | READOUT-HELP | 5 |
| C27-10 | C27 | learning/playground/collisions/CollisionPlayground.tsx:414 (`dl.collision-playground__readouts`), CollisionInspect.tsx:181-259 (`ul` active list, h4, progress `Event {value0} of {value1}`, 1-based) | Playground-only readout markup; step counter hand-written | StepCounter | READOUT-LIST | 5 |
| C27-11 | C27 | graphs/compgeo/SweepSideLists.tsx:66-67 | Focusable `li tabIndex=0` status lists | READOUT-LIST / D-STATUS | READOUT-LIST | 5 |
| C27-12 | C27 | step counters: functions `*_board_progress` (en.ts:728, 779, 1541), `collision_inspect_progress` (en.ts:102); `StepCounter` does not exist (`grep -rln StepCounter src` finds only unrelated hits in collisions) | Each graph writes its own counter; 0/1-base per decision 38 (1-based for Monotone) | StepCounter | STEP-COUNTER | 5 |
| C11-01 | C11 | 15 files: complex/{Multiplication:434,438; Reciprocal:453 (loop of 3); Roots:346}; functions/{Accumulation:324; Convexity:384; Darboux:306,308; Extrema:383; FixedPoint:389; FunctionInverse:281,285; FunctionTransformation:238; MeanValue:320; PolynomialZeros:302; Sequence:390; Taylor:354; UniformConvergence:376} | 18 raw `button[data-revealed]` reveal buttons (`data-action="toggle-..."`), each in `renderReveals` | No shared Reveal button (`grep RevealButton` finds none) | REVEAL-BUTTON | 1 |
| C11-02 | C11 | graphs/linear/LinearMapGraph.tsx:382-384 | Three raw `aria-pressed` toggle buttons (probe, curve, square) | These are display settings, not hidden-until-asked | `OnOffSwitch` (no new capability) | 1 |
| C11-03 | C11 | graphs/base/PresetSelector.tsx:88 | `Form.Check type=checkbox` of the figure-export dialog (host, not a graph control) | Host dialog, outside task 4 | none (out of scope) | - |
| C11-04 | C11 | `grep -rn 'type="checkbox"' src` outside tests | The only raw checkbox is C11-03; the catalogue's 3 are gone | none | none | - |
| C13-01 | C13 | graphs/compgeo/SimsonLinePanel.tsx:116; InversionPanel.tsx:168; InscribedAnglePanel.tsx:57 | `Slider` with identical copied props `min=0 max=360 step=1 bigStep=10 decimals=1 cyclic=360 fieldDecimals=2` (degrees field) | Props copied, no named angle slider | ANGLE-SLIDER | 1 |
| C13-02 | C13 | `grep -rn 'type="range"' src` outside `inputs/Slider` | none: raw ranges gone (ThreeViews, Simson, Inversion, InscribedAngle moved) | none | none | - |
| C13-03 | C13 | BinomialNormal exact field | not surveyed (`grep` for `Slider` with exact field not run) | - | not surveyed | 1 |
| C9-01 | C9 | graphs/compgeo/VoronoiControls.tsx:182-184 | Raw `button data-action="reset-example"` ("vor_example_reset", "Reset example") in a group reusing `inspector-playback` | Local Reset exception not named; label rule for "restore the example" undecided | EXAMPLE-RESET + D-RESET-LABEL | 2 |
| C9-02 | C9 | graphs/curves/bspline/{Extraction:256, Insertion:278, Nurbs:311} | Three raw `button data-action="reset"` ("bsp_example_reset"), each in an `inspector-playback` div | Same | EXAMPLE-RESET + D-RESET-LABEL | 2 |
| C9-03 | C9 | graphs/linear/LinearMapGraph.tsx:409 | Raw `button data-action="linear-map-reset"` (reset to identity) | Scope is not the example; a model operation | EXAMPLE-RESET | 2 |
| C9-04 | C9 | playback Reset labels: `PlaybackButtons` default (t("reset")), `sequence_reset`, `series_reset`, `prob_clt_reset`, `vor_construct_reset`, `bsd_reset_levels` ... | Mixed overrides of `resetLabel` | decision D-RESET-LABEL | EXAMPLE-RESET | 6 |
| C20-01 | C20 | graphs/patches/SurfaceCameraPanel.tsx:30 (used by CoonsPatchPanels:132, TensorPatchPanels:169, TriangularPatchPanels:165) | One shared camera panel; "Reset view" (`patch_view_reset`, en.ts:3207). The catalogue's copy-in-three is already resolved | none | none | - |
| C20-02 | C20 | Fit / Show all / Reset view elsewhere | `grep` of en.ts finds no other "Fit the view", "Reset view" or "Show all" keys except `euler_ode_show_all` (C12-05 meaning: steps) and `catalog_broaden_topics`; Voronoi/Fortune/Notable/EulerLine/Binomial/Density buttons are gone | none | none | - |
| C10-01 | C10 | `grep` for example buttons, radios, raw selects across graphs and learning | No example chooser outside `ChoiceSelect` remains (77 files use `ChoiceSelect`); only action buttons "Reset example" (C9) and `playground_load_example` (DrawingPlayground.tsx:423, a load action) | none | none | - |
| C25-01 | C25 | graphs/base/BaseCurveGraph.tsx:246-250 | `workspace-modes` Move/Add/Delete buttons are `aria-pressed` `UnavailableButton`s inside `details.editing-mode`; decision 9 keeps board tools as a named pressed group | Group is unnamed (class only) | none beyond naming; folded into slice 6 | 6 |
| C25-02 | C25 | Other mode choosers | `grep` finds no raw `<select>` or `<input>` anywhere in graphs/learning; mode and conic choosers are `ChoiceSelect` (not individually re-verified for each of the six nouns) | none | none | - |
| C26-01 | C26 | graphs/complex/ComplexRootsGraph.tsx:329 | `NumberInput` for the root degree | Degree must be a `CountSetter` (decision 10) | none (CountSetter exists) | 3 |
| C26-02 | C26 | Taylor:341, Runge:222, CnSpline:62, LeastSquares:277, Bernstein:229, BSpline Basis:271/Blossom:288/DeBoor:342, Tensor/Triangular/Join patch panels | All on `CountSetter`; `grep DEGREES` outside the Blossom model finds no copied lists | none | none | - |
| C29-01 | C29 | `grep -c '"Next step"' src/localization/en.ts` | 13 identical values (bisection, root_finding, euler, sequence, fixed_point, series, subdiv, intervalsweep, bentleyottmann, monotonepartition, hulltrace, fortune, collision_inspect); also three `"Show error bound"`-class pairs (taylor, fixed_point) and "Add point" (add_point, pointset_add_point), "Clear" (playground_clear, pointset_clear), "Reset" (reset, sequence_reset, series_reset) | Moves with the control, so after slice 4 and 5 | none | 6 |
| C30-01 | C30 | `grep -rl` of the hooks: `pointset-check`, `simson-slider-row`, `inscribed-slider-row` have 0 tsx and 0 css; `pointset-row` 2 tsx (PointSetControls.tsx:101,137; PascalControls.tsx:83) 0 css; `rational-weight*` 3 classes in one tsx 0 css; `bisection-actions` 4 tsx, 1 css; `inspector-playback` and `demo-actions` in 2 css, reused for non-playback groups (DelaunayControls.tsx:153, VoronoiControls.tsx:137,182,216,236, TriangulationControls.tsx:87, BSpline panels) | Unruled hooks mostly gone; reused-playback-class groups remain | Per control, with C12/C27 | none | 6 |
| OI-01 | open | complex/linear/Bernstein panels (state.md) | Complex: C11-01, C27-07, C26-01; Linear: C9-03, C11-02, C27-07; Bernstein: `OnOffSwitch` (BernsteinGraph.tsx:223) + `CountSetter` (l.229), nothing else raw | rows above | per row | 1/3/5 |
| OI-02 | open | graphs/projective/PascalControls.tsx:83-86 | Pascal steppers: `pointset-row` with two `button` stepper buttons labelled `projective_k2_step_back/forward`; the 44 px coarse-pointer rule exists only in `BooleanField.css`, `NumberInput.css`, `Slider.css`, `WorkspaceControls.css`, `FunctionReadout.css`, `DrawingPlayground.css`, not for `.pointset-row` (a grep of projective CSS finds no `coarse`) | Needs a shared stepper-button class | STEPPER-TOUCH | 3 |
| OI-03 | open | src/inputs/ChoiceSelect.tsx (no `reason`/`unavailable` prop) | No unavailable reason (decision 34) | Decision implemented? Needs ChoiceSelect `unavailableReason` | CHOICE-REASON | 3 |
| OI-04 | open | src/inputs/PointCollection.tsx (`label` only, no item noun) | Decision 33 not implemented | Needs `itemNoun` prop | POINTS-NOUN | 3 |
| OI-05 | open | VoronoiGraph.host.test.tsx ("schedules no timers"); frameFit.test.ts vs exampleAndFrame.test.ts; sharedControls.graphs.test.tsx / src/inputs/sharedControlBehaviour.tsx | Test debts, not re-read | test-only | TEST-DEBT (no capability) | 6 |
| OI-06 | open | NumberInput integer field hint; UnavailableButton `title` + hidden description | Behaviour debts (not re-read) | `NumberInput`, `UnavailableButton` | none | 3 |
| OI-07 | open | Insertion refusal separator; knot editor drag reasons; Derivatives corner `aria-label`; `PatchPointEditor` new `points` each render; curve workspace `onAdd` never refuses; De Casteljau export check | Low-priority carried items, not re-read | none | none | - |

## Row counts per capability

C12 10 (6 need work, 1 already done, 3 scope rows), C24 10, C15 7, C27 12, C11 4 (C11-01 stands for 18 buttons in 15 files), C13 3, C9 4, C20 2, C10 1, C25 2, C26 2, C29 1, C30 1, open items 7. Total 66 rows.

## Capabilities table

| Capability | Rows unblocked (count) | Owner files | Spec decision missing |
|---|---|---|---|
| PB-VARIANT: `PlaybackButtons` without Next, with Stop/Replay/Back or a single toggle, plus reasons | C12-01, 03, 04, 05, 06, 08, 09 (7) | `src/graphs/base/controls/PlaybackButtons.tsx` (+ test), `PlaybackBlock` union | D-NEW: is New arrangement/New a run restart (use the Reset action) or a model change (stays a separate button)? |
| PB-REASON: `PlaybackBlock` gains `reduced-motion` (and `export-busy`) | C12-03 (1) | `PlaybackButtons.tsx` | none (reduced-motion text exists in sl/en) |
| PB-READOUT: `t` readout through `LiveReadout`, muted while playing | C12-02 (1) | `DecasteljauAnimationControls.tsx`, `graphs/base/controls/LiveReadout.tsx`, `src/analysis/format.ts` | none |
| TRACE-POLICY-SHARED: move or re-export `TracePlayback` so non-compgeo graphs hold the index in their model/`SceneStore` and use the same pause/export policy | C24-01, 02, 03 (3, covering 7 graphs) | `src/graphs/compgeo/tracePlayback.ts` (to `src/graphs/base/` or `src/learning/runtime/`), `IterativeFunctionGraph.tsx`, `DeBoorGraph.tsx`, `SubdivisionCurveGraph.tsx` | D-TRACE: function graphs keep the index in the model (preset data), compgeo in the store. Option A: one `TracePlayback` over either (host supplies read/write). Option B: leave function graphs on `IterationController` and record the difference. Contracts task 3 says "no second helper", favouring A |
| D-PAUSE: one pause-on-edit rule for continuous loops (Epicycle, ArcLength, Roll, De Casteljau) | C24-07, 08, 09, 10 (4) | each graph + `PlaybackButtons` docs | Option A: any accepted edit pauses (Subdivision today). Option B: only a model change (Epicycle today). Option C: leave the loop-type graphs out of the rule |
| REVEAL-BUTTON: one shared Reveal/Hide button | C11-01 (18 buttons, 15 files) | new `src/inputs/RevealButton.tsx` (+ css/test), `BaseFunctionGraph.tsx:229` (`renderReveals`) | Confirm the UX spec keeps reveal buttons (catalogue says yes); label form ("Show X" / "Hide X") per control |
| ANGLE-SLIDER: shared angle `Slider` preset (0-360, step 1, big 10, cyclic, degree field) | C13-01 (3) | `src/inputs/Slider.tsx` or `src/inputs/AngleSlider.tsx`; Simson, Inversion, InscribedAngle panels | none |
| EXAMPLE-RESET: one "back to the example" named exception | C9-01, 02, 03 (3-4 with 04) | new `src/inputs/` or `graphs/base/controls/` button; Voronoi, three B-spline graphs, LinearMap | D-RESET-LABEL: "Back to the example" (B-spline) or "Reset example" (Voronoi)? Pick one label; LinearMap's reset-to-identity is a model operation and may stay |
| OP-PANEL: one curve operation panel | C15-01 to 07 (7) | `src/graphs/base/CurveWorkspaceControls.tsx`, `controls/BezierCurveControls.tsx`, `controls/RationalBezierCurveControls.tsx`, `BaseCurveGraph.tsx`, Extrapolation/Elevation/Subdivision graphs and rational variants | Which preview state wins (panel one vs two)? Option A: BezierCurveControls (pressed preview). Option B: CurveWorkspaceControls (local `operationPreview`) |
| READOUT-LIST / READOUT-HEADING / READOUT-HELP / READOUT-TABLE / STEP-COUNTER: shared readout markup | C27-01 to 12 (about 30 sites) | new files in `src/graphs/base/controls/` or `src/inputs/`; `FunctionReadout.tsx` (existing functions version) | D-STATUS: visible `role=status` chips (compgeo panels, projective, Hull robustness): decisions 39/48 keep them as discrete-pick titles; do the projective status blocks and Euler/Notable/Simson chips follow decision 39 (stay visible) or move to `LiveReadout`? |
| LIVE-HIDDEN: hidden nudge/event paragraphs to `LiveReadout` | C27-02, 06 (5 nudges + Triangulation) | `LiveReadout.tsx`, `TriangulationControls.tsx`, four projective controls | none beyond D-STATUS |
| FUNCTION-STATUS: complex/linear `demo-status` groups onto `FunctionReadout`/`StatusLive` | C27-07 (5) | `src/graphs/base/controls/StatusLive.tsx`, `functions/FunctionReadout.tsx`, complex and linear graphs | none |
| STEPPER-TOUCH: shared 44 px coarse-pointer stepper buttons | OI-02 (1; also `rational-weight-stepper`) | `src/inputs/` (a stepper-button class) + `PascalControls.tsx` | none |
| CHOICE-REASON / POINTS-NOUN | OI-03, OI-04 (2) | `src/inputs/ChoiceSelect.tsx`, `src/inputs/PointCollection.tsx` | none (decisions 34, 33 exist) |

## Suggested build order

1. ANGLE-SLIDER, REVEAL-BUTTON (small, no decisions, slice 1).
2. PB-VARIANT, PB-REASON, PB-READOUT (slice 4a; needs D-NEW only for Collision).
3. TRACE-POLICY-SHARED (slice 4b; needs D-TRACE; touches three graphs plus tests).
4. READOUT-* and STEP-COUNTER with LIVE-HIDDEN, FUNCTION-STATUS (slice 5a; needs D-STATUS).
5. OP-PANEL (slice 5b; needs the preview-state choice).
6. EXAMPLE-RESET, STEPPER-TOUCH, CHOICE-REASON, POINTS-NOUN, ComplexRoots degree `CountSetter` (slices 2-3).
7. C29/C30 clean-up last (slice 6).

## File-overlap note (item 4 playback against item 5 readouts/operations)

The state note's claim that only `sl.ts`/`en.ts` overlap is refuted. Files both would touch:

- `src/localization/sl.ts`, `en.ts` (as assumed).
- `src/graphs/base/controls/LiveReadout.tsx` (PB-READOUT and LIVE-HIDDEN), `PlaybackButtons.tsx` (its `role="status"` line also carries a reason readout).
- `src/graphs/curves/bezier/DecasteljauAnimationControls.tsx` (buttons l.38-52 and `aria-live` t l.36).
- `src/graphs/compgeo/DelaunayControls.tsx` (playback l.137, readouts l.145-163), `VoronoiControls.tsx` (l.222 vs 195-209 and the Reset example l.183), `EarClippingControls.tsx` (l.91 vs 96), `TriangulationControls.tsx` (l.87 flip group vs 104-123 readouts), and every other compgeo `*Controls.tsx` that renders both `PlaybackButtons` and a step/readout line.
- `src/graphs/functions/EpicycleGraph.tsx` (Play l.583 vs status/scroll table l.598), `RootFindingGraph.tsx` (l.285 vs table note l.352), the five iterative function graphs (playback block and readout through `FunctionReadout`), `EulerGraph.tsx`.
- `src/learning/playground/collisions/CollisionPlayground.tsx` (buttons l.402 vs `dl` l.414) and `CollisionInspect.tsx` (buttons l.232, readouts l.181-259), plus their CSS.
- `src/graphs/curves/bspline/DeBoorGraph.tsx` and `SubdivisionCurveGraph.tsx` (playback block with the same panel's readout).
- Shared CSS `src/graphs/base/WorkspaceControls.css`, `src/graphs/functions/FunctionReadout.css` (both define `inspector-playback`/`demo-actions`).

Recommendation: run item 4 first, or give the overlapping `*Controls.tsx` files a named region split (the state note's working rule), or serialize the two items per file.

## Contradictions with the state note

- The note lists Euler Next step / Show all and Epicycle Play as "still natively disabled"; Euler uses `aria-disabled` (EulerGraph.tsx:303-307) and Epicycle has no disabled state, only no reasons.
- Voronoi construction and all compgeo trace graphs are already on `PlaybackButtons` and `TracePlayback`; the open playback rows are Decasteljau, ArcLength, Parametric roll, Euler, Epicycle and the collision playground, plus function/DeBoor/Subdivision wiring that still hand-copies the export and pause guards.
- Catalogue "raw ranges" (C13), button-row example choosers (C10), copied camera panels and Fit buttons (C20), raw checkbox (C11) and Plain degree selects (C26) are already gone except ComplexRoots' `NumberInput` degree.
- The Item 3 "Pascal steppers" and "`pointset-row`" rule is a CSS gap only.

Not verified: CLT's base class (CltGraph.tsx:233-234), `RationalSubdivisionGraph2.tsx`, BinomialNormal exact field, edit behaviour of Parametric roll and De Casteljau playback, the Bezier clipping scroll table, `ChoiceSelect` use per mode noun, and test debts OI-05 to OI-07 (not re-read).
