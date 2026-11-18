# Master review repair and architecture queue

Status: planned, 2026-11-18. Source: [follow-up specification](../../specs/master-review-followups-2026-11.md) and [review](../../reviews/master-2026-11-17.md). Implementation is unstarted. The owner asked to create these tasks; this change publishes the plan.

## Work order and dependencies

Prioritize 01 (Preset writes and lesson interaction), 02 (verification/deployment coverage) and 05 (a valid-input board crash). Repairs 03, 04 and 06 are small independent fixes that can land alongside them. Task numbers are stable identifiers, not a mandatory serial order. Do not make a bug repair wait for an optional architecture refactor or formula entry.

Formula work runs Secant repair → evaluator/kernel adapters → Bisection → Newton/Secant. The evaluator already changes the root-finding kernel, so the Secant prerequisite applies there, not only at the final graph integration. Bisection also requires accepted user-action availability. Board-unit and collision work can proceed independently within their owned paths; chapter restoration remains lower priority.

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
| [Formula evaluator](../custom-function-entry/01-formula-evaluator.md) | Pure, domain-aware function interface | M | 03 and existing accepted foundations | [Formula queue](../custom-function-entry/README.md) |
| [Bisection pilot](../custom-function-entry/02-bisection-pilot.md) | First custom-formula consumer | M | Evaluator and 01 | [Formula queue](../custom-function-entry/README.md) |
| [Newton/Secant](../custom-function-entry/03-newton-secant.md) | Optional derivative/reference-root capabilities | M | Bisection pilot and 03 | [Formula queue](../custom-function-entry/README.md) |
| [Chapter reading restoration](../architecture-followups-2026-11/03-chapter-reading-restoration.md) | Shared restoration schedule | M | Independent; lower priority | [Existing queue](../architecture-followups-2026-11/README.md) |

The linked existing queues own their task status; update those instead of duplicating state here. Before starting any task, check its status and the current implementation revision; the reviewed SHA and planning date are historical evidence, not proof that a repair is still missing.

| Shared write boundary | Integration order / coordination |
| --- | --- |
| `src/analysis/rootFinding.ts` and its regression tests | Repair 03, then formula evaluator/kernel adapters, then Newton/Secant graph integration. Retain the repair regression across both migrations. |
| Workspace action availability and Preset command entry | Task 01 owns the decision; the Bisection pilot consumes the accepted interface. Other repairs retain existing control contracts. |
| Formula evaluator, model contracts and shared editor | One owner; integrate the two consumers sequentially. Pure grammar investigation may start before 03, but kernel changes wait for its acceptance. |
| Shared controls, language catalogs and captured route media | Coordinate the actual files with current owners before editing or capturing. Module independence does not authorize concurrent writes to these shared files. |

## Closeout

The specification maps every review finding to acceptance IDs. Each task must supply failing-before regression evidence, an accepted revision and appropriate mathematical, interaction and production checks. Keep any unverified item explicit. Completed foundations and deferred renderer experiments are described in the specification and are not extra tasks in this queue.
