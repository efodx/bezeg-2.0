# Task 06 batch 14: maps family evidence

Family module: `src/graphs/maps/` (`registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`). Exports `mapsDemonstrationRows`, `mapsCollectionKeys`, `mapsGraphLoaders`, `mapsCollections` (no `mapsPrimaryOwners`: all owners derive). Three IDs: `linear-map`, `complex-reciprocal`, `complex-roots`. Graphs stay in `src/graphs/linear/` and `src/graphs/complex/`; loaders are lazy `import('../linear/LinearMapGraph')` etc. `linear-map` also serves Families-prep "Batch D" modes with no row of their own; no graph file changed.

## Order
Catalog family `maps` lists the three, then `complex-power`, `complex-euler` (batch D), then `isometries`. `...mapsDemonstrationRows` is spread directly after `...legacyDemonstrationRows` and before `...complexBatchDDemonstrationRows` in `src/demonstrations.ts`. `placement` test asserts `linear-map, complex-reciprocal, complex-roots, complex-power, complex-euler, isometries`. The recorded table in `demonstrations.test.ts` moved the three rows to just before `projective/cross-ratio` (batch D has no rows there); `registrationIntegrity.test.ts` `realFamilies` gained `maps` before `complex-batch-d`.

## Collections
The three existing collection objects are reused (`linearMapPresetCollection`, `complexReciprocalPresetCollection`, `complexRootsPresetCollection`); keys equal ids, unchanged. `PresetImport.ts` replaced the three bare spreads and imports with `...mapsCollections`, at the same position.

## Owners
All three derive: each equals its first `chapterOwnerRows()` row (`linear-maps#matrix-and-image`, `complex-maps#reciprocal-inversion`, `complex-maps#roots`), asserted, and equals the old central owner. Three central rows deleted from `guidedLessonOwnership.ts`; `MapsDemonstrationId` added to `DerivedOwnerId` and `mapsDemonstrationRows` to `derivedOwnerIds`.

## Collateral
`graphFactories.ts` lost three entries and three imports; `graphLoaders.ts` gained one spread; probe script row-source list gained `src/graphs/maps/registration.ts`. `sceneReplacementContract.test.tsx` needed no change: it already imports `allGraphFactories as graphFactories`, which includes registered loaders, so lines 214-215 resolve the registered constructors. The new loading test keeps `/bezeg-2.0/compgeo/orientation` as legacy example; no other test broke.

## Failure counts
- Before the roots (`just unit src/graphs/maps`, tests first): 18 failed / 34 tests, 2 files failed (`/tmp/m14-pre.log`).
- Order failure with the spread after `complexBatchDDemonstrationRows` (maps, registrationIntegrity, demonstrations tests): 2 failed (maps `placement`, registrationIntegrity registration-order test), `/tmp/m14-order.log`.
- After the fix: those three pass, `.command-logs/2026-11-12T15-15-16-387Z-24588-7e59eb97.log`.

## Checks
- All `registrationLoading` and `registrationComposition` tests (name filter): passed, `.command-logs/2026-11-12T15-16-43-669Z-7512-7b7b034e.log`.
- lessonLookup.characterization, guidedExamplePreviews, authoredChapterCoverage, PresetCatalog: passed, `.command-logs/2026-11-12T15-17-36-480Z-23152-c3230895.log`.
- Node scripts (3 files): 60 pass, 0 fail.
- `just typecheck`: passed, `.command-logs/2026-11-12T15-19-55-583Z-27804-d844a680.log`. `just lint` on the changed paths: passed, `.command-logs/2026-11-12T15-22-04-316Z-35064-9d2e71cd.log`.
- Wide `just unit src` (whole `src`, a superset of the step 2 list, including GraphTransientState and PresetRoundTrip.contract; BEZEG_TRANSIENT_STATE, _SCENE_REPLACEMENT, _LESSON_RESTORATION, _SCENE_CONTENT, _PRESET_ROUNDTRIP, _GRAPH_TEARDOWN set to the 3 ids): 1 failed / 15410 tests (880 files passed, 12 skipped), 2085.8 s (about 930 s of it queued), `.command-logs/2026-11-12T15-22-13-601Z-29016-e7530d78.log`. The one failure, `src/DemonstrationsPage.test.tsx` "graph and lesson entry carry a validated return context..." (findByText 'Opened Bézier graph' not found), is pre-existing: it fails identically on a clean detached checkout of HEAD `76cfd64d` (`/tmp/m14-base.log`) and twice more here (`/tmp/m14-dp.log`, `/tmp/m14-dp2.log`). Not caused by this batch; cause not investigated.

## Not verified
Browser smoke; `just build`; sweeps beyond the 3 ids. Handler note: the `DemonstrationsPage.test.tsx` failure was a 1 s `findByText` timeout on the registered `/analysis/accumulation` loader, present on master since `85d49b1f`; fixed separately in `29d804e9` (loader stubbed), which passes.
