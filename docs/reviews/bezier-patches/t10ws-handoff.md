# 10W-S handoff (patch-subdivision wiring) - partial

Base 515d82a, nothing committed. Preview server on 3012 stopped. Untracked `.claude/scratch/` untouched.

## Done
- `TensorSubdivisionPanels.tsx` (new): split controls (direction select, u0/v0 slider + number field, locked-points note), elevate buttons (disabled at degree 4 with per-direction reason), correspondence readout, pieces switch.
- `TensorSubdivisionGraph.tsx`: `presetCollection()` -> `patch-subdivision`, `defaultPreset()` (dome, u, 0.4, pieces on), `workspaceEdit/Display`; local `SubdivisionStateDto` removed (uses `PatchStateDto`).
- `patchDto.ts`: state fields + `PATCH_STATE_FIELDS`. `patchPresetCollections.ts`: collection, strict checks (direction u|v, value finite in [0.05, 0.95], reject not clamp, own reasons checked before the shared check).
- Wiring: `demonstrations.ts` (after derivatives), `graphFactories.ts`, `realGraphTestHarness.tsx`, `guidedLessonOwnership.ts` (`tensor-subdivision`), `guidedExamplePreviewCopy.ts`, counts 49->50 in `Routes.test.tsx` and `demonstrations.test.ts` (also family count 4->5), `PresetCatalog.test.tsx`, `lessonCatalog.test.ts`.
- sl.ts + en.ts keys (CRLF kept): `patch_subdivision_title`, `prompt_patch_subdivision_*`, `patch_split_*`, `patch_pieces_locked`, `patch_elevate_*`, `patch_show_pieces`, `patch_correspondence_*`, `invalid_patch_subdivision_{direction,value}`. No new Slovenian terms (reused "subdivizija", "dvigni stopnjo", "del").
- Recipe + camera in `scripts/demonstration-preview-recipes.cjs`; `docs/commands.md` surface list.
- Tests: `TensorSubdivisionPanels.test.tsx` (39), new block in `patchPresetCollections.test.ts`.

## Checks observed
- `npx vitest run src/graphs/patches`: 32 files, 795 passed.
- Routes/demonstrations/learning/graphs-base/localization: after fixing the family count, all passed (demonstrations 11/11).
- eslint on changed files: clean. `just build`: passed.
- `npx tsc --noEmit`: only error is `demonstrationPreviewAssets.ts(53)` missing `patch-subdivision` (cleared by a successful recapture; not hand-edited).

## Remaining
1. Poster. First recapture needed `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` (additive recipe change alters the presentation fingerprint; other recipes untouched). With it, `captureSurface` timed out at `surfaceOutcome` (`scripts/demonstration-preview-recipes.cjs:185`, `waitForFunction` 30 s, no log). Not diagnosed. Check that `/bezeg-2.0/patches/subdivision` renders in the preview with Chromium/WebGL and what `surfaceOutcome` waits for (likely `data-surface-framing`). Then rerun: `just build; just preview 3012`; `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_IDS=patch-subdivision PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 node scripts/capture-demonstration-previews.cjs`; Read the PNG; stop the server.
2. `SMOKE_TEST_IGNORE='**/guided-lessons.smoke.spec.cjs' CI=true npm run test:smoke:built` after fresh build (needs `tests/demonstrations.smoke.spec.cjs`).
3. Mutation checks, one per assertion group (not yet run).
4. Docs for the handler: `docs/capabilities.md:46,100`, `current-architecture.md:147`, `ui-functionality.md:61`.
5. Transient-state contract picks the graph up via `graphFactories` (graphs/base tests passed); `--selective` shards not otherwise inspected.

## Flags
- `PresetImport`'s list uses `patchPresetCollections` automatically; no extra edit.
- Poster was not generated: do not push until step 1 is done.
