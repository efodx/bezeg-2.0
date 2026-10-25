# Test consolidation handler handoff 3

- Branch `worktree-test-consolidation`, worktree `.claude/worktrees/test-consolidation`, own `node_modules`. Pushed to `origin/master` at the commit named in the closing line of handler 3's report (see `git log origin/master`).
- Source: [spec](../../specs/test-consolidation.md), [work queue](../../tasks/test-consolidation/README.md), evidence in [coverage.md](../../tasks/test-consolidation/coverage.md). Previous notes: [handoff 2](handler-handoff-2.md), [handoff 1](handler-handoff-1.md). Originally `/implement docs/tasks/test-consolidation/README.md`.

## Accepted work (this handler)

- `9bbfff7` (handler): browser `en: Exit` test gated by `EXIT_SAMPLE` (7 rows: linear-function, repeated-subdivision, farin, spline-c1, ph-cubic, decasteljau, bisection). ph-cubic user-state hook: selects the curve (mounts `#hodograph-input-box`), edits `w1 x` to 3.5 through the keyboard coordinate editor, checks the fixture controls replace the user curve in the lesson (the lesson clears the selection, so no child board exists then), the edited child board after Exit, and `{hodograph}` stable over rounds. The editor `<details>` is closed after Exit, so read inputs by CSS locator, not by role.
- `d3351a9` (Sonnet worker, task 4): chapter activity lifecycle sampled on curve-parameter and blending-coefficients; completeness test (handler mutation: removing a row fails it). Evidence: coverage.md "Task 4 chapter activities".
- Deletion commit after `d3351a9` (Sonnet worker, handler-reviewed): hooks removed from 38 rows, `symmetricSplineRow({exitHooks})` keeps them for spline-c1 only; header comment updated; mapping in coverage.md "Task 1 deletion mapping", residual differences reviewed by the handler. Includes `task2-inventory.md` and the README status.

## Remaining steps, in order

1. Task 2 ([02](../../tasks/test-consolidation/02-shared-lesson-interactions.md)). Start from [task2-inventory.md](../../tasks/test-consolidation/task2-inventory.md) (line numbers refer to `9bbfff7`; the guided file has since shrunk by ~600 lines, so re-locate by test name). Inventory findings: the per-row observation branch (unlock, 44 px tab, reopen identity, Next hit-test) runs on all 45 rows inside the sl walk; reduced motion has no owner (`GuidedLesson.tsx:107-108`, unit stubs only `matches: false`); touch has one owner (`lesson-graph-access.smoke.spec.cjs` Taylor). Decide the feature matrix (observation with edits, playback, long math, label overlap, child board), assign one owner per behavior, add the reduced-motion unit case, then remove mapped per-row interaction assertions while keeping frame reachability. Serial with task 3 on the same smoke file; a bounded worker slice is reasonable once the matrix is written into the task file or coverage.md.
2. Task 3 ([03](../../tasks/test-consolidation/03-lesson-content-traversal.md)).
3. Repeat baseline timing at a quiet checkpoint (unit suite including the four `lessonRestoration.part*` files, plus browser); final full unit and browser run; smoke-tester on retained representatives; code-review skill; update `docs/smoke-tests.md` (three-scenarios-per-lesson rule superseded only for accepted replacements); do-log records for the three workers of handler 3 (below); push.

## Worker records for do-log (handler 3)

- Deletion: `bezeg-worker` Sonnet 5.5 medium, handoff-v12, dispatched 15:24Z, returned ~15:28Z, 22 tool uses, 47.7k tokens; accepted after one handler fix (orphan comment in rational-elevation).
- Task 4: `bezeg-worker` Sonnet 5.5 medium, handoff-v12, dispatched 15:27Z, 13 tool uses, 32.4k tokens; accepted; handler added the completeness mutation check.
- Task 2 inventory: `bezeg-worker` Haiku 5.5 medium, read-only, handoff-v12, ~15:28Z; hit the 78k watcher, HANDOFF sent, returned a complete inventory (85k tokens, 33 tool uses).

## Checks and environment

- Production build in `dist` was rebuilt by the task 4 worker from a dirty tree with app code identical to `17a24da` (test-only changes). Run `just build` on a clean tree before final timing.
- `just smoke-built --port 4517 tests/guided-lessons.smoke.spec.cjs --reporter=list` on the deletion tree (revision `d3351a9` + uncommitted deletion, build from `9bbfff7` dirty, workers idle): 130 passed, 5.4 min wall (45 sl walks, 45 narrow walks, 7 `en: Exit`, shared and extras). Indicative timing only. `--list` before and after the deletion: 130 identical tests. 7 `en: Exit` passed separately; ph-cubic all 3 tests passed.
- Vitest console output is suppressed; diagnostics must write to a file. The spec files are CRLF in the working copy (LF in the repo); edit with the Edit tool or Python `newline=''` + `encoding='utf-8'`. `lesson-smoke-helpers` `settle` needs an open lesson.

## Open decisions and risks

- Unit-suite growth (~650 s summed) against removed browser `en: Exit` rows (~1245 s at baseline run 1): confirm the net at the final timing.
- Accepted gap: DOM readouts after restore are checked only on sampled rows.
- Settings: handler Opus 5.5, permission mode auto; workers `bezeg-worker` Sonnet 5.5 medium for implementation, Haiku 5.5 for research/narrow smoke. Handler self-watch: `python tools/agent-usage/claude_worker_watch.py --self --until 150000`.
