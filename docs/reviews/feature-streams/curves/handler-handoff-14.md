# Curves stream: handler handoff 14

Handler 12 wrote this on 2026-11-01. It supersedes [handoff 13](handler-handoff-13.md). It stopped on a rebase conflict, as AGENTS.md requires. No agents and no preview are running. Settings are unchanged: handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet.

## CG-B1-3 (L1, L2 guided lessons): done, not on master

The branch is `stream-curves-cg-b1-3-v2` on origin (local `worktree-stream-curves`), based on `594510c9`:

| Commit | Content |
| --- | --- |
| `85da034e`, `379b895f` | The L1/L2 lessons and the review comment fix, rebased from handoff 13 |
| `09ef1a32` | Fixes for handoff 13's smoke failures (worker CG-B1-3c; handler review, one test, one comment fix) |
| next two | The task status and this note |

Root causes fixed in `09ef1a32`:
- **Curvature step 2 readout:** the lesson scene resets and then sets `t=1` in one batch. The overlay read `t=0.5` mid-batch, and `onStateChange` saw no change from the previous `t=1`, so it did not redraw. `CurvatureBezierCurveGraph` now records what the overlay last read and redraws when that differs from the state.
- **Readout line breaks:** the board text joins its lines with `<br>`; `readoutText()` stays plaintext. The smoke probes now end numbers with `(?![.,]?\d)` instead of `\b`.
- **Parametric at 390 px:** `setBoundingBox(box, true)` cropped the cycloid's width. The new `widenToCanvas` widens the box to the canvas aspect before fitting. This applies to every parametric view, not only lessons.

Checks at `379b895f` plus the uncommitted fix (the same content as `09ef1a32`):
- `just unit` on the curvature graph tests and `src/graphs/curves/parametric` passed.
- The worker's run of `just unit src/graphs/curves/parametric src/graphs/curves/bezier src/learning` passed, before the comment and test edits.
- Mutation: removing `stale ||` fails the new redraw test (1 failed, 23 passed). Reverting the `<br>` join fails the board-text test (the worker's run).
- `just typecheck` passed, and eslint passed on the bezier and parametric directories and the smoke spec.
- `SMOKE_PORT=4314 just smoke-lesson curve-parametric curve-curvature` passed on the final build (sl and en, including 390×844).
- Production preview at 1366×768: the live SL→EN switch updates the readout, which keeps three lines (90 px) in both languages.

## Stop: rebase conflict

`git rebase origin/master` (at `363e6c32`) conflicts on `85da034e` in:
- `src/learning/runtime/lessonCatalog.test.ts`
- `tests/guided-lessons.smoke.spec.cjs`

Both are shared catalogues, where the complex maps lessons (`caa51161`) added entries next to ours. The conflict looks additive (keep both sides), but resolving it needs the owner's go-ahead. After resolving: rerun the focused unit tests (`src/learning src/graphs/curves`), typecheck, the build, and `smoke-lesson curve-parametric curve-curvature`. Then push as a fast-forward to master.

## Next steps
1. Resolve the conflict above (after the owner approves), verify, push CG-B1-3 to master.
2. `3887af39` on master opens **G-CURVE and G-FN**. This unblocks the B-spline graphs (family 2), the I2/I4 graphs (family 3), and family 4's graphs. Read that commit's gate notes before planning them.
3. The remaining F3 lessons, one worker per lesson: I1, I3, I5, D4 `patch-coons` (claims are in handoffs 6 and 7). Each F4 chapter slice removes its pending entry (handoff 13).
4. Deferred low findings from handoff 13 (overlay `visible()` test, roll animation frame and unmount test, weak parametric probe) remain open.

## Evaluation record (not yet logged with `do-log`)
- Worker CG-B1-3c, Sonnet medium, brief handoff-v12: finished, 89k tokens, 98 tools, about 53 min including test-slot waits. It found the real root cause of failure 2 (the stale redraw), not a probe problem. Gaps: no test for the redraw fix, and it displaced a doc comment. The handler fixed both.
- Low memory killed background commands once; a unit run then waited 20 min at the memory gate.
