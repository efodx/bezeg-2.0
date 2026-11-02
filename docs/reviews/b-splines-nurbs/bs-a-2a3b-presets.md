# BS-A-2a3b: B-spline Preset collection wired into DeBoorGraph

## Changes
- `DeBoorGraph.tsx`: `presetCollection()` returns `bsplinePresetCollection`; class comment updated.
- NURBS weights: the collection accepts optional `weights`, but `DeBoorGraph.importPresetData` ignores them and `exportPresetData` omits them (non-rational curve only). No NURBS support added.
- `DeBoorGraph.test.tsx`: replaced the "follow-up slice" test with six tests: lesson default/checkpoint, collection check of export and default, lesson-fixture load (subclass overrides `lessonFixtureData`, applied through `getLessonCapabilities().apply`; invalid fixture rejected with "The lesson geometry is invalid", scene unchanged), figure Preset restore and no-data fallback, invalid import (too few points, unsorted knots) rejected with state unchanged, weighted data.
- Gap: `DeBoorGraph` does not override `lessonFixtureData`, so a real `lesson-fixture` action still throws `UnsupportedLessonActionError`; only the test subclass supplies fixtures. Not registered, so not added to `graphTransientStateContract.tsx` / `realGraphScenes.ts`.

## Checks
- `just unit src/graphs/curves/bspline src/graphs/base`: passed, 40 files, 843 passed, 4 skipped.
- `just lint` on both files: passed.
- `just typecheck`: failed only on syntax errors in `src/learning/content/coonsGuidedLessons.test.ts` (another worker's file); none in bspline files. Semantic checking may have been skipped by those syntax errors, so types are not confirmed.

## Mutations
1. `presetCollection()` returns undefined: 4 tests failed (collection, fixture, figure, invalid import). Reverted.
2. Figure test expected degree 3 changed to 4: 1 test failed. Reverted.
