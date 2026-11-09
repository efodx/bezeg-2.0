# Wave 2 slice P: projective family

Read `w2-common-brief.md` first; it holds role, shared files, test rules, checks and return format.

**Owned:** `src/graphs/projective/**` (CrossRatio, FivePoint, Pascal, PolePolar and ThreeViews controls, graphs, `*Edit.ts`, tests).

**Work (inventory rows 75–79):**
- Pressed example rows (C10) and conic, order and finite/ideal rows (C25) become `ChoiceSelect` (decision 9).
- `aria-pressed` point-selection rows (C14) follow the C14 target.
- `IntegerField` (CrossRatio), `CoordinateField` (FivePoint, multiples of 1/15) and `StepField` (PolePolar, scaled integer) commit per keystroke today. They become the shared point list or `NumberInput` with grid or step and bounds as props, committing on the shared rule. Typed clamps (`crossRatioEdit.ts`, `fivePointEdit.ts`, `polePolarEdit.ts`, `threeViewsEdit.ts`) follow decisions 3 and 8: keep the mathematical bounds and state the range instead of clamping silently where the spec says so.
- FivePoint's three raw `<select>`s (chord ends, third point) become `ChoiceSelect`. FivePoint's extrapolation checkbox and ThreeViews' point-on checkbox become `OnOffSwitch` or `BooleanField`; their 44 px targets come with the shared control, which settles the Annotated UI note (stream file, Notes, "checkbox comparison").
- ThreeViews' two raw range inputs (c in tenths, angle) become `Slider`; the angle slider is unavailable with a stated reason when the point is off (C6), not natively `disabled`.
- Board arrow keys (C16) keep their current steps; Pascal stepping along a conic stays the recorded exception.
- Pascal: add a visible readout beside the "Točka D: naslednji položaj" steppers showing the selected handle's table index (or position), so a press can be read back (stream file, Notes, "From Clips"; `docs/specs/lesson-guided-catalog-clips.md#handler-decisions-2026-11-07`). Give it a stable `data-` attribute and a unit test.

**Lessons and Presets:** projective lessons (`grep -rl` of the graph ids under `src/learning`) and stored Presets must load and act as before. Run their tests.

**Evidence file:** `w2-p.md`. **Handoff note:** `w2-p-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
