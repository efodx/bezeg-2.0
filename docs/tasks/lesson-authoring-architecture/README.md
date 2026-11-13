# Lesson-authoring architecture tasks

The [original specification](../../specs/lesson-authoring-architecture.md) owns the accepted interfaces. Tasks 02–05 are completed; their task files retain acceptance evidence. Workstream 1 has no task here: it joined [shared graph controls](../shared-graph-controls/README.md). The owner requested tasks 06–08 as a continuation on 2026-11-11, governed by [the rollout specification](../../specs/lesson-authoring-rollout.md).

| Task | Status | Scope | Coordination |
| --- | --- | --- | --- |
| [02: lesson definitions, ownership and adaptation](02-lesson-lookup.md) | accepted 2026-11-07 | Workstream 2 | — |
| [03: feature-local registration](03-feature-local-registration.md) | accepted 2026-11-10 | Workstream 3 pilot: projective conics | — |
| [04: owned standalone scenes](04-owned-standalone-scenes.md) | accepted 2026-11-10 | Workstream 4 pilot: Blossom and NURBS | — |
| [05: persisted scene validation and projection](05-persisted-scene-validation.md) | accepted 2026-11-10 | Workstream 5: complete validation, and the projection pilot on FivePoint and ThreeViews | — |
| [06: legacy family registration](06-legacy-registration-rollout.md) | complete 2026-11-13 | 113 legacy entries in 16 catalog families | Families-prep owns current shared-root edits; integrate after each conflicting batch lands. A B-spline first batch shares graph files with 07. |
| [07: standalone scene ownership](07-owned-scene-rollout.md) | complete 2026-11-13 (8 migrated, plane-geometry trio excluded) | 11 candidate graphs | Prefer disjoint B-spline consumers first; serialize shared host hooks with 08 and lifecycle-test edits with Controls visual. Three candidates are also in 08. |
| [08: persisted scene projection](08-scene-projection-rollout.md) | complete 2026-11-13 | 25 inventory rows: 3 projective and 22 legacy | Prefer remaining projective consumers first; serialize host hooks with 07 and collection roots with 06/Families-prep. Three legacy graphs are also in 07. |

Scope counts are at the rollout baseline, `origin/master` at `c7552e58`; later additions keep their stream owner.

Tasks 06–08 cite the rollout specification's R1–R3, O1–O3 and P1–P3. Tasks 03–05 cite the original specification's R1–R5, S1–S5 and P1–P5, which are different criteria under some of the same labels.

Two overlaps between the planned tasks are graph files, not host hooks:

- Tasks 07 and 08 both cover `InscribedAngleGraph`, `SimsonLineGraph` and `InversionGraph`. These extend `PointSetGraph`, the base where task 08 may group persistence mappings. One task holds those files at a time.
- Tasks 06 and 07 both name B-splines as a first batch. Task 06 may prepare B-spline metadata meanwhile, but the two do not edit the same graph files concurrently.

Read the [coordination snapshot](../../reviews/lesson-authoring-rollout/coordination-2026-11-11.md) and refresh actual ownership before implementation. The streams it names keep their queues in [Families prep](../feature-streams/families-prep.md) and [Controls visual polish](../feature-streams/controls-visual.md). The tasks can be prepared now; current overlap concerns specific files/batches, not a blanket wait for every active stream. Since 2026-11-12 the [lesson-authoring rollout stream](../feature-streams/authoring-rollout.md) runs tasks 06–08 at the owner's request. It holds their order, status and current coordination; the table above holds no second status.

Each implementer records a consumer inventory, bounded batch plan, deletion evidence and verification in the stream's review folder, `docs/reviews/feature-streams/authoring-rollout/`, linked from its task. A first successful migration is a checkpoint; completion accounts for the entire task scope. Preserve the existing pilot completion records.
