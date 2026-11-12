# Families-prep state note

Handler 10 handed off on 2026-11-12 to handler 11. The worktree is on branch `worktree-stream-families-prep-2`. Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take minutes while other streams hold the two test slots (`just check-changed` 15–25 min). Run long checks in the background.
- Publish with `just publish --background --recipe <docs|tooling|runtime> --base <last published local commit> --commits <id,...>`; the commit list must be exactly `base..HEAD` (a docs commit made after queuing makes the publish refuse). `tests/*.spec.cjs` needs `runtime`; `scripts/` needs `tooling`. The gate checks added Markdown links: no placeholder links in notes. Then `just publish --status`. `bash .command-logs/h9-pubci.sh <local short sha>` (background) waits for a publish and watches its hosted CI run; the owner asked that this stream keep master's CI green. A newer push cancels the running CI run of an older one; the newer run covers both.
- If a publish fails at `reconcile`, abort the rebase in the kept publish worktree (`git -C <publish worktree> rebase --abort`), rebase only your new commits here with `git rebase --onto origin/master <last published local commit>`, resolve mechanically, rerun `just check-changed`, and publish on the new base. Do not rebase while a worker or a check runs in this tree.
- Run `git diff --cached --check` before committing.
- To check committed code while workers edit the tree: `git worktree add ../<name> HEAD --detach`, junction `node_modules` (`New-Item -ItemType Junction`), `just build` and `just smoke-built <spec>` there; remove the junction with `cmd /c rmdir` BEFORE `git worktree remove --force`.
- Reviewers and smoke workers: never bare `npx vitest`/`npm test`/playwright test runs. Smoke workers serve a built copy on their own port. Broad smoke goes to Sonnet, named routes to Haiku.
- Master has a teardown sweep (`BEZEG_GRAPH_TEARDOWN`) instead of per-graph StrictMode tests. Sweep filter for a slice: `BEZEG_TRANSIENT_STATE`, `BEZEG_PRESET_ROUNDTRIP`, `BEZEG_GRAPH_TEARDOWN` = ids.

## Done

- F0, F1, F2a, F2b for all fifteen families (handlers 7–9).
- Handler 10 (all pushed unless noted):
  - Browser frame times for solids, contours, LP, phase portrait, logistic map `36730752` (script `scripts/f2b-solids-levelsets-phase-browser-perf.cjs`, results section in `docs/bezier-performance-results.md`, paragraphs in ADR 0051/0053/0054, task lines). Phone misses owed: cube offset long tasks (also a desktop hitch, unexplained), revolve discs p95, contour level/probe drags, the contour surface updating on drags (ADR 0053 planned not). Note `notes/f2b-perf3.md`.
  - Release-batch files split per batch: trigonometry (tasks 07–09), analytic lines (04–06), isometries (05–07).
  - **F3 trigonometry Batch A** `381a894a`: chapter `trigonometry` (functions strand) owning TR1, TR2 on `unit-circle`; action kind `trig`. CI fix `bad685a8` (`tests/unified-learning.smoke.spec.cjs` hard-codes the chapter list).
  - **F3 analytic lines Batch A** `092ef897`: chapter `analytic-lines` (plane-geometry strand, before projective conics) owning L1, L2 on `line-geometry`; action kind `lines`.
  - **F3 isometries Batch A** `f91d0287` (publishing at handoff, see below).
- **F3 pattern**: `notes/f3-trig-a.md` ("Reusable F3 skeleton checklist", "Pitfalls") plus `notes/f3-lines-a.md`; template commit `092ef897`. The catalog keeps one lesson per Demonstration, so every family's lessons are owned by a new chapter skeleton (`<x>GuidedLessons.ts`, `<x>ChapterRegistry.ts` with `adaptGuidedLessonContent`, `<x>Chapter.ts`, `lazyOwnedLessons` in `chapterOwnedLessons.ts`). Also needed every time: `LearningPage.tsx` `topicPreviews` row and strand, `LearningPage.test.tsx` counts (thumbnails stay at 24 until posters), `tests/unified-learning.smoke.spec.cjs` lines 5 and 76, `authoredChapterCoverage.test.ts`, `projectiveConicsChapter.test.ts` ordering, chapter prose ≥450 words per language, no casts (exhaustive `never` check). Workers run out of budget in about 150k: plan two workers per family (content + action, then tests + checks).

## In flight at handoff

- Publish of `f91d0287` (**F3 isometries Batch A**: chapter `isometries`, maps strand after complex maps, owning L1, L2 on `isometries`; action kind `isometry`; reviewed, `check-changed` passed) on base `092ef897`. Check `just publish --status`, then watch its CI (`bash .command-logs/h9-pubci.sh f91d0287`).
- This state note and the evaluation entry follow as a docs commit; publish it with `--recipe docs --base f91d0287` once that publish is ok (handler 10 starts a background loop that does this; check status before starting another).
- No worker is running.

## Owed

- Per family task files list their owed items (F4 guided examples, F5 poster/clip/thumbnail, F6).
- Trig: TR2 has no guided-lessons smoke row (one default row per Demonstration); content test's decimal check is loose; the wide addition formula block is clipped at the panel's right edge at 1280 (shared lesson panel).
- Frame-time misses above; contour N, phase seeds >6 and revolve segments have no control.
- Shared-code items (another stream or an owner decision): surface gesture hint promises a draggable point on solids (`DemonstrationWorkspace.tsx:284`); surface board's throttled resize after `freeBoard` (`jsxSurfaceView.ts`); CDP touch drag on a complex-plane point pans the board.
- Layout and older items: see `git show d7a92e94:docs/reviews/feature-streams/families-prep/state.md` section "Owed".

## Next

1. Confirm the pending publishes and the hosted CI run of the last push.
2. F3 for the remaining families, one at a time (they all edit the same chapter lists): circle geometry, combinatorics, then the rest; Batch B of trigonometry, lines and isometries can interleave (they add lessons to existing chapters). Split each release-batch file per batch first.
3. F4 (chapter guided examples) can follow per chapter once its F3 lessons exist.

Rules to keep: at most two workers in the stream at once, and only one F3 worker at a time (shared chapter files); never edit shared host files (`BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime, `src/graphs/base/` apart from test lists). At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
