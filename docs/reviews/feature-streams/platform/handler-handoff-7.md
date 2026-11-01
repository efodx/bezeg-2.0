# Platform stream: handler handoff 7

Written 2026-11-01 by platform handler 7 at the 150k soft context threshold. Source: [platform stream tasks](../../../tasks/feature-streams/platform.md), step 4. Tasks: [A6](../../../tasks/architecture-deepening-backlog/06-curve-gesture-mathematics.md) and [A8](../../../tasks/architecture-deepening-backlog/08-function-graph-sharing.md). Previous: [handoff 6](handler-handoff-6.md).

## State

- **Location:** worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- **Pushed** to `origin/worktree-stream-platform-8`; not on `master`. Commits on top of `master` (`51e2e54b`):

| Commit | Content | Review |
|---|---|---|
| `a467c526` | A6 S1 gesture-transforms module | Sonnet: no blocking finding; adapter test gap fixed in `4b908534` |
| `47434ed2` | A8 S1 mathematics into `src/analysis` | Sonnet: no blocking finding; two lows fixed inside `a5910b23` |
| `4b908534` | adapter asserts rotation direction and resize refusal | handler; both assertions fail under a swapped-argument and a removed-guard mutation |
| `2d5b0a80` | A6 S2: direct model tests (18), `elevatedControlPoints` delegates to kernel `elevate` | handler: kernel uses the same formula in the same arithmetic order |
| `a5910b23` | A8 S2: shared `BoundingBox`, `FillCurve`, `displayThinWidth`, `signedFill`, `modelCache`; comment fix; view-change test | Sonnet: no blocking finding; two lows fixed in `d1162c43` |
| `d1162c43` | restore `memoView` docblock; `LinearMapGraph` uses shared `BoundingBox` | handler |
| (this commit) | perf scripts, raw measurements, this note | — |

- **A8 S3:** "no change". `alphaParameterization` is pure, exported, used once, and tested directly (inventory §7). Record it in the A8 task status at acceptance.
- **Behavior change (A8 S2):** Bisection's model-keyed history cache is now cleared on scene removal; before, it was never cleared. No user-visible impact expected.

## Checks run

- On `d1162c43`: `just typecheck`, `just lint src` (on `a5910b23`, plus lint of `src/graphs/functions src/graphs/linear` after `d1162c43`), and `just build` passed.
- Unit: A6 S2 worker ran `just unit src/bezeg/impl/curve src/graphs/curves` plus ElevationGraph and interpolationExamples; A8 S2 worker ran `just unit src/graphs/functions src/graphs/complex src/analysis src/graphs/base`; the handler ran `src/graphs/linear` and `BaseFunctionGraph.test.ts` after `d1162c43`.
- **Not run:** full `just check`, browser smoke.

## Measurement (raw output in [perf/](perf/))

New scripts `scripts/curve-gesture-perf.cjs` and `scripts/function-slider-perf.cjs`, written by a Sonnet worker and modelled on `playground-perf.cjs`. Before = production build of `51e2e54b`; after = production build of `d1162c43`. Same machine, Chromium (Playwright), mouse, port 4311, 3 runs per case. Other streams' test runs shared the machine, so load was not controlled.

- **Desktop 1440x900, no throttle:** every curve and function case has a median of 16.7 ms and a p95 of 16.7–16.8 ms, before and after. Vsync-locked, so it does not discriminate.
- **Curves at 390x844, 4x CPU, drag, p95:** bezier 33.4 → 33.4; rational 50.0 → 33.4; c2spline 50.1 → 50.0. No regression.
- **Rotation bug in the browser:** with `PERF_ROTATE_JITTER=0` (a pointer step exactly vertical over the centre), before: rational rotate makes every control point non-finite. After: all three rotate cases pass.
- **Functions at 390x844, 4x CPU, p95** (before → after → after rerun):

| Case | Before | After | After rerun |
|---|---|---|---|
| integral drag b | 50.0 | 50.0 | — |
| area-between drag b | 66.7 | 100.0 | 83.4 |
| accumulation drag x | 83.4 | 150.0 | 100.0 |
| darboux drag b | 50.0 | 50.1 | — |
| bisection clicks | 16.8 | 16.8 | — |

**Open risk:** area-between and accumulation p95 are one to four frames worse after. That is unresolved: it may be machine load (the before run was not repeated under the same load), or a real cost. Candidate cause: `modelCache` is now also cleared in `removeGeneratedObjects`. If those graphs regenerate objects during a drag, the accumulation fill would recompute where it previously hit the cache. Both are signed-fill and modelCache users.

## Next steps, in order

1. **Settle the function p95 question.**
   - Rebuild before (`git switch --detach 51e2e54b`; `just build`; `just preview 4311`) and after alternately. Run `PERF_CASE=accumulation` and `PERF_CASE=area-between` at least twice per build, interleaved, and compare.
   - The scripts are committed now, so they disappear when you detach at `51e2e54b`. Copy them outside the tree first (e.g. `$CLAUDE_JOB_DIR/tmp`), run the copies while detached, and pass `PREVIEW_BASE_URL` if needed. They `require('playwright')`, so run them with `NODE_PATH` set to the worktree's `node_modules`.
   - If the regression is real, check whether `removeGeneratedObjects` runs per drag step on those routes. If it does, drop the clear there and keep `unmount` and `disposeFigureScene`, then re-measure.
2. **Smoke-test** (`bezeg-smoke` Haiku, exact locators; the perf scripts' locators in `window.JXG.boards` work).
   - Curves: select, drag, resize and rotate on `/bezier/curve`, `/rational/base` and `/spline/c2spline`, with mouse and touch. Touch is not covered by the perf scripts.
   - Functions: integral, area-between, accumulation, Darboux and bisection. Check the fill follows a drag, Reset, preset restore, and a language switch.
3. **Run `just check`** (one at a time; memory is tight).
4. **Record evidence and accept A6 and A8.**
   - Put the measurement tables in `docs/bezier-performance-results.md`, and mention the new scripts in `docs/commands.md` next to `playground-perf.cjs`.
   - Accept A6 and A8 in their task files and in the backlog README (A8 S3 "no change").
   - Write the evaluation record (do-log), and set `G-CURVE` and `G-FN` open in `platform.md`.
5. **Push.** Fetch, rebase onto `origin/master`, recheck, and push `HEAD:master`.

## Delegation telemetry (this handler)

| Assignment | Dispatched | Tokens / tools / time | Outcome |
|---|---|---|---|
| A6 S1 review (Sonnet) | 10:34Z | ~22k / 4 / 0.4 min | no blocking finding; adapter test gap |
| A8 S1 review (Sonnet) | 10:34Z | ~30k / 5 / 0.5 min | no blocking finding; 2 lows |
| A6 S2 (Sonnet medium) | ~10:36Z | ~31k / 12 / 3.8 min | done, no repair |
| A8 S2 (Sonnet medium) | ~10:38Z | ~64k / 36 / 17.3 min | done, no repair |
| A8 S2 review (Sonnet, git-objects only) | ~10:56Z | ~31k / 7 / 0.6 min | no blocking finding; 2 lows, fixed |
| perf scripts + baseline (Sonnet medium) | ~11:16Z | ~67k / 36 / 25.9 min incl. one follow-up | scripts work; it reproduced the A6 NaN bug in the browser |

- **Test slot waits:** builds waited 20 min and 7 min for the single machine-wide slot held by other streams.
- **Read-only review while detached:** a reviewer restricted to `git show` worked while the checkout was detached for the baseline build.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto`.
- Workers: `bezeg-worker` Sonnet `medium`. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Haiku with exact locators. Ports 4311 and 4312.
- Memory is tight. Use path-filtered unit runs, and run one full `just check` at a time. If the reaper kills a job, ask the owner before restarting it.
- Never force-push. Push new backup branch names (`-9` next).
