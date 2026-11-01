# Maps stream: handler handoff 8

Written 2026-11-01 by handler 8 (Opus 5.5, `auto`, effort `medium`) at the 150k context threshold. Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, local branch `worktree-stream-maps`.

## Git state

- `origin/master` has `fa0f1269` (the `linear-map` poster recipe), and nothing else from this run.
- Local `worktree-stream-maps` = `fa0f1269` + `21157ace` (WIP example cards) + `5d270c68` (F2b) + this note's commit. `origin/worktree-stream-maps` has diverged from it (older history); do not force-push it.
- `origin/maps-handler-8-wip` = `21157ace`: the example-card tooling. It is **not for master** until the capture: the new `guidedExamplePreviews.test.ts` case fails without `src/images/learning/examples/linear-maps/manifest.json`.
- `origin/maps-handler-8-f2b` = `1c9e5ac4`: F2b cherry-picked onto `origin/master` `12a5ecb4`. **Ready to push after the smoke.**

## Done this run

- **Linear 07 F5 poster recipe** (`fa0f1269`, on master), in `scripts/demonstration-preview-recipes.cjs`.
  - It selects example A = [[2, −1], [1, 1]] ("Primer matrike" → `basis-default`) with equal units and window [−1.6, 6.6, 11.6, −1.47].
  - The outcome check requires example A and the exact handles (2, 1) and (−1, 1); it has a test.
  - Poster not captured: the exhaustive `validateRecipes` check still fails for Geometry's `ear-clipping`, `interval-sweep` and `segment-intersections`, both in `scripts/demonstration-preview-capture.test.cjs` (already red on master) and at capture start. The note to Geometry is in the maps stream file.
  - No clip: spec criterion 1 asks for a static preview only. The task file's clip is a follow-up.
- **Linear 07 F5 example cards** (`21157ace`, branch only), built by a Sonnet worker (partial: capture skipped, free memory 0.3–2 GB).
  - `generate-guided-example-inventory.cjs --chapter <id>` and `capture-guided-example-previews.cjs --family <id>` work for any board-based chapter-owned chapter. They are table-driven, with `linear-maps` the only entry so far.
  - Per-example copy is in `src/learning/content/linearMapsPreviewCopy.ts`. The resolver is `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` in `guidedExamplePreviews.ts`.
  - The inventory is at `docs/reviews/linear-maps/guided-example-inventory.json`. Script tests pass (18/18), with mutation evidence in `.command-logs/f5-mutations.log`.
  - Handler review: the expectations (8 curves, 8 points) match L1 (identity) and L2 (determinant mode, example A); L2's alt text names the board's own "det A" text.
  - Worker-flagged risk: the capture checks curve samples at t = 0, 0.5 and 1, but the grid polylines use data arrays (`scripts/guided-example-preview-api.cjs:230-235`). The expectations contain no `curves` samples.
- **Complex 04 F2b** (`5d270c68`, and `1c9e5ac4` on the f2b branch).
  - Routes `/bezeg-2.0/complex-reciprocal` and `/bezeg-2.0/complex-roots`, family `maps`, `lesson: false`.
  - Both Preset collections are registered, with the titles and prompts SL/EN and the `n-ti koren` row in `docs/localization.md`.
  - Ownership entries go to the future chapter `complex-maps` (sections `reciprocal-inversion` and `roots`).
  - The worker also fixed a TDZ crash in `draggable` in both complex graphs; handler-reviewed.

## Checks

- At `1c9e5ac4` (clean tree):
  - `npx tsc --noEmit` clean;
  - focused `just unit` passed in 452 s (demonstrations, Routes, DemonstrationsPage, preview assets, presets, `src/graphs/complex`, `src/learning/runtime`, `src/learning/chapter`, `src/localization`);
  - `just build` passed.
- No full suite, no smoke, no browser look at any image this run.

## Next, in order

1. **Smoke F2b:** check out `origin/maps-handler-8-f2b` (or verify `5d270c68` on master's code) and run `$smoke-tester` on port 4316. Cover both new routes in SL/EN with a live switch, refresh, Preset save/restore, and `/complex-multiplication` unchanged. Then fetch, rebase onto `origin/master` and push to `master`. Afterwards rebase `worktree-stream-maps` onto `origin/master`; the F2b commit drops out as already applied.
2. **Example-card capture** (needs ≥ 3 GB free and no other capture running).
   - Run `just build`, `just preview 4316`, then `PREVIEW_BASE_URL=http://localhost:4316/... node scripts/capture-guided-example-previews.cjs docs/reviews/linear-maps/guided-example-inventory.json --family linear-maps`.
   - Look at both PNGs.
   - Haiku visual comparison review.
   - Then squash the WIP into a proper commit (a new commit; do not amend pushed history) and push to master.
3. **Poster capture:** once Geometry's three recipes are on master (or Geometry captures `linear-map` itself), run `PREVIEW_RECAPTURE_IDS=linear-map` (see `docs/commands.md`). Then remove `linear-map` from `POSTER_PENDING` and the `DemonstrationsPage.test.tsx` exemption.
4. **Linear 07 F6:** see handoff 7 (Batch A gate, `just check`, smoke of route and lessons, handle keyboard focus decision, `just linear-map-bench`).
5. **Complex 04 F3+F4:**
   - the M1 and M2 lessons in `complexMapsChapter*.ts`;
   - the chapter *Kompleksne preslikave*, with one `chapterOwnedLessons` entry;
   - set `lesson` back and remove the lessonless exemptions.
   - Split the lessons and the chapter between two workers. The example-card table in `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` and `chapterInventories` gets a `complex-maps` entry in its F5.
6. **Triangle 05:** as in handoff 7.

## Operational notes

- Free memory swings between 0.3 and 4 GB, and the machine-wide test slot was busy (the build waited 277 s behind `stream-geometry`).
- Workers skip captures below 3 GB. That is the right rule; schedule captures when memory is free rather than retrying.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet 5.5 `medium`; reviewers `bezeg-reviewer` Sonnet; visual review Haiku; smoke `bezeg-smoke` Sonnet on port 4316. Brief files under `docs/reviews/<family>/` worked well for both workers this run.
