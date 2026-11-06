# Stream: Controls
Run state: not started

Owner of the [shared graph controls queue](../shared-graph-controls/README.md) (spec: [shared-graph-controls.md](../../specs/shared-graph-controls.md)). The owner confirmed C1–C30 and decisions 1–11 on 2026-11-07, then handed further decisions to the handlers. Rules: [feature streams](README.md). Port 4317. Handoffs: `docs/reviews/feature-streams/controls/`.

## Queue

| Step | Task | Notes | Status |
| --- | --- | --- | --- |
| 0 | [Inventory](../shared-graph-controls/00-inventory.md) | Read-only. The handler decides exceptions and Reset removals | pending |
| 1 | [Foundation](../shared-graph-controls/01-foundation.md) | New graphs comply from here on | pending |
| 2 | [Shared point controls](../shared-graph-controls/02-shared-point-controls.md) | Pilots: PointSet, Interpolation, curve workspace | pending |
| 3 | [Contracts task 2](../mathematical-runtime-contracts/02-correlated-trace-types.md), then [task 3](../mathematical-runtime-contracts/03-shared-trace-playback.md) | Taken into this stream 2026-11-07: the sweeps edit the same panels and C24 uses this policy. Update their status in the [contracts queue](../mathematical-runtime-contracts/README.md) | pending |
| 4 | [Family sweeps](../shared-graph-controls/03-family-sweeps.md) | After step 3 | pending |
| 5 | [Remaining controls](../shared-graph-controls/04-remaining-controls.md) | Closeout of the spec's acceptance | pending |
| 6 | [Phone playback](../mobile-graph-playback/graph-adjacent-controls.md) | Approved 2026-11-06. Before starting, check on `origin/master` that no other session has taken it | pending |
| 7 | [Lesson-authoring workstream 5](../../specs/lesson-authoring-architecture.md#5-persisted-scene-validation-and-projection) | Approved once this scope settled. Write its task file from the spec first. Last, so it shares no `BaseGraph.tsx` seam with the steps above | pending |

## Decisions

The owner handed all decisions in this stream to its handlers on 2026-11-07: ask for no confirmation, and do not stop for an owner decision. Decide, record the choice with its reason and rejected alternative in the relevant spec, and continue. The owner asks for a change later if a result is unwelcome. The README's other stop conditions still apply: a step that keeps failing, a suspected defect no failing test can confirm, or a needed dependency change that cannot be avoided. Git and engineering rules in AGENTS.md are unchanged.

## Shared files

Steps 1 and 2 change shared inputs and `BaseGraph.tsx`-level seams, so push each slice promptly. Steps 3 and 4 touch `sl.ts` and `en.ts`; follow the [shared-file rules](README.md#shared-files).
