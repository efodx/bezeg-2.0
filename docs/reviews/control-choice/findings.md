# Control choice: findings

Ranked findings of the step 3 sweep, then what the handler saw on the migration screenshots (step 2). Earlier notes: [queue, "Findings already seen"](../../tasks/control-choice/README.md#findings-already-seen).

## Sweep of 2026-11-14 (after the migration)

`node scripts/controls-sweep/sweep.cjs --port 4324` on 138 routes in three views (desktop 1440 × 900, phone 360 × 640, Presentation): about 185 distinct compositions per view on 16 contact sheets each, under `.command-logs/controls-sweep/` (not committed; rerun to reproduce). The 1024 × 768 view of the spec was not captured: the inspector has the same 310 px column there.

Who looked: three reviewers (one per view, all 16 sheets each, rubric of spec Part B step 4 and DESIGN.md "Graph controls"; none could load the `impeccable` skill, and the harness refused their findings files, so their returned summaries are merged here). The handler opened desktop sheets 01 to 03 and the migration screenshots; it did not open the other 45 sheets. This departs from the spec ("the handler looks at every contact sheet") to keep the handler's context for the fixes; the closing sweep's sheets for the fixed compositions are opened by the handler.

Detector hits (three views together): long-help 718 on 100 routes; no-gap 169 on 20; ranged-field 216 on 13 (typed fields kept with a reason in `decisions.json`, and segment and interval rows); ragged-buttons 60 on 27; said-twice 45 on 9; point-as-fields 30 on 2 (LinearMap matrix columns, segment rows); native-marker 3 on 1. No row-wraps, ragged point rows, open boxes or clipped text.

Ranked by routes affected. "Decision" is the handler's (owner delegated design judgement, 2026-11-14).

| # | What | Routes | Fault | Decision for step 4 |
| --- | --- | --- | --- | --- |
| S1 | Presets block: a joined row of three, two full-width buttons flush against each other, a sixth button at its own width | 137 | shared | One grid: Reset, Save, Delete in three equal columns; Export and Import in two equal columns; Generate images full width; 8 px gaps, one button style |
| S2 | Slider: a "Min: a / Max: b" caption row under every track; the caption touches the next label when sliders are stacked | about 190 | shared | The two bounds sit at the ends of the track on the track's own line, as plain numbers without the words; the caption row goes. Screen readers keep the range from the input's `min` and `max` |
| S3 | No vertical rhythm inside a group: a select, slider, point list or count setter is followed at 0 to 2 px by the next label or heading | about 60 (169 detector hits) | shared | One rule in the inspector CSS: consecutive controls in a group are 12 px apart, a heading after a control 16 px; label to its own field stays 4 px |
| S4 | Display tab: the disclosure "Koordinatni sistem" holds one select labelled "Koordinatni sistem" | 93 | shared | The select's label is visually hidden (it keeps its accessible name) |
| S5 | Help longer than two lines | 100 | call sites | Two kinds. Help that explains the widget (range, step, "press Enter", "a value outside is refused") is deleted or cut to its meaning wherever a search finds it. Paragraphs that explain the mathematics under readouts stay: they are the teaching text of a Demonstration, and the detector is narrowed to control help so it stops counting them |
| S6 | Readout rows: label and value both wrap, a value breaks mid-word ("skrit / o"), runs of rows that only say "skrito" | about 50 | shared | A value that does not fit beside its label goes under it, right aligned; words never break inside; no change to which rows show |
| S7 | Playback rows break 2 + 1 with "Ponastavi" alone | 27 | shared | Equal columns: three buttons share one row at 286 px, and a row that must wrap wraps into equal rows |
| S8 | Point collection: Add, Remove, Clear and the mode button each on a line of their own width; the `x`, `y` entry is two bare fields | 18 | shared | Two equal columns for the buttons; the entry keeps its point-row alignment (step 0b) |
| S9 | Checkbox group labels run to three lines and spell out contents | 19 | call site | Shorter labels; the set stays checkboxes (catalogue: a checkbox within a set) |
| S10 | Point list title carries an instruction ("· urejanje s tipkovnico"); long row names squeeze the fields (M1) | 23 + | shared and call sites | The title names the points only; the name column takes at most 40 % of the row and a longer name wraps; call sites name rows by the point's letter |
| S11 | View buttons (patches) wrap 3 + 2; the editing-mode panel mixes one filled and two dashed buttons | 17 | shared | Equal-column grids; the dashed style stays reserved for unavailable actions |
| S12 | Knot editor: seven narrow fields in a right-aligned column; matrix cells as stacked typed fields | 6 | new shared control | The number grid of the spec's choice table: cells in the matrix's own rows and columns; the knot editor uses it as one row that wraps |
| S13 | Text shown twice in one panel (status line and first readout) | 9 | call sites | The status line stays, the duplicate readout row goes |
| S14 | A slider label of more than about 20 characters wraps beside the exact field (M2) | about 10 | shared | The label takes the row above the track when it would wrap; the exact field keeps its width |
| S15 | `Slider`, `CountSetter` and `PointListInput` take no `describedBy` (M9) | 3 | shared | Add the prop to all three |
| S16 | One disclosure shows the browser's marker | 1 | call site | Use the shared disclosure |
| S17 | Empty or blank crops (desktop #89, #105, #61, #185, #187; Presentation #460, #476) | unknown | sweep script or real | Open the routes; fix the capture if it is the script |

Not changed, with reason: the dashed border of an unavailable field or button (a shared-controls decision; it marks "not available now", and the reason sits next to it); checkboxes versus switches (S9).

## Seen during the migration slices (handler 2, 2026-11-14)

| # | What | Where | Fault | Proposed fix |
| --- | --- | --- | --- | --- |
| M1 | A long point name squeezes the coordinate fields: rows named "Kontrolna točka 1.1" or "Oglišče A" leave fields narrower than rows named "P1" | Epicycle control points, TriangleSolver vertices | call site and shared | The list's caption already says what the rows are; rows are named by the point's letter (`A`, `C₁.₁`). The name column of `PointListInput` gets a maximum width so a long name wraps instead of narrowing the fields |
| M2 | A slider label of more than about 20 characters wraps to two lines beside the exact field | FunctionTransformation ("Vodoravna raztegnitev b"), Waves ("Faza 1. vala v stopinjah") | shared | Label takes the full row when it would wrap, or the exact field narrows; decide on the contact sheet |
| M3 | Min and max labels of one slider touch the caption of the next control in the same group | every panel with two sliders in one group (MeanValue, Waves, FunctionTransformation) | shared | Vertical rhythm inside `inspector-group` (already in the queue's list) |
| M4 | Help under a kept typed field restates range and step over four lines | UnitCircle, the multiple-of-π field | call site | Shorten to the meaning; the field's own refusal states the range |
| M5 | Help that explains the widget under sliders ("Polarna vnosa izbereta najbližjo točko mreže 0,05 in veljata po Enter…") | ComplexMultiplication | call site | Keep only the rounding rule |
| M6 | Several count setters stacked, one per group, take a quarter of the panel | CountingTree letter counts | shared | A compact count setter row (label left, stepper right) when the label is short; decide on the contact sheet |
| M7 | A point list is followed by a readout heading with no gap | LineGeometry ("Premice" under row Q), Isometry rosette and frieze | shared | Same vertical rhythm rule as M3: a list or control and the next heading keep one group gap |
| M8 | Help under a kept typed field states its range and "a value outside is refused" | Growth capital, Simulation trials | call site | Delete; the field's refusal already says it |
| M9 | `Slider` and `CountSetter` take no `describedBy`, so a panel's shared help paragraph is no longer announced with them | Simulation | shared | Add `describedBy` to both and pass it through to the range input and the exact field |

## Behaviour changes accepted during migration

Recorded here and in the spec's user impact.

- UnitCircle: both angles use `AngleSlider`. A typed 360, 400 or −30 wraps into the turn instead of being refused; the arrow step is 1° (was 0,5°) and the big step 10° (was 5°). A typed half degree is still accepted. Reason: the catalogue's control for an angle, and wrapping is what a turn does.
- TriangleSolver: the vertex rows refuse an arrow step past the range instead of clamping it, as every point row does.
- EulerCircle: the angle is a plain `Slider` from 0 to 360, not an `AngleSlider`, because the playback ends at 360 and a wrapping control would show 0.
- BinomialNormal: one `p` slider with an exact field replaces the slider plus a separate "exact p" field.
- Kept as typed fields because the range is a validity limit: Linear `k` and `n`, Density `a` and `b` (see `decisions.json`).
