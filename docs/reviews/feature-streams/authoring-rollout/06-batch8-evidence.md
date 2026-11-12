# Task 06 batch 8: curve geometry family evidence

Family module `src/graphs/curves/geometry/` (`registration.ts`, `runtime.ts`, `collections.ts`, composition and loading tests). Six IDs in catalog order: `curve-parametric`, `curve-curvature`, `curve-comb`, `curve-evolute`, `curve-offset`, `curve-envelope`. Loaders import lazily from `curves/parametric`, `curves/bezier` (curvature, evolute), `curves/comb`, `curves/offset`, `curves/envelope`.

## Owners
All six are derived (the `curve-geometry` chapter owns a lesson row each, sectionId = id). No explicit owner metadata; `guidedLessonOwnership.ts` adds `curveGeometryDemonstrationRows` to `derivedOwnerIds`; the six central rows are deleted.

## Aggregate (R-maps)
`curvePresetCollections` held exactly the five curveMap entries (curvature, comb, evolute, offset, envelope); all moved to `geometry/collections.ts`, so the aggregate is deleted together with its `Object.values` spread in `PresetImport.ts`. `curve-parametric` was standalone (`parametric/parametricPresetCollection.ts`, unchanged, its standalone `PresetImport.ts` import removed; the family list holds it first). `curvePresetCollections.ts` keeps `curveCollection` and the DTO rules unchanged. Its test stays in place, importing the five collections from `geometry/collections` and listing them explicitly.

## Failure counts
- Before editing the roots: `just unit src/graphs/curves/geometry` failed to load the composition suite (0 tests ran; the aggregate was already removed from `curvePresetCollections.ts`, so `PresetImport` threw). Log /tmp/b8pre.log.
- After: the 5 curve-geometry composition and the loading tests pass.

## Checks
- `just unit src/graphs/curves/geometry src/graphs/curves/parametric src/graphs/registrationIntegrity.test.ts src/demonstrations.test.ts src/graphs/base/presets`: passed (53.2s), `.command-logs/2026-11-12T11-09-44-820Z-29624-5493125a.log`.
- `just unit src/graphs/curves src/graphs/basics src/learning/content src/learning/chapter`: passed (602s), `.command-logs/2026-11-12T11-10-38-404Z-26132-aca428e0.log` (covers criterion 3 plus every touched test).
- `just typecheck`: passed, `.command-logs/2026-11-12T11-20-47-811Z-31924-8fe8dfa6.log`.

## Collateral files
- Graph imports: `CurvatureBezierCurveGraph.tsx`, `CurveEvoluteGraph.tsx`, `CurveCombGraph.tsx`, `CurveOffsetGraph.tsx`, `CurveEnvelopeGraph.tsx` (collection import now from `../geometry/collections`); tests `CurvatureBezierCurveGraph.test.ts`, `CurveEvoluteGraphReal.test.tsx`, `CurveCombGraphReal.test.tsx`.
- Composition tests of basics, bezier, ph, rational, parametrisations, spline: removed the "aggregate no longer holds the moved collections" assertion (the aggregate no longer exists).
- No other loading test used a curve geometry route as legacy example.

## Notes
- In-family catalog order changes: the family's first two entries are now `curve-kinematics`, `mechanics-descent` (registered earlier), followed by the six, because registered rows follow legacy rows. The recorded flat order in `demonstrations.test.ts` moved behind the spline rows; the family test filters to the six.
- Stale comment (not edited, not owned): `parametricPresetCollection.ts:29` says "not yet registered in `curvePresetCollections`".
- Not verified: browser smoke.

## Handler correction: order within the catalog family

The worker's version spread the six rows after the splines, which put them behind `curve-kinematics` and `mechanics-descent`. Those two Families-prep rows share the `/bezeg-2.0/curve-geometry` catalog family, so the catalog order inside that family changed. R-order keeps each family's order, so the handler spreads `curveGeometryDemonstrationRows` just before `kinematicsDemonstrationRows` in `src/demonstrations.ts`. It also moves the `realFamilies` entry in `registrationIntegrity.test.ts` and the six recorded rows in `src/demonstrations.test.ts` to match. The family now lists the six, then kinematics and descent, as before. Rerun: `just unit src/graphs/curves/geometry src/demonstrations.test.ts src/graphs/registrationIntegrity.test.ts src/learning/catalog src/learning/chapter` passed. `just typecheck` and lint on the three files passed. The stale `parametricPresetCollection.ts` comment is updated.

Smoke: not run by handler 2 (context budget). Successor runs it before publishing.
