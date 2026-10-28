# Slice 09A handoff (partial) - `patch-decasteljau`

Worker stopped on HANDOFF at a consistent point. Nothing committed. `npx tsc --noEmit --pretty false` is clean at this point (0 lines, `.command-logs/t09a-tsc2.log`); no known tsc error.

## Done (implementation complete, graph-level tests missing)

- `src/bezeg/impl/patch/tensor-product-bezier-patch.ts`: `TensorColumnsDeCasteljauScheme` and `columnsFirstScheme(u, v)` (mirror of `decasteljauScheme`). Test added in `tensor-product-bezier-patch.test.ts` (levels recurrence, `evalByColumns`, Bernstein sum, `eval`, all `m,n` in 1..4, 1e-12): passes (14 tests in file).
- `surface-view/surfaceScene.ts`: roles `construction-2` (polyline + marker). `threeSurfaceView.ts`: colour `0xb02a73` (pink), dash `{0.022, 0.012}`, separate marker material. `threeSurfaceView.test.ts` roles/dashed lists and a palette test updated (not yet re-run after edit).
- `patchDto.ts`: `DECASTELJAU_ORDERS`, `DecasteljauOrder`, `isDecasteljauOrder`, `decasteljauOrder?` in `PatchStateDto` and `PATCH_STATE_FIELDS`. `patchPresetCollections.ts`: check rejects a bad order with `invalid_patch_decasteljau_order`; collection `"patch-decasteljau"`.
- `TensorPatchGraph.tsx`: optional state fields `showDeCasteljau?`, `decasteljauOrder?`; protected hooks `stateDto()`, `stateOf(dto)`, `selection()`, `panelActions` (patch-tensor behaviour unchanged). `TensorPatchPanels.tsx`: optional `pointExtra` / `visibilityExtra` props.
- New: `TensorDeCasteljauGraph.tsx` (subclass; default bicubic at (0.35, 0.6), order rows, construction on; `useStartingPatch` keeps order and switch; geometryChanged follows u/v while shown), `TensorDeCasteljauPanels.tsx` (order select with per-order help naming colour and dash; visibility switch reusing `de_casteljau_construction`), `TensorDeCasteljauScene.ts` (`buildDeCasteljauConstruction`; ids `dc1-...` stage 1 role `construction`, `dc2-L-k` stage 2 role `construction-2`; single-point lines are markers only), `TensorDeCasteljauScene.test.ts` (145 tests pass: markers equal an independent recurrence level by level, last stage-2 level reduces to `patch.eval`, level counts incl. bilinear min(m,n) then |m-n|, roles, unique ids).
- Wiring: `demonstrations.ts` (placed between tensor and triangular; title `patch_decasteljau_algorithm`, prompts `prompt_patch_decasteljau_order/levels`), `graphFactories.ts`, `realGraphTestHarness.tsx`, `guidedLessonOwnership.ts` (`tensor-decasteljau`), `guidedExamplePreviewCopy.ts`, `demonstrationPreviewAssets.ts`. `graphTransientStateContract.tsx` and `realGraphScenes.ts` needed no edit (they use `instanceof TensorPatchGraph`, which the subclass satisfies) - not yet confirmed by running those suites.
- Localization sl+en in lockstep (12 keys, see `patch_decasteljau_*`, `prompt_patch_decasteljau_*`, `invalid_patch_decasteljau_order`).
- Existing enumerating tests updated for the new route: `demonstrations.test.ts` (48 demonstrations, family counts, surface list), `lessonCatalog.test.ts`, `PresetCatalog.test.tsx` PATCH_KEYS. These 3 files pass (135 tests).

## Checks observed

- Full run `npx vitest run src/graphs src/bezeg/impl/patch src/localization src/learning src/demonstrations.test.ts`: before test updates 3 files failed / 6 tests failed (all route-list enumerations, now fixed and re-run green); 173 files passed. Not re-run in full since the fixes and the scene test. Log: `.command-logs/t09a-vitest1.log`.

## Remaining, in order

1. Graph test `src/graphs/patches/TensorDeCasteljauGraph.test.tsx` (pattern: `TensorPatchGraph.test.tsx` / `TensorPatchEditing.test.tsx`, `FakeSurfaceView`, `installBoardShims`, `settle`): order switch reaches the scene (select labelled `t("patch_decasteljau_order")`); construction follows net drag, `setDegree`, u/v change, Reset (`settle(() => graph.reset())`), Preset save/restore (order restored from DTO); switch off leaves no `dc1-`/`dc2-` polyline or construction marker; language switch relabels; `evaluated` marker equals `patch.eval(u, v)` in all three orders; old Preset without the fields loads (rows, shown).
2. DTO tests in `patchPresetCollections.test.ts` using the `texts()` helper with the `patch-decasteljau` collection: bad `decasteljauOrder` rejected with localized sl/en reason; Preset without it accepted; round-trip of the order.
3. Optionally a threeSurfaceView test that a `construction-2` marker uses its own material.
4. Mutations, one observed failure per new assertion group (not done): e.g. swap u/v in `columnsFirstScheme`; drop `construction-2` polyline role; skip `geometryChanged` u/v clause; remove `decasteljauOrder` from `PATCH_STATE_FIELDS`; make switch-off keep markers.
5. Run `npx vitest run src/graphs src/bezeg/impl/patch src/localization src/learning`, `npx eslint <changed files>`, `just build`; logs to `.command-logs/t09a-*.log`. Confirm `GraphTransientState.part*` suites and `localization` tests pass with the new route.
6. Docs for the handler: additive DTO field `decasteljauOrder` (absent = rows); new route `/bezeg-2.0/patches/decasteljau`; collection key `patch-decasteljau` (a file contract - PresetCatalog test updated).

## Flags

- Preview: `demonstrationPreviewAssets.ts` is `Record<DemonstrationId, string>` with no fallback; `patch-decasteljau` reuses the `patch-tensor` image (least misleading) until task 13. Catalog `manifest.json` has no entry; preview generator not run.
- Dash for `construction-2` (0.022/0.012) differs from iso-w/iso-v/compare; colour contrast test added but not yet run.
- `src/graphs/patches/tensorDerivatives*.ts` are the other worker's files; untouched.
