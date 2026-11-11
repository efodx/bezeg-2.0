# 06. Roll out family-local registration to legacy families

Status: planned, 2026-11-11. Source: [rollout scope and R1–R3](../../specs/lesson-authoring-rollout.md#registration); extends completed [task 03](03-feature-local-registration.md).

## Scope and entry

Start from `legacyDemonstrationRows` in `src/demonstrations.ts`, `graphFactories.ts`, `graphLoaders.ts`, `PresetImport.ts`, `guidedLessonOwnership.ts`, `chapterOwnedLessons.ts` and capture/inventory composition. Reuse the projective implementation and [ADR 0059](../../adr/0059-feature-local-registration.md).

The baseline has 113 legacy entries in: basics; polynomial Bézier; rational; splines; PH; parameterization; curve geometry; interpolation; B-splines; patches; functions; analysis; probability; maps; plane geometry; computational geometry. These catalog groupings guide batches, but implementation modules follow real ownership and may serve several groups. Newly registered Families-prep graphs keep their stream owner.

## Steps

1. Inventory each baseline ID, graph implementation, collection key/owner, lesson owners, tooling identity and shared-route relationships. Compare with current master and credit completed migrations. Finish with no unknown owner and a batch list covering all 113 entries.
2. Migrate bounded family batches using separate metadata, collection and runtime exports plus explicit root composition. Start with an unclaimed family such as B-splines; coordinate its graph-file edits with task 07. Serialize root integration after Families-prep's current registration batch lands. Preserve family/catalog order even where shared implementation modules cross those groups.
3. For each batch, remove replaced central rows and derived primary-owner duplication, connect tooling to the same identities and prove loading/deletion behavior. Retain genuine aliases and independent preview expectations. Record the removed registration sites and affected IDs before committing.
4. When the last legacy entry is accounted for, retire the legacy runtime fallback and constructor table, retaining the derived eager test adapter. Update the contributor recipe and architecture description for the final composition. A remaining legacy entry needs a concrete disposition; leaving an unplanned second pilot is incomplete.

## Verification and completion

Meet R1–R3 with registration integrity, catalog/ownership/import-loading, preset collection and capture-tool checks. Production smoke covers migrated routes, refresh/query/hash, unknown paths, catalog order and lesson return. Check shared-collection consumers together. Use the current verification recipe and record coverage by ID. Completion includes the full inventory, deletion evidence, checked revision and outstanding exclusions with their contract reason.
