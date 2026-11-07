# Inventory part 4: `src/graphs/base`, `complex`, `linear`, `bernstein`, `src/learning/playground`

Read from code at the worktree head; nothing was run in a browser. Paths are relative to `src/graphs/` unless they start with `src/`.
Common to the complex panels and LinearMap: they extend `BaseFunctionGraph`, so C7/C23 use `ignoreOutOfDomain` (`functions/BaseFunctionGraph.tsx:477`), which discards the `DomainError` reason; the `NumberInput` `rejectedHint` is the only feedback. Examples use `ChoiceSelect` (C10 shared). Host Reset (C9) and host Fit (C20) exist on every graph (`base/PresetSelector.tsx:237`, `base/DemonstrationWorkspace.tsx:233`).

## Panels

| Panel | Path | Shared | Local | Exception candidate |
| --- | --- | --- | --- | --- |
| Workspace shell: pan/zoom/Fit, inspector tabs, picker | base/DemonstrationWorkspace.tsx:231-238 (nav), :253 (tabs), :183 (switch) | none | C20 Fit button (:233); pan/zoom buttons natively `disabled` during a lesson, no reason (:234, C6); C25 tab group of pressed buttons (:253); Switch button uses `aria-disabled` + title reason (:182-186, the C6 target model) | none (host chrome) |
| Preset selector (Reset, Save, Delete, Export, Import, figures) | base/PresetSelector.tsx:211-258, ResetButton.tsx | none | C10 raw `Form.Select` with a "Default" entry (:224); C9 host Reset (:237); C6 `disabled={lessonActive}` on select, Reset, Save, Delete, Import, no reason; C7 problems in `role=alert` (:221) | none |
| Import presets dialog | base/PresetImportDialog.tsx:16,45 | none | react-bootstrap `Button`s, `disabled` without reason (C6) | none (not a graph control) |
| Save image (PNG, SVG) | base/SaveImage.tsx:23,29 | none | `Button disabled={exporting}` without reason (C6) | none |
| Coordinate system select | base/AxisSelector.tsx:21 | none | raw `Form.Select` (C10-style) | none: `ChoiceSelect` |
| Element size | base/SizeRange.tsx | C13 | none | none |
| Learning prompt | base/LearningPrompt.tsx:11 | none | one "Next prompt" button, `aria-live` paragraph (C21) | none |
| Curve picker and editing mode | base/BaseCurveGraph.tsx:150-195, :352 | C11 (point labels :197) | C14-like pressed row per curve + Clear selection (:159,:166); C25 board-tool pressed group (:188); mode buttons natively `disabled` with no curve selected, no reason (:188, C6) | C25 board tools stay a pressed group (decision 9) |
| Point coordinate editor | base/PointCoordinateEditor.tsx:12-68 | none | C4 form with "Apply all" (:34-40); C1 add-by-coordinates form (:49); C2 per-row Delete natively `disabled` at one point, no reason (:46); only refusal "enter finite numbers" `role=alert` (:62) | none: this is the C4 target |
| Selected-curve operations (panel A) | base/CurveWorkspaceControls.tsx:62-90 | C13, C11 (:81) | C15: raw `<button>` previews (`aria-pressed`) and apply buttons, preview state in the component | none, merge with B (C15) |
| Bezier curve controls (panel B) | base/controls/BezierCurveControls.tsx:104-142 | C13 | C15: react-bootstrap `Button` previews (`aria-pressed`); De Casteljau scheme a pressed Button, not `OnOffSwitch` (:132) | none, merge with A |
| Curve display switches | base/controls/CurveDisplayControls.tsx:34-52 | C11 | none | none |
| PH offsets | base/controls/PhBezierCurveControls.tsx:13-83 | C11, C5 (`CountSetter` min 1, no max, :61), C13 | lines switch natively `disabled` without reason (:36, C6) | none |
| Rational weights | base/controls/RationalBezierCurveControls.tsx:27-52 | C8 (`NumberInput`), C11 | C5-like hand stepper: two `Button`s -/+ 0.25 (:33,:41); Previous/Next weight (C14 candidate, :44-45); local Reset weight (:46); typed w <= 0 refused with `rejectedHint` (:36-40) | none (stepper is a C5 candidate; Reset weight see Local Reset) |
| Bernstein | bernstein/BernsteinGraph.tsx:221-232 | C5/C26 (`CountSetter`, degree 0..5, :228), C11 (:223) | none | none |
| Complex multiplication | complex/ComplexMultiplicationGraph.tsx:388-445 | C10, C8 (coordinates; modulus and argument `applyOn="confirm"`, :413-416) | C11 two raw reveal buttons, Show/Hide label swap (:434,:438); argument field natively `disabled` at w = 0 with help text (:417,:424); C21 status group re-read whole (:493) | none |
| Complex reciprocal | complex/ComplexReciprocalGraph.tsx:417-460 | C10, C8 (z, w, centre, radius) | C11 three raw reveal buttons (:453); C21 status group (:521) | none |
| Complex roots | complex/ComplexRootsGraph.tsx:313-355 | C10, C8 (w, test z), degree as `NumberInput` 2..8 (:329, C26 target `CountSetter`) | C11 three raw reveal buttons (:346); C21 status group (:403) | none |
| Linear map | linear/LinearMapGraph.tsx:371-420 | C10 (example, mode), C8 (four entries, `applyOn="confirm"`, :376) | **C9 local Reset "Reset to the identity"** (:409); C11 three raw `aria-pressed` buttons (:382); C22 private `notice` (:64,:403); typed clamp or snap with message (:137-145); C21 status group (:460) | typed clamp contradicts decision 3; decision 8 covers it |
| Drawing playground | src/learning/playground/DrawingPlayground.tsx:381-395 | none | own toolbar: Undo, Redo, Clear (C3), Add point (C1), Close, Delete point (C2), anchor-type pressed group, Load example; all natively `disabled`, no reason (C6); C16 keys (:293-330); C21 live summary (:376,:409) | whole playground: free-drawing model, see Exception candidates |
| Look underneath | src/learning/playground/LookUnderneath.tsx:123-150 | C13 (`Slider`, :146) | C11 four raw checkboxes (:129-135); Previous/Next segment natively `disabled` at the ends (C6) | none |

Helpers only (no row): `base/BaseGraph.tsx` (hosts the rows above in `workspaceSave`/`workspaceDisplay`), `base/controls/PlaybackButtons.tsx` (the shared C6/C12 control; its Reset is run-scoped, label default `reset`, :69), `base/controls/SelectedCurveControls.tsx` (composes A/B/rational/PH by adapter type), `base/realGraphTestHarness.tsx` (test helper), `base/Commands.tsx`, `base/CurveEditingFeature.ts`. All 24 `.tsx` rows of the TSV for my directories are covered (21 panel rows, 6 helper files; the shell, selector and import dialog rows split `DemonstrationWorkspace`/`PresetSelector`). Row count: 21.

## Open items

### Item 1: focus order, zoom and pan keys, hit-testing, playground (read from code)

- **Focus order** is DOM order (`base/DemonstrationWorkspace.tsx`): header actions (:177-195), the guided lesson panel when open (:207), the graph box then the pan/zoom group (:231-237), learning prompt (:240), then the inspector (:241-): collapse button, three tab buttons, active tab content.
- **The board is not a Tab stop.** `#jgbox` is a plain `div` without `tabIndex` (`src/JGBox.tsx:11`). Bezeg sets no JSXGraph `keyboard` option, so the library default applies (`keyboard.enabled: true`, `panShift: true`, `node_modules/jsxgraph/src/options.js:758`), and element `tabindex` defaults to -1 (`options.js:2559`): focusable by click only. Pan and zoom by keyboard therefore exist only as buttons (`navigateBoard`, `base/BaseGraph.tsx:727-750`: arrows move 15 % of the box, +/- call `zoomIn`/`zoomOut`, Fit frames all visible points). That JSXGraph's own Shift+arrow pan and `+ - o` zoom work after clicking the board is inferred from library source (`board.js` `keyDownListener`), not run. The hint names only Shift+drag and Shift+wheel (`DemonstrationWorkspace.tsx:238`).
- Pan/zoom buttons are natively `disabled` while a lesson shows content (:234), no reason; Fit stays enabled.
- **Curve-board hit-testing** (`base/CurveEditingFeature.ts:63-135`; `curves/object/AbstractJXGPointControlledCurve.ts:217-228, 425-435`): in Move mode a press goes to the selected curve when inside its bounding box padded by 0.3 user units (fixed in user units, so it shrinks on screen when zoomed out), else deselects; with none selected a point under the pointer (`hasPoint`, screen px) wins over a curve; otherwise the first curve in list order whose JSXGraph `hasPoint` holds is selected. Add mode creates a point only if no point is under the pointer; Delete mode removes the first point under the pointer and silently does nothing at one point (:130).
- **Playground** (`src/learning/playground/DrawingPlayground.tsx`): Tab order is toolbar, then per anchor its in-handle, anchor, out-handle (:343-375), each `tabIndex=0` `role=button`, focus selects; the canvas `svg` is `tabIndex=-1` (:397). Arrows move an anchor or handle 5 units, Shift 25, Alt breaks handle symmetry, clamped silently to the 1000 x 625 view box (`clampPoint` :67; `drawingModel.ts:41`); Delete/Backspace removes an anchor; Enter/Space selects, and closes on the first anchor; Ctrl/Cmd+Z undo, +Shift redo (:293-330). Hit radius `max(14, (coarse ? 22 : 10) * unitsPerPx)` (:335); a handle within 1.5 radii of its anchor is not pointer-grabbable (:359). A press on empty canvas at 32 anchors returns silently (:214); toolbar Add is natively disabled there. Double click toggles anchor type, falling back to nearest-anchor hit-testing (:257-272).

### Item 4: Reset (table under Local Reset)

**Host Reset** = `BaseGraph.reset()` -> `reloadSelectedScene()` -> `applyFigurePreset` (`base/BaseGraph.tsx:294, 342-356, 1043-1096`); disabled during a guided lesson (`PresetSelector.tsx:237`).
- **No Preset selected:** scene data `defaultPreset()` (`storedPresetData`, :645-651; mount uses `initialPresetData()` instead, :792, which a graph may override with a host handoff, so Reset ignores a handoff); scene state = the state captured at mount (`initialFigureGraphState`, :655-660, set :765); transient state fresh (`restoreTransientState(undefined)`); view set to the starting box (`startingBox`, :351: `initialView()` or the app default); then `initialize()` (`SceneReplacement.ts:119`).
- **Preset selected:** same path with the stored Preset: its data (collection-checked, invalid falls back to default, :647-651), its `graphState` laid over the mount state (:657-659), its `boardState` box applied after the scene if present (:1074-1076), else the starting box. A vanished Preset clears the selection (:348).
- **Untouched:** the Preset list and display settings (point labels, sizes, axis; kept as graph preferences, comment ~:667). Playback stops only through a graph's `stopLessonAnimations()` override (base is a no-op, :616). Not run in a browser.

### Item 5: lesson runner and `DomainError` (read from code)

1. `BaseGraph.applyLessonAction` is `try`/`finally { store.notify() }` (`base/BaseGraph.tsx:537-544`); `LessonActionRegistry.ts` has no `catch` or `DomainError`, so the error propagates.
2. Correlation `add-point` -> `addPoint()` -> `accepted(addCorrelationPoint(model))` throws `new DomainError(correlationEditMessage(issue))` at the cap (`functions/CorrelationGraph.tsx:144-147, 177-178, 212`). `DomainError.message` renders the localized `reason` lazily (`BaseFunctionGraph.tsx:50-60`); its comment says lesson actions let it propagate (:46-49).
3. `LessonSession.applyActions` (`src/learning/runtime/LessonSession.ts:204-218`) catches any error, restores the lesson checkpoint (graph as before the lesson, not the scene's earlier actions), stores it in `snapshotValue.error` and rethrows it (the `DomainError` is an `Error`).
4. Callers: `GuidedLesson.tsx` `refresh()` (:362-368), wrapping Next (:508), Back (:507), the frame action button `applyCurrentAction()` (:516) and animation commands (:383); and the `start()` effect (:197-203). Each calls `setStartupError(error)`.
5. With `startupError` set, `GuidedLesson` renders only the title, Close and `<p role="alert">` "The example scene could not be prepared. {error.message}" (:440-451; `guided_lesson_scene_error`, `en.ts:2032`), so the learner sees the Correlation reason in the active language. That view has no Back or Next: the lesson is a dead end until closed; `refresh` clears the error only after a later successful operation, which this view cannot trigger.
6. The same path serves every family's lesson action. Not run in a browser; the Correlation cap value was not read.

### Item 7: typed clamp and drag refusal (read from code)

- **Typed clamp:** only LinearMap (`LinearMapGraph.tsx:137-145`; `src/linear/linearMapModel.ts:170-174`: clamp to [-4, 4], snap to 1/4, notice). The complex panels **refuse** out-of-range and off-grid typed values with a hint (`ComplexRootsGraph.tsx:73-74`; `analysis/complex.ts:88-91` snaps only for noise; `en.ts:1731`). Under decision 8 they change to snap with a notice.
- Rational weight: typed w <= 0 refused with `weight_must_be_positive` (`RationalBezierCurveControls.tsx:36-40`). `PointCoordinateEditor`: any finite value, no clamp (:30-33).
- **Drag stops at the limit silently** (already decision 3): complex operands clamp to +-2 then snap (`ComplexMultiplicationGraph.tsx:329-332`; `ComplexRootsGraph.tsx:244, 262-266`; `ComplexReciprocalGraph.tsx:314-348`, radius clamped :345); LinearMap snaps and clamps (`LinearMapGraph.tsx:336-341`); the playground clamps (:67). Each moves the handle back with `moveTo`.
- **Drag refusal by a rule:** none found. Complex and LinearMap drags sit inside `ignoreOutOfDomain`, which would snap a handle back silently, but clamp and grid make every dragged value valid (modulus bound 2*sqrt 2 = the square's corner, `analysis/complex.ts:28`).
- Keyboard steps exist only in the playground and clamp silently (decision 7 compliant); curve and function boards have none (decision 11).

### Item 8: mute during Play (read from code only)

None of my directories has a Play control or a Play-gated announcement: grep for `playing|playback|animat` in complex, linear, bernstein and the playground finds nothing; in `base` it finds only `BaseGraph` plumbing, `PlaybackButtons`, `LessonActionRegistry`, and pause-on-picker in `PresetSelector`/`DemonstrationWorkspace`. Announcement regions here are `role=status aria-live=polite` groups re-read whole (complex `demo-status` :493/:521/:403, LinearMap :460), the LinearMap notice (:403), `PlaybackButtons`' reason line (`PlaybackButtons.tsx:84`), and the playground's debounced summary (`DrawingPlayground.tsx:156-165, 409`). Sequence and De Boor are outside my directories and not examined.

## Exception candidates

- **Board tools Add/Move/Delete (`BaseCurveGraph.tsx:188`, `:352`)**: C25, stay a named pressed group (decision 9, visible active tool on a projector). Shared control otherwise: `ChoiceSelect`.
- **Drawing playground toolbar and keys**: own anchor model with handle types, cap 32, undo history, 1000 x 625 box, no grid, so C1-C3 and C16 of the shared point controls do not fit a point list. Keep as one named exception, but apply C6 (stated reason for Add/Close/Clear/Delete) and C16 (arrow, Shift, Delete already match). Shared control otherwise: C1-C3, C16.
- **Rational Reset weight**: a per-weight edit; host Reset cannot restore one weight. Named local Reset. The -/+ 0.25 stepper and Previous/Next weight stay C5/C14 candidates.
- **Complex argument field disabled at w = 0**: mathematical (the argument of 0 is undefined); keep, but C6 needs it focusable with its reason (already in `complex-w-argument-help`). Shared control: `NumberInput` under the C6 protocol.
- **LinearMap 2x2 entries**: *Likely exceptions* lists "2x2 matrix entry"; here the four entries are plain `NumberInput`s (`LinearMapGraph.tsx:376`), so the handler decides it against other parts' matrix panels. No exception needed for complex reveal buttons, Bernstein or LinearMap toggles (C11 targets).

## Local Reset

| Reset | Path | Restores | Same as host Reset? |
| --- | --- | --- | --- |
| LinearMap "Reset to the identity" | linear/LinearMapGraph.tsx:159-163, button :409 | matrix and `exampleId` to identity; mode, the three display switches, `testAngle` and the view stay; notice cleared | **No.** No Preset: host Reset restores all of `DEFAULT_LINEAR_MAP_STATE` (identity, mode `basis`, `testAngle` 0, all switches true; `src/linear/linearMapModel.ts:39-47`) plus the starting view; the local button is a subset. Preset selected: host loads the Preset's matrix, local still gives identity. Equal only on a default-mode, default-switch scene with no Preset. |
| Rational "Reset weight" | base/controls/RationalBezierCurveControls.tsx:46; `curves/object/JXGRationalBezierCurve.ts:381` | current weight of the selected curve to 1 | **No.** Host reloads the whole scene. |
| PlaybackButtons Reset (shared, run-scoped) | base/controls/PlaybackButtons.tsx:69 | the run, not the scene (used outside my directories) | Different scope; same label "Reset" as host (`ResetButton.tsx:7`). |

No Reset in the complex panels (`ComplexRootsGraph.tsx:71` notes none is needed), Bernstein or the playground (Clear and Load example are undoable scene edits, `DrawingPlayground.tsx:277-281`).

## Spec differences

- **C23 last sentence** ("Lesson actions skip the guard, though `model.ts` promises a message for Correlation"): the message is not lost. It reaches the learner through `GuidedLesson`'s startup-error view (Item 5), but the lesson is stranded there with only Close.
- **Decision 8 / C18** name LinearMap, Correlation and Simson only; the complex panels refuse typed off-grid values with a hint, so decision 8 changes them too.
- **C9 "own Reset buttons in 10 files":** my directories add LinearMap's Reset and the rational Reset weight (a weight-scoped reset the catalogue does not name).
- **Decision 11:** `PointCoordinateEditor` mounts in `BaseCurveGraph` only when `workspaceUsesStructuredEditing()` is true (:181; the default is false, :149; true in Bezier, CurvatureBezier, Envelope, PH, Comb cubic, Offset bezier). PH uses it too via `BasePhBezierCurveGraph`. Other curve graphs need a typed path of their own; I did not check them (item 2 belongs to other parts).
- C26 "`NumberInput` (ComplexRoots)" is correct (`ComplexRootsGraph.tsx:329`).

## Handoff

Written under a budget signal, but all assigned items are answered. Unchecked: line numbers marked approximate (`~`) and the base `PresetSelector` figure-batch modal (`ImageGenerationModal`, :60-115) were only skimmed; the two playground files and `LearningPrompt` were read at the JSX level only. Nothing was run in a browser.
