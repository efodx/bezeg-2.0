# Curves stream: handler handoff 3

Written 2026-10-31 by handler 3 at its 150k soft threshold, after all of its agents had returned. Settings to keep:
- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet `medium` (`high` for difficult kernels).
- Mathematical reviews: `bezeg-reviewer` Sonnet.

## State

- Worktree `.claude/worktrees/stream-curves`, branch `worktree-stream-curves`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- `master` holds everything through `1e113a7`, which includes the three AB kernels. The local commits `f216e5c` (PS-1c, **not yet reviewed**) and `6b1e957` (evaluation log) are pushed only to `origin/stream-curves-3` as a backup. Do not push PS-1c to `master` before its review.
- Machine load: run path-filtered `just unit <paths> --maxWorkers=2`, one run at a time.

## Accepted this session

| Slice | Commits | Evidence | Notes |
| --- | --- | --- | --- |
| PS convention decision | `677c8df` (rebased) | [ADR 0027](../../../adr/0027-probability-demonstration-family.md) decision 4 | Inclusive median-of-halves quartiles and population σ by default, from RIC/ZRSS sources; spec P4 numbers amended (fences 2.75 and 8.75) |
| AB-1a `degree-reduction.ts` | on master | [ab-1a](../../advanced-bezier/ab-1a-kernel.md) | Handler repair: extent-relative reducibility tolerance |
| AB-1b `arc-length.ts` | on master | [ab-1b](../../advanced-bezier/ab-1b-kernel.md) | Spec D3 chord minima corrected; deferred: the D3 graph splits Gauss panels at cusp parameters |
| AB-1c `coons.ts` | on master | [ab-1c](../../advanced-bezier/ab-1c-kernel.md) | Worker repair: B averages mismatched corners; extent-relative corner check |

## Next steps, in order

1. **PS-1c mathematical review** (`bezeg-reviewer` Sonnet) of `src/analysis/descriptiveStatistics.ts` and `correlation.ts`, with evidence in [ps-1c-kernel.md](../../probability-statistics/ps-1c-kernel.md). Check the quarter-tenth fence arithmetic, the inclusive/exclusive rules against ADR 0027 decision 4, the exact integer σ numerator, and the use of `fitLine`. Note that `nSxy` is in tenths² units: 1800 for the default, where the spec's 18 is in data units. After that, write the disposition, set the PS-1c task row to done, and push.
2. **PS-1b** `convolution.ts` plus its representation measurement and an ADR (ADR 0027 decision 2). The highest ADR on master is now 0030; check `git ls-tree --name-only origin/master docs/adr/` after the final rebase.
3. **Ungated F2a graph code:** CG-B1-2a and CG-B1-2a' (read ADR 0022 and the gate reading in the curve-geometry README first); the I1, I3 and I5 graphs; the AB-C F2a Coons graph on `BaseSurfaceGraph` (ADR 0028 item 3; the net feeds `TensorProductBezierPatch` directly). These need engineering review and focused browser checks on port 4314.
4. Gated work as in [handoff 2](handler-handoff-2.md) step 4. Also, AB-A (D1/D3 graphs) waits for `G-CURVE`.

## Consumer rules added this session

- The D1 readout shows maximum error with at most 4–5 decimals, since it is sampled with 2000 intervals.
- The D3 readout must not over-claim digits near a cusp, and the graph shows the cusp status.
- The D4 graph shows `coonsCornerCheck` and refuses to claim interpolation at mismatched corners.
- The P4/P5 UI snaps values to tenths before display, and the kernels snap by rounding.

## Risks and lessons

- **Push races:** two pushes were rejected while `tsc` ran. Retry with fetch, rebase, `tsc` and push without other steps in between.
- **Kernel briefs:** state "tolerances relative to extent, not absolute coordinates". Two parallel kernels had the same translation-dependence defect.
- **Red-test strength:** the handler's first regression test for AB-1a passed against the old rule. Always observe the red run.
- The evaluation log is complete through this session (`6b1e957`).
