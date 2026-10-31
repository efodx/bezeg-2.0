# Maps stream: handler handoff 1

Written 2026-10-31 by handler 1 (Opus 5.5, permission mode `auto`, effort `medium`) at its 150k soft threshold.

## State

- Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`, rebased on `origin/master` (includes `a6cd11a`, the test-load fix). `node_modules` is a **junction** to the main checkout: delete the junction before removing the worktree.
- `Run state: active` on master (`3af8ea7`).
- On master: linear maps F0 (`e13e703`, ADR 0025) and complex maps F0 (`7e63a2d`, renumbered to ADR 0029 in `dd95074`).
- **Not on master yet:** linear maps task 01 (matrix kernel) is committed on the stream branch and pushed to `origin/worktree-stream-maps` only. Its full `just unit` run was stopped by low-memory reaping before it produced a result. **First step for handler 2:** run the full suite once (`just unit`, expect a queue), and if it passes, rebase and `git push origin HEAD:master`. Then set task 01 to `done` in `docs/tasks/linear-maps/README.md` and in the stream file.

## Accepted

- **Linear maps F0:** `docs/tasks/linear-maps/` (tasks 01–09, term table), ADR 0025 (one mode-based `LinearMapGraph`, quarter-grid entries in [−4, 4]). Spec decisions 3 (eigen predicate) and 4 (grid drawing) are deferred to tasks 08 and 04.
- **Complex maps F0:** `docs/tasks/complex-maps/` (tasks 01–07, term table), ADR 0029 (new `maps` family *Preslikave ravnine / Maps of the plane* for linear and complex maps; a graph per lesson until Batch C; 0.05 operand grid). It revises ADR 0025's placement from `basics` to `maps`. Image-drawing ADR deferred to Batch B/C measurement.
- **Linear maps 01 (matrix kernel):** `src/linear/matrix2.ts`, `gridImage.ts` and tests. 20 tests pass (`just unit src/linear`), typecheck passes, and there is mutation evidence for all six groups. The handler reviewed the mathematics (no separate review worker was run, because the soft threshold had been reached). API notes for later tasks: `Mat2` is row-major `[[a,b],[c,d]]`, so the columns are the images of e₁, e₂. `snapMatrixEntry` clamps to [−4, 4] and throws on non-finite input, so task 03's import path must reject rather than snap. `multiply`/`apply` may return `-0`; tests normalise it.

## Next steps, in order

1. Family 3 (triangle geometry) F0. Its kernel needs `G-CG`: check `docs/tasks/feature-streams/geometry.md` on `origin/master`. F0 itself is ungated.
2. Dispatch two workers in parallel, both ungated: linear maps **02** (eigen/singular kernel, Sonnet `medium`) and complex maps **01** (Möbius kernel, Sonnet `high`). Then linear **03** (state model), **04** (grid drawing measurement + ADR), complex **02**, complex **05** (sampler).
3. Then linear 05 and complex 03 (graphs, F2a). Everything from F2b on waits for `G-REG` (`docs/tasks/feature-streams/platform.md`). When only gated work remains, set `Run state: waiting on G-REG` (add `G-CG` if family 3 is stuck too), push, and end without polling.

## Risks and lessons

- **ADR number races:** two parallel streams claimed the same ADR number three times today. Check `git ls-tree origin/master docs/adr/` **after** the final fetch/rebase and immediately before pushing. Grep for the exact number: a count of `1` means it is taken.
- **The worker budget watcher failed** with "no transcript for this agent id" for a worker launched from this worktree session, so worker budgets were unmonitored. Rely on the brief's 30-turn rule and report the gap; check whether `claude_worker_watch.py` looks under the worktree's project folder.
- **Machine load:** heavy runs waited about 20 minutes for a slot. After `a6cd11a` the machine has 1 shared slot. Use path-filtered `just unit <path> --maxWorkers=2` while iterating, run the full suite once per slice, and treat timeouts under load as starvation.
- At about 16:30 UTC, Claude Code reaped this session's background watchers (the 215k self watcher and a log wait) because memory was critically low. Background `until` loops and watchers may die under load.
- The sandbox refuses `sed` or `xargs` with computed file arguments (`$f`, `xargs`). Spell paths out, or use Edit.

## Settings to keep

Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium` (`high` for Möbius and robust predicates); reviews `bezeg-reviewer`; smoke `bezeg-smoke` on port 4316.
