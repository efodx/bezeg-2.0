# 10W-J handoff (patch-joins wiring) - partial

Base 1b15888, nothing committed, no preview server started (none to stop). Untracked `.claude/scratch/` untouched; temp scratch files removed.

## Done (code written, only `tsc` run)
- `patchDto.ts`: join fields (`joinContinuity`, `joinAlpha`, `joinV`, `mB`, `nB`, `netB`) in `PatchStateDto` + `PATCH_STATE_FIELDS`.
- `patchPresetCollections.ts`: `checkJoinState` (reject, not clamp: continuity, alpha [0.25,4], v [0,1], mB/nB 1-4, netB length (mB+1)(nB+1), B all-or-nothing), collection `patch-joins`, `joinStartingScenes` (C1, G1 alpha=2, C0 kink).
- `TensorJoinPanels.tsx` (new): JoinScenesControls, JoinModeControls (alpha disabled outside g1), JoinBDegreeControls, JoinBPointControls (derived rows explained, no editor), `joinReportCase`, JoinReportPanel.
- `TensorJoinGraph.tsx`: `presetCollection()`, `selectBIndex`, `selectedBIndex`, `useJoinScene`, `framedPoints` override, `workspaceEdit/Display`; `JoinStateDto` now alias of `PatchStateDto`.
- `TensorPatchGraph.tsx`: new protected `framedPoints()` used by `resetView` (behaviour-preserving).
- `inputs/Slider.tsx`: optional `disabled` prop.
- sl.ts/en.ts: ~55 keys each, lockstep (CRLF kept).
- Wiring: demonstrations.ts, graphFactories.ts, realGraphTestHarness.tsx, guidedLessonOwnership.ts (`tensor-joins`), guidedExamplePreviewCopy.ts, Routes.test.tsx (51), demonstrations.test.ts (51, family 6), PresetCatalog.test.tsx, lessonCatalog.test.ts, docs/commands.md, recipe target in scripts/demonstration-preview-recipes.cjs.

## Observed
- `npx tsc --noEmit`: only error is `demonstrationPreviewAssets.ts(54)` missing `patch-joins` (cleared by recapture; do not hand-edit).

## Remaining
1. Add `'patch-joins'` to `surfaceCameras` in the recipes file: `{az: -0.9, el: 0.5, distance: ~13.877 (computed, unverified), target: [1.5, 0, 0]}` (no `surfaceControlPointCounts` entry). Confirm with `getInitialState().camera` (my probe printed nothing; vitest swallowed console).
2. Tests not written: `TensorJoinPanels.test.tsx` (mode switch updates report; alpha disabled outside g1; derived B not movable via editor; report wording C0/C1/G1/vanish/no-c0), `patchPresetCollections.test.ts` join block (accept/reject), Reset/Preset restore/language switch. Existing `TensorJoinGraph.test.tsx` (comment about tensor collection rejecting B fields) may need updating.
3. Run: `npx vitest run src/graphs/patches src/Routes.test.tsx src/demonstrations.test.ts src/learning src/graphs/base src/localization`, eslint on changed files, `just build`, `just preview 3012`, then `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_IDS=patch-joins PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 node scripts/capture-demonstration-previews.cjs` (VERIFIED_PRESENTATION only because adding a recipe changes the recipes fingerprint); Read the PNG; stop server; built smoke `SMOKE_TEST_IGNORE='**/guided-lessons.smoke.spec.cjs' CI=true npm run test:smoke:built`; mutations.
4. Docs for handler: capabilities/architecture/ui-functionality lines for the new route.

## Term choices (sl)
"stik krp", "zveznost stika", "ostri rob" (existing "ostri vogal" idiom), "izpeljana (točka)", "razmerje α"; no new mathematical term.

## Flags
- Union `kink` Preset: B row 1 mirrors A's z (`patchPresetCollections.ts` `joinScene`); verify it is visibly C0-only in the report.
- `JoinBPointControls` keeps a stale derived focus after an A-point click (minor).
