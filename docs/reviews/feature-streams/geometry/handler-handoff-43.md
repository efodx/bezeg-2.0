# Geometry stream: handler handoff 43

Written 2026-11-03 by handler 43 (Opus 5.5, auto, effort medium). Continues [handoff 42](handler-handoff-42.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run

1. **Handoff 42 step 1.** `3f33ce7f` is on `origin/master`. Its own CI run was cancelled by later pushes, but the runs for `c2a6018b` and `4e7892a9`, which contain it, are green.
2. **T3 F6 accepted** ([record](f6-t3-acceptance.md)). This closed Gate 3 (projection readability at 1280×720).
   - Captures `f6-t3-smoke/g3-*.png`, all viewed. With the card hidden ("Skrij") the frames are legible. Dragging the card and presentation mode still leave it over the board centre; that layout went to learn-ui.
   - **Defect found and fixed:** on every diagram frame of both T3 lessons, the "continues" markers were all outside the visible board. The cause was `VoronoiGraph.visibleBox()` rounding the view outward.
   - Fix `36c4071e`: round inward after a 16 px inset. A Sonnet worker made it, with a mutation-checked host test. The handler moved the inset constant above the class JSDoc in `2bd25087`.
   - Production recheck: all markers are inside the board on every frame (`f6-t3-smoke/g3w-after.log`).
3. **Shared-runtime findings sent to learn-ui:** a "Notes from other streams" section in `docs/tasks/feature-streams/learn-ui.md` covering Next focus (`GuidedLesson.tsx:323`), exit focus, and the card layout at 1280×720.
4. **S3 planned:** task files 22–26 in `docs/tasks/sweep-algorithms/`, with the README's Batch S3 table.
5. **Task 22 (Fortune kernel), partial.** A Sonnet worker at high effort ran out of budget. Its WIP `65463ba1` is on `origin/geometry-fortune-kernel-wip` and on the local branch `worktree-agent-a4439a1de43c1003c` (worktree `.claude/worktrees/agent-a4439a1de43c1003c`). Its own note is `docs/reviews/sweep-algorithms/22-handoff.md` on that branch.
   - **Observed:** 23 tests passed and 1 skipped; tsc clean. 300 general-position random sets plus 500 degenerate small-grid sets equal the Delaunay dual.
   - **Root selection:** the breakpoint is the root where \(D=y_i-y_j\) changes from negative to positive. No combinatorial fallback was needed.
   - **Tie rule:** when a site is a circle's lowest point, the circle event goes first.
   - **Open:**
     - the four mutations of the task;
     - lint (eslint was missing in the worker's worktree);
     - the skipped "doubles differ" search;
     - the `22-random.log` the test comment cites;
     - the cancel assertion, which covers only sets without four cocircular sites;
     - the argued skip of the \((i,s,j)\) triple after a hit;
     - the mathematical review.

## Branch state

Branch `stream-geometry`. All of this run's commits are on `origin/master` (`4e7892a9..0238913e`, pushed as a fast-forward; this correction follows).

The full `just check` at `8595dfb7` (`43-check.log`) failed only `guidedExamplePreviews.test.ts:261` (fourier-series card), and that was a stale Vitest transform cache. Functions handler 31 diagnosed it.
- After deleting `node_modules/.vite/vitest` and `node_modules/.vitest-cache`, the test passes 8/8 (`43-previews2.log`).
- The rebase onto `4e7892a9` brought in two docs files only.

`origin/stream-geometry` is stale, from before the rebase; it was not force-pushed. Master is the reference.

## Next steps, exactly

1. Check that hosted CI for the latest master run containing `0238913e` is green; if it is red, read the failure first. Then add the run to the stream row. If a unit test fails only on an import.meta.glob result, clear the Vitest caches above and rerun it before calling it a regression.
2. **Finish task 22** from `geometry-fortune-kernel-wip`.
   - Run the four mutations, lint, `22-random.log`, the double search (or record that none exists within the limits), and the cancel assertion for cocircular sets.
   - Then a mathematical review (`bezeg-reviewer`), focused on the root-selection proof, the tie rule, and merging cocircular events.
   - Cherry-pick the accepted commits onto `stream-geometry`, minus its copy of the task docs, which is already there as `c7ce4822`.
3. Then task 23. Measure the beach line first, as the task file says.
4. Worktree cleanup still needs the owner, who has refused `--force`/`-D` before. Ask before acting. The list is in handoffs 40 and 41. New this run: `agent-a2cb92ec239e0a795` (the marker fix, cherry-picked) and `agent-a4439a1de43c1003c` (kernel WIP, keep it).

## Risks and lessons

- Lesson scenes always change the board view, so any view-dependent drawing must be checked inside a lesson, not only on the plain route. The F6 smoke missed the markers because the card hid them.
- `bezeg-worker` on the Fortune kernel used 150k tokens in about 32 tool calls. The rest of task 22 fits one more worker. Give it the WIP branch and the 22-handoff note.
- Never chain `git rebase` with a test run.

## Live processes

None. The previews were stopped, and both workers returned.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), `isolation: worktree`, at most two at once, watcher at 135k. Use effort high for exact kernels. Reviews: `bezeg-reviewer`. Smoke: `bezeg-smoke`.
- Successor launch, from the stream worktree: `claude --bg -n "geometry handler 45" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor starts its own successor the same way and tells it to do the same.
