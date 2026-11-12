# Task 06 batch 1 (B-splines) evidence

Branch `worktree-stream-authoring-rollout` at `beb539aa`, dirty (shared with the Interpolation/Hermite/Subdivision worker; not touched).

## Changes
- New in `src/graphs/curves/bspline/`: `registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`.
- `src/demonstrations.ts`: six rows deleted from `legacyDemonstrationRows`; one import and one spread (`...bsplineDemonstrationRows`, last in `definitions`).
- `src/graphs/graphFactories.ts`: six entries and six class imports removed.
- `src/graphs/graphLoaders.ts`: import and `...bsplineGraphLoaders` spread.
- `src/graphs/base/presets/PresetImport.ts`: `bsplinePresetCollection` replaced by `...bsplineCollections` (the collection already was a standalone file, not in an aggregate map; its definition stays in `bsplinePresetCollection.ts`, which the graphs import directly; key `bspline-curve` unchanged, six collectionKeys all point to it). Position in the list moved after projective.
- `src/learning/chapter/guidedLessonOwnership.ts`: six primary rows deleted; `DerivedOwnerId` = projective | B-spline ids, `derivedOwnerIds` built from both row sets.
- `src/graphs/registrationIntegrity.test.ts`: `bspline` added to `realFamilies` (last, matching the `definitions` spread order).
- Outside the owned list (one-line edit, required): `scripts/probe-demonstration-clip-routes.cjs` `rowSource` gains `src/graphs/curves/bspline/registration.ts`, else its clip-id check reports the six clip ids as stray rows.

## Owner derivation
All six (`bspline-basis|deboor|insertion|extraction|nurbs|blossom`): first `chapterOwnerRows()` row is `b-splines#<id>`, equal to the removed explicit primary. Proven by `registrationComposition.test.ts` (6 cases) plus the existing `guidedLessonOwnership.test.ts` loop over all lesson ids. No explicit owner kept.

## Flat `definitions` order consumers (R-order)
Flat order changes only for the six ids (they move to the tail); per-family order is unchanged. Consumers found:
- `getDemonstrationCatalog().families` filters by family: order within family preserved (test "placement").
- `DemonstrationCollection.tsx:51` flattens families, not the flat list.
- `Routes.tsx:38` maps all demonstrations to routes; order irrelevant (paths unique).
- `LESSON_DEMONSTRATION_IDS` / `GUIDED_LESSON_AVAILABLE_IDS`: used as sets/filters, except `lessonRestorationContract.tsx:203,214` shards by `index % LESSON_RESTORATION_PARTS` (shard membership shifts, union asserted equal) and `catalogSweepScope.familySample` (first entry per family; B-spline family stays contiguous, first stays `bspline-basis`). Test-sharding only; no semantic dependence, so no stop. Same shift already happened for every earlier registered family.
- `tests/smoke-catalog.cjs` follows spreads: checked, 18 families, B-splines six in order. Preview manifest/recipes keyed by id.

## Tests (pre/post)
- Pre (modules absent): 2 files failed to resolve `./registration` (/tmp/pre.log). With the family files added but roots unedited: 24 failed / 11 passed in the two new files.
- Post: `just unit src/graphs/curves/bspline src/graphs/registrationIntegrity.test.ts src/graphs/projective src/learning/chapter src/graphs/base/presets`: first run 1 failure (registered-rows-order test: `realFamilies` entry had to be last); after fixing, `registrationIntegrity` and the two new files pass. The full five-path run was not repeated after that one-line reorder (only integrity + bspline registration files re-run, passed).
- `just lint` on changed files: passed. `npx tsc --noEmit --pretty false`: exit 0. `just build`: passed (warnings in log).
- `node --test scripts/probe-demonstration-clip-routes.test.cjs scripts/capture-guided-example-previews.test.cjs`: 26/26. `deriveIds()` parses 138 rows including all 6 bspline. `tests/smoke-catalog.cjs` loads.

## Not verified
Browser smoke; `generate-guided-example-inventory.cjs` / preview capture (need browser/FFmpeg; not keyed to legacy rows); full `just unit` of the whole suite.
