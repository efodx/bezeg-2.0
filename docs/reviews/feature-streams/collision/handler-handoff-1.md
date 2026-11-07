# Collision stream — handler handoff 1

Written 2026-11-07 by handler 1 at BUDGET SOFT. Worktree `.claude/worktrees/stream-collision`, branch `worktree-stream-collision`, port 4320. Task table: [collision-playground tasks](../../../tasks/collision-playground/README.md). Evaluation records for CP1–CP5 are in `docs/agent-workflow/evaluation-log.md`.

## Pushed

- CP1 model `f1a4b928` (radius scales with 1/√n, about 5 % touching; decision in the spec).
- CP2 worker host `8b93633c`.
- CP3 limits `7a0987ec`: naive 4 000, sweep 5 000. CDP cannot throttle a worker, so the throttled numbers ran on the main thread.
- CP4 Run component `9c0bbd19`, with the hidden harness route `/bezeg-2.0/harness/collision-playground` (`?count=&method=&inspect=0&inspectCount=`).
- CP5 Look underneath `e8d72ec4`.
- CP7 measurement script `89065af6`: `just collision-containment <path> [json] [md]`, and `COLLISION_CP7_MODE=paused|none` for baselines. Trial results are in `docs/reviews/collision-playground/cp7-measurements.md`.

## CP6: in the worktree or committed locally, not pushed

CP6 came from a worker; its report is in `docs/reviews/collision-playground/cp6-notes.md`. Check `git log origin/master..HEAD` and `git status` for what handler 1 managed to commit.

- **Part 1, shared runtime:**
  - `src/learning/chapter/orderedContent.ts`
  - `content/bezierChapter.ts`
  - `content/familyChapters.ts`
  - `FamilyChapterPage.tsx`
  - new `FamilyChapterPlayground.test.tsx`
- **Part 2, content:**
  - `content/sweepChapter.ts` and `.test.ts`
  - the `collision_*` strings in `sl.ts`
  - string updates in `CollisionPlayground.test.tsx` and `CollisionInspect.test.tsx`
  - docs: `localization.md`, `capabilities.md`, `ui-functionality.md`, `specs/sweep-algorithms-lessons.md` and `specs/collision-playground.md`. The spec also carries a handler fix: a BEL character had replaced `\a` in `\approx` in the CP3 limits paragraph.
- **Terms:** all proposals are kept except bounding box, which is "očrtani pravokotnik" without "(škatla)", because "škatla" is already the probability chapter's box. The sources are repo usage only.
- **Checks so far:** tsc, lint and the build were clean when the worker ran them, and the new test passes alone. Handler 1 started a full `just unit src/learning` after the worker's final test fix. If no result is recorded in the stream file, rerun it.

## Next slice: the containment question (stop condition)

The CP7 trial on the harness missed criterion 2 on mobile 4×. Scroll and link input-to-paint p95 was about 136 ms against a 100 ms target. The cost is already there with the playground **paused** (128 / 168 ms), and a bare `/bezeg-2.0/learn` page gives 28 / 24 ms. Desktop passes (26 / 16 ms). Other trial results passed:

- no long animation frame over 50 ms;
- the method switch takes 37 / 58 ms;
- the draw median is 1.3 / 6.4 ms;
- the off-screen pause and the worker termination on navigation work.

The hidden-tab case was not measured, because headless Chromium keeps `document.hidden` false; it needs a headed run.

Steps:

1. Verify, then commit CP6 part 1 alone and push it. It is shared runtime, so note it in the stream file for Platform, and Bézier chapter tests must pass. Commit part 2 but **do not push** the chapter blocks until step 3 decides.
2. Investigate the paused-playground cost with a performance trace (CDP Tracing) on the harness at 4×. Compare it with the same harness page without the component, which needs a harness query flag. Suspects:
   - the large DPR-scaled canvas repainting on scroll;
   - ResizeObserver or IntersectionObserver callbacks;
   - the chapter-page CSS;
   - the `/learn` baseline not being comparable.

   Then run `just collision-containment /bezeg-2.0/learn/sweep-algorithms` once CP6 is in the build.
3. Decide:
   - If the playground is the cause and a fix keeps it ≤ 100 ms, fix it, push CP6 part 2, then finish CP7.
   - Otherwise set `Run state: stopped: containment miss on mobile 4x (owner decision)` and report to the owner with the numbers (README stop rule; spec criterion 2).
4. Unfixed CP4 finding from the CP7 trial: the live region can announce an in-flight snapshot from the old method after a method switch. Announce only the first snapshot whose method and count match the action (`CollisionPlayground.tsx`, `pendingAnnounce`), with a test.
5. Open gap: the shared Slider's number field is 40 px tall on coarse pointers. The Controls stream owns that component, so record it rather than patch it.
6. CP7 remains:
   - the acceptance matrix;
   - `just check`;
   - a bilingual chapter smoke (`bezeg-smoke`, Sonnet);
   - links from the performance results and the performance plan;
   - keep or remove the harness route, and record why.
