# Task 06 batch 13: probability family evidence

Family module: `src/graphs/probability/` (`registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`; no name clash; `src/graphs/random/` is a separate module holding `prob-simulation`). Exports `probabilityDemonstrationRows`, `probabilityCollectionKeys`, `probabilityGraphLoaders`, `probabilityCollections`. Five IDs: `prob-density`, `prob-binomial-normal`, `prob-clt`, `prob-summary`, `prob-correlation`. Graphs stay in `src/graphs/functions/`; loaders are `import('../functions/XGraph').then(m => () => new m.X())` (named exports).

## Order
The catalog family is `/bezeg-2.0/probability`. Its only already-registered row is `prob-simulation` (`src/graphs/random/registration.ts`, spread via `randomDemonstrationRows`). `...probabilityDemonstrationRows` is spread directly after `...analysisDemonstrationRows` (before functions, long before random), so the five still lead the family and the family order of the catalog (analysis, then probability) is unchanged. The recorded table in `demonstrations.test.ts` moved the five rows to just after `analysis/fixed-point`. Test `placement` asserts the family lists the five, then `prob-simulation`. `registrationIntegrity.test.ts` `realFamilies` gained a `probability` entry after `analysis`.

## Aggregate
`unregisteredFunctionPresetCollections` is gone; its five entries are `probabilityFamilyPresetCollections` (property names and storage keys unchanged, key equals id, asserted). `functionPresetCollections` stays as the union of functions, analysis and probability maps (35 entries) because about 40 graph classes and several host tests import it. `PresetImport.ts` lost the `Object.values(unregistered...)` spread and its import and spreads `...probabilityCollections` after `...analysisCollections`; the key-uniqueness test passes. Functions and analysis composition tests updated for the removed export.

## Owners
All five derived (chapter `probability` owns sections density, binomial-normal, clt, summary, correlation). Five central rows (and their comment) deleted; the probability family ids are added to `DerivedOwnerId` and `derivedOwnerIds` in `guidedLessonOwnership.ts`. The composition test asserts each equals its old central owner and its first `chapterOwnerRows()` row, and that `guidedLessonOwners` has no row.

## Legacy example
Legacy route examples in `functions/registrationLoading.test.tsx` and `analysis/registrationLoading.test.tsx` (mock `graphFactories` and route `/bezeg-2.0/probability/density`) switched to `/bezeg-2.0/compgeo/orientation` (`orientation`, still in `graphFactories.ts`; handler decision: `linear-map` turns non-legacy in the maps batch). `src/learning` has no legacy-example use of these routes (matches there are lesson ids and chapter data).

## Collateral
`graphFactories.ts` lost 5 entries and 5 imports; `scripts/probe-demonstration-clip-routes.cjs` row-source list gained `src/graphs/probability/registration.ts`; `graphLoaders.ts` and `PresetImport.ts` gained one spread each.

## Failure counts
- Before the roots (`just unit src/graphs/probability`, tests written first): 7 failed / 10 tests, 2 files failed (`/tmp/b13pre.log`, `.command-logs/2026-11-12T14-22-18-003Z-35112-73176fe3.log`).
- Order failure with the spread deliberately placed after `randomDemonstrationRows`, run over probability, registrationIntegrity and demonstrations tests: 4 failed (placement test, registration-order test, `demonstrations.test.ts` sl and en), `/tmp/b13order2.log`, `.command-logs/2026-11-12T14-24-54-964Z-23580-27a8a596.log`. (An earlier misplaced run, before the `realFamilies` entry existed, gave 5 failed.)
- After the fix: probability, registrationIntegrity and demonstrations tests pass, `.command-logs/2026-11-12T14-24-34-537Z-25748-a2e893aa.log`.

## Checks
- Node scripts (3 files): 60 pass, 0 fail, `/tmp/b13node.log`.
- `just typecheck`: passed after fixing a stray apostrophe in a test string (first run failed with TS1005 in `functions/registrationComposition.test.ts`), `.command-logs/2026-11-12T14-35-22-805Z-34404-242fed1f.log`.
- `just lint` on 13 changed paths: passed, `.command-logs/2026-11-12T14-37-16-129Z-35556-7a3e8be8.log`.
- Wide `just unit` (step 2 list plus GraphTransientState and PresetRoundTrip.contract; BEZEG_TRANSIENT_STATE, _SCENE_REPLACEMENT, _LESSON_RESTORATION, _SCENE_CONTENT, _PRESET_ROUNDTRIP, _GRAPH_TEARDOWN set to the 5 ids): passed (628 s), `.command-logs/2026-11-12T14-37-07-870Z-20532-b64dcda7.log`. It ran while the legacy-route example was switched from `linear-map` to `orientation` (coordinator addition); the three loading tests were rerun afterwards: passed (`.command-logs/2026-11-12T14-47-57-204Z-14420-2f590f45.log`), lint of those files passed. A first wide run was killed by my own `timeout 590` wrapper (exit 143) and discarded.

## Not verified
Browser smoke; `just build`; sweeps beyond the 5 ids.
