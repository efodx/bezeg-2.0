# 4. One live function model authority

Status: pending. Source: [specification, section 4](../../specs/mathematical-runtime-contracts.md#4-one-live-function-model-authority), acceptance F1–F4 and shared verification. Dependency: task 1 accepted. Serialize shared base/subclass edits, including overlaps with task 5 or the separate lesson-authoring persistence workstream.

## Scope and entry points

Start at `src/graphs/functions/BaseFunctionGraph.tsx`, `src/graphs/base/SceneStore.ts`, and the host/replacement contracts. Inventory every `BaseFunctionGraph` subclass, including the complex and linear-map families, all flat scene-state readers, capture/import/figure paths and `modelCache`/`memoView` consumers. The target is one live domain-model owner; persisted validation/default policies stay with their existing owners.

## Work and completion

1. Capture current model identity, accepted no-op, host-only update and board-synchronization behavior. Include a same-tick multi-action lesson and conflicting model fields in persisted data versus graph state, pinning the current authority rule independently of the new representation.
2. Settle a store-owned immutable model representation and stable typed access. Prove it with one simple graph and one graph with substantial model/view caching. A getter that allocates a projection per read, or a new mutable cache serving as a second authority, does not satisfy F1/F2.
3. Migrate the base and all inventoried subclasses in bounded sequential slices. Keep the existing write/sync interface where it helps callers, but remove the mutable mirror, cast-based snapshot reconstruction and authority reconciliation made obsolete by the final representation. Preserve import precedence and public file shapes through explicit edge adaptation.
4. Complete F1–F4 across the inventory. Demonstrate unchanged cache dependencies and settled geometry; record representative drag/slider baselines before changing cache or rendering policy. Update current architecture to describe the implemented live ownership.

## Verification and return

Run focused store/base/model-cache tests and real-host tests for every affected family, including the task 1 regressions. Cover the replacement/lesson/figure cases in F3 with meaningful board observations and retained independent expected values. Run typecheck, final unit suite, lint and build. Delegate broad production smoke across affected function-derived families; use the full browser checklist if the shared host/workspace/lesson runtime changes.

Return the complete consumer inventory with disposition, identity and same-tick evidence, removed reconciliation locations, unchanged persisted-data samples, numerical/interaction checks, exact revision/results and explicit gaps. A partial pilot is progress, not completion of this task.
