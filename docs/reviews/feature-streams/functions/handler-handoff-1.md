# Functions stream: handler handoff 1

Written 2026-10-31 by handler 1 (Opus 5.5, `--permission-mode auto`, `--effort medium`), past the 150k soft threshold.

## State

- Worktree `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete the junction before removing the worktree.
- On `master`: Run state `active`; F0 for family 1 ([tasks](../../../tasks/numerical-methods/README.md), ADR 0023) and family 2 ([tasks](../../../tasks/school-function-graphs/README.md), ADR 0026); the Euler task item-7 correction (below); this note.
- **On the stream branch only, not on master**: commit "feat: add root-finding, Simpson and Euler kernels". It is also pushed to `origin/stream-functions`. Its contents:
  - `src/analysis/rootFinding.ts` and its test (task 01): 16 tests pass and typecheck passes. Every mutation is caught except one equivalent mutant.
  - `src/analysis/quadrature.ts` and its test (task 02): 10 tests pass.
  - `src/analysis/odeEuler.ts` and its test (task 03): 14 tests pass.
  - `src/analysis/derivative.ts`: `ValueFunction`/`DerivableFunction` structural types widen `differenceQuotient`, `secantLine` and `tangentLine`. Behaviour is unchanged.

## Remaining to accept kernels 01–03 (next steps, in order)

1. Rebase the branch onto `origin/master`.
2. Run the full `just unit` once, and `just typecheck`. Both workers' full runs were load-blocked: one queued 1243 s for a slot and never finished. The machine was at 0.3 GB free and killed background watchers. Targeted runs passed.
3. Mathematical review of the three kernels: one `bezeg-reviewer` with Sonnet `medium`, scoped to formulas, termination rules and test non-vacuity.
4. Repair any findings, then push to `master`. Set tasks 01–03 to accepted in `docs/tasks/numerical-methods/README.md` and update the stream file line.

## Then

- Family 2 kernels 01 (catalogue core), then 02 (transformation and inverse), 03 (polynomial and rational) and 04 (series and conic). They are ungated. 02 and 03 depend on 01; 04 is independent and can run in parallel with 01.
- F0 for families 3 (projective conics) and 4 (Fourier series), then their kernels.
- `G-REG` and `G-FN` are still closed (Platform stream). When only gated work is left, set `Run state: waiting on G-FN, G-REG`, push, and end.

## Decisions and findings

- Euler task item 7 was wrong as written. The exact solution of \(y'=y^2\) blows up at 1, but Euler's polyline lags behind it and is finite at \(x=1\). The test therefore asserts `left-window` with bounded nodes for a far `xEnd`. The task file is corrected; the spec's N5 acceptance 3 still holds. When N5 prose is written, it must not claim that the polyline stops at 1.
- The secant `repeated-iterate` stop is a heuristic, documented in code.
- Spec digit counts vary: the tests round to the digits the spec shows.

## Risks for the owner

- **ADR number races across streams.** Master has duplicate numbers: 0021 (exact grid predicates; this stream's ADR was first pushed as 0021 and is now 0023), 0025 (two other streams), and 0026 (curves' interpolation ADR and this stream's school catalogue ADR). File names differ, so links work. Renumbering again only repeats the race. A convention such as a number range per stream would end it.
- Machine load: follow a6cd11a's limits. Run one heavy command per worktree, and use path-filtered runs with 2 workers.

## Settings to keep

Successor: `--agent claude --model opus --permission-mode auto --effort medium`. Workers: `bezeg-worker` Sonnet `medium`. Reviews: `bezeg-reviewer`. Smoke port 4315.
