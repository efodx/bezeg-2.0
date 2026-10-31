# Curves stream: handler handoff 2

Written 2026-10-31 by handler 2. It passed its 150k soft threshold, let its running agents return, integrated their work and stopped. Settings to keep:
- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet `medium`; `high` for de Boor/NURBS and other difficult kernels.
- Mathematical reviews: `bezeg-reviewer` Sonnet.

## State

- Worktree `.claude/worktrees/stream-curves`, local branch `worktree-stream-curves`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- `master` holds everything through `abc13a3`; nothing is unpushed. `origin/stream-curves` and `origin/stream-curves-2` are stale backups that can be ignored. Never force-push them.
- Machine load: a peer session reported memory pressure. Run path-filtered `just unit <paths> --maxWorkers=2`, one run at a time. Treat timeouts as load artifacts until reproduced.

## Accepted this session (all with independent mathematical review)

| Slice | Kernel | Commits | Evidence |
| --- | --- | --- | --- |
| BS-1a | knot vector, basis, de Boor, uniform limit | `64e14ab`, `4deaa51` | [bs-1a](../../b-splines-nurbs/bs-1a-kernel.md) |
| BS-1b | insertion, extraction, rational, derivative sources | `8ba6fe0`, `f075a90` | [bs-1b](../../b-splines-nurbs/bs-1b-kernel.md) |
| IA-1a | `src/analysis/interpolation.ts` (barycentric, nodes, Runge) | `002175d` | [ia-1a](../../interpolation-approximation/ia-1a-kernel.md) |
| IA-1b | `leastSquares.ts`, `hermite.ts` | `219f4bf` | [ia-1b](../../interpolation-approximation/ia-1b-kernel.md) |
| IA-1c | `subdivision.ts` (four-point; Chaikin imported) | `abc13a3` | [ia-1c](../../interpolation-approximation/ia-1c-kernel.md) |
| PS-1a | `distributions.ts` (erf, normal, binomial, Poisson, strips) | `6c31ee6` | [ps-1a](../../probability-statistics/ps-1a-kernel.md) |

Spec amendments:
- B-spline extraction also raises the domain ends of unclamped vectors to multiplicity k.
- The I3 Catmull-Rom locality claim changed from two segments to four.

Consumer rules for later F2a slices are recorded in the evidence files:
- The knot editor gates on `validateKnotVector`.
- The I2 UI clamps n at 40.
- The I3 UI catches `RangeError` for coincident points.
- PS-1c computes the total sum of squares and handles horizontal data.
- Lesson text must state the open-end behaviour of Chaikin and four-point subdivision.

## Next steps, in order

1. Ungated kernels, up to three agents at a time:
   - **AB-1a** `degree-reduction.ts`;
   - **AB-1c** `coons.ts`;
   - **AB-1b** `arc-length.ts` on CG-1's `polynomialBezierSource`;
   - **PS-1b** `convolution.ts` plus its representation measurement and ADR (ADR 0027 defers the representation to Batch B, and the measurement decides it).

   Each kernel gets a `bezeg-reviewer` mathematical review before it goes to `master`.
2. Ungated F2a graph code:
   - **CG-B1-2a** (`curve-parametric`) and **CG-B1-2a'** (`curve-curvature`). Read ADR 0022 and the gate reading in the curve-geometry README first.
   - The I1, I3 and I5 graphs (IA-A/B/C F2a). These are point/curve graphs and ungated. I2 and I4 wait for `G-FN`.
   - Graph slices change rendering and interaction paths, so they need engineering review and focused browser checks (port 4314).
3. Decision-gated: PS-1c (`descriptiveStatistics.ts`, `correlation.ts`) waits for the quartile/σ convention decision after a matura source check (ADR 0027). Do that research before dispatch.
4. Gated: registration and lessons wait for `G-REG`; B-spline graphs and the comb on existing curves for `G-CURVE`; all Probability graphs and I2/I4 for `G-FN`; AB-1d clipping for `G-CG`. When only gated work remains, set `Run state: waiting on <gates>` in the stream file and end.

## Risks and lessons

- **ADR number races:** check `git ls-tree --name-only origin/master docs/adr/` after the final rebase. On collision, renumber our ADR. The highest number on master is currently 0029.
- **Push races:** two pushes were rejected as non-fast-forward because other streams landed in between. Fetch, rebase, run `tsc`, then retry. Never use `--force-with-lease`; the auto-mode classifier blocks it.
- **Worker mutation runs:** two workers applied mutations in batches or reverted with `git checkout`. Ask for one mutation per run in briefs. Spot-check the least-proven mutation yourself, as done for the IA-1b tangent scaling.
- **Watchers:** worker watchers ran; none reached 135k. The highest was BS-1b at about 103k with `high` effort.
- Evaluation entries for CG-1, BS-1a and the reviews are in `docs/agent-workflow/evaluation-log.md`. Entries for this session's IA-1a/1b/1c, PS-1a and BS-1b runs are not yet written. Usage, from tool results:
  - IA-1a: 17+6 uses, 54k.
  - PS-1a: 16+4 uses, 64k.
  - BS-1b: 34 uses, 103k, `high`.
  - IA-1b: 17 uses, 48k.
  - IA-1c: 14 uses, 38k.
  - Reviews: 25–31k each, 6–10 uses.
  - Repairs: IA-1a (tolerances, overflow guard) and PS-1a (Poisson cap, erfc oracles). The other slices were accepted without repair.
