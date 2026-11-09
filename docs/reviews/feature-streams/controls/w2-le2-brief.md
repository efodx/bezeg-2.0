# Wave 2 slice LE2: look underneath and drawing playground

Read `w2-le-common-brief.md` first.

**Owned:** `src/learning/playground/LookUnderneath.tsx`, `src/learning/playground/DrawingPlayground.tsx`, their test files and CSS, and the `playground_*` keys. Worker LE1 owns the collision playground.

**Work:**
- **Look underneath** (inventory row): the four raw checkboxes (`:129-135`) → `OnOffSwitch`; Previous/Next segment (`:145-147`, native `disabled` at the ends) → `UnavailableButton` with a reason and a blocked-press `RefusalNotice`.
- **Drawing playground** (inventory row): Undo, Redo, Clear, Add point, Close, Delete point (`:400-410`, native `disabled`, no reason) → `UnavailableButton` with reasons (one shared `RefusalNotice` for the toolbar); the anchor-type pressed group (`:413`) stays a pressed group (decision 9, a board tool) but its native `disabled` becomes `aria-disabled` with a reason ("select a point first"); the live summary (`:435`) → `LiveReadout`. Keys (C16, `:293-330`) unchanged.
- One thin wiring test per changed control kind per file, each with an observed failure by mutation.

**Evidence file:** `w2-le2.md`. **Handoff note:** `w2-le2-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
