# Test consolidation work queue

Status: implemented, 2026-10-25. Source, scope and shared acceptance: [specification](../../specs/test-consolidation.md). These are implementation tasks, ordered by expected priority/gain. All five tasks are implemented; task 3 kept two navigations per lesson after a single traversal measured slower. Final timing (full browser suite 665 s → 370 s wall, 3914 s → 2159 s summed) and the unit run are in [coverage.md](coverage.md) "Final timing". Evidence: [coverage.md](coverage.md).

| Priority | Task | Dependency |
| --- | --- | --- |
| 1 | [Real-graph lesson restore/re-entry contract](01-lesson-restoration.md) | Retain browser checks affected by task 5 until their drawing comparisons are repaired. |
| 2 | [Shared lesson interaction matrix](02-shared-lesson-interactions.md) | Task 1 coverage map; serialize edits to the shared smoke file. |
| 3 | [Single per-lesson content traversal](03-lesson-content-traversal.md) | Task 2 owns shared interaction checks. |
| 4 | [Chapter activity contract and browser samples](04-chapter-activity-lifecycle.md) | Independent of 1–3 after the shared coverage-map format is settled. |
| 5 | [Repair excluded drawing comparisons](05-function-drawing-contract.md) | Reproduce first; a prerequisite for affected removals in task 1. |

Start task 1 with a coverage inventory and baseline timings; identify which removals need task 5 and execute those repairs before those removals. Tasks 1–3 are sequential implementation slices. Task 4 and bounded task 5 repairs can be delegated separately when file and verification ownership are clear. Workers implement and return evidence; the handler owns review, stable acceptance, commits and pushes. Do not run competing Playwright jobs on the same port.

Keep one concise coverage/evidence record alongside this index during implementation: assertion responsibility, before/after test names, representative-selection rationale, excluded/unverified cases, revision/build provenance, commands, timings and temporary-fault results. Update task status here rather than duplicating the backlog elsewhere. At closeout consolidate unique evidence under the documentation retention policy.
