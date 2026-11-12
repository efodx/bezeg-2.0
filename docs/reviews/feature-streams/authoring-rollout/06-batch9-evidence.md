# Task 06 batch 9: interpolation family evidence

Family module `src/graphs/curves/interpolation/` (`registration.ts`, `runtime.ts`, `collections.ts`, composition and loading tests). Chosen because the directory already holds the Lagrange graph and its collection, and its name equals the catalog family; the other graphs (hermite, subdivisionCurves, functions/Runge, functions/LeastSquares) are imported lazily from their own directories. Five IDs in catalog order: `interp-lagrange`, `interp-hermite`, `interp-runge`, `interp-least-squares`, `interp-subdivision`.

## Owners
All five are derived (the `interpolation` chapter owns a lesson row each); the five explicit rows in `guidedLessonOwnership.ts` are deleted and `interpolationDemonstrationRows` joins `derivedOwnerIds`. Derived owners equal the old central ones (sectionIds `lagrange`, `hermite`, `runge`, `least-squares`, `subdivision`; asserted in the composition test).

## Aggregate (fnMap)
`interp-runge` and `interp-least-squares` (with its `leastSquaresCollection` factory and both diagnoses) moved from `functionPresetCollections` into `interpolation/collections.ts` (`rungePresetCollection`, `leastSquaresPresetCollection`); `functionCollection` is unchanged and all other entries stay. The two graphs import the collections from there; `functionPresetCollections.test.ts` adds them to its parametrised sweep and uses the moved export. The three standalone collections (lagrange, hermite, subdivision) were removed from `PresetImport.ts` and are in the family list. Storage keys unchanged.

## Order
The catalog family `/bezeg-2.0/interpolation` held no registered rows, so its order is unchanged. The rows are spread directly after `curveGeometryDemonstrationRows` (flat order: behind the curve geometry rows, as recorded in `demonstrations.test.ts`; `realFamilies` entry placed likewise).

## Failure counts
- Before editing the roots: `just unit src/graphs/curves/interpolation/registration` 20 failed / 37 (17 passed); log /tmp/b9pre.log (includes a path typo in my first test draft, fixed before the roots were edited).
- After: 37 pass (`.command-logs/2026-11-12T11-45-39-987Z-24548-48508d98.log`).

## Checks
- Wide `just unit` (step 2 list): 4016 passed, 1 failed (205 files), `.command-logs/2026-11-12T11-33-44-191Z-16496-8aafd2aa.log`. The one failure was my own test regex (a `\b` mangled by Python); fixed, family tests rerun above, passed. The rest of the wide run was not rerun.
- `just unit src/graphs/base/sceneReplacementContract.test.tsx src/graphs/base/GraphTransientState` with `BEZEG_TRANSIENT_STATE` set to the five ids: passed (206 s), `.command-logs/2026-11-12T11-46-12-877Z-19092-bfe3930e.log`.
- `node --test scripts/ci-change-scope.test.cjs scripts/transient-state-scope.test.cjs`: 57 pass, 0 fail (/tmp/b9node.log).
- `just typecheck`: passed, `.command-logs/2026-11-12T11-49-48-262Z-33448-faeb715b.log`.
- ESLint on the changed files (`npx eslint <files>`, not `just lint`): exit 0.

## Collateral
Importers of the moved collections: `RungeInterpolationGraph.tsx`, `LeastSquaresGraph.tsx`, `functionPresetCollections.test.ts` updated. `sceneReplacementContract.test.tsx` uses `allGraphFactories`, unaffected. Legacy `graphFactories.ts` lost the five entries and imports. `scripts/probe-demonstration-clip-routes.cjs` row source list gained the new `registration.ts`.

## Not verified
Browser smoke; the `PresetRoundTrip`/lesson-restoration sweeps beyond the wide unit run; `just build`.
