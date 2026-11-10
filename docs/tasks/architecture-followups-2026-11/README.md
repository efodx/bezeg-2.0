# November architecture follow-ups

Status: planned, 2026-11-10. Source: [assessment and bounded specification](../../specs/architecture-followups-2026-11.md). The owner requested judgment on the review and tasks for the recommendations worth doing; these are implementation tasks, not completed changes.

| Order | Task | Size | Depends on | Status |
| --- | --- | --- | --- | --- |
| 1 | [Board-unit projection](01-board-unit-projection.md) | M | None | planned |
| 2 | [Applied collision settings](02-applied-collision-settings.md) | S–M | None | planned |
| 3 | [Chapter reading restoration](03-chapter-reading-restoration.md) | M | None | planned |

Start with board units because the same dimensional rule has already needed repairs in several consumers. Collision settings has a concrete duplicate-rebuild path and a bounded protocol change. Reading restoration has useful common behavior, but must preserve the distinct legacy visit and browser history semantics.

There is no fourth preview task: the [disposition](../../specs/architecture-followups-2026-11.md#disposition) explains its overlap with the existing feature-local registration pilot. Completed earlier architecture queues are not reopened.

Follow [AGENTS.md](../../../AGENTS.md) for delegation, review, verification and commits. One owner controls each shared interface. Before starting, check the current branch and active stream ownership; the source assessment at `337ea75c` was rechecked against `origin/master` at `4d58732a`. Each task closes against its source acceptance IDs and records the tested revision, observed results and any remaining gaps.
