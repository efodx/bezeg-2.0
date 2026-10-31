# Curves stream: handler handoff 1

Written 2026-10-31 by handler 1 at its 150k soft threshold. Settings to keep: Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium` (`high` for de Boor/NURBS kernels), reviews `bezeg-reviewer` Sonnet for kernel mathematics.

## State

- Worktree `.claude/worktrees/stream-curves`, local branch `worktree-stream-curves`; `node_modules` is a junction to the main checkout (delete the junction before removing the worktree).
- `master` has everything through `9714d2b` (CG-1 curvature kernel) plus this note's commit.
- **Unpushed to master:** `4a446d9` BS-1a knot-vector/basis/de Boor kernel (`src/bezeg/impl/curve/bspline/`), committed locally and pushed to `origin/stream-curves` only. It needs its mathematical review before it goes to `master`.

## Accepted this session

- F0 for all five families: task folders `docs/tasks/{curve-geometry,b-splines-nurbs,interpolation-approximation,probability-statistics,advanced-bezier}/README.md`; ADRs 0022 (curvature overlays in Demonstration graphs), 0024 (B-spline representation/Presets), 0026 (interpolation editing model, QR solver), 0027 (Probability family), 0028 (advanced Bézier owners); specs marked scheduled.
- CG-1 curvature kernel: worker evidence and review disposition in [cg-1-kernel.md](../../curve-geometry/cg-1-kernel.md). Deferred finding: tangential-cusp detection for L5 (recorded on CG-B3-2a).

## Next steps, in order

1. Rebase onto `origin/master`. Dispatch a `bezeg-reviewer` (Sonnet) mathematical review of `4a446d9`: Cox–de Boor and half-open/right-end handling, de Boor alphas, validation codes, Chaikin/uniform limit, test independence; worker's design choices to settle are listed in [bs-1a-kernel.md](../../b-splines-nurbs/bs-1a-kernel.md) (degree 0 accepted, `n<k` throws, evaluators throw on invalid vectors, open Chaikin keeps end points). Fix, then push to `master` and mark BS-1a done.
2. Ungated work, two workers at a time: CG-B1-2a (`curve-parametric` graph) and CG-B1-2a' (`curve-curvature` graph) — check ADR 0022 and the gate reading in the curve-geometry README; IA-1a and IA-1b kernels; IA-1c after BS-1a lands; PS-1a kernel; AB-1a, AB-1c kernels; AB-1b uses CG-1's `polynomialBezierSource`; BS-1b (insertion/extraction/rational/`derivativeSource` on CG-1's `DerivativeSource` = `{at(t)->{point,d1,d2}, scale}` and `splineSpanSource`).
3. Gated: registration/lessons wait for `G-REG`; spline comb and B-spline curve graphs for `G-CURVE`; function-graph slices (I2, I4, all Probability graphs) for `G-FN`; clipping for `G-CG`. When only gated work remains, set `Run state: waiting on <gates>` and end.

## Risks and lessons

- **ADR number races:** three streams create ADRs at once. Check `git ls-tree --name-only origin/master docs/adr/` right after the final rebase and just before `git push`; renumber on collision. Functions' `0026-school-function-catalogue.md` duplicates our 0026 number (theirs landed second; left to them).
- **Worker watcher telemetry gap:** `claude_worker_watch.py <agentId>` printed "no transcript for this agent id" for workers launched from this worktree session; budgets relied on the brief's turn cap. `--self` works.
- `do-log` evaluation records for CG-1, BS-1a and the CG-1 review are not yet written ([subagent-flow-evaluation](../../../../.agents/skills/subagent-flow-evaluation/SKILL.md#do-log)): CG-1 Sonnet medium, 28 tool uses, ~70k tokens, accepted after two low-severity fixes; BS-1a Sonnet high, 30 tool uses, ~56k tokens, review pending; review Sonnet, 5 tool uses, ~25k tokens, 2 actionable findings.
