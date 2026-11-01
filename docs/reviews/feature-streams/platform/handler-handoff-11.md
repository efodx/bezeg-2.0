# Platform stream: handler handoff 11

Written 2026-11-01 23:40Z by platform handler 11 near the 150k soft context threshold. Source: [platform stream tasks](../../../tasks/feature-streams/platform.md), step 6. Task: [A3](../../../tasks/architecture-deepening-backlog/03-scene-replacement-path.md). Previous: [handoff 10](handler-handoff-10.md).

## State

- **Location:** worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`, rebased onto `origin/master` `ffa32040` at 21:15Z. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- **All A3 code slices are done, branch only, not on `master`:**

| Commit | Content | Review |
|---|---|---|
| `3be2da56` | S1 contract test, sweep seam | handler 10 |
| `df2c468b` | S2 `SceneReplacement.ts`, every entry through `replaceScene` | two Sonnet reviewers (ordering/contracts; disposal) |
| `2dc2707d` | S2 repair: checkpoint without `data` disposes nothing (both reviewers; unreachable today, tested, mutation-checked); a disposing plan batches the board again; two fake-board fixtures | handler |
| `8c09fe79` | S3a family teardown: projective `removeDrawn`, PointSet pending/overlay, inscribed angle and notable points chip, function graphs own ancestor helper points (handler narrowed the worker's "own every created object" to ancestors of registered objects). Registry-wide zero-sweep case, 69 families | handler |
| `448321eb` | S3b: Hermite/Interpolation/Parametric tear down once (was 3 `removeScene` per reload); Parametric rebuilds when state names another curve (handler addition, hand-written Presets without graph state); PH remount guard, `it.fails` cases flipped; sweep dev warning | handler |
| `0fa716b9` | S4: sweep removed; JSXGraph infrastructure reads only in `src/graphs/base/BoardInfrastructure.ts` (test-only caller); leak test = no pre-replacement scene object survives + stable count; mutation (cross ratio without `removeDrawn`) fails with 43 kept | handler diff check only |
| (this commit) | this note, status line | — |

- Backup: `origin/worktree-stream-platform-18` (`0fa716b9`). Push this commit to `-19`.

## Checks run

- At S2+repair (`2dc2707d` area): `just unit` over all of `src/graphs` in chunks, `src/learning/runtime` + `sceneContentAgainstGraphs`, typecheck, lint, `just build` — passed.
- S3a: base/projective/compgeo, functions (after handler's narrowing), typecheck, lint — passed.
- S3b: base, curves, learning runtime, typecheck, lint (worker); parametric + contract after handler change — passed.
- S4 (worker): base+curves, functions/projective/compgeo/patches/linear/complex/bernstein, learning runtime, typecheck, lint — passed.
- **Not run on `0fa716b9`:** full `just unit` (incl. `src/learning` content, presets, Routes, Demonstrations), `just build`, any browser check.

## Next steps, in order

1. Start the self watcher. Fetch and rebase onto `origin/master`.
2. Push gate: `just unit` in foreground chunks under 10 min (`src/graphs` as two chunks, `src/learning` split, remaining dirs), `just typecheck`, `just build`.
3. Optional short engineering review of `0fa716b9` + `448321eb` (Sonnet `bezeg-reviewer`): initialize-skip risk in Hermite/Interpolation/Parametric (a future caller expecting `initialize` to rebuild), PH controls hidden until a curve exists.
4. Full browser checklist ([docs/smoke-tests.md](../../../smoke-tests.md)) via `bezeg-smoke`: curve, spline, PH, function routes with Preset reload, figure batch and lesson exit; also projective cross ratio/Pascal/pole-polar and a compgeo point set reload (teardown changed there); PH remount (navigate away and back after editing). Check the dev console for the absence of errors.
5. Accept A3: evidence file `docs/tasks/architecture-deepening-backlog/03-scene-replacement-path.evidence.md` (inventory differences kept and why: see `SceneReplacement.ts` header; sweep counts before/after from the `8c09fe79` message), task status, backlog README row 3, platform.md step 6, update stale names (`sweepSceneBoardObjects`, `boardInfrastructureObjectClosure`, `finishSceneReplacement`) in `docs/specs/architecture-deepening-backlog.md` §3 and the A3 task file if they describe current behavior, and architecture docs if they describe the sweep. Do-log entries (telemetry below). Push to `master` as a fast-forward.
6. Step 6 is the last platform queue step: after A3, set the stream's run state and report to the owner.

## Delegation telemetry (this handler)

| Assignment | Dispatched | Tokens / tools / time | Outcome |
|---|---|---|---|
| S2 engineering review (`bezeg-reviewer` Sonnet) | 21:16Z | 29k / 8 / 0.7 min | 1 medium (checkpoint dispose), 1 low (unbatched disposal), test-strength notes |
| S2 disposal review (`bezeg-reviewer` Sonnet) | 21:16Z | 46k / 17 / 1.4 min | same checkpoint finding (low, unreachable); no misses |
| S3a (`bezeg-worker` Sonnet) | 21:58Z | 60k / 41 / 27 min | done; handler narrowed function helper ownership |
| S3b (`bezeg-worker` Sonnet) | ~22:27Z | 48k / 30 / 31 min | done; handler added Parametric curve-mismatch rebuild |
| S4 (`bezeg-worker` Sonnet) | ~23:00Z | 50k / 30 / 36 min | done; restore left a CRLF-only change (handler reverted) |

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto --effort medium`.
- Workers: `bezeg-worker` Sonnet `medium`, one at a time. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Haiku with exact locators; preset controls sit behind the "Shrani" tab, which hides the curve picker, and PH routes start with no saved Preset. Port 4311.
- Workers' mutation restores can change line endings: check `git diff --stat` before staging.
- Next backup branch name: `-20` after `-19`.
