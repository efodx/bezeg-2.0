# Mathematical runtime contracts task queue

Status: planned, 2026-11-03. Source and canonical acceptance criteria: [specification](../../specs/mathematical-runtime-contracts.md). These tasks implement the five additional recommendations requested by the owner after the recent-commit review. Application implementation has not started.

| Priority | Task | Status | Dependency / ownership |
| --- | --- | --- | --- |
| 1 | [Stable geometric-series evaluation](01-stable-series-evaluation.md) | Pending | Independent numerical fix; settle before task 4 changes its host. |
| 2 | [Correlated trace event and note types](02-correlated-trace-types.md) | Pending | Owns shared trace types and necessary producers/adapters. |
| 3 | [Shared trace playback policy](03-shared-trace-playback.md) | Pending | After task 2; same graph/trace consumers get one owner. |
| 4 | [One live function model authority](04-live-function-model.md) | Pending | After task 1; serialize base/subclass migration and coordinate persistence-owner edits. |
| 5 | [Typed conic variants and solver outcomes](05-typed-conic-outcomes.md) | Pending | Independent; own analytical/projective conic types and their consumers. |

Keep one status here per task. Store any implementation evidence beside this index and link it from the completed task; decisions and acceptance changes belong in the specification. The existing [lesson-authoring architecture](../../specs/lesson-authoring-architecture.md) remains a separate queue.

Tasks 1, 2 and 5 can be assigned independently when their files and test resources are disjoint. Task 4 may overlap function graph consumers touched by tasks 1 or 5; complete or serialize those edits. Workers implement bounded slices and return evidence without further delegation or Git operations; the handler owns review, integration, acceptance, commits and pushes. Large migrations may use sequential worker slices under the same task, with one shared-interface owner and no duplicate completion ledgers.

Implementation completion requires the task's named spec criteria and the [shared verification contract](../../specs/mathematical-runtime-contracts.md#order-ownership-and-verification), including regression evidence and explicit coverage gaps. The publication of this queue was verified as documentation only.
