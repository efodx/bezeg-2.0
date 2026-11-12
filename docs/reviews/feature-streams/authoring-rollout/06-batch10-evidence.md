# Task 06 batch 10: patches family evidence

Family module `src/graphs/patches/` (`registration.ts`, `runtime.ts`, `collections.ts`, composition and loading tests). The directory already holds all seven graphs and both collection modules, and its name equals the catalog family. Seven IDs in catalog order: `patch-tensor`, `patch-decasteljau`, `patch-derivatives`, `patch-subdivision`, `patch-joins`, `patch-triangular`, `patch-coons`. Every row keeps `view: 'surface'` (asserted in the composition test).

## Owners
All seven are derived: the first `chapterOwnerRows()` row naming each id equals the old central owner (`bezier-patches` curve-to-patch, tensor-decasteljau, tensor-derivatives, tensor-subdivision, tensor-joins, triangular-patches; `advanced-bezier` patch-coons). Section ids differ from the Demonstration ids (except `patch-coons`), so "derived" means the first owning row, as in batch 9, and the composition test asserts the old values. The seven rows in `guidedLessonOwnership.ts` and their two comments are deleted; `patchesDemonstrationRows` joins `derivedOwnerIds`. `patchChapter.test.ts` read `guidedLessonOwners[demo]` and now uses `getGuidedLessonOwners(demo)[0]`.

## Aggregate (patchMap)
Deviation from batch 8's shape: `patchPresetCollections` holds exactly the six tensor/triangular entries and already lives in the family directory, but the same module also exports the default presets, starting patches and join scenes used by about 30 graph, test and script importers. It is therefore not moved; `collections.ts` composes its six entries with the standalone `coonsPresetCollection` into `patchesCollections`, and `PresetImport.ts` spreads that list (the two separate imports are gone). Storage keys unchanged.

## Order
The catalog family `/bezeg-2.0/patches` held no registered rows. The rows are spread directly after `interpolationDemonstrationRows`; the recorded flat order in `demonstrations.test.ts` moves the seven patches rows behind the interpolation rows (before `bspline/...`). Per-family order and the `realFamilies` entry (appended after interpolation) unchanged in meaning; the patches family keeps its neighbours `bspline` and `functions`.

## Failure counts
- Before editing the roots: `just unit src/graphs/patches/registration` 27 failed / 41 (14 passed), `/tmp/b10pre.log`.
- After: 41 pass (`/tmp/b10c.log`, see Checks).

## Checks
- Wide `just unit` (step 2 list): passed, `.command-logs/2026-11-12T12-10-42-126Z-22896-8a870b2a.log` (the `patchChapter.test.ts` fix landed while it ran, so that file and the family tests were rerun, below).
- `just unit src/learning/content/patchChapter.test.ts src/graphs/patches/registration`: `.command-logs/2026-11-12T12-24-38-915Z-31536-ade13422.log`, passed.
- GraphTransientState contract plus sceneReplacementContract for the seven ids: passed (142 s), `.command-logs/2026-11-12T12-24-50-660Z-6612-af3ff797.log`.
- `node --test` (three scripts): 60 pass, 0 fail, `/tmp/b10node.log`.
- `just typecheck`: passed (first run caught the `patchChapter.test.ts` TS7053; passed after fix), `/tmp/b10tc.log`.
- `just lint` on the 13 changed files: passed, `.command-logs/2026-11-12T12-21-09-953Z-29404-ec5c1838.log`.

## Collateral
Importers of `patchPresetCollections` (graphs, tests, scripts via SSR) keep working unchanged; only `PresetImport.ts` changed its import. `graphFactories.ts` lost seven entries and seven graph imports. `scripts/probe-demonstration-clip-routes.cjs` row source list gained `src/graphs/patches/registration.ts`. `scripts/demonstration-preview-recipes.cjs` and `generate-guided-example-inventory.cjs` only mention or SSR-load the unchanged collection module.

## Not verified
Browser smoke; `just build`; sweeps outside the listed unit paths.
