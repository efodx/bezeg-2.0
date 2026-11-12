# Task 06 batch 16: computational-geometry family evidence (last registration batch)

Family module: `src/graphs/compgeo/computationalGeometry/` (`registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`). Exports `computationalGeometryDemonstrationRows`, `computationalGeometryCollectionKeys`, `computationalGeometryGraphLoaders`, `computationalGeometryCollections` (no `computationalGeometryPrimaryOwners`: all 16 owners derive). IDs, in order: `orientation`, `polygon-area`, `convex-hull`, `point-in-polygon`, `hull-robustness`, `bezier-hulls`, `ear-clipping`, `point-set-triangulation`, `delaunay`, `voronoi`, `voronoi-degenerate`, `interval-sweep`, `segment-intersections`, `monotone-partition`, `monotone-triangulation`, `fortune`. Rows moved verbatim (paths `/bezeg-2.0/compgeo/...`). Graphs stay in `src/graphs/compgeo/`; loaders are lazy `import('../OrientationGraph')` etc. (classes taken from the old `graphFactories.ts`). No graph file changed.

## Order
No other row has family `computational-geometry`. `...computationalGeometryDemonstrationRows` is spread right after `...planeGeometryDemonstrationRows` in `definitions`, so the flat catalog order is unchanged from before (the 16 rows follow the five plane-geometry rows, which follow maps). `placement` test asserts the family lists exactly the 16 in order. `demonstrations.test.ts` table: the 16 rows moved after `inversion`; `registrationIntegrity.test.ts` `realFamilies` gained `computational-geometry` after `plane-geometry`.

## Collections
The 16 existing collection objects are reused. `compgeoPresetCollections.ts` stays (graphs import its overlay constants and `bezierClippingCollection` is exported from it); `collections.ts` imports the objects from it, except `pointInPolygonPresetCollection`, which that file does not export (imported from its own file). The list is in catalog order (the old aggregate was in another order, so the position of these 16 in `presetCollections` changed; the storage keys and the collection objects did not). `PresetImport.ts` replaced `...compgeoPresetCollections` with `...computationalGeometryCollections`; nothing else spreads the aggregate (only `curves/bezier/registrationComposition.test.ts` reads it to assert `compgeo-bezier-clipping` is absent). Keys are unchanged and asserted as an explicit map: `compgeo-orientation`, `compgeo-polygon-area`, `compgeo-hull-trace` (convex-hull), `compgeo-point-in-polygon`, `compgeo-hull-robustness`, `compgeo-bezier-hulls`, `compgeo-ear-clipping`, `compgeo-triangulation` (point-set-triangulation), `compgeo-delaunay`, `compgeo-voronoi`, `compgeo-voronoi-degenerate`, `compgeo-interval-sweep`, `compgeo-bentley-ottmann` (segment-intersections), `compgeo-monotone-partition`, `compgeo-monotone-triangulation`, `compgeo-fortune`.

## Owners
All 16 derive: each equals its first `chapterOwnerRows()` row (chapters `convexity-hulls`, `triangulations-voronoi`, `sweep-algorithms`; section = id), asserted, and equals the old central owner. The 16 central rows (and their comments) are deleted from `guidedLessonOwnership.ts`; `ComputationalGeometryDemonstrationId` joined `DerivedOwnerId` and the rows joined `derivedOwnerIds`.

## Empty legacy table
Form chosen, the smallest that keeps typecheck green:
- `src/demonstrations.ts:69` `legacyDemonstrationRows = [] as const satisfies readonly Definition[]` (type `readonly []`; the `DemonstrationId` union is unaffected). Kept exported.
- `src/graphs/graphFactories.ts:10` `graphFactories: Record<Exclude<DemonstrationId, RegisteredDemonstrationId>, ...> = {}` (the type resolves to `Record<never, ...>`); all graph imports removed. `allGraphFactories.ts`, the `Routes.tsx:13` fallback and `graphLoaders.ts` are untouched (still working).
- Typing fixes this forced: `src/graphs/registrationIntegrity.test.ts:200` widens the empty table to `readonly Definition[]`; `src/graphs/graphCollectionIdentity.test.ts` types the legacy entries as `Object.entries<() => BaseGraph<BaseGraphState>>(graphFactories)` and the list as `[string, BaseGraph<BaseGraphState>][]` (the former `ReturnType<...>` and `unknown` entries failed on `never`).
- `scripts/transient-state-scope.test.cjs`: the drift guard's `realSources` no longer lists `graphFactories.ts` (its `=> new X(` pattern matched nothing, failing "the ground-truth patterns matched nothing"). `scripts/transient-state-scope.cjs` needed no change (its import parser returns no classes from the empty file; the loader runtimes supply them).
- Deleted the test `a legacy route still resolves through the legacy table` (it used `/bezeg-2.0/compgeo/orientation` and the mocked `graphFactories`) from these 16 files: `src/graphs/{analysis,basics,maps,patches,probability,projective,functions}/registrationLoading.test.tsx`, `src/graphs/compgeo/planeGeometry/registrationLoading.test.tsx`, `src/graphs/curves/{bezier,bspline,geometry,interpolation,parametrisations,ph,rational,spline}/registrationLoading.test.tsx`. The mocked `graphFactories` module (`{'orientation': ...}`, now `{}` where it carried that entry) stays: the other tests there still assert the legacy table is not evaluated. The new family test has no legacy test. Two other grep hits for "legacy route" (`guidedExamples.test.ts`, `lessonLookup.characterization.test.ts`) are about patch-basics legacy URLs, unrelated, untouched.
- Not retired here (task 06 step 4): `legacyDemonstrationRows`, `graphFactories`, `allGraphFactories`, the Routes fallback.

## Collateral
`graphFactories.ts` lost 16 entries and 16 imports; `graphLoaders.ts` gained one spread (after `planeGeometryGraphLoaders`); probe script row-source list gained `src/graphs/compgeo/computationalGeometry/registration.ts`.

## Failure counts
- Tests first (`just unit src/graphs/compgeo/computationalGeometry`): 45 failed / 72 tests, 2 files failed (`/tmp/m16-pre.log`).
- Order failure with the spread before `...mapsDemonstrationRows` (family, registrationIntegrity, demonstrations tests): 3 failed: `demonstrations.test.ts` "preserves every Demonstration" in sl and en, and registrationIntegrity "registered rows stay after the legacy rows in the catalog, in family registration order" (`/tmp/m16-order.log`). Restored afterwards.
- After the fix (spread after plane geometry, table moved, keys asserted, collections.ts import corrected): family, registrationIntegrity and demonstrations tests pass (94 tests incl. the two other files).

## Checks
- Node scripts (3 files): 60 pass, 0 fail (after the `realSources` fix; before it 59/1).
- `just typecheck`: passed (`.command-logs/2026-11-12T16-53-16-753Z-32600-dfbcfac6.log`), after fixing the two `never` errors above. `just lint` on the changed paths: passed.
- Wide `just unit src` (BEZEG_TRANSIENT_STATE, _SCENE_REPLACEMENT, _LESSON_RESTORATION, _SCENE_CONTENT, _PRESET_ROUNDTRIP, _GRAPH_TEARDOWN set to the 16 ids): passed, 1346.3 s (includes 252 s waiting for a slot), `.command-logs/2026-11-12T16-57-10-174Z-30780-c0349139.log`; no failures. It includes every `registrationLoading`/`registrationComposition` test, `PresetCatalog`, `lessonLookup.characterization`, `guidedExamplePreviews`, `DemonstrationsPage` and `Routes` tests.

## Not verified
Browser smoke; `just build`; sweeps beyond the 16 ids.
