# Shared graph controls

**Status:** draft, 2026-11-07. The owner approved all panels and confirmed the decisions below; a second audit is extending the catalogue. No task files exist.

Widens [workstream 1 of lesson-authoring architecture](lesson-authoring-architecture.md#1-shared-inspector-controls), which stops after two panels. Its numeric event table, boolean variants, test fixture and lint rule still apply, except where this spec changes them. Builds on [demonstration controls UX](demonstration-controls-ux.md) and [playback button reasons](playback-button-reasons.md).

## Rule

**One capability, one control.** When two graphs offer the same capability, they use the same shared control and it behaves the same way: same placement of new items, same limits handling, same feedback, same commit timing, same keyboard use.

A graph supplies only its domain: values, bounds, grid, conversions, commands and localized text. Mathematics stays in the graph or domain module.

A special control is a last resort. It is allowed only where a technical or mathematical reason makes the common control hard to use. Each exception names its reason in the lint exemption list. A new graph that needs a capability with no shared control adds one, rather than writing a local version.

## Audit

Seven read-only Haiku audits covered the 134 control files on 2026-11-06 at `0bf7348e`. All stopped early at their budget, so this catalogue is a strong sample and not a complete inventory. The handler checked the claims marked in the [evidence notes](#evidence-notes) against source. Task 0 completes the inventory.

## Capability catalogue

| # | Capability | Today | Target |
| --- | --- | --- | --- |
| C1 | Add point | Five behaviours: board click in Add mode plus typed form (curves); Add toggle, snapped click and integer form (PointSet); `CountSetter` + placing the point right of the last point (Interpolation, Subdivision, Correlation) or the rightmost point (Least squares); first free grid position (zeros); Add value (Summary statistics) | One point-collection control: + button, optional typed entry, optional board Add mode |
| C2 | Remove point | Last only (−), selected only (PointSet), per row (curves, zeros, segments), board Delete mode. Silent at the minimum on the curve board | Same control as C1, with a stated reason at the minimum |
| C3 | Clear all | PointSet only | Offered through C1 where a graph allows an empty set |
| C4 | Edit coordinates | Seven forms: `PointListInput`, `PointCoordinateEditor` (Apply all), patch `PointEditor` (Apply, xyz), `IntegerField` in PointSet and CrossRatio, `CoordinateField` in FivePoint, `StepField` in PolePolar, Voronoi query (Set) | One point list with axis count, grid or step, and bounds as props |
| C5 | Count stepper | `CountSetter`, plus hand copies in Taylor, UniformConvergence, Runge, Fourier and Epicycle | `CountSetter` only |
| C6 | Unavailable control | Native `disabled` with no reason (`CountSetter`, PointSet Remove and Clear, curve mode buttons, Decasteljau) versus focusable `aria-disabled` with a reason (`PlaybackButtons`) | One protocol: the `PlaybackButtons` model everywhere |
| C7 | Refusal feedback | Field hint, page alert, status line, silent clamp (CrossRatio, FivePoint, PolePolar), silent ignore (`ignoreOutOfDomain` with `CountSetter`, choices and drags) | One channel; nothing is refused silently |
| C8 | Commit timing | `NumberInput` commits per keystroke by default; lists, `CountSetter`, matrix entries and complex modulus use Enter or blur; Voronoi and patches need a button | One rule (decision 2) |
| C9 | Reset | Host Reset on every graph, plus own Reset buttons in 10 files, plus playback Reset. Scope differs: whole model, example origin, or step only | Host Reset for the scene; playback Reset for the run, with a distinct label; local Reset only as a named exception |
| C10 | Choose example | `ChoiceSelect` in most graphs; button rows in Delaunay, EarClipping, Fortune, both Monotone graphs, Voronoi, CrossRatio, Pascal and FivePoint; raw select in Euler, Notable and Inversion. The `custom` entry varies | One example chooser with one `custom` rule |
| C11 | Show or hide | `OnOffSwitch` (45 files), raw reveal buttons (15), raw checkbox (3) | `OnOffSwitch` for display settings; one shared Reveal button for results hidden until asked, which the UX spec keeps on purpose |
| C12 | Playback | `PlaybackButtons` in 18 files; own versions in Decasteljau, ArcLength, Parametric roll, Epicycle, Euler and Voronoi construction | `PlaybackButtons`, extended for Back or Show all if two graphs need them |
| C13 | Slider | Raw range in ThreeViews, Simson, Inversion and InscribedAngle; the same parameter has different steps (alpha, `t`) | `Slider` only, with shared step conventions |
| C14 | Select point | The same `aria-pressed` toggle written separately in PointSet, CrossRatio, FivePoint, Pascal and PolePolar | One selectable-point row |
| C15 | Curve operations | Two panels with different preview state (`CurveWorkspaceControls`, `BezierCurveControls`), plus raw Slider and Button in the Extrapolation, Elevation and Subdivision graphs and their rational versions | One operation panel |

## Likely exceptions

To be confirmed one by one in task 0: 2×2 matrix entry, knot vectors, the multiplicity field of zeros, segment and interval rows (they edit pairs), Pascal stepping along a conic, and affine transform buttons.

## Owner decisions — confirmed 2026-11-07

1. **Where a new point lands.** Explicit coordinates always win: a lesson action, typed entry or board click adds exactly there. Without coordinates, the graph's own placement rule applies if it has one. Otherwise the shared default applies: one unit right of the last point, or left at the limit. Every add command accepts coordinates, so lessons can use them. Zeros keep their first-free-position rule as a placement rule, not an exception.
2. **Commit timing.** Typed fields commit on Enter or blur. Sliders, steppers and drags apply immediately. This replaces the workstream 1 rule that preserves each field's current policy.
3. **Out-of-range input.** Typed values are refused with a message and never clamped. A drag stops at the limit without a message.
4. **Examples.** Always a select.
5. **Local Reset buttons.** Removed where the host Reset gives the same result. One stays only as a named exception.

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
2. **Foundation:** workstream 1 inputs, the protocols in C6–C8, the fixture and the lint rule with every current bypass exempted, so new graphs comply from then on.
3. **Shared controls:** C1–C5 and C14, piloted on PointSet, Interpolation and the curve workspace.
4. **Family sweeps,** one per family, shrinking the exemptions: compgeo, projective, functions, curves, patches. Run after contracts task 3, which likely touches the same panels.
5. **C9–C13 and C15.**
6. **Phone playback** ([spec](mobile-graph-playback.md), approved 2026-11-06), once C12 settles the playback control.

## User impact

Some controls move, gain reasons or change commit timing. No route changes are planned, and no stored Preset changes. Any local Reset removal is recorded here when confirmed.

## Evidence notes

Checked against source by the handler:

- **Add rules:** `correlationModel.ts` and `InterpolationGraph.addPoint` use the last point; `addLsqPoint` uses the rightmost.
- **Reset:** `PresetSelector` gives every graph a host Reset. Audit rows saying Taylor and others have no Reset were wrong.
- **Rational weights:** `setWeight` has no guard, so the ±0.25 buttons can reach a weight of zero or below, an open item in the [control inventory](../tasks/demonstration-controls-ux/inventory.md). Refusal under C7 should close it.
- **Silent clamp:** `crossRatioEdit.ts` clamps to its coordinate limit with no message.
- **Curve board delete:** `CurveEditingFeature` ignores a delete at one point with no message.
- **`ValueListInput`:** a click on an unavailable remove button still calls `onRemove`. This is documented in its props, so the host can explain the refusal; it is not a defect.

Counts are from text search, so treat them as approximate. Not audited in full: about 15 function graph bodies, Coons and Triangular patch behaviour, keyboard and focus order, and `src/learning/playground`.
