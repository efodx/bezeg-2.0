# Slice 08A handoff (partial, second worker)

Stopped on the coordinator's HANDOFF. Everything below is uncommitted in the worktree. `npx tsc --noEmit --pretty false` was clean after the last non-test edit (the last full tsc run printed nothing after the final fixes).

## Done since the first handoff

- Preview placeholder removed. `src/demonstrationPreviewAssets.ts` now types the map as `Record<Exclude<DemonstrationId, 'patch-triangular'>, string>` (hand edit of a generated file, commented; task 13's generator will emit the entry). New `src/demonstrationPreviewSrc.ts` (`demonstrationPreviewSrc(id)`, undefined for `patch-triangular`) is used by `DemonstrationCollection.tsx`, `HomeDemonstrationsCarousel.tsx`, `DemonstrationsOpeningPrototype.tsx` and `WelcomePage.test.tsx`. `DemonstrationPreview.tsx` takes `src?: string` and renders only its pale frame without one. `LearningPage.tsx` and `familyChapters*` are unaffected (they index fixed ids). No test yet for the src-less `DemonstrationPreview`.
- Catalog enumerations updated: `src/demonstrations.test.ts` (new row, counts 47, surface filter both ids, patches family count 2, no navigation actions for `patches/*`, second prompt), `src/learning/runtime/lessonCatalog.test.ts` exception list, `src/graphs/base/presets/PresetCatalog.test.tsx` (unused collections now just `g1-spline`). Last run of these plus `src/graphs/base/presets`: all passed except the families-count line, which was fixed afterwards (not re-run).
- GraphTransientState.part3 failures: root cause was test helpers that only knew the tensor graph. `realGraphScenes.ts` (`perturbPatch` handles both patch types) and `graphTransientStateContract.tsx` (`resetDisplay` treats both patch graphs alike). Part3 then passed (observed in `tmp-t08a/v2.log`).
- DTO: `checkState(value, triangular)` in `patchPresetCollections.ts` rejects `u + v > 1 + 1e-9` with the new key `invalid_triangular_parameters` (`{value0: u, value1: v}`), sl/en added in lockstep after `invalid_patch_parameter`. Tensor accepts `u = v = 1` as before (tested).
- Default triangular Presets now store `u = v = 1/3` (they stored 0.5/0.5, a point on the hypotenuse where the split preview and the de Casteljau reduction are degenerate). `defaultDto()` in the graph reads this.
- `guidedLessonOwnership.ts`: the comment already says task 12 authors the `triangular-patches` section; the entry is required by `Record<DemonstrationId, ...>`.

## Tests added

- `src/graphs/patches/triangularPatchPresets.test.ts`: 38 pass (default Presets, accepted data, 19 localized rejections in sl and en incl. `u+v>1`, file importer).
- `src/graphs/patches/TriangularPatchScene.test.ts`: 53 pass (lattice rows, mesh = independent Bernstein evaluation, iso families on the identity patch, boundary curves vs Bezier rows, net and markers, de Casteljau levels vs multinomial sums, elevation, lowering, three-piece split).
- Observed mutation failures for the scene test (each reverted): w-family copying v (4 iso tests), mesh vertices reversed (4), `boundary-w0` wrong (5), `subdivide(v, u)` (4), de Casteljau level off by one (3), `j` row family dropped (4), lowering samples swapped (2), elevated net perturbed (8).
- Not yet mutated: the DTO tests. Suggested: change `> 1 + 1e-9` to `> 2` and `(n + 1) * (n + 2) / 2` to `(n + 1) ** 2` in `patchPresetCollections.ts`, then run `triangularPatchPresets.test.ts`.
- `src/graphs/patches/TriangularPatchGraph.test.tsx` (25 tests): 20 pass, 5 fail from test-side faults:
  1. Reset test and Preset-file test mount two graphs in one document, so `getByLabelText` finds duplicate labels. Fix: unmount the first, or build the reference with `new ExposedGraph().getInitialState()` and compare `expectAgreement` only on the second.
  2. Language test uses the label `"Degree n"`; use `t("patch_triangular_degree")` after `setLanguage("en")` (the English text is "Patch degree (n)").
  3. Saved-Preset test: `toMatchObject({u: 0.3, v: 0.55, ...})` fails; the printed object was not inspected. Check whether `setParameter("v", 0.55)` then `("u", 0.3)` inside one `act` or the restore changes `u`/`v` (possible real defect in Preset restore, or `selectPreset` loading a different Preset).
  4. Multi-action test: after `setDegree(4)`, `setParameter("u", 0.9)` inside one `act`, `graph.state` did not match `{n: 4, u: 0.9}`. The mismatch was not inspected. This may be a real violation of "later action reads the state written by an earlier one" or an error in the test (the default `v` is now 1/3, so `setParameter("u", 0.9)` clamps to 2/3; the test expectation is wrong). Likely the latter: use `u = 0.5`.
  No mutation was run on the graph test.

## Remaining

- Fix the 5 graph test failures above; run graph-level mutations (for example drop the clamp in `setParameter`; drop `showDeCasteljau` from `geometryChanged`; skip the camera in `importPresetData`).
- A small test for `DemonstrationPreview` without `src` and for a catalog card of `patch-triangular` without image.
- Tensor unchanged check: run `src/graphs/patches/TensorPatch*.test.tsx` and part1..4 transient tests after the shared edits (`BaseSurfaceGraph.tsx` restore via `hasPoint`, `redrawGeometry`); the earlier combined run failed only on triangular items, but it was before later edits.
- Required runs, not done: `npx vitest run src/graphs/patches src/bezeg src/graphs/base src/demonstrations.test.ts src/learning`, `npx eslint <changed files>`, `just check`.
- Docs: short note in `docs/tasks/bezier-patches/08-triangular-workspace.md`; flag the preview gap (task 13) and the manual edit of the generated `demonstrationPreviewAssets.ts`.

## Checks run (observed)

- `tmp-t08a/v2.log`: demonstrations, presets, lessonCatalog and part3: 243 passed, 2 failed (the families count, since fixed).
- `tmp-t08a/dto.log`: 38/38. `tmp-t08a/scene.log`: 53/53. `tmp-t08a/graph.log`: 20 pass, 5 fail.
- tsc clean before the last graph-test edits; lint, build and `just check` not run.

## Flags

- `src/demonstrationPreviewAssets.ts` (hand-edited generated file) and `src/demonstrationPreviewSrc.ts` (remove once the generator emits `patch-triangular`).
- Default triangular Presets changed to `u = v = 1/3` in `patchPresetCollections.ts` (`triangularPreset`).
- Message numbers are not locale-formatted (`u = 0.7` in Slovenian); consistent with the other patch messages.
- `tmp-t08a/` holds logs and `mutate.py` (delete before commit); `tmp-r1b`, `tmp-r1b2`, `tmp-r2` are not mine.

## Close-out (third worker, handoff-v12)

- Graph test: 25/25. The saved-Preset failure was test-side (u/v restore is correct; `zMode` is session state and stays true across reset and Preset load). Other fixes: unmount the first graph before mounting a second, `t("patch_triangular_degree")`, valid barycentrics (u 0.5, v 0.9 clamps to 0.5, then v 0.3).
- `DemonstrationPreview.motion.test.tsx`: src-less preview and `patch-triangular` card render a frame, no `<img>` (mutation `src !== undefined &&` removed: both fail). `Routes.test.tsx` (47 routes, triangular route) and `DemonstrationsPage.test.tsx` (no image for src-less ids) updated.
- DTO mutation (`> 1 + 1e-9` to `> 2`): 3 of 38 fail. Reverted.
- tsc clean; eslint clean on changed files; `just check` passed (212 files, 4128 tests, build ok) per `tmp-t08a/check2.log`.
- Generator finding: the hand-edited `demonstrationPreviewAssets.ts` (typed `Record<Exclude<..>>`) is NOT checked by `just check`, but `validateGeneratedPreviews` (tests/smoke-catalog.cjs:155) demands the exact type `Record<DemonstrationId, string>`, a map and manifest covering every active Demonstration, and a surface-view recipe per capture. The Playwright test "generated preview mapping and provenance cover the active catalog" (tests/demonstrations.smoke.spec.cjs:106) and the generator's own publish validation will fail, and the generator asserts captures equal all catalog ids (scripts/capture-demonstration-previews.cjs:755), until task 13 adds a `patch-triangular` recipe/capture and regenerates (then delete `demonstrationPreviewSrc.ts`, restore `Record<DemonstrationId,string>`).
