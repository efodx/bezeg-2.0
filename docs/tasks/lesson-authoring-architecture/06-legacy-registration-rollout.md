# 06. Roll out family-local registration to legacy families

Status: complete, 2026-11-13. All 113 entries are registered family-locally in 16 batches ([inventory](../../reviews/feature-streams/authoring-rollout/06-inventory.md), batch evidence and smoke linked from the [stream](../feature-streams/authoring-rollout.md)). Step 4 deleted `graphFactories.ts`, the `Routes.tsx` legacy fallback and `legacyDemonstrationRows`. The derived test adapter `allGraphFactories.ts` is kept, and a deletion guard was added ([evidence](../../reviews/feature-streams/authoring-rollout/06-step4-evidence.md)). No exclusions. Planned 2026-11-11. Source: [rollout scope and R1–R3](../../specs/lesson-authoring-rollout.md#registration); extends completed [task 03](03-feature-local-registration.md).

## Scope and entry

Start from `legacyDemonstrationRows` in `src/demonstrations.ts`, `graphFactories.ts`, `graphLoaders.ts`, `PresetImport.ts`, `guidedLessonOwnership.ts`, `chapterOwnedLessons.ts` and capture/inventory composition. Reuse the projective implementation and [ADR 0059](../../adr/0059-feature-local-registration.md).

The baseline has 113 legacy entries in 16 catalog families: basics (2); polynomial Bézier (11); rational (7); splines (5); PH (2); parameterization (3); curve geometry (6); interpolation (5); B-splines (6, including the task 04 pilots); patches (7); functions (14); analysis (16); probability (5); maps (3); plane geometry (5); computational geometry (16). These catalog groupings guide batches, but implementation modules follow real ownership and may serve several groups: `bezier-clipping` is cataloged under polynomial Bézier and implemented in `src/graphs/compgeo`. Newly registered Families-prep graphs keep their stream owner.

## Steps

1. Inventory each baseline ID, graph implementation, collection key/owner, lesson owners, tooling identity and shared-route relationships. Compare with current master and credit completed migrations. Finish with no unknown owner and a batch list covering all 113 entries.
2. Migrate bounded family batches using separate metadata, collection and runtime exports plus explicit root composition. Start with an unclaimed family such as B-splines; coordinate its graph-file edits with task 07. Serialize root integration after Families-prep's current registration batch lands. Preserve family/catalog order even where shared implementation modules cross those groups.
3. For each batch, remove replaced central rows and derived primary-owner duplication, connect tooling to the same identities and prove loading/deletion behavior. Retain genuine aliases and independent preview expectations. Record the removed registration sites and affected IDs before committing.
4. When the last legacy entry is accounted for, retire the legacy runtime fallback and constructor table, retaining the derived eager test adapter. Update the contributor recipe and architecture description for the final composition. A remaining legacy entry needs a concrete disposition; leaving an unplanned second pilot is incomplete.

## Verification and completion

Meet R1–R3 with registration integrity, catalog/ownership/import-loading, preset collection and capture-tool checks. Production smoke covers migrated routes, refresh/query/hash, unknown paths, catalog order and lesson return. Check shared-collection consumers together. Use the current verification recipe and record coverage by ID. Completion includes the full inventory, deletion evidence, checked revision and outstanding exclusions with their contract reason.
