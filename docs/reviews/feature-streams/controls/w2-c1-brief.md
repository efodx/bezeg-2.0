# Wave 2 slice C1: compgeo triangle panels

Read `w2-common-brief.md` first; it holds role, shared files, test rules, checks and return format.

**Owned:** `src/graphs/compgeo/EulerLinePanel.tsx`, `NotablePointsPanel.tsx`, `SimsonLinePanel.tsx`, `InscribedAnglePanel.tsx`, `InversionPanel.tsx`, their graphs (`EulerLineGraph`, `NotablePointsGraph`, `SimsonLineGraph`, `InscribedAngleGraph`, `InversionGraph`) and those graphs' test files. Any helper used only by these.

**Work (inventory rows 69–73):**
- Raw example `<select>`s (C10) become `ChoiceSelect`; keep the `custom` option's semantics (shown only while active, unknown ids ignored).
- Raw mode, focus and source-kind selects (C25) become `ChoiceSelect`; `aria-pressed` choice rows follow the spec's C14/C25 target.
- Raw angle, theta and epsilon sliders with degrees fields (C13, C17) become `Slider` with its number field; keep steps, units and ranges; the epsilon slider's five stops stay five stops.
- `IntField` in Simson and Inversion (C4) become the shared field (`NumberInput` integer, or the point list where the target says so). Decisions 3 and 8 govern out-of-range typing: the silent ignore becomes the shared stated-range behaviour; list it as a confirmed change.
- Show all (C20) is removed from EulerLine and NotablePoints; Fit covers it (spec *Delegated decisions*, task 0 item 2). Check that EulerLine `fitView` frames H, G, O, N and the nine-point markers when shown; give that view rule a pure test plus one real-graph case if it has none.
- Any hand-written live paragraph in these panels moves to `LiveReadout` (`src/graphs/base/controls/LiveReadout.tsx`; pattern in `HullTraceControls.tsx`).
- Duplicate mechanics tests to delete include `InversionGraph.host.test.tsx:591` and `InscribedAngleGraph.host.test.tsx:190` (see `controls-impact.md`).

**Lessons:** these graphs back Guided lessons (`grep -rl` the graph ids under `src/learning`). Lesson actions that set angle, mode or example must still work; run their lesson tests.

**Evidence file:** `w2-c1.md`. **Handoff note:** `w2-c1-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
