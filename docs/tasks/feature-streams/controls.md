# Stream: Controls
Run state: not started

Owner of the [shared graph controls queue](../shared-graph-controls/README.md) (spec: [shared-graph-controls.md](../../specs/shared-graph-controls.md)). The owner confirmed C1–C30 and decisions 1–11 on 2026-11-07. Rules: [feature streams](README.md). Port 4317. Handoffs: `docs/reviews/feature-streams/controls/`.

## Queue

| Step | Task | Notes | Status |
| --- | --- | --- | --- |
| 0 | [Inventory](../shared-graph-controls/00-inventory.md) | Read-only. Ends with `Run state: stopped: task 0 exceptions need the owner` | pending |
| 1 | [Foundation](../shared-graph-controls/01-foundation.md) | Only after the owner answers task 0. New graphs comply from here on | pending |
| 2 | [Shared point controls](../shared-graph-controls/02-shared-point-controls.md) | Pilots: PointSet, Interpolation, curve workspace | pending |
| 3 | [Family sweeps](../shared-graph-controls/03-family-sweeps.md) | Needs contracts task 3; see below | pending |
| 4 | [Remaining controls](../shared-graph-controls/04-remaining-controls.md) | Closeout of the spec's acceptance | pending |
| 5 | [Phone playback](../mobile-graph-playback/graph-adjacent-controls.md) | Approved 2026-11-06. Before starting, check on `origin/master` that no other session has taken it | pending |

## Dependency outside the streams

[Contracts task 3](../mathematical-runtime-contracts/03-shared-trace-playback.md) has no stream, and it needs contracts task 2. Before step 3, check its status in the [contracts queue](../mathematical-runtime-contracts/README.md) on `origin/master`. If it is not accepted, set `Run state: stopped: contracts task 3 is not done` and report it, as this stream does not own that work.

## Shared files

Steps 1 and 2 change shared inputs and `BaseGraph.tsx`-level seams, so push each slice promptly. Steps 3 and 4 touch `sl.ts` and `en.ts`; follow the [shared-file rules](README.md#shared-files).
