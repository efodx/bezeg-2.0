# Task 06 batch 11: functions family evidence

Family module: `src/graphs/functions/` (`registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`), beside the graphs it registers. Reason: all fourteen graphs, their messages and `functionPresetCollections.ts` already sit there, so no import path moves; `waves/` keeps its own subdirectory. Fourteen IDs in catalog order: `linear-function`, `exponential-function`, `trigonometric-functions`, `function-transformation`, `function-inverse`, `polynomial-zeros`, `rational-function`, `geometric-series`, `conic-focal`, `continuity`, `derivative`, `definite-integral`, `area-between-curves`, `arc-length`. Loaders use `import('./XGraph').then(m => () => new m.XGraph())` (named exports; four graphs have no default export).

## Owners
Choice: eight explicit owners live in the family registration as `functionsPrimaryOwners` (like `splinePrimaryOwners`), merged into `familyPrimaryOwners` in `guidedLessonOwnership.ts`; the six `school-function-graphs` ids derive (`derivedOwnerIds` takes the family rows not in `functionsPrimaryOwners`). The 14 central rows are deleted. The composition test asserts that `getGuidedLessonOwners(id)[0]` equals the old central value for all fourteen, no `guidedLessonOwners` row remains, and each derived id equals its first `chapterOwnerRows()` row. No lesson-content test read the deleted rows (`guidedLessonOwners[` has no remaining reader).

## Aggregate (fnMap)
Chosen: split in place, not moved. `functionPresetCollections.ts` now exports `functionsFamilyPresetCollections` (the 14), `unregisteredFunctionPresetCollections` (the 21 Analysis and probability entries, for later batches) and `functionPresetCollections` (their union, so the 51 graph and test importers are unchanged). Reason: moving the 14 into `collections.ts` would touch every graph importer for no gain and `functionCollection` and the helpers stay shared. `collections.ts` orders the 14; `PresetImport.ts` spreads `...functionsCollections, ...Object.values(unregisteredFunctionPresetCollections)`, so no collection is in both. Storage keys unchanged (`trigonometric-function`, `piecewise-continuity` differ from the ids; asserted).

## Order
Rows registered earlier in the catalog family `/bezeg-2.0/functions`: `unit-circle` (trig) and `waves`. `functionsDemonstrationRows` is spread directly before `trigDemonstrationRows`, so the family still lists the fourteen, `unit-circle`, `waves` (asserted). The `realFamilies` entry sits before `trigonometry`; the fourteen recorded rows in `demonstrations.test.ts` moved behind the projective rows. Catalog family order is an explicit list, so it is unchanged.

## Failure counts
- Before editing the roots: `just unit src/graphs/functions/registration` 43 failed / 63 (20 passed), `/tmp/b11pre.log` (`.command-logs/2026-11-12T13-00-11-694Z-13820-ff125e81.log`).
- After: composition and loading suites pass (82 passed with `demonstrations.test.ts` and `registrationIntegrity.test.ts`, `.command-logs/2026-11-12T13-02-02-024Z-31944-c2e4b301.log`).

## Checks
- Wide `just unit` (step 2 list plus `src/graphs/GraphTransientState` and `PresetRoundTrip.contract`; `BEZEG_TRANSIENT_STATE`, `_SCENE_REPLACEMENT`, `_LESSON_RESTORATION`, `_SCENE_CONTENT`, `_PRESET_ROUNDTRIP`, `_GRAPH_TEARDOWN` set to the fourteen ids): passed (1031.7 s), `.command-logs/2026-11-12T13-05-12-634Z-22868-0a288b16.log`.
- `node --test` (three scripts): 60 pass, 0 fail, `/tmp/b11node.log`.
- `just typecheck`: passed (148.7 s), `.command-logs/2026-11-12T13-02-37-666Z-31800-b0a2b6d6.log`.
- `just lint` on the 13 changed files: passed, `.command-logs/2026-11-12T13-05-57-994Z-23768-cf674716.log`.

## Collateral
`graphFactories.ts` lost 14 entries and 14 graph imports. `scripts/probe-demonstration-clip-routes.cjs` row source list gained `src/graphs/functions/registration.ts`. The loading test uses `/bezeg-2.0/analysis/bisection` as the legacy-route example. Importers of `functionPresetCollections` keep working unchanged.

## Not verified
Browser smoke; `just build`; sweeps outside the listed unit paths (the sweep variables were limited to the fourteen ids).
