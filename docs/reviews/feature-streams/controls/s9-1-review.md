# Step 9 slice 1 review (engineering)

Scope: uncommitted registration pilot (projective). Build run: `.command-logs/s9-review-build.log` (passed). Tests not re-run.

## Findings
No blocking finding.

1. Non-blocking, src/Routes.tsx:8-12. Every graph route (legacy too) now awaits `import('./graphs/graphLoaders')` before starting the GraphRoute/graphFactories imports; a sequential extra round trip (small chunk) on legacy routes. Expected: start both in `Promise.all`, or decide registration by a metadata set. Cosmetic/perf only.
2. Non-blocking, src/graphs/registrationIntegrity.test.ts:65-77. Collection identity is checked between `collections.ts` and `PresetImport` only; graphs build their own `*PresetCollection()` instances, so a rival definition inside a graph for the same storage key would not be seen. Same exposure as before the change.
3. Non-blocking, src/graphs/projective/registrationLoading.test.tsx:113. The Routes static-import allowance (`learning/`) also hides a static reach of lessonCatalog/chapterOwnedLessons; the evaluation test (line 41) does cover them via mocks, so the gap is closed in practice.

## Cleared
- Metadata imports: registration.ts and collections.ts have only `import type` or model/validation modules; `Definition` type import is erased (circular with demonstrations.ts is type-only). The AST test (registrationLoading.test.tsx:67-80) skips type-only imports; collections.ts pulls projectivePresetCollection (localization + models only, no graph).
- DemonstrationId stays a narrow union (rows `as const satisfies`); guard at registrationIntegrity.test.ts:87 fails to compile if widened.
- Catalog order unchanged: projective rows spread last (demonstrations.ts), asserted at registrationIntegrity.test.ts:79.
- Routes: registered ids resolve through loaders, legacy through `graphFactories` (`Exclude` type keeps the legacy table exhaustive). Routes.test identity change is justified (projective not in table) and replaced by constructor assertions for all five projective paths, so no weakening.
- Chunking (build/assets): CrossRatio/Pascal/PolePolar/FivePoint/ThreeViews each remain their own chunk, referenced only from the graphLoaders chunk; graphFactories chunk does not reference them; graphLoaders is imported only dynamically (Routes.tsx:8; static importers are tests and allGraphFactories.ts).
- R1 integrity: messages name family and id/path/key; real table run (registrationIntegrity.test.ts:66-72) against legacy rows, factory ids and collections; synthetic failures cover each rule.
- R2: module evaluation is observed through hoisted `vi.mock` factories with `resetModules`; a projective route evaluates only its own graph, legacy route evaluates graphFactories and no projective graph.
- Storage key: unique-key test over composed presetCollections (line 73-77).
- CJS: smoke-catalog resolves spreads (absolute paths accepted by parseSource); probe regex reads both files; transient-state-scope reads runtime lazy loaders by a strict regex with a test that all five classes resolve in `src/graphs/projective`.
- All-graph consumers: test files import `allGraphFactories`, which merges legacy + resolved loaders, so projective stays covered.

## Not verified
Vitest/tsc/script test runs, browser smoke, and whether `check-changed-always-run.cjs` (comment line 9) still selects PresetCatalog.test through the new import chain.
