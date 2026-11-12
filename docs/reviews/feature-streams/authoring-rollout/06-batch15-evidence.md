# Task 06 batch 15: plane-geometry family evidence

Family module: `src/graphs/compgeo/planeGeometry/` (`registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`). Exports `planeGeometryDemonstrationRows`, `planeGeometryCollectionKeys`, `planeGeometryGraphLoaders`, `planeGeometryCollections` (no `planeGeometryPrimaryOwners`: all owners derive). Five IDs: `triangle-centres`, `inscribed-angle`, `euler-line`, `simson-line`, `inversion`. Graphs stay in `src/graphs/compgeo/` (`NotablePointsGraph`, `InscribedAngleGraph`, `EulerLineGraph`, `SimsonLineGraph`, `InversionGraph`, all named exports); loaders are lazy `import('../NotablePointsGraph')` etc. No graph file changed.

## Order
Catalog family `plane-geometry` lists the five, then `triangle-solver` (trig), `line-geometry` (lines), `circle-construction`. `...planeGeometryDemonstrationRows` is spread directly after `...mapsDemonstrationRows` in `src/demonstrations.ts` `definitions` (so before every registered row of the family). `placement` test asserts `triangle-centres, inscribed-angle, euler-line, simson-line, inversion, triangle-solver, line-geometry, circle-construction`. The recorded table in `demonstrations.test.ts` moved the five rows to just after `complex-roots`; `registrationIntegrity.test.ts` `realFamilies` gained `plane-geometry` after `maps`.

## Collections
The five existing collection objects are reused (`notablePointsCollection`, `inscribedAngleCollection`, `eulerLineCollection`, `simsonLineCollection`, `inversionCollection`). Storage keys differ from the IDs and are unchanged: `compgeo-notable-points`, `compgeo-inscribed-angle`, `compgeo-euler-line`, `compgeo-simson-line`, `compgeo-inversion`; the composition test asserts each. `PresetImport.ts` replaced the five bare entries and imports with `...planeGeometryCollections`, at the same position (before `...compgeoPresetCollections`, which stays).

## Owners
All five derive: each equals its first `chapterOwnerRows()` row (`triangle-geometry#notable-points`, `#inscribed-angle`, `#euler-line`, `#simson-line`, `#inversion`), asserted, and equals the old central owner. Five central rows deleted from `guidedLessonOwnership.ts`; `PlaneGeometryDemonstrationId` added to `DerivedOwnerId` and `planeGeometryDemonstrationRows` to `derivedOwnerIds`.

## Collateral
`graphFactories.ts` lost five entries and five imports; `graphLoaders.ts` gained one spread (after `circleConstructionGraphLoaders`); probe script row-source list gained `src/graphs/compgeo/planeGeometry/registration.ts`. Direct uses searched: no `graphFactories['<id>']` use in `src`; test files naming the IDs or graphs are the graph host tests, preset-collection tests, `sceneReplacementContract.test.tsx` (uses `allGraphFactories`, which includes registered loaders) and the lesson tests; none needed a change. The loading test keeps `/bezeg-2.0/compgeo/orientation` as the legacy example (legacy until batch 16). Departure from the brief: the composition test's "key equals id" assertion of batch 14 is replaced by an explicit key map, as the keys differ from the IDs.

## Failure counts
- Tests first (`just unit src/graphs/compgeo/planeGeometry`): 23 failed / 40 tests, 2 files failed (`/tmp/m15-pre.log`).
- Order failure with the spread after `circleConstructionDemonstrationRows` (family, registrationIntegrity, demonstrations tests): 5 failed. Two are the order itself (family `placement`; registrationIntegrity "registered rows stay after the legacy rows ... in family registration order"); the other three were the not yet updated `demonstrations.test.ts` table (sl, en) and the composition key assertion (`/tmp/m15-order.log`).
- After the fix (spread after maps, table moved, keys asserted): those three files pass (62 tests), `.command-logs/2026-11-12T16-08-58-557Z-31064-d8e6a891.log`.

## Checks
- Node scripts (3 files): 60 pass, 0 fail (`/tmp/m15-node.log`).
- `just typecheck`: passed, `.command-logs/2026-11-12T16-13-23-462Z-33296-987acf52.log`. `just lint` on the changed paths: passed, `.command-logs/2026-11-12T16-15-06-133Z-31520-da4d4d0e.log`.
- Wide `just unit src` (BEZEG_TRANSIENT_STATE, _SCENE_REPLACEMENT, _LESSON_RESTORATION, _SCENE_CONTENT, _PRESET_ROUNDTRIP, _GRAPH_TEARDOWN set to the 5 ids): passed, 1209.3 s, 15438 tests passed, 40 skipped, 886 files passed, no failures (`.command-logs/2026-11-12T16-17-16-128Z-30904-ac8a9fb2.log`); `src/DemonstrationsPage.test.tsx` passes. It includes every `registrationLoading`/`registrationComposition` test and the ID-naming tests.

## Not verified
Browser smoke; `just build`; sweeps beyond the 5 ids.
