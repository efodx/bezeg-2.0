# Platform stream: handler handoff 6

Written 2026-11-01 by platform handler 6 at the 150k soft context threshold (157.8k measured at 10:25Z). Source: [platform stream tasks](../../../tasks/feature-streams/platform.md), step 4. Tasks: [A6](../../../tasks/architecture-deepening-backlog/06-curve-gesture-mathematics.md) and [A8](../../../tasks/architecture-deepening-backlog/08-function-graph-sharing.md).

## State

- **Location:** worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- **On `master`:** step 3 is closed. A7 slice 2e plus A7 acceptance went in as `ef573684`, and the step 3 evaluation record as `51e2e54b`.
- **Committed on the branch, not on `master`, not reviewed.** These two commits are pushed to `origin/worktree-stream-platform-6`, with this note's commit on top:
  - `a467c526` A6 S1: `src/bezeg/impl/curve/gesture-transforms.ts`.
    - `rotationAngle` uses `atan2(cross, dot)` and returns 0 for a degenerate radius.
    - `resizeScale` returns `null` (step refused) for a non-finite or zero factor. A zero-extent axis keeps scale 1, and mirroring is kept.
    - `AbstractJXGPointControlledCurve.rotate/resize` call these. The stale `prefer-const` suppression is pruned.
  - `47434ed2` A8 S1: in `src/analysis`:
    - `accumulationFill` moved to `accumulation.ts`.
    - `sampleJumpPieces`, with the rename `jumpLeftLimit`, moved to `bisection.ts`.
    - New `gridUnits` in `numbers.ts`, used by `uniformConvergence.ts` and `BaseFunctionGraph.gridValue`.
    - Five local `clean` helpers now use `cleanNumber`.
    - `complex.ts` keeps its own `value*20` grid, which is not bit-identical to `value/0.05`.
- **Inventories:** [a6-inventory.md](a6-inventory.md) and [a8-inventory.md](a8-inventory.md), with each worker's slice plan.

## Checks run

- **Combined tree (both slices, content of `47434ed2`):** `just lint src`, `just typecheck`, and `just unit src/bezeg/impl/curve src/graphs/curves/object` passed.
- **A8 worker on the final tree:** `just unit src/analysis src/graphs/functions src/graphs/complex` passed.
- **A6 worker:** `just unit src/bezeg/impl/curve src/graphs/curves` passed. Legacy-formula transcriptions in the tests show the old failures: a NaN angle with the pointer vertically aligned, a 100° step that does not come out as 100°, and a non-finite scale for a zero-width box.
- **Not run:** build, the full suite, browser checks, and drag measurement.
- **Full suite on A7 (`4d5c50d7`):** one unrelated load timeout in `src/graphs/compgeo/InscribedAngleGraph.host.test.tsx` (122 s against 60 s). The file passed alone in 54 s. Expect it again when memory is short.

## Next steps, in order

1. **Review S1 of both tasks** with `bezeg-reviewer` Sonnet, telling each reviewer "do not run tests".
   - A6 S1: mathematical and engineering review of `a467c526`. Check that the angle sign matches the old slope formula for ordinary steps, and that the resize refusal semantics hold.
   - A8 S1: engineering review of `47434ed2`. Check the equivalence of the moved code and that the drawing comparisons are unchanged.
2. **A6 S2** (inventory slice 2):
   - Direct translate, scale and rotate tests on `abstract-point-controlled-curve.ts` for polynomial, rational, spline and 3D curves.
   - `AbstractJXGBezierCurve.elevatedControlPoints` (2D duplicate) delegates to the kernel `elevate`.
   - Keep `interpolationExamples.test.ts:328-345`.
3. **A8 S2** (inventory slice 2), file-disjoint from A6:
   - Export `BoundingBox` from the base and delete its 14 local copies. Delete the 4 local `FillCurve` copies, and use `displayThinWidth` where graphs hand-roll it.
   - Add a `signedFill` helper (Accumulation, Area, DefInt) and a base-cleared `modelCache` (5 graphs).
   - Fix the stale `setState` comment at `BaseFunctionGraph.tsx:19-21`.
   - Add a resize/zoom-at-unchanged-model test. Test-consolidation task 5 is repaired, so cache changes are safe.
   - Reject the thick-width and curve-creation wrappers.
4. **A8 S3:** `alphaParameterization` (`AlphaParamBezierCurveGraph.tsx`) is a curves file. Run it after A6, or record "no change": it is pure, exported, single-use and directly tested.
5. **Measurement and browser verification.** `performance-plan.md` requires before/after measurement.
   - A6: write a curve-gesture perf script, since `scripts/playground-perf.cjs` covers only the playground. Routes: `/bezier/curve`, `/rational/base`, `/spline/*`. Smoke select, drag, resize and rotate with mouse and touch.
   - A8: integral, area, accumulation, Darboux and bisection routes, with slider drags measured.
   - Then `just check`, then accept A6 and A8. Fetch, rebase onto `origin/master`, recheck, and push `HEAD:master`. That opens `G-CURVE` and `G-FN`; update the gates table in `platform.md`.

## Delegation telemetry (this handler)

| Worker | Dispatched | Tokens / tools / time | Outcome |
|---|---|---|---|
| A7 2e (Sonnet medium) | 09:12Z | ~101k / 60 / 10.9 min | done, no repair; the handler made two small edits |
| 2e review (Sonnet) | ~09:24Z | ~24k / 6 / 0.4 min | one low, fixed |
| A7 smoke (Haiku medium) | 09:46Z | ~27k / 12 / 1.7 min | 8/8 passed (locators and fixtures supplied) |
| A6 inventory (Sonnet medium) | 10:19Z | ~40k / 10 / 1.6 min | slice plan |
| A8 inventory (Sonnet medium) | 10:19Z | ~62k / 16 / 2.1 min | slice plan |
| A6 S1 (Sonnet medium) | ~10:21Z | ~26k / 11 / 3.9 min | done; typecheck and lint blocked only by A8's in-progress files |
| A8 S1 (Sonnet medium) | ~10:23Z | ~57k / 32 / 9.5 min | done; stale lint suppression from A6 left for the handler |

- **Memory pressure:** the reaper killed a rebased `just check` and three watchers. The owner then said "continue", and the rerun completed.
- **Parallel workers:** as in handoff 5, each saw the other's half-written files fail repo-wide checks. Running repo-wide checks only after both return worked.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto`.
- Workers: `bezeg-worker` Sonnet `medium`. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Haiku with exact locators. Ports 4311 (4312 for a second preview).
- Memory is tight. Use path-filtered unit runs, and run one full `just check` at a time. If the reaper kills a job, ask the owner before restarting it.
- Never force-push. `origin/worktree-stream-platform-5` holds pre-rebase history, so push new branch names rather than force.
