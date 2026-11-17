# Master review repair and architecture queue

Status: planned, 2026-11-18. Source: [follow-up specification](../../specs/master-review-followups-2026-11.md) and [review](../../reviews/master-2026-11-17.md). Implementation is unstarted. The owner asked to create these tasks; this change publishes the plan.

## Work order and dependencies

Start repairs 01–06. Their modules are independent, apart from task 01's shared workspace ownership: coordinate any control changes through that owner. Board-unit and collision work can proceed independently. Formula work runs evaluator → Bisection → Newton/Secant; the latter also requires the Secant repair. Chapter restoration remains lower priority.

| Task | Findings / outcome | Size | Prerequisites | Status owner |
| --- | --- | --- | --- | --- |
| [01 User-action availability](01-user-action-availability.md) | R1, R2; current locks at commit time | M | None | This queue: planned |
| [02 CI verified and deployed source](02-ci-source-provenance.md) | R3 | M | None | This queue: planned |
| [03 Secant exact roots](03-secant-termination.md) | M1 | S | None | This queue: planned |
| [04 Rational zeros and domain](04-rational-domain.md) | M2 | S | None | This queue: planned |
| [05 B-spline parameter sampling](05-bspline-sampling.md) | M3, M4; shared domain rules | M | None | This queue: planned |
| [06 Empty Monte Carlo results](06-monte-carlo-empty-state.md) | M5 | S | None | This queue: planned |
| [Board-unit projection](../architecture-followups-2026-11/01-board-unit-projection.md) | Dimensional conversion owner | M | Independent | [Existing queue](../architecture-followups-2026-11/README.md) |
| [Applied collision settings](../architecture-followups-2026-11/02-applied-collision-settings.md) | One rebuild and identified command result | S–M | Independent | [Existing queue](../architecture-followups-2026-11/README.md) |
| [Formula evaluator](../custom-function-entry/01-formula-evaluator.md) | Pure, domain-aware function interface | M | Existing accepted foundations; coordinate shared owners | [Formula queue](../custom-function-entry/README.md) |
| [Bisection pilot](../custom-function-entry/02-bisection-pilot.md) | First custom-formula consumer | M | Evaluator and 01 | [Formula queue](../custom-function-entry/README.md) |
| [Newton/Secant](../custom-function-entry/03-newton-secant.md) | Optional derivative/reference-root capabilities | M | Bisection pilot and 03 | [Formula queue](../custom-function-entry/README.md) |
| [Chapter reading restoration](../architecture-followups-2026-11/03-chapter-reading-restoration.md) | Shared restoration schedule | M | Independent; lower priority | [Existing queue](../architecture-followups-2026-11/README.md) |

The linked existing queues own their task status; update those instead of duplicating state here. Task 01 owns shared action-availability changes. Formula tasks have one owner for the evaluator, model contracts and shared editor; migrate the two consumers sequentially. Check the current controls-visual and clip owners before editing their shared paths.

## Closeout

The specification maps every review finding to acceptance IDs. Each task must supply failing-before regression evidence, an accepted revision and appropriate mathematical, interaction and production checks. Keep any unverified item explicit. Completed foundations and deferred renderer experiments are described in the specification and are not extra tasks in this queue.
