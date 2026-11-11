# Lesson-authoring architecture tasks

The [original specification](../../specs/lesson-authoring-architecture.md) owns the accepted interfaces. Tasks 02–05 are completed; their task files retain acceptance evidence. The owner requested the following continuation on 2026-11-11, governed by [the rollout specification](../../specs/lesson-authoring-rollout.md).

| Task | Status | Coordination |
| --- | --- | --- |
| [06: legacy family registration](06-legacy-registration-rollout.md) | planned | Families-prep owns current shared-root edits; integrate after each conflicting batch lands. |
| [07: standalone scene ownership](07-owned-scene-rollout.md) | planned | Prefer disjoint B-spline consumers first; serialize shared host hooks with 08 and lifecycle-test edits with Controls visual. |
| [08: persisted scene projection](08-scene-projection-rollout.md) | planned | Prefer remaining projective consumers first; serialize host hooks with 07 and collection roots with 06/Families-prep. |

Read the [coordination snapshot](../../reviews/lesson-authoring-rollout/coordination-2026-11-11.md) and refresh actual ownership before implementation. The tasks can be prepared now; current overlap concerns specific files/batches, not a blanket wait for every active stream. No supervisor stream entry is added by this queue.

Each implementer records a consumer inventory, bounded batch plan, deletion evidence and verification next to its task. A first successful migration is a checkpoint; completion accounts for the entire task scope. Preserve the existing pilot completion records.
