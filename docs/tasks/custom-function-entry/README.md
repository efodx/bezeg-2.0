# Custom-formula implementation queue

Status: planned, 2026-11-18. Source: [custom formulas specification](../../specs/custom-function-entry.md). Linked from the [master-review queue](../master-review-followups-2026-11/README.md). The formula implementation is unstarted on origin/master abacf13d; the earlier local handoff describes planning only.

## Sequence

| Task | Outcome | Prerequisites | Status |
| --- | --- | --- | --- |
| [01 Formula evaluator](01-formula-evaluator.md) | Pure bounded evaluator and built-in adapter interface | Accepted [Secant termination repair](../master-review-followups-2026-11/03-secant-termination.md), plus existing Contracts live-model and Controls foundations | planned |
| [02 Bisection pilot](02-bisection-pilot.md) | Complete editable, persistable teaching workflow | 01 and [user-action availability](../master-review-followups-2026-11/01-user-action-availability.md) | planned |
| [03 Newton and Secant](03-newton-secant.md) | Second consumer with optional derivative/reference information | 02 and [Secant termination repair](../master-review-followups-2026-11/03-secant-termination.md) | planned |

One owner controls the evaluator interface, shared formula editor and model contract. Integrate sequentially; coordinate current shared-control and clip-capture ownership before changing either route. Task 01 already adapts `src/analysis/rootFinding.ts`, so its kernel changes wait for the accepted Secant repair and retain that regression. Grammar/dependency investigation can proceed earlier without editing the shared kernel. Keep built-in IDs and authored lesson payloads compatible. Other candidate routes in the specification remain future scope.

## Acceptance ownership

The source spec's numbered acceptance is covered as follows: 01 owns grammar/evaluator portions of acceptance 3 and the dependency decision; 02 owns acceptance 1, Bisection state/persistence portions of 3, and route-specific acceptance 4; 03 owns acceptance 2, Newton/Secant portions of 3, and its acceptance 4. Final route bundle measurements are recorded with 02/03 even if candidate measurements were made during 01. None of these tasks is complete merely because its pure evaluator tests pass.
