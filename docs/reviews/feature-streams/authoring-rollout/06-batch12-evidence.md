# Task 06 batch 12 (12a and 12b merged): analysis family evidence

Decision (handler, option 1): all sixteen analysis IDs register in this batch. Reason: the catalog family `analysis` lists its rows in `definitions` order, legacy rows first. Registering only `bisection`..`extrema` would have moved them behind the remaining eight legacy rows (`convexity`..`fixed-point`), changing the visible catalog order. A temporary tail list was rejected as a root edit 12b would delete.

Family module: `src/graphs/analysis/` (`registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`; no name clash). Exports `analysisDemonstrationRows`, `analysisCollectionKeys`, `analysisPrimaryOwners`, `analysisGraphLoaders`, `analysisCollections`. Graphs stay in `src/graphs/functions/`; loaders are `import('../functions/XGraph').then(m => () => new m.XGraph())`. Sixteen IDs: `bisection`, `root-finding`, `quadrature`, `euler-method`, `mean-value`, `accumulation`, `darboux`, `extrema`, `convexity`, `taylor`, `sequence`, `uniform-convergence`, `fourier-series`, `fourier-coefficients`, `epicycles`, `fixed-point`.

## Owners
Ten explicit (`analysisPrimaryOwners`): bisection, mean-value, accumulation (functions-and-calculus#integrals), darboux, extrema, convexity, taylor, sequence, uniform-convergence, fixed-point. Six derived: root-finding, quadrature, euler-method (numerical-methods), fourier-series, fourier-coefficients, epicycles. Sixteen central rows deleted (plus their comments); `guidedLessonOwners[` has no reader for these ids. The composition test asserts primary owners equal the old central values and each derived id equals its first `chapterOwnerRows()` row.

## Aggregate (fnMap)
Split in place: `functionPresetCollections.ts` now has `functionsFamilyPresetCollections` (14), `analysisFamilyPresetCollections` (16, property names unchanged, e.g. `euler`), `unregisteredFunctionPresetCollections` (5 probability entries) and the union `functionPresetCollections` (35) for existing importers. `PresetImport.ts` spreads `...functionsCollections, ...analysisCollections, ...Object.values(unregistered...)`. Storage keys unchanged: `euler-method` -> `euler`, `epicycles` -> `epicycle` (asserted). The functions composition test count (21) became 5.

## Order
Spread `...analysisDemonstrationRows` directly after `projectiveDemonstrationRows` (before functions), so the 16 precede the registered recursion, dynamics, solids and levelsets `analysis` rows. New test `placement` in `analysis/registrationComposition.test.ts` asserts the 16 in order, then `recursion-cobweb, recursion-growth, phase-portrait, logistic-map, solids, contour-map, linear-program`. The recorded table in `demonstrations.test.ts` moved the 16 rows to just before `functions/linear`; the `realFamilies` entry sits before `functions`.

## Failure counts
- Before the roots (`just unit src/graphs/analysis`): 18 failed / 21 (`/tmp/b12pre.log`, `.command-logs/2026-11-12T13-43-15-138Z-21476-f19f5665.log`; the composition file was missing from that run, only the loading file ran).
- Order failure observed with the spread deliberately placed after `solidsDemonstrationRows`: 4 failed (placement test, `registrationIntegrity` registration-order test, `demonstrations.test.ts` sl and en), `/tmp/b12order.log`, `.command-logs/2026-11-12T13-44-54-226Z-26488-da2a3fbd.log`.
- After the fix: analysis, registrationIntegrity, demonstrations tests pass, `.command-logs/2026-11-12T13-45-25-991Z-27076-ba09e94e.log`.

## Collateral
`graphFactories.ts` lost 16 entries and 16 imports; `scripts/probe-demonstration-clip-routes.cjs` row-source list gained `src/graphs/analysis/registration.ts`; the functions loading test's legacy-route example is now `/bezeg-2.0/probability/density`.

## Checks
- Node scripts (3 files): 60 pass, 0 fail, `/tmp/b12node.log`.
- `just typecheck`: passed, `.command-logs/2026-11-12T13-46-33-127Z-34024-87c9ec0e.log`.
- `just lint` on 15 changed files: passed, `.command-logs/2026-11-12T13-48-00-543Z-17192-e1738848.log`.
- Wide `just unit` (step 2 list plus GraphTransientState and PresetRoundTrip.contract; BEZEG_TRANSIENT_STATE, _SCENE_REPLACEMENT, _LESSON_RESTORATION, _SCENE_CONTENT, _PRESET_ROUNDTRIP, _GRAPH_TEARDOWN set to the 16 ids): first run 1 failed / 4104 (the functions loading test still used `/bezeg-2.0/analysis/bisection` as its legacy route, `.command-logs/2026-11-12T13-45-53-132Z-32488-f1125c1f.log`); fixed to `/bezeg-2.0/probability/density`, whole check rerun: passed (624.8 s), `.command-logs/2026-11-12T13-55-10-115Z-20860-522ce3c8.log`. The typecheck and the main lint ran before that one-line test fix; the fixed file was linted separately (passed, `.command-logs/2026-11-12T13-55-01-949Z-31352-056a99f9.log`).

## Not verified
Browser smoke; `just build`; sweeps beyond the 16 ids.
