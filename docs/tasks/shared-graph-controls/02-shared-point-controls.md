# 2. Shared point controls

Source: [shared graph controls](../../specs/shared-graph-controls.md), Order step 3. Depends on: task 1.

## Work

Build C1–C5, C14, C16, C18 and C19, and pilot them on PointSet, Interpolation and the curve workspace before any family sweep.

- **Point collection (C1–C3).** One control, following decision 1. The lesson `add-point` of Interpolation, Hermite and Correlation gains optional coordinates; existing lessons keep working without them.
- **Point list and stepper (C4, C5).** One point list with axis count, grid or step, and bounds as props; `CountSetter` only.
- **Selection and keys (C14, C16).** One selectable-point row and one key handler. No arrow nudges on curve and function boards (decision 11).
- **Drag (C18).** One drag helper taking the graph's step, and one point factory that binds the cursor. Decisions 3 and 7 apply: PointSet and Correlation lose the limit notice, and mathematical refusals keep theirs.
- **View (C19).** One view policy under decision 6, replacing the copied out-of-view tests.

Mathematics stays in the graph or domain module.

## Acceptance

- The three pilots pass the shared behaviour test, and their exemptions are gone.
- Decisions 1, 3, 6 and 7 each have a test on at least two graphs.
- Lessons on the pilots behave as before except for the confirmed view change, which task 0's item 6 lists and the evidence file records.
- Stored Presets and routes do not change.

## Checks

Mathematical checks for any path through evaluation or construction. Engineering, mathematical and UI review under [review routing](../../agent-workflow.md#review-routing). Smoke PointSet, Interpolation and the curve workspace with [the browser checklist](../../smoke-tests.md), including touch and keyboard, in both languages.
