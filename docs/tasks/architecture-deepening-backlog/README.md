# Architecture deepening work queue

Status: planned, 2026-10-25. Source, evidence and shared acceptance: [specification](../../specs/architecture-deepening-backlog.md). No task is started.

Tasks are grouped into lanes by file ownership. Lanes can run in parallel. Within a lane, follow the order shown unless a dependency says otherwise.

| # | Task | Lane | Strength | Dependency |
| --- | --- | --- | --- | --- |
| 1 | [Preset storage integrity](01-preset-storage-integrity.md) | Host | Strong | None. Touches only BaseGraph's preset cluster. |
| 2 | [Figure export operation](02-figure-export-operation.md) | Host | Strong | After 1 if both edit `PresetSelector.tsx`; otherwise parallel. |
| 3 | [One scene replacement path](03-scene-replacement-path.md) | Host | Worth exploring | After 2 (same `applyFigurePreset` method). Task 5 is a useful pilot. |
| 4 | [Completed generic spline changes](04-generic-spline-changes.md) | Curves | Strong | None. |
| 5 | [PH auxiliary-board lifetime](05-ph-auxiliary-board.md) | Curves | Strong | None. Coordinate `GraphSession` edits with task 3. |
| 6 | [Curve editing gesture mathematics](06-curve-gesture-mathematics.md) | Curves | Worth exploring | After 4 (shared adapter hierarchy). |
| 7 | [One owner for function-model rules](07-function-model-rules.md) | Functions | Strong | None. |
| 8 | [Function graph shared drawing and analysis](08-function-graph-sharing.md) | Functions | Worth exploring | After 7 (both touch every function graph). |
| 9 | [One typed lesson action vocabulary](09-lesson-action-vocabulary.md) | Learning | Strong | None. Rebase over 7 if graph lesson handlers move. |
| 10 | [Derived Demonstration and lesson registration](10-derived-registration.md) | Learning | Worth exploring | After test-consolidation tasks 1–3 settle the smoke file. Can overlap 9 if `model.ts` edits are serialized. |

## Parallel waves

- **Wave 1 (five in parallel):** 1, 4, 5, 7, 9. These have disjoint primary files: presets, the spline adapter, PH, function models, and lesson content and catalog.
- **Wave 2:** 2, 6, 8, 10.
- **Wave 3:** 3. It benefits from 2 (export locks gone) and 5 (ownership pilot).

Start with task 1. It is small, it fixes a user-visible failure mode (one corrupt stored value can break the picker, save and backup), and it touches nothing else in wave 1.

## Working rules

Workers implement one task each and return evidence; the handler owns review, acceptance, commits and pushes. Two shared files need care:
- Edits to `BaseGraph.tsx`: tasks 1–3 run in sequence for the clusters they touch.
- Edits to `sl.ts` and `en.ts`: rebase, do not merge by hand.

Do not run competing Playwright jobs on the same port.

Record each task's evidence next to its file:
- callers' removed knowledge (the deletion test);
- before/after test names;
- reproduced defects;
- revision and commands.

Update status here rather than elsewhere.
