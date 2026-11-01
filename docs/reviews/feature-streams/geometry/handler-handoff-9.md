# Geometry stream — handler handoff 9

Written 2026-11-01 by handler 9 (Opus 5.5, permission mode auto, effort medium) at the 150k soft threshold.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. `node_modules` is a junction to the main checkout: delete the junction itself before removing the worktree.
- `Run state: active` on `master` (unchanged).
- **Task 12 (convexity F2b registration) is two local WIP commits on `stream-geometry`, not on `master` and not on the remote** (a force-push of the rebased branch was refused, correctly): `1ef86de9` (registration) and `4e8b028f` (fixes). Rebase them onto `origin/master` first. Master has since gained linear maps 06 registration (shared `demonstrations.ts`, `graphFactories.ts`, locale catalogs, recipes, manifest), so expect textual overlap; a real conflict is a stop condition (AGENTS.md).
- Untracked logs `docs/reviews/convexity-hulls/0[578]-*.log`, `12-unit-*.log` are not ours to commit.

## Done this run

| Item | Where | Notes |
| --- | --- | --- |
| Sweep S0 02 trace model and exact event order | `c19a003c` (master) | Sonnet `high` worker, math review no findings. |
| Sweep S0 03 exact segment primitives | `d2e3c402` (master) | Same; mutations failed 6 and 7 tests. |
| Task 12 fixes | WIP `4e8b028f` | (1) `PointSetGraph.exportPreset()` drops `model` from `graphState`: the collections' `checkGraphState` rejects it and the Preset catalog round-trip failed for all three ids. Lesson checkpoints still use the full `sceneGraphState()` (restore replaces state after `importPresetData`). (2) `lessonCatalog.test.ts` exempts `lesson: false` ids via `LESSON_DEMONSTRATION_IDS`. (3) Poster evidence: `LINE_DEFINED_IDS` lets the three compgeo ids pass with visible lines instead of a curve. Observed pre-fix failures; focused run after the fix: 10 files, 206 tests passed. |
| Task 12 focused suite | before fixes | 42 files: the only failures were the 5 above (posters, lesson catalog, 3 Preset round-trips). Engineering review of consumers in main chat: `DemonstrationWorkspace.tsx:98,108,207` guard an undefined owner; no app caller of `guidedLessonLaunchPath`. |
| Triangulation 05 task file | this push | [05 Voronoi value](../../../tasks/triangulation-voronoi/05-voronoi-value.md). `circumcentre` is on master (`src/compgeo/triangle.ts:183`, triangle geometry 02), so 05 is unblocked. Not dispatched. |

## Next, in order

1. Rebase the WIP onto `origin/master`; `npx tsc --noEmit --pretty false`.
2. Posters: `just build`, `just preview 4313`, then
   `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_BASE_URL=http://127.0.0.1:4313/bezeg-2.0 PREVIEW_RECAPTURE_IDS=orientation,polygon-area,convex-hull node scripts/capture-demonstration-previews.cjs`.
   The first flag is needed across source revisions; the second because the WIP changed the recipes file (three new recipes and `LINE_DEFINED_IDS`). Check `git diff origin/master -- scripts/demonstration-preview-recipes.cjs` first: retained recipes must be unchanged. If master's linear-maps slice regenerated the manifest, rebase first and recapture after. Look at the three PNGs; recipe viewboxes are guesses.
3. Then task 12's remaining checks: `just lint` on touched paths, full `just unit` once, `just build`, smoke of the three routes in SL/EN with a live switch (bezeg-smoke). Commit posters, fetch, rebase, `git push origin HEAD:master`, mark 12 accepted in the convexity README and stream file.
4. Dispatch triangulation 05 (Sonnet `high`, math review), and write sweep task 04 (segment-set graph mode, F2a) from the spec.
5. Convexity 13 and 14 (F3), then F4, F5, F6.

## Environment

- Memory was critically low (about 220 MB free) with three streams running vitest. The first focused unit run took 867 s; path-filtered sweep runs took seconds. One worker at a time.
- Pushing slices while the branch carries WIP: commit from a temporary detached worktree at `origin/master` under `$CLAUDE_JOB_DIR/tmp` (no `node_modules` needed), push, remove it, then rebase the stream branch.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet (`high` for exact predicates); math review `bezeg-reviewer` Sonnet; routine review and narrow smoke on Haiku.
