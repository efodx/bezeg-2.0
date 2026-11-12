# Stream: Lesson-authoring rollout
Run state: active

Started 2026-11-12 at the owner's request. It carries the registration, owned-scene and projection pilots to the legacy consumers: tasks 06–08 of the [lesson-authoring task queue](../lesson-authoring-architecture/README.md), governed by the [rollout specification](../../specs/lesson-authoring-rollout.md). Rules: [feature streams](README.md). Worktree `.claude/worktrees/stream-authoring-rollout`. Port 4323. State: `docs/reviews/feature-streams/authoring-rollout/state.md`, written at the first handoff.

## Queue

| Step | Task | Notes | Status |
| --- | --- | --- | --- |
| 1 | Inventories: step 1 of tasks [06](../lesson-authoring-architecture/06-legacy-registration-rollout.md), [07](../lesson-authoring-architecture/07-owned-scene-rollout.md) and [08](../lesson-authoring-architecture/08-scene-projection-rollout.md) | Read-only, so the three may run together. Each ends with a batch list covering its whole scope: 113 entries, 11 graphs, 25 rows | done 2026-11-12: [06](../../reviews/feature-streams/authoring-rollout/06-inventory.md) (113 entries, 16 batches; open contract questions listed for step 4), [07](../../reviews/feature-streams/authoring-rollout/07-inventory.md) (8 eligible; plane-geometry trio proposed for exclusion, decided at step 6), [08](../../reviews/feature-streams/authoring-rollout/08-inventory.md) (6 batches; permitted-state generalization needed after the projective trio) |
| 2 | 07: B-spline scene batch | `BSplineBasisGraph`, `DeBoorGraph`, `BSplineInsertionGraph`, `BSplineExtractionGraph`. Characterize first (task 07 step 2) | done 2026-11-12: [evidence](../../reviews/feature-streams/authoring-rollout/07-batch1-evidence.md), [smoke](../../reviews/feature-streams/authoring-rollout/batch1-smoke.md) |
| 3 | 08: projective batch | CrossRatio, Pascal and PolePolar. Disjoint from step 2, so the two may run together while neither changes host hooks | done 2026-11-12: [evidence](../../reviews/feature-streams/authoring-rollout/08-batch1-evidence.md), [smoke](../../reviews/feature-streams/authoring-rollout/batch1-smoke.md). The three `projective-*` rows of `PRESET_DATA_STATE_KEYS` stay until task 08 step 4 |
| 4 | 06: registration by family | Batches from the step 1 inventory. B-splines register after step 2 has landed. Root files are shared with Families prep (below) | in progress: 42/113 registered. B-splines ([evidence](../../reviews/feature-streams/authoring-rollout/06-batch1-evidence.md), [smoke](../../reviews/feature-streams/authoring-rollout/06-batch1-smoke.md)); basics, PH, parameterization ([evidence](../../reviews/feature-streams/authoring-rollout/06-batch2-evidence.md), [smoke](../../reviews/feature-streams/authoring-rollout/batch2-smoke.md)). polynomial Bézier ([evidence](../../reviews/feature-streams/authoring-rollout/06-batch3-evidence.md), [smoke](../../reviews/feature-streams/authoring-rollout/06-batch3-smoke.md)). rational ([evidence](../../reviews/feature-streams/authoring-rollout/06-batch4-evidence.md), [smoke](../../reviews/feature-streams/authoring-rollout/06-batch4-smoke.md)). splines ([evidence](../../reviews/feature-streams/authoring-rollout/06-batch5-evidence.md), [smoke](../../reviews/feature-streams/authoring-rollout/06-batch5-smoke.md)). curve geometry ([evidence](../../reviews/feature-streams/authoring-rollout/06-batch8-evidence.md); smoke pending). Next: interpolation (5) |
| 5 | 07: remaining curve candidates | Interpolation, Hermite, SubdivisionCurve and ParametricCurve | done 2026-11-12: Interpolation, Hermite, SubdivisionCurve ([evidence](../../reviews/feature-streams/authoring-rollout/07-batch2-evidence.md)); ParametricCurve ([evidence](../../reviews/feature-streams/authoring-rollout/07-batch3-evidence.md), [smoke](../../reviews/feature-streams/authoring-rollout/batch3-smoke.md)) |
| 6 | 08: `PointSetGraph` owners, then 07: the plane-geometry trio | `InscribedAngleGraph`, `SimsonLineGraph` and `InversionGraph` are in both tasks | not started |
| 7 | Close-out | Step 4 of each task, `just check`, task status lines, architecture and persistence guidance | not started |

Each task file holds its steps, acceptance and completion evidence; this file holds the order and status. A first migrated batch is a checkpoint: a task is done only when its whole scope has a disposition.

## Coordination, refreshed 2026-11-12

Recheck these at each batch boundary, as the rollout specification requires.

- **Controls visual** is complete. Its teardown consolidation landed in `84c25138`: one all-graph teardown sweep replaced the per-graph StrictMode and scene-change teardown tests. Task 07 step 2 therefore starts by listing which lifecycle assertions remain for its candidates, and restores any distinction that O2 and O3 need and the sweep does not make.
- **Families prep** is active and still edits the registration roots (`demonstrations.ts`, `graphLoaders.ts`, `PresetImport.ts`, `registrationIntegrity.test.ts`) and the inventories task 08 reads (`graphTransientStateContract.tsx`, `PresetCatalog.test.tsx`). Prepare family-local modules freely. Keep each root edit minimal, push it as soon as it is accepted, and keep both sides when rebasing over its additions.
- **Shared host code** (`BaseGraph.tsx`, `GraphSession.ts`, `SceneReplacement.ts`, `OwnedScene.ts`, `ScenePersistence.ts`): one slice at a time, in its own commit.

## Records

Inventories, batch plans, deletion evidence, reviews and smoke notes go in `docs/reviews/feature-streams/authoring-rollout/`. At acceptance each task file's status line links them, as tasks 03–05 did.

## Decisions

Handlers decide without owner confirmation (owner standing direction): decide, record the choice with its reason and rejected alternative in the rollout specification, and continue. The README's stop conditions still apply.

- **One stream for three tasks** (planner, 2026-11-12). The tasks share host hooks, three graph files and the registration roots, so one owner sequences them. Rejected: one stream per task, which would turn each shared file into a cross-stream wait.
- **Step 6 runs task 08 before task 07** (planner, 2026-11-12). Task 08 may move persistence mappings into the `PointSetGraph` base, so the scene migration of the three subclasses follows a settled base. Rejected: task 07 first, which would be rebased over the base change. A handler may reorder with a recorded reason.
