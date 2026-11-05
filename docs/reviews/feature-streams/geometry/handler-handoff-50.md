# Geometry stream: handler handoff 50

Written 2026-11-05 by handler 50 (Opus 5.5, auto, effort medium). Continues [handoff 49](handler-handoff-49.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watcher passed the 175k soft threshold after task 21's section.

## Done this run

1. **Hosted CI for 03152bfd:** run 41939499517 was cancelled by `cancel-in-progress` after newer pushes (only `unit (1)` was cut off; that rolled the `smoke` job up to failure; build, `unit (2)` and all chromium shards had passed). Run 41941098734 on `ed0b37d9`, which contains it, succeeded.
2. **Actions for 21 and 22** (workers 21a and 22a, in parallel). Point in polygon: `set-polygon {polygon}`, `set-query-point` (whole grid steps; `null` is the figure's default), `ray` and `winding` in `POINT_SET_OVERLAY_NAMES`. Hull robustness: `set-mode` `chain`/`kettner`, `set-pop-rule {rule: 'non-left'|'right'}`, `set-duplicates {duplicates: 'merge'|'keep'}`, `select-cell {i, j}`. Every hull edit pauses and resets to step 0.
3. **Review of the actions:** one real defect, repaired by the handler with an observed pre-fix failure (14.06 against 11.25): returning from Kettner re-fitted the saved chain box and zoomed out about 1.25x each round trip. The saved box now returns exactly. Coverage gap: no host test does `captureState`/`restoreState` for these actions; 21b covers scene restore for A3, and brief 22b asks for it for hull robustness.
4. **Task 21 accepted:** lesson A3 (worker 21b). `just smoke-lesson point-in-polygon` passes.
5. **The A3 section of task 23 moved into 21.** An interim `guidedLessonOwners` entry passes every unit test but gives the lesson no launch path: chapter-owned lessons open through the section registry, and the panel never appeared in the browser. Only the smoke showed this.
6. **Rebase unions:** `bspline-blossom` (master's new lesson) plus `point-in-polygon` in `lessonMathNotation.test.ts` and `LESSONS`; the no-lesson list is now `['hull-robustness']`. Git merged the counts in `guidedExamplePreviewCopy.test.ts` silently: both sides had 107 and 114, and the union is 108 and 115.

## Branch state

Local `stream-geometry` = origin/master + the 21/22 commits + this note. **If this note is on origin/master, the push gate passed.** If not, rerun the gate from handoff 49, fetch, rebase and push. Gate at `aecad2d4`: tsc 0, build passed, lesson smoke passed, focused units in `docs/reviews/convexity-hulls/50-push1-unit.log`.

## Next steps, exactly

1. Confirm hosted CI for this push (`gh run list --branch master`). A cancelled run is normal when a newer push follows; check that a descendant run succeeded.
2. **Task 22: dispatch [brief 22b](../../convexity-hulls/22b-brief.md) as written.** It is ready, and includes the A5 chapter section (registry, section with a `formula`, owner, `CHAPTER_LINK_PENDING`, `SECTIONS`, the "next four sections" sentence). It may exceed 30 turns: 21b took 74 tool uses, so split off the section if the worker reports partial. Expect `guidedExamplePreviewCopy.test.ts` to go to 109 and 116, `authoredChapterCoverage.test.ts` to 123, and the no-lesson list to `[]`. Run `just smoke-lesson hull-robustness` before accepting.
3. **Task 23:** what remains is the chapter smoke at 1440×900 and 390×844 in SL and EN, including focus return from both lessons. The sections themselves land with 21 and 22.
4. **F5:** Curves captured `point-in-polygon` and `hull-robustness` jointly (`36df707e`), and `POSTER_PENDING` is empty. Only the F5 visual comparison remains (a Haiku review of the two catalog posters). They were captured before these lessons existed; recapture only if the review finds a fault.
5. **Batch 2 F6:** criterion-to-test matrix, bilingual smoke and `just check`.
6. **Worktree and branch cleanup needs the owner.** `origin/geometry-batch2-wip` can be deleted with permission. The other lists are in handoffs 40, 41, 43 and 44, plus `origin/geometry-fortune-lesson-wip` and `origin/geometry-fortune-chapter-wip`. Ask before acting.

## Risks and lessons

- A lesson needs its chapter section to open at all. Never use an interim owner; smoke before calling a lesson slice accepted.
- `bash` heredocs and inline Python can lose a backslash on the way through this tool, so lesson prose written that way lost its delimiters. Write such text with the Write tool, or build backslashes with `chr(92)`.
- Rebase unions on comma lists: check the ends of the lists by eye after resolving.
- Master moves every few minutes. Rebase right before the push.

## Live processes

The 215k self-watcher, which ends with this session. No preview is running.

## Settings to keep

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, high), reviews `bezeg-reviewer` (Sonnet), smoke `bezeg-smoke` (Sonnet). At most two at once, each with a 135k watcher.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 52" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own the same way and tells it to do the same.
