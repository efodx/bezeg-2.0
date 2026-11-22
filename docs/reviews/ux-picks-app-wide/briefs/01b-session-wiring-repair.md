# Brief: finish the 01b session wiring (repair pass)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`. Do not commit. Context: the original brief `docs/reviews/ux-picks-app-wide/briefs/01b-session-wiring.md` (read it, its owned paths and rules hold). A first worker wired the adapter (uncommitted diff in `GraphSession.ts`, `BaseGraph.tsx` (getter is `boardView`), the three pilots, `GraphSession.test.ts`, new `viewAdapterWiring.test.tsx`); the last run of the brief's unit command had 73 failures in 15 files.

## Handler changes already made (do not redo)

- `viewAdapter.ts`: `setIntent(box, {keepAspectRatio, zoom})` where `zoom` is JSXGraph's `setZoom` mode (`"reset" | "update" | "keep"`), passed to `setBoundingBox` for that call only; new `following(work)`: a view that follows already-attributed scene state, not a write (same mechanism as `resizing`).
- The handler-owned helpers `realGraphScenes.ts` (~248) and `graphTransientStateContract.tsx` (~105) now wrap their direct view change in `runAs('learner', ...)`.

## Your repairs

1. Fit site in `BaseGraph.fitToVisiblePoints`: pass `zoom: "update"` and restore the `board.applyZoom()` call it had before (see `git diff src/graphs/base/BaseGraph.tsx`), so `SequenceGraph.test.ts` and `UniformConvergenceGraph.test.ts` Fit tests pass unchanged. If they assert `setBoundingBox(box, keep, 'update')` on a spy, they must pass as written.
2. `PhasePortraitGraph.applyView` (~441): wrap the `setIntent` in `this.boardView.following(() => ...)`. Find any other pilot site that is a key-gated sync after the host commit (`LinearMapGraph.refitView` ~934 when called from `syncSceneToModel`) and do the same; a site called inside a learner or lesson scope can stay as is, but `following` is right for any view derived from scene state.
3. The four `parameters.keys()` assertions now missing `"view"` (`TaylorGraph.host.test.tsx`, `LinearMapGraph.writes.test.tsx`, `FunctionTransformationGraph.writes.test.tsx`, `DecasteljauGraph.writes.test.tsx`): add `"view"`. You may edit these four test files for that assertion only.
4. Run the brief's unit command; fix what remains within the owned paths. A failure you can fix only by editing a handler-owned all-graph suite or helper, or by weakening an assertion: stop and report it with `file:line` and the error.
5. Then `npx tsc --noEmit --pretty false`, `just lint`, and `just check-changed` (foreground, timeout 600000).

## Return (at most 300 words)

Per repair: done or not, `file:line`. Final counts of the unit command and `check-changed`. Anything reported under 4. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01b-session-wiring.md`.
