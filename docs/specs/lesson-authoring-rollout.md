# Lesson-authoring rollout after the pilots

Status: planned, 2026-11-11. The owner requested continuation tasks for workstreams 3, 4 and 5 and a check against running streams. [Task queue](../tasks/lesson-authoring-architecture/README.md). No application migration is implemented by this planning change.

Extends [lesson-authoring architecture](lesson-authoring-architecture.md), retaining its interfaces and compatibility contracts. The accepted pilot records stay complete. This specification replaces their pilot-only stopping point for the bounded consumers below; it does not reopen the completed shared-input, lesson-lookup or persisted-validation work. It also schedules the legacy-registration continuation previously deferred in the [November follow-ups](architecture-followups-2026-11.md#disposition).

## Scope

Baseline: `origin/master` at `c7552e58`, reconciled on 2026-11-11. New families are already adopting [ADR 0059](../adr/0059-feature-local-registration.md); this rollout targets legacy consumers. Refresh the inventory at each batch boundary, credit work already merged, and preserve concurrent additions.

| Workstream | Completion scope | Outside this rollout |
| --- | --- | --- |
| 3: registration | The 113 entries in `legacyDemonstrationRows` at the baseline, across its 16 catalog families; retire their central constructor/collection/primary-owner registrations in bounded family batches. | Reimplementing the projective pilot or Families-prep registrations; changing lesson availability, routes or catalog order. |
| 4: owned scenes | Disposition every named candidate in task 07, migrate every compatible standalone scene, and explain any exclusion against the scene contract. | Forcing curve adapters, auxiliary boards or surface renderers into the slot; scene-reuse optimizations. |
| 5: projection | Disposition the remaining legacy entries of `PRESET_DATA_STATE_KEYS` at the baseline, migrate duplicated projection/reconstruction knowledge through its actual family owners, and account for removed inventory entries. | Repeating complete-envelope validation; changing accepted files/defaults; migrating new Families-prep graphs during their release work. |

The inventory is finite: additions after this baseline keep their current stream owner unless explicitly included in a later batch. A completed first batch does not complete the rollout. Each in-scope consumer ends as migrated, already covered by a shared owner, or excluded with a concrete contract mismatch; an unassessed or merely inconvenient consumer remains unfinished.

## Shared contracts

Preserve route and example identities, catalog/teaching order, canonical collection keys, valid file shapes, reset meaning and trusted checkpoint restoration. Keep independent mathematical and persisted-data expectations. Record any necessary behavioral change separately before combining it with migration work.

Retain explicit root composition and the separation of cheap metadata, collections, runtime loaders and tooling. Extend the existing `SceneDeclaration`/`SceneSlot` and `ScenePersistence` interfaces only for a demonstrated consumer need. Graph families retain mathematical validation, derived geometry and reuse compatibility; the host owns lifetime and replacement order.

## Acceptance

### Registration

- **R1:** The baseline inventory has no unresolved legacy entry. Runtime routes resolve family loaders without importing the legacy all-graph constructor table. Family metadata and collection loading do not evaluate graph constructors; test-only eager adapters still cover every graph. Retire the legacy runtime table/path once its last consumer moves.
- **R2:** Per-family catalog ordering, exact routes, shared collection relationships and chapter ownership agree before and after migration. Preserve multiple owners per Demonstration, several Demonstrations per collection, aliases and shared-route cases. Derive navigation owners only where historical associations actually agree.
- **R3:** Capture/inventory tooling reads migrated identities through the existing TypeScript loading bridge. Independent preview expectations remain independent. Deletion/loading checks catch reintroduced central registration and accidental executable imports; production route/asset and exact-section return checks pass.

### Owned scenes

- **O1:** Every task-07 candidate has a recorded disposition. Migrated graphs delegate one live standalone scene to the session-owned slot and lose the replaced ownership/lifecycle choreography. Existing domain scene implementations and synchronous state remain authoritative.
- **O2:** Real-host checks cover ordinary synchronization, structural replacement, reset/import, synchronous multi-action lessons, checkpoint/figure return and remount. Change creation inputs beyond point count (such as knots or mode) to distinguish synchronization from rebuild. Preserve contextual reset and replacement behavior.
- **O3:** Captured old objects/listeners become inactive after release, disposal is idempotent, failed construction cleans partial resources, and late work cannot touch a replaced scene. Preserve unrelated session resources and the existing lifecycle assertions when consolidating tests.

### Projection and reconstruction

- **P1:** Every baseline legacy inventory entry has a disposition. Migrated consumers use one family-owned declaration for persisted projection and fresh reconstruction; remove the export/figure/default-scene mappings it replaces. Share at an existing base only when all affected subclasses' fields are accounted for.
- **P2:** Persisted data, permitted display state, transient state and derived caches are classified explicitly. Valid historical imports and exports retain their meaning; omitted fields remain deterministic and contextual reset remains contextual. Trusted checkpoints restore full runtime state directly. Generalize the permitted-state type only where a consumer needs more than `initialized`, with checked named fields rather than casts that admit arbitrary state.
- **P3:** Independent round-trip and board observations cover two distinct preceding scenes, partial presets, malformed refusal without mutation, derived-state reconstruction, lesson reset/exit and figure return. Replace a `PRESET_DATA_STATE_KEYS` row only when the public projection contract covers its assertion; retain independently authored expected values.

## Coordination and verification

The [coordination snapshot](../reviews/lesson-authoring-rollout/coordination-2026-11-11.md) records current work; it is evidence, not a permanent lock. Recheck live sessions, uncommitted files and unpublished commits before taking a shared file. Stream queue labels alone are insufficient.

- Families-prep owns its new-family registrations and shared-root edits while that batch is in flight. Registration inventories and family-local preparation can proceed; shared-root integration waits until those edits land or the active ownership is explicitly released. Do not wait for the entire stream to finish.
- Controls visual polish can run alongside disjoint runtime work. Its planned lifecycle/test consolidation must not delete the distinguishing assertions needed by O2/O3/P3. Serialize edits to the same graph tests, readout helpers or control files.
- Tasks 07 and 08 serialize any `BaseGraph`, `GraphSession`, `SceneReplacement` or common persistence-hook change. Task 06 and task 08 serialize collection-root edits. Consumer-only batches may run concurrently when their graph files and tests are disjoint.
- Use the current command guide after the CI scheduling changes land. Select affected route IDs explicitly where catalog sweeps are sampled; sampling is not evidence for a newly migrated graph. Record exact coverage and use existing shared contracts instead of reproducing every test per graph.

## Rollout decisions

Recorded by the stream handlers under the owner's standing direction; evidence in [the stream records](../reviews/feature-streams/authoring-rollout/).

- **R-circle: no collection, declared explicitly** (2026-11-12). `circle` has no Preset collection, and registration integrity requires a collection reference. Its family registration declares the absence explicitly, with a reason, matching its `NO_PRESET_COLLECTION` entry in the transient-state contract; integrity accepts an explicit absence and still rejects an omitted one. Rejected: an empty collection, which would advertise import and export the graph does not support.
- **R-maps: split aggregate collection maps per family** (2026-11-12). Each registration batch moves its entries out of `curvePresetCollections`, `functionPresetCollections`, `patchPresetCollections` and the compgeo array into its family `collections.ts`, with collection keys unchanged, and the aggregate is deleted with its last user. Rejected: filtering the aggregate spread by migrated IDs, which keeps the definitions centrally owned and adds a temporary filter that must be removed later.
- **R-owners: derive where history agrees, otherwise explicit** (2026-11-12). `DerivedOwnerId` generalizes from the projective rows to every family registration. An ID's primary owner is derived only when the first `chapterOwnerRows()` row equals its current primary, which a test checks. The 45 IDs whose owners sit in chapters without owned-lesson rows keep the owner as explicit family metadata. Rejected: forcing derivation by adding owned-lesson rows, which would change lesson ownership in a registration batch.
- **R-order: registered rows trail in the flat list** (2026-11-12). As in the projective pilot, migrated rows move behind the legacy rows in `definitions`; order within each catalog family stays the same. The first batch confirms which consumers read flat order and records them; a consumer that depends on it stops the batch. Batch 1 found one: the recorded registry order in `src/demonstrations.test.ts`. Product code reads the catalog by ID or by family, so each batch moves its rows in that table behind the registered families, in spread order. Rejected: an explicit global order table, which recentralizes what the families now own.
- **R-g1: the `g1-spline` import-only collection moves to the splines family** (2026-11-12). It has no Demonstration but accepts old exports, so the splines `collections.ts` keeps it as an import-only entry. Rejected: a root legacy list, a central site with a single entry.
- **O-subdivision: a surplus vertex pool rebuilds the scene** (2026-11-12). `SubdivisionScene.sync` refuses when its vertex pool is larger than the shown round needs, so the slot rebuilds. Without it, a checkpoint restored after Play left a 16-point pool for a 12-point stage and failed the teardown contract. Going back a round, Reset, a rule switch or a restore now rebuilds instead of syncing; round, playback and refusal state live in graph state and survive. Rejected: shrinking the pool inside `sync`, which would make the domain scene manage board-object removal that the slot already owns.
- **O-plane: plane-geometry scene disposition waits for task 08** (2026-11-12). The task 07 inventory finds that `InscribedAngleGraph`, `SimsonLineGraph` and `InversionGraph` keep lists of board objects on the shared `PointSetGraph` board, not one standalone scene. They are decided at queue step 6, after task 08 settles `PointSetGraph`.

Follow the source workstream's verification and AGENTS review/smoke requirements for implementation. Start with focused checks, then the current runtime publication recipe. Shared host/lesson-runtime changes need the full shared checklist; family-only registration needs production loading/route/tooling checks. Planning documents alone need Markdown/link/whitespace checks. This queue did not start a stream by itself. The owner started the [lesson-authoring rollout stream](../tasks/feature-streams/authoring-rollout.md) on 2026-11-12.
