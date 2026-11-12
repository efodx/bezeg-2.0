# Task 06 batch 5 (splines family) evidence

Branch `worktree-stream-authoring-rollout` at `1e49abb7`, dirty (uncommitted).

## Changes
- New family module `src/graphs/curves/spline/`: `registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`. Five rows in catalog order (`spline-cn`, `spline-c1`, `spline-c2`, `spline-g1`, `spline-g1-symmetric`); one lazy loader each; collection keys unchanged (`cn-spline`, `c1-spline-graph`, `c2-spline`, `g1-spline-graph`, `g1-symmetric-spline-graph`).
- R-g1: the import-only `g1-spline` collection moved from `legacyCurvePresetCollections` (removed from `curvePresetCollections.ts`) to `src/graphs/curves/spline/collections.ts` as `legacyG1SplinePresetCollection`, key unchanged, last entry of `splineCollections` (spread by `PresetImport.ts`). No Demonstration references it (`splineCollectionKeys` omits it).
- Roots: `src/demonstrations.ts` (5 rows out, spread last), `graphFactories.ts` (5 entries, 5 imports), `graphLoaders.ts`, `PresetImport.ts` (spreads `splineCollections`; legacy list import removed), `guidedLessonOwnership.ts` (5 rows out, `splinePrimaryOwners` spread), `registrationIntegrity.test.ts` (`spline` in `realFamilies`), `scripts/probe-demonstration-clip-routes.cjs`, `curvePresetCollections.ts` (5 entries and the legacy list out), `src/demonstrations.test.ts` (5 recorded rows moved behind `rational/circlen`).
- Graph import-line edits (5): `CnSplineGraph`, `C1SplineGraph`, `C2SplineGraph`, `G1SplineGraph`, `G1SymmetricSplineGraph` (collection from `./collections`).
- Collateral: `curvePresetCollections.test.ts` and `base/presets/PresetCatalog.test.tsx` (use the family collections instead of `legacyCurvePresetCollections`); `registrationLoading.test.tsx` of basics, projective, curves/{bezier,bspline,parametrisations,ph,rational} (legacy route example now `/bezeg-2.0/functions/linear`, factory mock key `linear-function`).

## Owners (R-owners)
All five are explicit family metadata (`splinePrimaryOwners`); the `splines` chapter owns no `chapterOwnerRows()` row, asserted per id. None derived.

## Tests
- Pre-change: new composition test, family files present, roots unedited: 19 failed / 9 passed (/tmp/b5pre.log). Failing before the move: the old-export import test passes only after `splineCollections` is spread by `PresetImport.ts`; the pre-existing `PresetImport.test.ts` import test already covered `g1-spline` and passed throughout.
- Post: `just unit` on spline, registrationIntegrity, demonstrations, curvePresetCollections, base/presets and the 7 touched loading tests passed (104.6 s; `.command-logs/2026-11-12T10-40-34-252Z-30552-90c876c9.log`). `just unit src/graphs/curves/spline src/learning/content src/learning/chapter` passed (577 s; `.command-logs/2026-11-12T10-44-47-817Z-1812-7aae142c.log`). `just typecheck` passed (`.command-logs/2026-11-12T10-42-24-793Z-8412-02d94a4f.log`). `just lint` on all changed paths passed (`.command-logs/2026-11-12T10-44-32-661Z-30364-cb74906f.log`).

## Not verified
Production build, browser smoke, whole-repo unit suite. One one-line fix to `spline/registrationLoading.test.tsx` (runtime path regex) landed after the first post run; the later spline run covers it, the lint run did not re-run after it.
