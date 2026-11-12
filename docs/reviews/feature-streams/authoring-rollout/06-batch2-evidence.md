# Task 06 batches 2, 6, 7 (basics, PH, parameterization) evidence

Branch `worktree-stream-authoring-rollout` at `3aebdb37`, dirty (shared with the Interpolation/Hermite/Subdivision worker; their files untouched).

## Changes
- New family modules (each `registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`):
  - basics in `src/graphs/basics/` (rows `bernstein`, `complex-multiplication`). Reason: the catalog family spans `bernstein` and `complex` and neither directory owns it; the module imports lazily from both.
  - PH in `src/graphs/curves/ph/` (`ph-cubic`, `ph-quintic`).
  - parameterization in `src/graphs/curves/parametrisations/` (`spline-`, `weighted-`, `uniform-parameterization`, catalog order kept).
- Roots: `src/demonstrations.ts` (7 rows deleted, 3 imports, 3 spreads after bspline), `graphFactories.ts` (7 entries and 7 class imports removed), `graphLoaders.ts` (3 spreads), `PresetImport.ts` (3 family spreads), `guidedLessonOwnership.ts`, `registrationIntegrity.test.ts` (3 `realFamilies` entries after bspline), `scripts/probe-demonstration-clip-routes.cjs` (3 `rowSource` entries).
- R-maps: removed from `curvePresetCollections`: `bernstein` (`bernstein-graph`), `ph-cubic` (`cubic-ph`), `ph-quintic` (`quintic-ph-graph`), `spline-parameterization` (`alfaparametrizacije`), `weighted-parameterization` (`alpha-param`), `uniform-parameterization` (`uniform-graph`); from `functionPresetCollections`: `complex-multiplication` (key `complex-multiplication`). All keys unchanged and now defined in the family `collections.ts`. To allow that, `curveCollection` and `functionCollection` are exported from the aggregate files (helpers, no behaviour change); `diagnoseComplex` moved into basics `collections.ts` as an inline diagnosis (same body); unused complex imports dropped from the function aggregate. The aggregates are still spread by `PresetImport.ts`.
- Graph import-line edits only: Bernstein, ComplexMultiplication, CubicPh, QuinticPh, AlphaParam, SplineAlphaParametrization, UniformParam (aggregate import replaced by the family collection import; usage line changed to the imported name).
- Test collateral (outside the owned list, needed): `curvePresetCollections.test.ts` (two lookups use the moved `bernstein`/`ph-quintic` collections), `projective/registrationLoading.test.tsx` and `curves/bspline/registrationLoading.test.tsx` (their "legacy route" case used `/bezeg-2.0/bernstein`, now registered; switched to `/bezeg-2.0/bezier`).

## Owner derivation (R-owners)
None derivable: for all seven ids `chapterOwnerRows()` has no row (chapters `foundations`, `ph-curves`, `parametrization` own no lessons), asserted per id in the composition tests. All seven stay explicit as family metadata (`basicsPrimaryOwners`, `phPrimaryOwners`, `parameterizationPrimaryOwners` in each `registration.ts`; values unchanged). `guidedLessonOwnership.ts` generalized minimally: `FamilyOwnedId` is excluded from the central record type and `familyPrimaryOwners` merges into `ownersById`. The Bernstein additional owner (`bezier-curves#bernstein-form`) moved to `basicsAdditionalOwners`.

## Tests
- Pre (family modules absent): 3 new composition files failed to resolve (/tmp/b2pre.log). With family files added, roots unedited: 40 failed / 28 passed in the 3 composition files.
- Post: see below.

## Flat order (R-order)
Same analysis as batch 1: only the flat `definitions` position of the seven ids moves to the tail; per-family order and family order (`basics` stays first) are asserted by the placement tests.
