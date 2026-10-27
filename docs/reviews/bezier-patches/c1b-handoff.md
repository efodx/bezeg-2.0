# Slice C1b handoff - partial

Implementation is written and its own tests pass. Lint, `just build` (lazy three chunk size), mutation checks, and the three type errors below are not done.

## Files (all uncommitted)
- New: `src/graphs/patches/patchSceneBuilder.ts` (+test), `BaseSurfaceGraph.tsx`, `TensorPatchGraph.tsx` (+`.test.tsx`, fake view), `src/images/demonstrations/catalog/patch-tensor.png` (720x440 neutral #f3f1ea, made by a throwaway node script).
- Edited: `patchDto.ts` (isoDensity/shadingDensity), `patchPresetCollections.ts` (+test; density check; cameras tuned), `src/localization/{sl,en}.ts` (new key `invalid_patch_density`, lockstep; no existing key fitted), `src/demonstrations.ts` (+test), `graphFactories.ts`, `presets/PresetImport.ts`, `presets/PresetCatalog.test.tsx` (PATCH_KEYS added; `patch-triangular` allowed as unused until task 08), `demonstrationPreviewAssets.ts` (hand entry), `src/graphs/base/PresetSelector.tsx` (`batchExporter` made optional; ImageGenerationModal hidden without it - small edit outside the owned list, needed for the surface save panel).

## Decisions
- Cameras (az -0.9, el 0.5, portrait aspect 0.45 via fitCameraTo): dome distance 17.37 target [0,0,1.25]; saddle distance 12.22 target [0,0,0]. A test asserts distance in [fit, fit*1.01).
- `isoDensity` matches the shared `^is` boolean regex in `checkSceneState`, so it is passed in `allowed` and checked separately (8|16).
- Revision: bumped in onStateChange only for net/show*/density changes or new view; `syncReplacedScene` always bumps. Selection and camera and u/v never bump.
- Scene is rebuilt in full on every reconcile (no geometry caching); unmeasured for camera orbit or slider drags.
- Lowering degree resamples at (i/m', j/n'); raising is exact `elevate`.

## Checks observed
- `npx vitest run src/graphs/patches`: 80 passed (before adding default-camera test; that one later ran in a passing patches run? NO - not re-run after adding; rerun).
- `src/demonstrations.test.ts`: 11 passed.
- `npx tsc --noEmit`: only 3 errors, all missing `patch-tensor` in exhaustive `Record<DemonstrationId, ...>` in learning code I did not touch: `src/learning/chapter/guidedLessonOwnership.ts:11`, `src/learning/content/guidedExamplePreviewCopy.ts:59`, derived error `src/learning/chapter/guidedExamplePreviews.ts:38`. Needs a handler decision (entries need a chapter/section and bilingual copy, or `Exclude`).
- `node -e "require('./tests/smoke-catalog.cjs').validateGeneratedPreviews()"` fails: "Recipes must exhaustively match shipped IDs" (needs a recipe and manifest capture; task 13). No .webm needed (Partial map). Only Playwright smoke runs this.
- Contract tests still failing for patch-tensor (not exempted): `GraphTransientState.part2.test.tsx` 8 tests (`realGraphScenes.ts:135` `board.setBoundingBox` and `realGraphTestHarness.tsx:139` `board.getBoundingBox` on undefined board) and `PresetCatalog.test.tsx` "patch-tensor: the default Preset exports..." (same observeScene). C1c must generalize the harness.

## Remaining
1. Rerun `just unit src/graphs/patches src/graphs/base src/demonstrations`, lint changed files, `just build` and report the three chunk name/size.
2. One mutation per new assertion group (none run).
3. Resolve the 3 tsc errors; Uredi/Prikaz controls and harness are C1c (setters exist: setDegree, setParameter, setVisibility, setDensity, applyCameraPreset, resetView, setZMode).
Logs: `.command-logs/c1b-*.log`.
