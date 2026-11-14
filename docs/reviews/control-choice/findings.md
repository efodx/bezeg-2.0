# Control choice: findings

Ranked findings come from the step 3 sweep. Until then this file collects what the handler saw on the migration screenshots (step 2), so step 4 starts with them. Earlier notes: [queue, "Findings already seen"](../../tasks/control-choice/README.md#findings-already-seen).

## Seen during the migration slices (handler 2, 2026-11-14)

| # | What | Where | Fault | Proposed fix |
| --- | --- | --- | --- | --- |
| M1 | A long point name squeezes the coordinate fields: rows named "Kontrolna točka 1.1" or "Oglišče A" leave fields narrower than rows named "P1" | Epicycle control points, TriangleSolver vertices | call site and shared | The list's caption already says what the rows are; rows are named by the point's letter (`A`, `C₁.₁`). The name column of `PointListInput` gets a maximum width so a long name wraps instead of narrowing the fields |
| M2 | A slider label of more than about 20 characters wraps to two lines beside the exact field | FunctionTransformation ("Vodoravna raztegnitev b"), Waves ("Faza 1. vala v stopinjah") | shared | Label takes the full row when it would wrap, or the exact field narrows; decide on the contact sheet |
| M3 | Min and max labels of one slider touch the caption of the next control in the same group | every panel with two sliders in one group (MeanValue, Waves, FunctionTransformation) | shared | Vertical rhythm inside `inspector-group` (already in the queue's list) |
| M4 | Help under a kept typed field restates range and step over four lines | UnitCircle, the multiple-of-π field | call site | Shorten to the meaning; the field's own refusal states the range |
| M5 | Help that explains the widget under sliders ("Polarna vnosa izbereta najbližjo točko mreže 0,05 in veljata po Enter…") | ComplexMultiplication | call site | Keep only the rounding rule |

## Behaviour changes accepted during migration

Recorded here and in the spec's user impact.

- UnitCircle: both angles use `AngleSlider`. A typed 360, 400 or −30 wraps into the turn instead of being refused; the arrow step is 1° (was 0,5°) and the big step 10° (was 5°). A typed half degree is still accepted. Reason: the catalogue's control for an angle, and wrapping is what a turn does.
- TriangleSolver: the vertex rows refuse an arrow step past the range instead of clamping it, as every point row does.
- EulerCircle: the angle is a plain `Slider` from 0 to 360, not an `AngleSlider`, because the playback ends at 360 and a wrapping control would show 0.
- BinomialNormal: one `p` slider with an exact field replaces the slider plus a separate "exact p" field.
- Kept as typed fields because the range is a validity limit: Linear `k` and `n`, Density `a` and `b` (see `decisions.json`).
