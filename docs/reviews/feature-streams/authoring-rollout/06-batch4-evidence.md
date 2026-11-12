# Task 06 batch 4 (rational family) evidence

Branch `worktree-stream-authoring-rollout` at `9a37863d`, dirty (uncommitted).

## Changes
- New family module `src/graphs/curves/rational/`: `registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`. Seven rows in catalog order (`rational`, `rational-decasteljau`, `rational-elevation`, `rational-extrapolation`, `rational-subdivision`, `farin`, `circle`); one lazy loader each.
- R-circle contract: `src/graphs/registrationIntegrity.ts` adds `NoPresetCollection = {none: reason}`; `collectionKeys` accepts `string | NoPresetCollection`; `checkRegistrations` accepts an explicit absence with a non-blank reason, reports a blank reason (`declares no collection without a reason`) and still reports an omitted reference (`has no collection reference`). `rationalCollectionKeys.circle` is `{none: ...}` (`registration.ts`), matching `NO_PRESET_COLLECTION` in the transient-state contract.
- Roots: `src/demonstrations.ts` (7 rows out, import, spread last), `graphFactories.ts` (7 entries, 7 imports), `graphLoaders.ts`, `PresetImport.ts`, `guidedLessonOwnership.ts` (7 rows out, `rationalPrimaryOwners` spread), `registrationIntegrity.test.ts` (`rational` in `realFamilies`, type widened, new synthetic test), `scripts/probe-demonstration-clip-routes.cjs`, `curvePresetCollections.ts` (6 map entries and the `rational` helper out), `src/demonstrations.test.ts` (7 recorded rows moved behind `bezier/clipping`).
- Graph import-line edits (6): `FarinPointsCurveGraph`, `RationalBezierCurveGraph`, `RationalDecasteljauGraph`, `RationalElevationGraph`, `RationalExtrapolationGraph`, `RationalSubdivisionGraph2` (collection from `./collections`). `RationalBezierCurveCircleGraphN` unchanged.
- Collateral: `curvePresetCollections.test.ts` (rational collections imported from the family); `registrationLoading.test.tsx` of basics, projective, curves/bezier, curves/bspline, curves/parametrisations, curves/ph (legacy route example now `/bezeg-2.0/spline/c1spline`, factory mock key `spline-c1`).

## Owners (R-owners)
All seven are explicit family metadata (`rationalPrimaryOwners`); the `rational-curves` chapter owns no `chapterOwnerRows()` row, asserted per id. None derived. The composition test compares `getGuidedLessonOwners(id)[0]`, not `getGuidedLessonOwner`, because the latter maps `rational-decasteljau` to a retained example home (`homogeneous`), unchanged behaviour.

## Tests
- Pre-change: new composition test, family files present, roots unedited: 22 failed / 7 passed (/tmp/b4pre.log). Integrity: new explicit-absence test failed before the contract change, 1 failed / 6 passed (/tmp/b4int-pre.log).
- Post: `just unit src/graphs/curves/rational src/graphs/registrationIntegrity.test.ts src/demonstrations.test.ts src/graphs/curves/curvePresetCollections.test.ts src/graphs/base/presets src/graphs/base/GraphTransientState -t "circle|rational|farin"` passed (83.3 s; `.command-logs/2026-11-12T10-23-11-463Z-29868-be253de6.log`). The 6 loading tests + both rational tests + integrity + demonstrations test (unfiltered) passed (27.7 s; `.command-logs/2026-11-12T10-24-35-265Z-2804-fcbb9551.log`). `just unit src/learning/content src/learning/chapter src/graphs/curves/rational` passed (306 s; `.command-logs/2026-11-12T10-25-07-951Z-15992-5f800938.log`). `just typecheck` passed (`.command-logs/2026-11-12T10-19-59-601Z-28988-a6790de3.log`; first run failed on a type predicate in my test, fixed). `just lint` on the 28 changed paths passed (`.command-logs/2026-11-12T10-28-14-672Z-15968-02d16b25.log`).

## Not verified
Production build, browser smoke, whole-repo unit suite.
