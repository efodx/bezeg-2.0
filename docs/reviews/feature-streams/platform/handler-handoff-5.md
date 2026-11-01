# Platform stream: handler handoff 5

Written 2026-11-01 by platform handler 5 at the 150k soft context threshold, after A7 slices 2b–2d. Source: [platform stream tasks](../../../tasks/feature-streams/platform.md), step 3; A7 task [07-function-model-rules.md](../../../tasks/architecture-deepening-backlog/07-function-model-rules.md); evidence in [07-function-model-rules.evidence.md](../../../tasks/architecture-deepening-backlog/07-function-model-rules.evidence.md) (sections "Slice 2b", "Slice 2c", "Slice 2d", "Slice 2e decision").

## State

- Worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- `master` has not changed from this stream since `27dc4f7a`. `origin/master` was 3 commits ahead at 08:16Z (maps docs, notable points graph, linear maps chapter; the last two touch `sl.ts`/`en.ts`).
- **Committed, not on `master`**, pushed to `origin/worktree-stream-platform-5` (this note's commit included):
  - `f9b40c0d` slice 2a (lazy `DomainError`/lesson error text; handoff 4)
  - `86400a36` slice 2b: Bisection, MeanValue, Accumulation, Darboux; `cleanNoise` moved to `analysis/numbers.ts`
  - `3c31e813` slice 2c: Extrema, Sequence, Taylor
  - `3c382657` slice 2d: UniformConvergence, FixedPoint, Complex multiplication/reciprocal/roots; records the slice 2e decision
- Working tree clean after this note.

## Checks run

- 2b final tree (`86400a36` content): `just typecheck`, `just lint src`, `just unit src/analysis src/graphs/functions src/localization` passed.
- 2c: typecheck and lint passed; the handler's unit run was killed by OS memory pressure. Unit evidence on the final tree: the reviewer's (non-`just`) `npx vitest run src/graphs/functions src/analysis`, 2065/2065, plus workers' filtered runs.
- 2d final tree (`3c382657` content): `just typecheck`, `just lint src`, `just unit src/analysis src/graphs/functions src/graphs/complex` passed.
- Not run on 2a–2d: `just check` (full suite + build) and any browser check. Both are required at A7 verification.
- Each slice had a `bezeg-reviewer` Sonnet engineering + localization review: no high/medium findings. Deferred lows: duplicated identical keys (`*_example_rejected`, `*_endpoint_range_rejected` could become shared keys); complex hint texts hard-code their ranges (pre-existing).

## Next steps, in order

1. **Slice 2e.** Brief: [a7-2e-brief.md](a7-2e-brief.md) (decision in the evidence file's "Slice 2e decision"). One `bezeg-worker` Sonnet `medium`: localize the setter throws in Linear, Exponential, Trigonometric, Continuity, Derivative, DefiniteIntegral, AreaBetweenCurves, ArcLength and `IterativeFunctionGraph.tsx:82` `cannotAdvanceMessage` (shared by Bisection, Sequence, FixedPoint) with shared parametrized keys; investigate LinearMap reachability without editing. Rewrite the brief's log paths (`.claude/jobs/93b64843/tmp`) to your own job tmp directory and set HEAD in the prompt. Then decide LinearMap from the worker's findings and record it. Review with `bezeg-reviewer` Sonnet.
2. **A7 verification** (unchanged from handoff 4): `just check`, then a browser check of invalid input and Preset import on two function routes in both languages, `bezeg-smoke` Haiku with exact locators: hints `p.number-input-hint[role=status]`; import modal from "Uvozi prednastavitve"/"Import presets" behind "Shrani"/"Save", `#preset-import-file`, `.modal [role=alert]`. Build invalid files from `functionPresetCollections.test.ts` fixtures (the empty export `{}` is not a valid fixture). Note that the old function graphs' field hints are the generic `number_rejected_hint`; setter texts are visible only through lesson errors (unit-tested). Then accept A7, fetch, rebase onto `origin/master` (expect `sl.ts`/`en.ts` adjacency only; stop on conflict), recheck, push `HEAD:master`.
3. Evaluation record for step 3 (telemetry below plus handoffs 3 and 4), then step 4: A6 ∥ A8.

## Delegation telemetry (this handler)

| Worker | Dispatched | Tokens / tools / time | Outcome |
|---|---|---|---|
| 2b Bisection+Darboux (Sonnet medium) | 08:16Z | ~102k / 43 / 8.3 min | done, no repair |
| 2b MeanValue+Accumulation | 08:16Z | ~80k / 36 / 6.9 min | done, no repair |
| 2b review (Sonnet) | ~08:26Z | ~39k / 12 / 0.8 min | no defects |
| 2c Extrema+Sequence | 08:30Z | ~113k / 61 / 19.8 min | done, no repair |
| 2c Taylor | 08:30Z | ~63k / 22 / 4.5 min | done; handler fixed one Slovenian string |
| 2c review (Sonnet) | ~08:50Z | ~39k / 8 / 2 min | no defects; ran bare `npx vitest` against the rules |
| 2d UniformConvergence+FixedPoint | 08:55Z | ~113k / 52 / 10.7 min | done, no repair |
| 2d Complex (3 graphs) | 08:55Z | ~120k / 58 / 11.9 min | done, no repair |
| 2d review (Sonnet) | ~09:08Z | ~44k / 12 / 0.7 min | two lows, deferred |

- Lessons: two parallel workers with exclusive `diagnoseX` blocks and "re-read before Edit" in shared `sl.ts`/`en.ts`/collection worked without conflicts; while both ran, each saw the other's half-written files fail typecheck/lint, so tell workers to ignore failures in files they don't own. Tell reviewers "do not run tests" explicitly (the 2d brief did, and it held). Memory pressure killed background watchers and a unit run once (owner approved continuing at ~08:53Z).

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto`.
- Workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Haiku. Ports 4311 (4312 second preview).
- Memory is tight: one heavy job at a time, path-filtered unit runs in workers. If a run is killed again, ask the owner before restarting.
- Never force-push.
