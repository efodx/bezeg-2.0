# Slice 09B2 handoff (partial) - `patch-derivatives` route

State: implementation complete and green; the view test, mutation checks, `just build` and docs remain. Nothing committed.

## Done and observed
- `npx vitest run` (full, `.command-logs/t09b2-full.log`): 224 files, 4433 tests passed.
- `npx tsc --noEmit --pretty false`: 0 errors. `npx eslint` on the changed and new patch files: exit 0.
- New tests: `TensorDerivativesScene.test.ts`, `TensorDerivativesGraph.test.tsx` (16 tests, passed after the label-backslash fix and a type-annotation fix), and a `patch-derivatives` block in `patchPresetCollections.test.ts`.

## Files
- New: `src/graphs/patches/TensorDerivatives{Graph.tsx,Panels.tsx,Scene.ts}` plus the two tests above.
- Edited:
  - Scene contract and views: `surface-view/surfaceScene.ts` (new roles `vector-u`/`vector-v`/`twist`/`normal`, `ScenePlane`, `planes?`, finite check), `surface-view/threeSurfaceView.ts` (colours, dashes, plane mesh and outline), `FakeSurfaceView.ts` (plane line in `sceneSignature`).
  - DTO, Presets and base graph: `patchDto.ts` (`showTwist`), `patchPresetCollections.ts` (`patch-derivatives` collection, `derivativesStartingPatches`, cameras fitted), `TensorPatchGraph.tsx` (optional state fields, `startingPatches()` hook), `TensorPatchPanels.tsx` (`startingPatches` prop).
  - Wiring: `demonstrations.ts`, `graphFactories.ts`, `demonstrationPreviewAssets.ts`, `guidedLessonOwnership.ts`, `guidedExamplePreviewCopy.ts`, `realGraphTestHarness.tsx`, and the enumerating tests (`Routes.test.tsx` 49, `demonstrations.test.ts`, `PresetCatalog.test.tsx`, `lessonCatalog.test.ts`).
  - Localization: `sl.ts` and `en.ts` (17 keys each, `patch_derivatives_*`, `preset_collapsed_edge`, `preset_parallel_corner`, `patch_show_tangent_plane`/`normal`/`twist`).

## Decisions and deviations
- Colours and styles: `vector-u` blue `0x0b4f9c` solid, `vector-v` crimson `0xb3202a` solid, `twist` violet `0x6a2c91` dotted (0.008/0.01), `normal` near-black `0x2a2a2a` long-dashed (0.05/0.02), `plane` `0x4f86c6` at opacity 0.3, `depthWrite` off, double-sided, plus an outline.
- Slovenian terms: "tangentna ravnina", "normala", and "mešani odvod (zasuk)" for twist. "Mešani odvod" is the calculus term and names S_uv exactly; "zasuk" is kept in brackets for the CAGD literature.
- Added a small hook in `TensorPatchGraph` (`startingPatches()`) and a `startingPatches` panel prop so the route can offer four starting patches. Optional state fields `showTangentPlane`/`showNormal`/`showTwist` were added to `TensorPatchGraphState`.
- Zero-length arrows (for example `S_v = 0` or a vanishing twist) are omitted together with their labels. The bicubic symmetric `smoothDomeNet` has twist 0, so the scene test uses the dome Preset.
- A non-boolean `showTwist` is rejected by the existing `checkSceneState` boolean rule (`invalid_option`), which is localized; no new message key was needed.
- The readout sits at the end of Uredi, after the Bernstein readout, not next to the sliders. Revisit if the smoke test finds it too far down.

## Remaining, in order
1. `threeSurfaceView.test.ts` (not edited yet):
   - Add the four new roles to `roles` and `dashed` (`twist`, `normal`) in the "line dashes" block (near line 580). Update the pattern-count assertion from 4 to 6 and extend the dash-order assertions: `twist < iso-w < construction-2 < iso-v < normal < compare`.
   - Add a contrast/uniqueness test for the four new colours (at least 3:1 on white, distinct from all others, and `vector-u` and `vector-v` the only solid pair).
   - Add a plane test: mesh and material created and double-sided, rebuilt on a new revision without leaking geometry, disposed on `dispose()` (follow the existing disposal tests).
2. Add a `surfaceScene` finite-check test for `planes` (a NaN corner throws).
3. Mutations, one observed failure per new assertion group: break the arrow direction, put a plane corner out of plane, keep the normal/plane for a degenerate net, ignore `showTwist`, leave out the plane disposal.
4. `just build` (log to `.command-logs/t09b2-build.log`).
5. Docs: update `docs/specs/bezier-patches.md` / `docs/tasks/bezier-patches/09-construction-derivatives.md` for the route, the new optional DTO field `showTwist`, and the role and plane additions. The breaking-change note: existing Presets and files are unchanged.
6. Smoke test per `docs/smoke-tests.md` (route `/bezeg-2.0/patches/derivatives`: plane transparency and ordering, label overlap of `S_u`, `S_v`, `S_(uv)`, `n`, the corner buttons, the readout and status).

## Unverified
- No real Three rendering of the plane or arrows, no browser or smoke run, no `just build`.
- No mutation checks yet.
- Arrow dash visibility (dotted twist heads at 0.008 of the extent) has not been judged visually.

## Gotcha
- Heredocs here strip backslashes: `"\\mathbf{n}"` came out as `"\mathbf{n}"` in `TensorDerivativesScene.ts` and its test. This is fixed through the Edit tool. Use Edit, not shell or Python heredocs, for any string with a backslash.
