# Shared graph controls

**Status:** scheduled, 2026-11-07. The owner approved all panels and confirmed C1–C30 and decisions 1–11. Tasks: [shared graph controls queue](../tasks/shared-graph-controls/README.md), run by the [`controls` stream](../tasks/feature-streams/controls.md).

Widens [workstream 1 of lesson-authoring architecture](lesson-authoring-architecture.md#1-shared-inspector-controls), which stops after two panels. Its numeric event table, boolean variants, test fixture and lint rule still apply, except where this spec changes them. Builds on [demonstration controls UX](demonstration-controls-ux.md) and [playback button reasons](playback-button-reasons.md).

## Rule

**One capability, one control.** When two graphs offer the same capability, they use the same shared control and it behaves the same way: same placement of new items, same limits handling, same feedback, same commit timing, same keyboard use.

A graph supplies only its domain: values, bounds, grid, conversions, commands and localized text. Mathematics stays in the graph or domain module.

A special control is a last resort. It is allowed only where a technical or mathematical reason makes the common control hard to use. Each exception names its reason in the lint exemption list. A new graph that needs a capability with no shared control adds one, rather than writing a local version.

## Audit

Seven read-only Haiku audits covered the 134 control files on 2026-11-06 at `0bf7348e`. All stopped early at their budget, so this catalogue is a strong sample and not a complete inventory. The handler checked the claims marked in the [evidence notes](#evidence-notes) against source. The [inventory](../tasks/shared-graph-controls/inventory.md) completes it.

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
| C24 | Playback wiring | Delaunay, EarClipping and HullTrace define the same `nextStep`, `play` and `pause` with `exportBusy` and `atEnd` guards; about eight more graphs use `exportBusy`. Subdivision pauses on every accepted edit, Epicycle only on a changed model | The shared policy from [contracts task 3](../tasks/mathematical-runtime-contracts/03-shared-trace-playback.md), with no second helper, and one pause-on-edit rule |
| C25 | Mode chooser | Unnamed `workspace-modes` buttons, `role=group` rows, raw selects (Simson mode, Inversion focus and source kind, tolerance in Bezier clipping) and `ChoiceSelect`. Six nouns name it. Conic choice is a pressed row in Pascal and PolePolar, a select in ConicFocal | One rule (decision 9) and one group noun per kind |
| C26 | Degree chooser | Hand stepper with `NumberInput` (Taylor, Runge), `NumberInput` (ComplexRoots), `CountSetter` (CnSpline, Least squares), `ChoiceSelect` (B-spline Basis, Blossom, De Boor; Tensor, Triangular and join patches, with `DEGREES` copied three times) | `CountSetter` (decision 10) |
| C27 | Readout blocks | `data-readout` is a label and value pair in functions and a sentence in compgeo. Lists use `dl`, `ul` with `aria-label`, or `ul` under a heading. Headings are styled three ways. Help is sometimes `role=note`. Epicycle's scroll table is a focusable region, Bezier clipping's is not. Monotone counts steps from 0, the others from 1 | One readout list, heading, help element and table wrapper, and one 1-based `StepCounter` |
| C28 | Number formats | `degrees()` copied twice with fixed decimals ("30,00" against "30"). Tiny values in two notations from five helpers: `·10⁻⁷` (Simson, hull robustness, five-point) and `e-7` (NURBS, Bisection). Decasteljau shows `t = 0.50` with a point in Slovenian | `formatNumber` plus one `formatDegrees` and one `formatScientific` in `src/analysis/format.ts`, in `·10⁻⁷` form |
| C29 | Shared labels and keys | "Next step" on 12 keys, "Add point" and "Show error bound" on two each; Remove against Delete; four Clear keys; three playback Reset labels; four Back labels; six aria-labels on one +1 stepper; three copies of one B-spline example set | One key per shared meaning, moved with its control. Slovenian and English stay in lockstep |
| C30 | Inspector layout | `pointset-check`, `pointset-row`, `simson-slider-row`, `inscribed-slider-row` and `rational-weight-*` have no CSS rule. Taylor, Fourier, Runge and UniformConvergence borrow `CountSetter` classes; `bisection-actions`, `demo-actions` and `inspector-playback` are reused across unrelated graphs | Layout classes belong to the shared control. Unused hooks go |

## Likely exceptions

Decided in task 0 on 2026-11-07; evidence in the [inventory](../tasks/shared-graph-controls/inventory.md). Each entry names the shared control it would otherwise use. The lint exemption list carries the same reasons.

| Exception | Instead of | Reason |
| --- | --- | --- |
| Knot vectors (`KnotEditor`) | C4 | A knot edit must keep the vector ordered, so each row depends on its neighbours |
| Multiplicity field of zeros | C4 | Each entry pairs a position with a multiplicity of 1–3. The list otherwise uses the C1, C2 and C4 parts, and first-free placement stays a placement rule (decision 1) |
| Segment and interval rows | C4 | Each row edits a pair of endpoints |
| Pascal stepping along a conic | C16 | A step moves along a direction table and wraps; it is not a coordinate step |
| Affine transform buttons | C1, C4 | They act on the whole curve, not on one point |
| Patch control-point choice by index | C14 | A net needs two or three indices and has up to 25 points. One shared chooser replaces the three `NO_INDEX` copies and Coons's `NO_SELECTION` |
| `stepOutOfBand` on the derivative `h` slider | C13 | `h` cannot be zero, so the graph skips a dead band. `Slider` stays |
| Surface camera panel with Reset view | C20 | Surface demonstrations have no host Fit, and the camera is orbit angles, not a bounding box. One shared camera panel replaces the three copies |
| Epicycle Play and time slider | C12 | Time runs continuously and does not stop at a step. Revisit in task 4: if a second graph needs a continuous run, extend `PlaybackButtons` instead |
| FourierSeries "zoom to peak" | C20 | The peak window is a domain-chosen view, not a fit to the drawing. Its "whole view" button goes if task 4 confirms it equals Fit |
| Drawing playground toolbar | C1–C3 | It has its own anchor model: handle types, a cap of 32, undo history and no grid. C6 and C16 still apply |
| Rational "Reset weight" | C9 | It restores one weight, which the host Reset cannot do |
| LinearMap "Reset to the identity" | C9 | It is a domain action on the matrix: mode, display switches, test angle and view stay |
| "Reset example" on Voronoi, B-spline Extraction, Insertion and Nurbs | C9 | It returns to the example now chosen, while the host Reset returns to the default or Preset. One label and one key, owned by the example chooser (C10) |
| TensorJoin "Back to the two patches" | C9 | It leaves the capstone mode, so it is not a Reset |

Not exceptions, though audits or task 0 suggested them:

- **2×2 matrix entry:** LinearMap's four entries are already `NumberInput`.
- **Cyclic angle fields** (Simson, InscribedAngle, Inversion): `Slider`'s exact field gains a cyclic property that wraps a value. Decision 3's refusal does not apply to a cyclic value.
- **Query points** (PointInPolygon, Voronoi): the point list gains a single-point form with no add or remove.
- **Complex argument at `w = 0`:** it stays unavailable because the argument of zero is undefined, under the C6 protocol.
- **Board tools:** decision 9 already keeps them a named pressed-button group.

Not catalogued: degree elevation, split at a value, linked corners, join continuity, Reverse order, and Triangulation edge select and Flip. Each is a one-family domain action built from shared parts, so only C6 and C7 apply to them.

## Owner decisions — confirmed 2026-11-07

1. **Where a new point lands.** Explicit coordinates always win: a lesson action, typed entry or board click adds exactly there. Without coordinates, the graph's own placement rule applies if it has one. Otherwise the shared default applies: one unit right of the last point, or left at the limit. Every add command accepts coordinates, so lessons can use them. Zeros keep their first-free-position rule as a placement rule, not an exception.
2. **Commit timing.** Typed fields commit on Enter or blur. Sliders, steppers and drags apply immediately. This replaces the workstream 1 rule that preserves each field's current policy.
3. **Out-of-range input.** Typed values are refused with a message and never clamped. A drag stops at the limit without a message.
4. **Examples.** Always a select.
5. **Local Reset buttons.** Removed where the host Reset gives the same result. One stays only as a named exception.
6. **View after an edit.** An added or typed point that lands outside the view refits it; a point inside never moves the view; a drag never refits. Objects the graph derives (triangle centres, Simson feet) keep the outside-the-view report. This changes the always-refit add on the curve graphs and adds a refit to PointSet and Least squares.
7. **Keyboard limits and drag refusals.** An arrow or Shift step behaves like a drag, stopping at the limit without a message. Decision 3's silence covers coordinate limits only: a drag or step refused by a mathematical rule, such as Interpolation's repeated parameter, keeps its stated reason. An axis a point cannot move on does nothing and needs no message.
8. **Typed values off the grid.** `LinearMapGraph` clamps and snaps typed entries with a notice, and the clamping contradicts decision 3. Correlation snaps silently and Simson's integer fields ignore the entry. Outside the range is refused, including on LinearMap; in range but off the grid snaps to the grid with a short notice, everywhere.
9. **Mode chooser.** Board tools such as Add and Delete stay a named pressed-button group, because the active tool must stay visible from a projector. Every other mode is a `ChoiceSelect`, including conic type.
10. **Degree chooser.** `CountSetter` for every degree. All option lists checked are consecutive integers, and a degree is a count, so C5 already covers it. The B-spline and patch selects change.
11. **Keyboard on curve and function boards.** No arrow-key nudges there. The typed list, already labelled for keyboard editing in `PointCoordinateEditor`, stays the keyboard path; adding nudges would need a selection model on those boards. Task 0 confirms that every draggable point has a typed path.

## Delegated decisions

On 2026-11-07 the owner handed every further decision in this work to the handlers: no confirmation is needed, and the owner asks for a change later if a result is unwelcome. The handler decides exceptions, Reset removals and any new question, and records each here or in *Likely exceptions* with its reason and the alternative it rejected, so the choice is easy to find and reverse.

### Decided in task 0 — 2026-11-07

Each entry gives the choice, its reason and the rejected alternative.

1. **Reset removals (decision 5).** Remove the local Reset on FunctionInverse, FunctionTransformation, PolynomialZeros, RationalFunction and Blossom. They restore the default model, which is the host result with no Preset selected. With a Preset selected they ignore it, and returning to the Preset is the better result. Rejected: keeping them for the case where they differ, since that difference is the defect. Run-scoped resets are not removed: De Boor "Back to level 0", Voronoi "Reset construction" and SubdivisionCurve "Reset polygon" become the playback Reset (C9).
2. **Show all and view Reset (C20).** Remove Show all from Notable, where it equals Fit, and from EulerLine, where it does not: EulerLine overrides `fitView` to add H, G, O and N when shown, so Fit frames everything Show all did and the nine-point markers too. Voronoi and Fortune "Reset view" go the same way, with `fitView` returning the frame or run box. Rejected: keeping them as exceptions, because `fitView` is an existing seam (`HullRobustnessGraph`, `BSplineBasisGraph`) and the target is host Fit only.
3. **Off-grid typed values (decision 8).** "Everywhere" includes the function models and the three complex panels, which refuse off-grid values today. The snap and its notice belong to the shared field, which rounds to the graph's grid before calling the model. Models keep refusing off-grid values, so imported Presets and lesson actions are still checked. Rejected: making the models round, which would weaken "reject, never clamp" (`gridValue`, `BaseFunctionGraph.tsx`) and accept malformed imports.
4. **Typed paths (decision 11).** Task 0 could not confirm that every draggable point has a typed path: most curve boards have none. Those boards gain the shared point list (C4), in the curves sweep. Decision 11's "no arrow nudges" stands. A keyboard-operable control that fully sets a point with one degree of freedom counts as its path, so ConicFocal P keeps its φ slider, with the optional exact field (C13). Rejected: arrow nudges, which need the selection model decision 11 ruled out, and accepting the gap, which leaves those boards without a keyboard path.
5. **What counts as outside the view (decision 6).** The test uses what the graph frames, including Hermite tangent tips. Otherwise the second add in `hermite-locality-six` leaves an arrow clipped by about 0.05. Rejected: testing the point alone, which is the literal wording but clips a visible object.
6. **Refused lesson actions (C23).** A lesson action refused by the model stays a thrown `DomainError`. The session restores its checkpoint and the lesson shows the reason with Close. A refused authored action is a content defect, and a loud failure finds it. The guard's single refusal message still applies. Rejected: refusing quietly and continuing, which would show a scene that does not match its text.
7. **Drag refusals (decisions 3 and 7).** Beyond PointSet and Correlation, all PointSet subclasses, Summary statistics and the PointInPolygon and Voronoi query points lose their limit notice. The opposite gap closes too: `axisPoint` and B-spline knot-marker drags refused by a mathematical rule are silent today and gain a stated reason.

### Decided in task 1 — 2026-11-07

8. **Unparseable drafts (slice 1a).** Enter or blur on a draft that is not a number shows the range hint, or the general hint without limits, and commits nothing; typing alone stays silent. Reason: with Enter or blur as the only commit, a silent Enter reads as a dead key. Rejected: keeping the silent revert, which was harmless only while every keystroke committed.
9. **Retyping the shown text (slice 1a).** A draft equal to the field's displayed text writes nothing, even when the model holds more digits. Reason: the field looks the same either way, and a write would change the model invisibly. Rejected: committing every edited draft.
10. **Boolean variants (slice 1b).** `BooleanField` is one native checkbox in a switch or a checkbox look, with no added role, because the switch had none and a visual variant does not justify a different protocol. `OnOffSwitch` stays as its switch variant, so its 48 callers did not change. Rejected: migrating every caller now, which only renames.
11. **Number keyboard (slice 1b).** `inputMode="decimal"` only when a field cannot go negative; otherwise `text`. Reason: iOS decimal keypads may lack a minus sign. Rejected: a decimal keypad everywhere, which can make negative values impossible to type on a phone.
12. **High contrast (slice 1b).** Under forced colours the boolean field falls back to the system checkbox, so a switch looks like a checkbox there. Reason: forced colours drop the custom track colours, and the on state lost its thumb. Rejected: recolouring the custom track with system colours, whose SVG thumbs forced colours do not recolour.
13. **Unavailable controls (slice 2a).** `UnavailableButton` carries the `PlaybackButtons` model: an unavailable button stays focusable with `aria-disabled`, gives its reason in `title` and a linked description, and a press shows the reason in its owner's status region; `PlaybackButtons` and `CountSetter` use it. An unavailable `NumberInput` is read-only with `aria-disabled` and shows its reason as its hint. Reason: native `disabled` drops focus and gives no reason. Rejected: native `disabled` with nearby help, which a keyboard user cannot reach.
14. **Where refusals speak (slice 2a).** A model refusal goes to the graph's one `RefusalChannel`, shown alone by `RefusalNotice` and cleared by the shared `guard` on the next accepted edit, including an accepted no-op. Typed-field checks (unparseable, out of range, snapped to the grid) stay in the field's own hint. Reason: a field hint is linked to the field that caused it, so a screen reader reads it with the field. Rejected: routing field checks through the graph channel, which separates the message from its field.
15. **A draft when the field becomes unavailable (slice 2a).** An open draft is dropped and the field shows the reason; a draft open when the field unmounts is dropped silently. Reason: a commit would be refused anyway, and an unmounting field has nowhere to explain. Rejected: committing the draft on unmount, which writes to a graph during teardown.
16. **Snap rounding (slice 2a).** The shared field rounds an off-grid value half away from zero, range-checks the result, and names the value it used with enough decimals for the grid. With `integer`, `grid` must be a whole number.
17. **Drag refusals (slice 2b).** Every function graph owns one `RefusalChannel` in `BaseFunctionGraph`, shown once after the readout; a model refusal of an `axisPoint` drag shows its reason there, repeated drag frames do not announce it again, and an accepted write, Reset, Preset or lesson checkpoint clears it. A B-spline knot-marker drag that would make the vector invalid shows the same reason a typed value gets; the clamp to the neighbours and the limit stays silent. Reason: decision 7 keeps a reason for a mathematical refusal. Rejected: a channel per subclass, which would let Correlation show two notices.
18. **One readout region and the Play mute (slice 3).** `LiveReadout` (`src/graphs/base/controls/`) is a graph's one readout region; while `muted` (callers pass `muted={playing}`) it is present and empty, and on unmute it shows the current text at once, so Pause or the end of a run announces the state once. A visible status block keeps its text but is no longer itself live; the `LiveReadout` carries the announcement. Notice regions (a field hint, `RefusalNotice`, the playback reason, the count status) stay empty until something is refused, so they never speak unprompted and are outside the one-region rule. Reason: a run that ticks every 400 ms floods a screen reader, and a visible group that re-reads every line on each change does too. Rejected: `aria-live="off"` on the visible group during Play, which leaves Pause silent because the text does not change.
19. **Field-hint announcement (slice 3).** `NumberInput`'s hint sits in an always-mounted, role-less polite wrapper, so a hint that appears is announced; the hint keeps its id for `aria-describedby`. Reason: a status inserted together with its text is not reliably announced. Rejected: an always-mounted `role="status"` per field (tried in 2a), which breaks the one-status-per-area count; routing hints through the graph channel, which decision 14 rejected.
20. **Signature marker (slice 3).** `data-readout-live` is the one marker `controlsSignature` skips; the signature also reports `aria-disabled` inputs and buttons as unavailable, since slice 2a's buttons no longer use native `disabled`.
21. **Formats (slice 4).** `formatDegrees` is the number text only (the `°` stays in the catalog strings), with trailing zeros dropped. `formatScientific` always writes `mantissa·10ⁿ` with trimmed mantissa zeros, and `formatSignificant` uses it outside its plain range. A parameter that moves while animating, such as De Casteljau's `t`, keeps two fixed decimals with the language's separator so its width stays steady. Simson's area ratio keeps its own helper, because it shows one fixed mantissa decimal. Rejected: one helper with a mode flag, which would hide which notation a readout uses.
22. **Lint rule (slice 5a).** `no-restricted-syntax` in `eslint.config.mjs` rejects JSX `input`, `select`, `textarea` and react-bootstrap `Form.Control`/`Range`/`Select`/`Check` in `src/graphs` and `src/learning` outside tests. `controlExemptions` lists every current bypass with its reason (host chrome or the family sweep that removes it). A hand-built −/+ stepper has no syntactic signal, so the rule cannot catch it; today's five are listed in `uncaughtSteppers`, which records them without exempting the file. Rejected: exempting those files, which would let them add raw inputs unseen.
23. **Shared behaviour test (slice 5b).** `src/inputs/sharedControlBehaviour.tsx` (test-only) registers the seven checks (placement, limit, refusal, commit, Escape, keyboard, Reset) per control kind (`numericFieldBehaviour`, `sliderBehaviour`, `countSetterBehaviour`) against a caller's mount. It runs on the bare controls and two real graphs per kind (`src/graphs/base/sharedControls.graphs.test.tsx`). A check a graph fails today is marked `knownGap` and runs as `it.fails`, so it turns red when fixed. A field hint that survived the host Reset was fixed by decision 24. Rejected: one test per graph, which lets the checks drift apart.
24. **Hint after Reset (2026-11-08).** `NumberInput` drops its hint when its value changes from outside the field, except after the value its own accepted commit wrote, so a snapped notice (decision 16) stays. A Reset that restores the same number has no value change to see, as the lesson-authoring event table notes, so `BaseGraph` wraps the Edit and Display panels in `ReplacementRevision` (`src/inputs/replacementRevision.ts`) carrying `workspaceRevision`, which every scene replacement and curve workspace refresh bumps. When it changes, the field shows the model and drops its draft and hint. Rejected: keying each panel on the revision, which would also reset focus and disclosures; a prop on each field, which every consumer would have to pass. The count setter's refusal is not part of this change.
25. **Rendered fixture (slice 5c, 2026-11-08).** Lesson-authoring workstream 1 asks for a test-only rendered fixture of every shared control (I3). It is `fixtures/controls/index.html` with its `main.tsx`, outside `src/`: the Vite dev server serves it at `/bezeg-2.0/fixtures/controls/`, and the production build keeps `index.html` as its only entry, so the fixture never reaches `build/` or the public site. It renders both boolean variants, choice, numeric, slider and count, with help, refusal, unavailable and disabled states and long labels, in Edit and Display placement; `?lang=en` selects English. A Playwright spec with its own config starts the dev server on port 4328 and checks it at 1440×900, 1024×768, 724×900, 390×844 and 200% text: no clipped label, value or hint, visible keyboard focus, and 44 CSS px touch targets on a coarse pointer, saving a screenshot per view. A `just` recipe runs it. It is not in CI yet. Rejected: a route in the app, which the spec forbids; a second production build of the fixture, which adds a build and provenance for no gain, since the controls' CSS is the same in dev.
26. **Fixture findings (slice 5d, 2026-11-08).** Three CSS fixes from the 5c fixture: the coarse-pointer rule for typed number fields uses `.number-input input[type]`, so it outranks the base rule and gives every number field, including the slider's, 44 CSS px on coarse pointers and narrow windows; a boolean label wraps inside a long word (`overflow-wrap: anywhere`); `.inspector-display-graph` has a `minmax(0, 1fr)` column, so a wide control cannot push Display past the inspector. Left open: at 200% text a longer `ChoiceSelect` option is clipped, because a native select shows one line and the inspector stays 310 px wide. The fixture holds it as one `test.fail`; every other clip at 200% fails normally. Fixing it needs shorter option labels or a radio group for few options, a separate decision. Rejected: widening the inspector with text size, which changes the shared workspace layout.

### Decided in task 2 — 2026-11-08

27. **Where the point modules live.** Placement (decision 1), the view policy (decision 6), the drag constraint (decisions 3 and 7) and the point keymap (C16) are plain functions in `src/graphs/base/points/`, with no React and no JSXGraph; only the point factory (C18) there takes a board. The React controls stay in `src/inputs/`. Reason: the spec asks for geometry independent of React and JSXGraph, and these rules are testable as data. Rejected: methods on `BaseGraph`, which PointSet, Interpolation and the curve graphs do not share as a parent below it, and which would tie the rules to the board.
28. **One point collection (C1–C3).** `PointCollection` (`src/inputs/`) shows the count with the `CountSetter` −/+ when a graph removes the last point, or an Add button and a "Remove selected" `UnavailableButton` when it removes the selection; Clear all, a typed new-point entry and a board Add-mode pressed button are optional props. Every refusal at a bound gives its reason through `UnavailableButton`. Reason: one control with optional parts keeps placement, limits and feedback the same where graphs differ only in what they offer. Rejected: one control per removal style, which brings back the copies C1 counts. Clear all is offered only where the minimum is 0, and is unavailable with a reason when the set is already empty; the typed entry adds on its Add button or on Enter in a field whose value was accepted, and empties afterwards (slice P2).
29. **One point list (C4, C14).** `PointListInput` grows into the one point list: axis count 1–3, `grid` or `integer` per list, bounds, an optional per-row remove with the minimum's reason, and an optional selectable row (`aria-pressed`, C14). Its existing callers keep working without the new props. Reason: the existing list already has the commit and refusal behaviour task 1 settled. Rejected: a new component beside it, which would leave two lists.

## Acceptance

1. Every capability in the catalogue has one shared control, or a named exception with its reason.
2. Lint fails on a raw input, range, select or stepper in graph code outside the exemption list, and the list shrinks to the recorded exceptions.
3. Two graphs offering a capability pass the same shared behaviour test: placement, limit, refusal, commit, Escape, keyboard and Reset.
4. No control is unavailable or refuses without a stated reason.
5. Workstream 1's I1–I5 hold for every migrated panel, in both languages.
6. Lessons, Presets and synchronous multi-action scenes behave as before, except for the confirmed changes above. Mathematical meaning is unchanged.
7. The [lesson-family template](../tasks/feature-streams/README.md#family-template) tells new graphs to use the shared controls.

## Order

1. **Task 0:** finish the inventory per panel, and decide exceptions. Read-only.
2. **Foundation:** workstream 1 inputs, the protocols in C6–C8, the keymap in C17, the channels in C21–C23, the formats in C28, the fixture and the lint rule with every current bypass exempted, so new graphs comply from then on.
3. **Shared controls:** C1–C5, C14, C16, C18 and C19, piloted on PointSet, Interpolation and the curve workspace.
4. **Family sweeps,** one per family, shrinking the exemptions: compgeo, projective, functions, curves, patches. Run after [contracts task 3](../tasks/mathematical-runtime-contracts/03-shared-trace-playback.md), which touches the same panels and owns the playback policy C24 uses.
5. **C9–C13, C15, C20, C24–C27, C29 and C30.**
6. **Phone playback** ([spec](mobile-graph-playback.md), approved 2026-11-06), once C12 and C24 settle the playback control.

## User impact

Some controls move, gain reasons or change commit timing. No route changes are planned, and no stored Preset changes. Each local Reset removal is recorded here when decided. The second audit adds these visible changes: PointSet and Correlation drags lose their limit notice; Monotone steps count from 1; Delaunay and Triangulation angles lose trailing zeros; NURBS and Bisection show tiny values as `·10⁻⁷`; B-spline and patch degree selects become steppers; LinearMap refuses out-of-range entries; and the curve graphs stop refitting after an add that stays in view, which can change lesson views.

Decided in task 0:

- **Local Resets removed:** FunctionInverse, FunctionTransformation, PolynomialZeros, RationalFunction and B-spline Blossom. Use the host Reset. It also restores the view, which those buttons left alone, and returns to a selected Preset.
- **Other buttons removed:** Show all on Notable and EulerLine, and "Reset view" on Voronoi and Fortune. Use the host Fit.
- **Relabelled:** De Boor "Back to level 0", Voronoi "Reset construction" and SubdivisionCurve "Reset polygon" become the playback Reset. "Back to the example" becomes "Reset example".
- **Typed values:** function and complex fields snap an off-grid value with a notice instead of refusing it.
- **New controls:** curve boards without a typed list gain one.
- **Lesson views:** `interp-fifth-point-added` and `hermite-locality-six` no longer refit as they do today. The first keeps its earlier view; the second refits only at its second add, to a different box.
- **Typed fields (task 1):** a typed number applies on Enter or when the field is left, no longer on each keystroke. A value that is not a number is explained instead of ignored. Phones show a full keyboard for fields that accept negative values.
- **Switches (task 1):** switches in workspace tools lists take the Display tab's look, and show as plain checkboxes in Windows high-contrast mode.
- **Limit notices:** drags on every PointSet graph, Summary statistics and the query points stop silently at the limit.
- **Unavailable buttons (task 1):** the count stepper's − and + no longer grey out silently at a bound: they stay focusable, look dashed, and say why when pressed. Playback buttons are unchanged. Correlation's refusal shows on its own line instead of among the status lines.
- **Announcements (task 1):** screen readers stay silent while De Boor and Sequence play and hear the state once on Pause or at the end, as the computational-geometry runs already do. A typed-field hint is announced when it appears. Nothing visible changes.
- **Typed-field hints (task 1):** a range or refusal hint under a typed field goes away on Reset, on a preset or lesson restore, and when the value changes elsewhere, such as by a drag.
- **Fixture fixes (task 1):** on phones, tablets and windows up to 700 px wide, typed number fields are 44 px tall, as the count stepper's already was. Long setting names wrap instead of running past the panel.
- **Number formats (task 1):** Delaunay and Triangulation angles drop trailing zeros (`90°`, not `90,00°`); NURBS, Blossom and Bisection show tiny values as `1,23·10⁻⁷` instead of `1.23e-7`; De Casteljau shows `t = 0,50` with a decimal comma in Slovenian.

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

Task 0 corrections, checked against source or a running build, 2026-11-07. Where these differ from the catalogue above, these hold:

- **C5:** the hand stepper is in FourierSeries. Epicycle's −1/+1 sits beside a `Slider`.
- **C8:** the per-keystroke list also includes `IntegerField`, `CoordinateField` and `StepField` in PointSet and the projective graphs.
- **C9:** most local Reset counts were comments; the [inventory](../tasks/shared-graph-controls/inventory.md) lists the real buttons.
- **C18:** FivePoint, PolePolar and ThreeViews also clamp silently, and the movable-point cursor is also missing on LinearFunction P1 and P2 and the FourierCoefficients and Epicycle handles.
- **C21:** "Silent while Play runs" is written in 10 files, not six, all in compgeo. No function graph gates on Play. De Boor's readout changed on each level during Play in a running build. Sequence is ungated too; its live text stayed static with the certificate hidden, and the shown state was not run. This was DOM observation, not screen-reader speech.
- **C23:** a Correlation add at the cap in a lesson does reach the learner: `applyActions` restores the checkpoint and rethrows, and `GuidedLesson` shows the reason with only Close. This closes the earlier note that the runner's handling was not traced.
- **C27:** both Monotone counters were observed starting at 0 (`Korak 0 od 14`), and Delaunay at 1.
- **PH:** the start point is not draggable, read from code, which contradicts line 15 of [the PH overlay spec](ph-arc-length-and-elevation-overlay.md). Decision 11 covers draggable points, so no typed path is needed. The curves sweep confirms this in a browser and corrects whichever is wrong.

Counts are from text search, so treat them as approximate. Task 0 covered the areas the audits left out.
