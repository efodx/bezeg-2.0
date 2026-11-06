# Shared graph controls

**Status:** draft, 2026-11-07. The owner approved all panels and confirmed C1–C15 and decisions 1–5. C16–C30, the extended rows and decisions 6–11 come from the second audit and await the owner's confirmation. No task files exist.

Widens [workstream 1 of lesson-authoring architecture](lesson-authoring-architecture.md#1-shared-inspector-controls), which stops after two panels. Its numeric event table, boolean variants, test fixture and lint rule still apply, except where this spec changes them. Builds on [demonstration controls UX](demonstration-controls-ux.md) and [playback button reasons](playback-button-reasons.md).

## Rule

**One capability, one control.** When two graphs offer the same capability, they use the same shared control and it behaves the same way: same placement of new items, same limits handling, same feedback, same commit timing, same keyboard use.

A graph supplies only its domain: values, bounds, grid, conversions, commands and localized text. Mathematics stays in the graph or domain module.

A special control is a last resort. It is allowed only where a technical or mathematical reason makes the common control hard to use. Each exception names its reason in the lint exemption list. A new graph that needs a capability with no shared control adds one, rather than writing a local version.

## Audit

Seven read-only Haiku audits covered the 134 control files on 2026-11-06 at `0bf7348e`. All stopped early at their budget, so this catalogue is a strong sample and not a complete inventory. The handler checked the claims marked in the [evidence notes](#evidence-notes) against source. Task 0 completes the inventory.

A second audit on 2026-11-07 took five angles: readouts, board interaction, control logic and lesson commands, unread panels, and wording and layout. All five stopped partial. The handler spot-checked their main claims against source and dropped or corrected the rows listed in the [evidence notes](#evidence-notes). Its reports are in [`docs/reviews/shared-graph-controls/`](../reviews/shared-graph-controls/); where a report and this spec differ, this spec is the checked version.

## Capability catalogue

| # | Capability | Today | Target |
| --- | --- | --- | --- |
| C1 | Add point | Five behaviours: board click in Add mode plus typed form (curves); Add toggle, snapped click and integer form (PointSet); `CountSetter` + placing the point right of the last point (Interpolation, Subdivision, Correlation) or the rightmost point (Least squares); first free grid position (zeros); Add value at the median (Summary statistics). The lesson `add-point` of Interpolation, Hermite and Correlation takes no coordinates | One point-collection control: + button, optional typed entry, optional board Add mode. Those lesson commands gain optional coordinates (decision 1) |
| C2 | Remove point | Last only (−), selected only (PointSet), per row (curves, zeros, segments), board Delete mode. Silent at the minimum on the curve board | Same control as C1, with a stated reason at the minimum |
| C3 | Clear all | PointSet only | Offered through C1 where a graph allows an empty set |
| C4 | Edit coordinates | Seven forms: `PointListInput`, `PointCoordinateEditor` (Apply all), patch `PointEditor` (Apply, xyz), `IntegerField` in PointSet and CrossRatio, `CoordinateField` in FivePoint, `StepField` in PolePolar, Voronoi query (Set), `IntField` in Simson and a different `IntField` in Inversion, and a second `CoordinateField` in PointInPolygon that shares only its name with FivePoint's | One point list with axis count, grid or step, and bounds as props |
| C5 | Count stepper | `CountSetter`, plus hand copies in Taylor, UniformConvergence, Runge, Fourier and Epicycle | `CountSetter` only |
| C6 | Unavailable control | Native `disabled` with no reason (`CountSetter`, PointSet Remove and Clear, curve mode buttons, Decasteljau, PolygonArea Reverse, patch Elevate with the reason in nearby help) versus focusable `aria-disabled` with a reason (`PlaybackButtons`) | One protocol: the `PlaybackButtons` model everywhere |
| C7 | Refusal feedback | Field hint, page alert, status line, silent clamp (CrossRatio, FivePoint, PolePolar), silent ignore (`ignoreOutOfDomain` with `CountSetter`, choices and drags) | One channel; nothing is refused silently |
| C8 | Commit timing | `NumberInput` and the raw fields in Simson, Inversion, InscribedAngle and PointInPolygon commit per keystroke; lists, `CountSetter`, matrix entries and complex modulus use Enter or blur; Voronoi and patches need a button | One rule (decision 2) |
| C9 | Reset | Host Reset on every graph, plus own Reset buttons in 10 files, plus playback Reset. Scope differs: whole model, example origin, or step only. Restoring an example has two labels: "Back to the example" (B-spline) and "Reset example" (Voronoi) | Host Reset for the scene; playback Reset for the run, with a distinct label; local Reset only as a named exception |
| C10 | Choose example | `ChoiceSelect` in most graphs; button rows in Delaunay, EarClipping, Fortune, both Monotone graphs, Voronoi, CrossRatio, Pascal and FivePoint; button rows in PointInPolygon and the patch starting nets and join scenes; raw select in Euler, Notable, Inversion, Simson and InscribedAngle. The `custom` entry takes four forms: left out of the options, a stored string, a disabled option, or filtered in `onChange` | One example chooser with one `custom` rule |
| C11 | Show or hide | `OnOffSwitch` (45 files), raw reveal buttons (15), raw checkbox (3) | `OnOffSwitch` for display settings; one shared Reveal button for results hidden until asked, which the UX spec keeps on purpose |
| C12 | Playback | `PlaybackButtons` in 18 files; own versions in Decasteljau, ArcLength, Parametric roll, Epicycle, Euler and Voronoi construction | `PlaybackButtons`, extended for Back or Show all if two graphs need them |
| C13 | Slider | Raw range in ThreeViews, Simson, Inversion and InscribedAngle; the same parameter has different steps (alpha, `t`). Simson, Inversion and InscribedAngle each copy an angle slider with a degrees field; BinomialNormal pairs a slider with an exact field | `Slider` only, with shared step conventions and an optional exact field |
| C14 | Select point | The same `aria-pressed` toggle written separately in PointSet, PointInPolygon, CrossRatio, FivePoint, Pascal and PolePolar | One selectable-point row |
| C15 | Curve operations | Two panels with different preview state (`CurveWorkspaceControls`, `BezierCurveControls`), plus raw Slider and Button in the Extrapolation, Elevation and Subdivision graphs and their rational versions | One operation panel |
| C16 | Selected-point keys | An arrow moves one grid step (PointSet), one unit (CrossRatio), 1/5 (FivePoint), 0.2 (PolePolar) or one conic position (Pascal). Shift means a unit, five positions or nothing. Delete works only on PointSet. Escape cancels a pending point there and deselects in PointInPolygon | One key handler: the graph declares its step and big step. Shift is always the big step, Delete works wherever removal does, Escape always backs out |
| C17 | Value-step keys | Simson and InscribedAngle: arrows 1, Shift or Page 10. Inversion: Shift 10, Page keys left to the browser. Epicycle, Fourier and Inversion fields: Shift with Up or Down only. Simson's integer field has no big step | One keymap in `Slider`, `CountSetter` and `NumberInput`: arrow is one step, Shift or Page is the big step |
| C18 | Drag snap, limits and cursor | Grids differ (integer, 1/5, tenths, grid exponent, none on curves). At the limit CrossRatio and Interpolation clamp silently; PointSet and Correlation refuse with a notice. The movable-point cursor is missing on all compgeo and projective points | One drag helper taking the graph's step and following decisions 3 and 7, and one point factory that binds the cursor |
| C19 | View after an edit | Add refits always (Interpolation, Hermite, Subdivision) or only when outside (Correlation, Summary statistics). Typed edits refit when outside on those graphs; Simson and Inversion only report it; PointSet and Least squares do nothing. The out-of-view test is copied in the curve graphs | One view policy (decision 6) |
| C20 | Fit and view Reset | Host "Fit to points", plus inspector buttons "Fit the view to the bars" (Binomial) and "Fit the view to the curve" (Density), plus Show all (Notable, EulerLine). "Reset view" in Voronoi, Fortune and three patch panels. Camera presets and angle sliders are copied into three patch panels | Host Fit only, with the graph supplying bounds through `fitView`. One view Reset label. One camera panel. Show all is removed if task 0 finds it equal to Fit |
| C21 | Live announcements | `LiveReadout` with a 500 ms settle (curves), a hand-written hidden paragraph per step (compgeo), a visible status group that re-reads every line (functions). "Silent during Play" is written six times, and Sequence and De Boor have no such gate. `controlsSignature` skips only curve readouts | `LiveReadout` for every graph readout, with one mute-during-Play rule and one marker the test harness reads |
| C22 | Notice storage | Private `notice` with `setNotice` copied in CLT, Correlation and Summary statistics; `rejectionValue` (Epicycle); state enums (Interpolation, Subdivision); `noticeValue` (PointSet); `EntryNotice` (LinearMap); a subscribe store (zeros). Refusals inside a status group are read with all its lines | One notice channel, shown alone. It carries the C7 message and clears on accept |
| C23 | Refusal guards | `ignoreOutOfDomain` discards the reason at about 185 call sites; `guarded()` shows it in three graphs; curve `editPoint` returns a string. Add at the maximum and remove at the minimum return silently on Interpolation, Hermite, open Subdivision and Least squares. The curve minimum lives in four places. Epicycle keeps a stale refusal after an accepted no-op. Lesson actions skip the guard, though `model.ts` promises a message for Correlation | One guard for inspector and lesson paths. Models return the refusal, the guard shows it, and accepted edits clear it |
| C24 | Playback wiring | Delaunay, EarClipping and HullTrace define the same `nextStep`, `play` and `pause` with `exportBusy` and `atEnd` guards; about eight more graphs use `exportBusy`. Subdivision pauses on every accepted edit, Epicycle only on a changed model | One playback helper with one pause-on-edit rule |
| C25 | Mode chooser | Unnamed `workspace-modes` buttons, `role=group` rows, raw selects (Simson mode, Inversion focus and source kind, tolerance in Bezier clipping) and `ChoiceSelect`. Six nouns name it. Conic choice is a pressed row in Pascal and PolePolar, a select in ConicFocal | One rule (decision 9) and one group noun per kind |
| C26 | Degree chooser | Hand stepper with `NumberInput` (Taylor, Runge), `NumberInput` (ComplexRoots), `CountSetter` (CnSpline, Least squares), `ChoiceSelect` (B-spline Basis, Blossom, De Boor; Tensor, Triangular and join patches, with `DEGREES` copied three times) | `CountSetter` (decision 10) |
| C27 | Readout blocks | `data-readout` is a label and value pair in functions and a sentence in compgeo. Lists use `dl`, `ul` with `aria-label`, or `ul` under a heading. Headings are styled three ways. Help is sometimes `role=note`. Epicycle's scroll table is a focusable region, Bezier clipping's is not. Monotone counts steps from 0, the others from 1 | One readout list, heading, help element and table wrapper, and one 1-based `StepCounter` |
| C28 | Number formats | `degrees()` copied twice with fixed decimals ("30,00" against "30"). Tiny values in two notations from five helpers: `·10⁻⁷` (Simson, hull robustness, five-point) and `e-7` (NURBS, Bisection). Decasteljau shows `t = 0.50` with a point in Slovenian | `formatNumber` plus one `formatDegrees` and one `formatScientific` in `src/analysis/format.ts`, in `·10⁻⁷` form |
| C29 | Shared labels and keys | "Next step" on 12 keys, "Add point" and "Show error bound" on two each; Remove against Delete; four Clear keys; three playback Reset labels; four Back labels; six aria-labels on one +1 stepper; three copies of one B-spline example set | One key per shared meaning, moved with its control. Slovenian and English stay in lockstep |
| C30 | Inspector layout | `pointset-check`, `pointset-row`, `simson-slider-row`, `inscribed-slider-row` and `rational-weight-*` have no CSS rule. Taylor, Fourier, Runge and UniformConvergence borrow `CountSetter` classes; `bisection-actions`, `demo-actions` and `inspector-playback` are reused across unrelated graphs | Layout classes belong to the shared control. Unused hooks go |

## Likely exceptions

To be confirmed one by one in task 0: 2×2 matrix entry, knot vectors, the multiplicity field of zeros, segment and interval rows (they edit pairs), Pascal stepping along a conic, affine transform buttons, patch control-point choice by index (a net needs two indices and has too many points for a C14 row; one shared chooser replaces the three `NO_INDEX` copies and Coons's `NO_SELECTION`), and `stepOutOfBand` on the derivative `h` slider (a domain rule the graph applies, so `Slider` stays).

Not catalogued: degree elevation, split at a value, linked corners, join continuity and Reverse order. Each is a one-family domain action built from shared parts, so only C6 and C7 apply to them.

## Owner decisions — confirmed 2026-11-07

1. **Where a new point lands.** Explicit coordinates always win: a lesson action, typed entry or board click adds exactly there. Without coordinates, the graph's own placement rule applies if it has one. Otherwise the shared default applies: one unit right of the last point, or left at the limit. Every add command accepts coordinates, so lessons can use them. Zeros keep their first-free-position rule as a placement rule, not an exception.
2. **Commit timing.** Typed fields commit on Enter or blur. Sliders, steppers and drags apply immediately. This replaces the workstream 1 rule that preserves each field's current policy.
3. **Out-of-range input.** Typed values are refused with a message and never clamped. A drag stops at the limit without a message.
4. **Examples.** Always a select.
5. **Local Reset buttons.** Removed where the host Reset gives the same result. One stays only as a named exception.

## Proposed decisions — awaiting the owner

6. **View after an edit.** Recommended: an added or typed point that lands outside the view refits it; a point inside never moves the view; a drag never refits. Objects the graph derives (triangle centres, Simson feet) keep the outside-the-view report. This changes the always-refit add on the curve graphs and adds a refit to PointSet and Least squares.
7. **Keyboard limits and drag refusals.** Recommended: an arrow or Shift step behaves like a drag, stopping at the limit without a message. Decision 3's silence covers coordinate limits only: a drag or step refused by a mathematical rule, such as Interpolation's repeated parameter, keeps its stated reason. An axis a point cannot move on does nothing and needs no message.
8. **Typed values off the grid.** `LinearMapGraph` clamps and snaps typed entries with a notice, and the clamping contradicts decision 3. Correlation snaps silently and Simson's integer fields ignore the entry. Recommended: outside the range is refused, including on LinearMap; in range but off the grid snaps to the grid with a short notice, everywhere.
9. **Mode chooser.** Recommended: board tools such as Add and Delete stay a named pressed-button group, because the active tool must stay visible from a projector. Every other mode is a `ChoiceSelect`, including conic type.
10. **Degree chooser.** Recommended: `CountSetter` for every degree. All option lists checked are consecutive integers, and a degree is a count, so C5 already covers it. The B-spline and patch selects change.
11. **Keyboard on curve and function boards.** Recommended: no arrow-key nudges there. The typed list, already labelled for keyboard editing in `PointCoordinateEditor`, stays the keyboard path; adding nudges would need a selection model on those boards. Task 0 confirms that every draggable point has a typed path.

## Acceptance

1. Every capability in the catalogue has one shared control, or a named exception with its reason.
2. Lint fails on a raw input, range, select or stepper in graph code outside the exemption list, and the list shrinks to the confirmed exceptions.
3. Two graphs offering a capability pass the same shared behaviour test: placement, limit, refusal, commit, Escape, keyboard and Reset.
4. No control is unavailable or refuses without a stated reason.
5. Workstream 1's I1–I5 hold for every migrated panel, in both languages.
6. Lessons, Presets and synchronous multi-action scenes behave as before, except for the confirmed changes above. Mathematical meaning is unchanged.
7. The [lesson-family template](../tasks/feature-streams/README.md#family-template) tells new graphs to use the shared controls.

## Order

1. **Task 0:** finish the inventory per panel, and confirm exceptions. Read-only.
2. **Foundation:** workstream 1 inputs, the protocols in C6–C8, the keymap in C17, the channels in C21–C23, the formats in C28, the fixture and the lint rule with every current bypass exempted, so new graphs comply from then on.
3. **Shared controls:** C1–C5, C14, C16, C18 and C19, piloted on PointSet, Interpolation and the curve workspace.
4. **Family sweeps,** one per family, shrinking the exemptions: compgeo, projective, functions, curves, patches. Run after contracts task 3, which likely touches the same panels.
5. **C9–C13, C15, C20, C24–C27, C29 and C30.**
6. **Phone playback** ([spec](mobile-graph-playback.md), approved 2026-11-06), once C12 and C24 settle the playback control.

## User impact

Some controls move, gain reasons or change commit timing. No route changes are planned, and no stored Preset changes. Any local Reset removal is recorded here when confirmed. If confirmed, the second audit adds these visible changes: PointSet and Correlation drags lose their limit notice; Monotone steps count from 1; Delaunay and Triangulation angles lose trailing zeros; NURBS and Bisection show tiny values as `·10⁻⁷`; B-spline and patch degree selects become steppers; LinearMap refuses out-of-range entries; and the curve graphs stop refitting after an add that stays in view, which can change lesson views.

## Evidence notes

Checked against source by the handler:

- **Add rules:** `correlationModel.ts` and `InterpolationGraph.addPoint` use the last point; `addLsqPoint` uses the rightmost.
- **Reset:** `PresetSelector` gives every graph a host Reset. Audit rows saying Taylor and others have no Reset were wrong.
- **Rational weights:** `setWeight` has no guard, so the ±0.25 buttons can reach a weight of zero or below, an open item in the [control inventory](../tasks/demonstration-controls-ux/inventory.md). Refusal under C7 should close it.
- **Silent clamp:** `crossRatioEdit.ts` clamps to its coordinate limit with no message.
- **Curve board delete:** `CurveEditingFeature` ignores a delete at one point with no message.
- **`ValueListInput`:** a click on an unavailable remove button still calls `onRemove`. This is documented in its props, so the host can explain the refusal; it is not a defect.

Second audit, checked by the handler. Confirmed unless listed here:

- **`Select.tsx`:** no importers, so report row 18 is right and the first audit's count of about eight was wrong. The file is dead code; remove it in the foundation.
- **Step keys:** Simson and InscribedAngle share one key map. The board report's row 9 implied they differ. Inversion's Page keys are not dead: they fall through to the browser.
- **Fit:** the board report said one label covers several framings. The labels differ, and the real problem is a second Fit action beside the host's.
- **Show all:** only Notable and EulerLine have it, not Simson or Inversion. The `show-all` in `EulerGraph` is a separate playback action.
- **Patch Elevate:** it uses native `disabled` with nearby help, so it does not follow C6 as the report said.
- **Scientific notation:** five helpers but two notations. Five-point uses a true superscript minus, not an ASCII hyphen.
- **"Next step":** 12 keys, not five. **`ignoreOutOfDomain`:** about 185 calls across `src/graphs`, not 164.
- **Drag notices:** Correlation also refuses a drag with a notice, which the report missed. Interpolation's `movePoint` clamps, though its comment says refused.
- **InscribedAngle slider:** it sends a delta on purpose, to keep the direction of motion. This is implementation detail and no pattern.
- **Lesson add at the cap:** `applyLessonAction` has no `DomainError` handling, so a Correlation add at the cap leaves it as a throw. No lesson calls it today, and the outer runner's handling was not traced.
- **Monotone step base:** read from code, not run. Screen-reader speech during Play was not tested in any browser.

The 12 commits on `origin/master` at this check touch none of `src/graphs`, `src/inputs`, `src/localization` or `src/learning/model.ts`, so the citations also hold there.

Counts are from text search, so treat them as approximate. Not audited in full: about 15 function graph bodies, Coons and Triangular patch behaviour, focus order, zoom and pan keys, selection hit-testing, patch surface drag, and `src/learning/playground`.
