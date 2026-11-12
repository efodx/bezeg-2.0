# Task 06 batch 3 (polynomial Bezier family) evidence

Branch `worktree-stream-authoring-rollout` at `24271b29`, dirty (uncommitted).

## Changes
- New family module `src/graphs/curves/bezier/`: `registration.ts`, `runtime.ts`, `collections.ts`, `registrationComposition.test.ts`, `registrationLoading.test.tsx`. Eleven rows in catalog order (`bezier`, `decasteljau`, `decasteljau-alternative`, `affine`, `subdivision`, `repeated-subdivision`, `extrapolation`, `elevation`, `reduction`, `arc-length-param`, `bezier-clipping` last). Loaders import lazily from `curves/bezier`, `curves/reduction`, `curves/arclength` and `compgeo`. `curve-curvature` and `curve-evolute` stay legacy.
- Roots: `src/demonstrations.ts` (11 rows deleted, import, spread last), `graphFactories.ts` (11 entries and 11 class imports removed), `graphLoaders.ts`, `PresetImport.ts`, `guidedLessonOwnership.ts`, `registrationIntegrity.test.ts` (`bezier` in `realFamilies`), `scripts/probe-demonstration-clip-routes.cjs`, `src/demonstrations.test.ts` (11 recorded rows moved behind the `param/param/uniform` row, spread order).
- R-maps: removed from `curvePresetCollections` the 8 map entries plus `reduction` and `arc-length-param`, whose two collection definitions moved verbatim into the family `collections.ts` (with the now unused arclength import dropped). Removed `bezierClippingCollection` from the `compgeoPresetCollections` array; its definition stays in that file (exported, still used by nothing but the family list) because it needs `BEZIER_CLIPPING_OVERLAY_IDS` defined there. All keys unchanged (`decasteljau-alternative` keeps `decasteljau2`, `bezier-clipping` keeps `compgeo-bezier-clipping`).
- Graph import-line edits: the 8 `curves/bezier` graphs, `DegreeReductionGraph`, `ArcLengthParametrizationGraph` (aggregate import replaced by the family collection import). `BezierClippingGraph` unchanged (it still imports `bezierClippingCollection` from compgeo).
- Test collateral: `curvePresetCollections.test.ts` (moved collections imported from the family; the two `toBe` identity checks became "no longer in the map"); `registrationLoading.test.tsx` of bspline, parametrisations, ph, basics and projective (legacy route example `/bezeg-2.0/bezier/curve` is now registered, switched to `/bezeg-2.0/rational/base`, factory mock key `rational`).

## Owner derivation (R-owners)
- Derived (3): `reduction`, `arc-length-param`, `bezier-clipping`. Per id the first `chapterOwnerRows()` row is `advanced-bezier#<id>`, equal to the former central row (asserted in the composition test). They are listed in `bezierDerivedOwnerIds`; `guidedLessonOwnership.ts` adds them to the derived set and its record type.
- Explicit family metadata (8, `bezierPrimaryOwners`): `bezier`, `decasteljau`, `decasteljau-alternative`, `affine`, `subdivision`, `repeated-subdivision`, `extrapolation`, `elevation`. The `bezier-curves` chapter owns no lesson rows (no `chapterOwnerRows()` row, asserted per id).

## Tests
- Pre-change: new composition test with family files present and roots unedited: 27 failed / 7 passed (/tmp/b3pre.log).
- First post-edit run: 3 failures in my own deletion test (false positives of the identity regex: `'subdivision'` in a rational row title and an interpolation section, `compgeo-bezier-clipping` still defined in compgeo). Fixed the test (ids matched as row/table entries; compgeo file dropped from the central-file scan, its list asserted separately) and the owner type (`typeof bezierDerivedOwnerIds[number]`).
- Post: `just unit src/graphs/curves/bezier src/graphs/registrationIntegrity.test.ts src/demonstrations.test.ts src/graphs/compgeo src/graphs/curves src/graphs/basics src/graphs/projective` passed (793.5 s; /tmp/b3u2.log, `.command-logs/2026-11-12T09-47-15-922Z-28912-14388502.log`). `just unit src/learning/content src/learning/chapter` passed (284.3 s; `.command-logs/2026-11-12T10-00-29-646Z-11196-323bdaa6.log`). `just typecheck` passed (`.command-logs/2026-11-12T10-05-18-372Z-24748-3c8de21d.log`). `just lint` on the 31 changed `.ts/.tsx/.cjs` paths passed (`.command-logs/2026-11-12T10-06-10-098Z-9092-949aa772.log`).

## Not verified
Production build and browser smoke (routes and preset import/export of the 11 Demonstrations) were not run; whole-repo unit suite not run.
