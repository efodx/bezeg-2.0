# Stream: Platform

Owner of the [architecture deepening backlog](../architecture-deepening-backlog/README.md) (spec: [architecture-deepening-backlog.md](../../specs/architecture-deepening-backlog.md)). Rules: [feature streams](README.md). Port 4311. Handoffs: `docs/reviews/feature-streams/platform/`.

Per-task evidence stays next to each task file, as that README asks. Update the task's status in the backlog README as well as here.

## Queue

The order differs from the backlog README's waves: tasks that gate other streams come first. Each step runs at most two tasks in parallel; pairs are file-disjoint.

| Step | Tasks | Notes | Status |
| --- | --- | --- | --- |
| 1 | A1 preset storage ∥ A9a typed lesson-action vocabulary, review-field decisions, one pilot content file | A9's decisions go in the Guided lessons spec | planned |
| 2 | A9b scripted migration of the remaining content files (incl. `patchChapter*.ts`) ∥ A4 generic spline changes | Review A9b by search, not by reading | planned |
| 3 | A10 derived registration ∥ A2 figure export operation | A10 after A9 (`model.ts`); A2 after A1 (`BaseGraph.tsx`, `PresetSelector.tsx`). **Opens `G-REG`** once A9 and A10 are accepted | planned |
| 4 | A6 curve gesture mathematics ∥ A5 PH auxiliary board | A6 after A4. **Opens `G-CURVE`** once A4 and A6 are accepted | planned |
| 5 | A7 function-model rules (convexity pilot, then the other ten) | Rebases over A9 (reverses the backlog's soft 9-after-7 order). Not in parallel with A2 or A8: they share function-graph test files | planned |
| 6 | A8 function graph sharing | After A7. **Opens `G-FN`** | planned |
| 7 | A3 one scene replacement path | After A2, A5 and A8 (shares `BaseFunctionGraph.tsx` with A8). Full browser checklist | planned |

Line ranges in the task files date from `2f602d0` (2026-10-25); locate code by search. Families in other streams may have added graph families since. A3, A7 and A8 must cover every graph family on `master` when they start, not only the families that existed on 2026-10-25.

## Gates provided

| Gate | Status |
| --- | --- |
| `G-REG` (A9 + A10) | closed |
| `G-CURVE` (A4 + A6) | closed |
| `G-FN` (A7 + A8) | closed |

A *Worth exploring* task (A3, A6, A8, A10) may end in "no change" after its inventory, with the reason recorded. That counts as accepted and opens its gate.
