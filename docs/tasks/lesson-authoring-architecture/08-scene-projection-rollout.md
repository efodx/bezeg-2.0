# 08. Roll out persisted scene projection and reconstruction

Status: planned, 2026-11-11. Source: [rollout scope and P1–P3](../../specs/lesson-authoring-rollout.md#projection-and-reconstruction); extends the projection portion of completed [task 05](05-persisted-scene-validation.md). Complete persisted-input validation already shipped.

## Scope and entry

Use `ScenePersistence.ts`, `projectivePersistence.ts`, graph export/import/figure/default-lesson hooks, collection state checks and `PRESET_DATA_STATE_KEYS` in `graphTransientStateContract.tsx`.

First finish the remaining projective consumers: CrossRatio, Pascal and PolePolar. Then cover the baseline legacy model entries in the transient-state inventory: point-set/algorithm graphs, triangle-centres, inscribed-angle, Euler line, Simson line and inversion. Group inherited mappings under `PointSetGraph` where their contracts truly agree; triangulation's extra state needs its own classification. Exclude the newly registered trigonometry, line, isometry, circle-construction and combinatorics entries owned by Families-prep, and its in-flight Random/Kinematics additions.

## Steps

1. Inventory each in-scope ID's persisted data, permitted graph state, transient state, derived caches and all reconstruction paths. Mark existing single-owner mappings as already covered, with evidence. Finish with every baseline legacy inventory entry assigned to a batch and every shared-base subclass accounted for.
2. Migrate CrossRatio, Pascal and PolePolar using the existing declarations and hooks. Preserve finite/ideal point cases, selection reset, authored scene defaults and valid stored formats. Remove the replaced model-stripping and reconstruction knowledge; verify before expanding.
3. Migrate the remaining eligible family owners in bounded batches. Use typed permitted-state fields when more than `initialized` must persist. Preserve consumer-specific model validation, derived-state rebuilding, synchronous lesson writes and trusted checkpoint restoration. Shared-base changes must explicitly cover every affected subclass, including any excluded new consumer that inherits that base.
4. Replace central test-inventory rows only where shared public-contract tests retain their independent assertions. Complete the inventory and update persistence guidance; the projective batch alone does not close this task.

## Coordination, verification and completion

Serialize `BaseGraph`/replacement hooks with task 07 and collection-root edits with task 06 or Families-prep. Families-prep currently edits `graphTransientStateContract.tsx` and `PresetCatalog.test.tsx`; integrate removals after its additions land, retaining its coverage. Coordinate shared projective/lifecycle test files with Controls visual.

Meet P1–P3 through independent round trips, partial/malformed inputs, fresh reconstruction after different prior scenes, reset/lesson/figure return and mathematical board observations. Retain legacy valid fixtures and verify no stored key or format changed. Use the current runtime publication recipe and affected browser flows; shared host changes require the full shared checklist. Completion records declarations adopted, duplicate mappings deleted, inventory dispositions and exact coverage.
