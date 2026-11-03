# Geometry stream: handler handoff 46

Written 2026-11-03 by handler 46 (Opus 5.5, auto, effort medium). Continues [handoff 45](handler-handoff-45.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watch passed the 175k soft threshold after task 26 was integrated.

## Done this run

1. **Sweep task 25 (Fortune lesson C5) accepted and on master.** See the [record](../../sweep-algorithms/25-acceptance.md).
   - The first `just smoke-lesson fortune` failed. In lesson steps 5 and 6, the two beach-line breakpoints lie at about (±31.5, 63), far up the unbounded rays. That is correct geometry, so the smoke row now declares `offscreenSteps: [5, 6]`, with the reason in a comment.
   - The smoke then passed in SL and EN. The card-hidden legibility capture at 1280×720 covered all 17 frames in SL and EN; there were no page errors, and the markers were visible.
   - The rebase onto master happened three times, as L3, N5 and L4 landed in turn. Each time, the enumerating-test conflicts were resolved as unions, and each time the preview-copy counts had collapsed silently in the auto-merge.
     - Final totals: 103 available lessons and 110 preview copies. The no-lesson list in `lessonCatalog.test.ts` is now `[]`.
     - Pushed `70efe184..22b5a6f9`.
   - Hosted CI: the run for `22b5a6f9` was cancelled, superseded by the next push. Run 41650359004 for `752a07ad`, which contains `22b5a6f9`, is green.
2. **Fortune poster.** Curves handler 40 captured it jointly with `bspline-extraction` in `752a07ad` (BS-B-5), after geometry agreed not to capture.
   - The recipe was unchanged, and no `LINE_DEFINED_IDS` entry was needed. `POSTER_PENDING` is now empty.
   - **Handler 46 viewed `src/images/demonstrations/catalog/fortune.png`.** The circles are round (equal units). The sweep line passes through D at the scheduled event, with diamonds at the lowest points of the two solid circles. The dashed false-alarm circle has its cross. The rays and the vertical edge are legible. This is the poster evidence for S3 F6.
3. **Sweep task 26 (chapter section) implemented, committed locally as `be44562d`, not yet accepted.** [Brief](../../sweep-algorithms/26-brief.md); one `bezeg-worker` (Sonnet, effort high, about 138k tokens, returned complete).
   - The `fortune` section follows `monotone-triangulation`. It has an activity card and a prerequisite link to `triangulations-voronoi#voronoi`.
   - The Voronoi section has a new in-text back link, "Fortunov algoritem" → `/bezeg-2.0/learn/sweep-algorithms#fortune`. Family chapter paragraphs now render localized in-text links through `src/learning/chapter/linkedParagraph.tsx`. The handler made `ChapterPage.tsx` reuse it in place of its identical `renderParagraph`.
   - Ownership moved, and `fortune` left `CHAPTER_LINK_PENDING` (which is now `['patch-coons']`). Chapter coverage went from 116 to 117.
   - Breaking change: `lesson.bezier-curves.geometric-properties.fortune` becomes `lesson.sweep-algorithms.fortune.fortune`. It is recorded in the task file.
   - Checks at `be44562d` (handler, after the dedupe): tsc clean, eslint clean, `just unit src/learning --no-fsModuleCache` 107 files and 1783 tests passed. The worker's build passed.
   - Mutations:
     - restoring the interim owner fails 2 tests in `sweepChapter.test.ts`;
     - moving the back link fails `triangulationChapter.test.ts` and `OrderedChapterRendering.test.tsx`.

## Branch state

- `stream-geometry` = `origin/master` `22b5a6f9` + `be44562d` (task 26) + this note's commit. `origin/master` has since moved to `752a07ad` or later.
- `be44562d` is also on `origin/geometry-fortune-chapter-wip`, so it survives. Never force-push. `origin/stream-geometry` is stale.

## Next steps, exactly

1. **Finish task 26 acceptance.**
   - Rebase onto `origin/master` (expect `POSTER_PENDING`/count conflicts only if another lesson or route landed). Do not chain the rebase with tests.
   - Then run `just build`.
   - Browser check (task 26 item 3), on `just preview 4323`:
     - `/bezeg-2.0/learn/sweep-algorithms` and `/bezeg-2.0/learn/triangulations-voronoi` at 1440×900 and 390×844, in SL and EN;
     - the in-text "Fortunov algoritem" link reaches `#fortune`;
     - math is typeset in both paragraphs;
     - the fortune activity opens the lesson, and its return link lands on the section link with focus restored;
     - `just smoke-lesson fortune` still passes.
   - Optionally view one bezier-chapter paragraph with links (`ChapterPage` now uses the shared helper; it is behavior-identical).
   - Write `docs/reviews/sweep-algorithms/26-acceptance.md`. Mark task 26, the sweep README row 65 and the stream file row 3 accepted. Rerun tsc, `just unit src/learning` and the build after the rebase. Push to master, and confirm hosted CI.
2. **S3 F6 acceptance** in `docs/reviews/feature-streams/geometry/f6-s3-acceptance.md`, following [f6-t3-acceptance.md](f6-t3-acceptance.md):
   - the criterion-to-test matrix for C5 acceptance 1–6 (a worker can draft it);
   - `just check`, run without editing `src` while it runs;
   - the bilingual smoke (the route, the lesson, the chapter, and focus return);
   - performance from [23-perf.md](../../sweep-algorithms/23-perf.md), median 16.7 ms;
   - the poster evidence from step 2 above.
3. **Worktree cleanup still needs the owner.** Ask before acting; the lists are in handoffs 40, 41, 43 and 44. The remote branches `origin/geometry-fortune-lesson-wip` (merged) and `origin/geometry-fortune-chapter-wip` (once 26 is on master) are now candidates.

## Risks and lessons

- **Silent count collapse.** When master and this branch each add one lesson, git auto-merges the identical increments in `guidedExamplePreviewCopy.test.ts` without a conflict. After every rebase, recount by hand.
- **Stale Vitest cache.** A `guidedExamplePreviews.test.ts` failure on a new card was a stale cache. Clear `node_modules/.vite/vitest` and `node_modules/.vitest-cache` before focused runs after a rebase.
- **Master moves fast.** Three other streams pushed lessons within an hour. Fetch right before the fast-forward check.
- **Hidden lesson card.** On some frames, the hide control is "Opazuj na grafu" ("Observe on the graph") rather than "Skrij navodila vodenega primera". The capture script is at `$CLAUDE_JOB_DIR/tmp/capture.cjs`; it is job-local, so recreate it from this description if needed.

## Live processes

The only one left is the 215k self-watcher, which ends with this session. The preview is stopped, and the worker has returned.

## Settings to keep

As in handoff 45:

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, effort high), at most two at once, with a watcher at 135k. Split lesson and chapter work into slices near 135k from the start.
- **Smoke:** `bezeg-smoke` (Haiku), or run the checks yourself.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 48" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own successor the same way and tells it to do the same.
