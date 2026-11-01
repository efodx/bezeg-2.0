# Maps stream: handler handoff 12

Written 2026-11-01 by handler 12 (Opus 5.5, `auto`, effort `medium`) after the 150k context threshold, with the machine out of memory (Claude Code stopped the handler's unit run and both watchers). Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`.

## Git state

- On `origin/master`: `4aad3d12` (triangle 05 F2b: family `plane-geometry`, routes `/bezeg-2.0/triangle-centres` and `/bezeg-2.0/inscribed-angle`, both Preset collections; Preset load no longer duplicates the inscribed angle scene; graph and collection share one overlay-id list) and `1f9b3b1e` (both triangle graphs start at `[-1, 6, 8, -3]`, framing the default triangle, its circumcircle and the obtuse H=(1,6); default-view test extended).
  - Checks at `1f9b3b1e`: tsc; focused `just unit` (compgeo, presets, catalog, routes, learning, localization) and `just build` on the first rebase (`239a78ad`); after a second clean rebase, tsc and `LearningPage`/`demonstrations`/`lessonCatalog` tests. Browser: both routes open directly and after refresh, SL titles, no console errors (`.command-logs/t05-f2b/shots/`). EN live switch not checked.
  - The first rebase conflicted in `lessonCatalog.test.ts`; the owner approved the resolution.
- **F3+F4 work in progress** on branch `stream-maps-t05` on origin (commit after this note's), **unverified, not on master**. Brief: `docs/reviews/triangle-geometry/05-f3-f4-brief.md`; W1 notes: `05-f3-f4-w1-notes.md`.

## F3+F4 state (what the WIP commit holds)

- W1 (partial at its budget): `triangleGeometryChapterRegistry.ts`, `triangleGeometryChapterLessons.ts` (T1 and T2, 7 steps each, SL/EN), the `chapterOwnedLessons` row, lesson tests in `triangleGeometryChapter.test.ts`. Code changes: `POINT_SET_OVERLAY_NAMES` gains the triangle overlays; `InscribedAngleGraph` handles the `parameter` action `t` (glider, degrees). Its own test passed; nothing wider ran.
- W2 (done): `triangleGeometryChapter.ts` registered in `familyChapters.ts`; Learn strand `plane-geometry` and topic preview in `LearningPage.tsx`; count updates in `LearningPage.test.tsx`, `authoredChapterCoverage.test.ts`, `familyChapters.test.ts`; smoke rows in `tests/guided-lessons.smoke.spec.cjs` and chapter order in `tests/unified-learning.smoke.spec.cjs`; 6 term rows in `docs/localization.md`.
- Handler: removed `lesson: false` from both routes and their ids from the lessonless list in `lessonCatalog.test.ts`; removed "(ortocenter)" from T1 prose (README term table). eslint clean on the new files; tsc clean before the last two edits.

## Next, in order

1. Check free memory first. Run `npx tsc --noEmit --pretty false` and `just unit src/learning src/localization src/graphs/compgeo src/demonstrations.test.ts src/DemonstrationsPage.test.tsx src/Routes.test.tsx`. Known suspects from W2's run: W1's T2 test whose "not exactly equal / natanko enak" regex matched circle prose (W1 may have fixed it after; verify), and any lesson-count test (`lessonSmokeCoverage.test.ts`) after the flag removal. `lessonMathNotation.test.ts` and `sceneContentAgainstGraphs.test.tsx` have not yet seen the new lessons.
2. Preview copy, which `caa51161` also added: a `triangle-geometry` entry in `src/learning/chapter/guidedExamplePreviews.ts` / `guidedExamplePreviewCopy.ts` and its test counts, if the tests require it.
3. Review: engineering + mathematical review of the lesson scenes and readouts (`bezeg-reviewer`, Sonnet), per review routing; lesson prose is one-shot and outside review.
4. `just build`, then a browser look at `/learn/triangle-geometry` and both lessons in SL and EN with a live switch; check the smoke row `setup` minimum of 3 board points against step 1. Commit, rebase, push to master (user impact: new Learn chapter and Learn buttons on both routes).
5. F6 as in the task file; F5 example cards and posters remain blocked as in handoff 11 (posters now also pending for `triangle-centres` and `inscribed-angle`).

## Open items

- Geometry has not added the `PointSetGraph` vertex-name hook; panels map "A (P1)".
- W1 risk: scenes set vertices with `set-points`, so the example selector shows "custom" on the right, obtuse and Thales steps.
- Memory: the machine reaped background commands at low memory. The memory-gate floor is now 0.5 GB on master (`c0fc4292`).

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet 5.5 `medium`; reviewers `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet on port 4316. W1 hit 135k in 48 turns on two lessons plus tests: split lesson scene work per lesson next time.
