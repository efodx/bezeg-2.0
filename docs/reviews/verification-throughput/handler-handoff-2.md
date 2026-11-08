# Verification throughput: handler handoff 2

Written 2026-11-08 by handler 2. Source: [spec](../../specs/verification-throughput.md); its Progress bullets are current. Branch `worktree-verification-throughput-2` (worktree `.claude/worktrees/verification-throughput-2`); everything below is on `origin/master`. The evaluation record is in `docs/agent-workflow/evaluation-log.md` (2026-11-08, handler 2).

## Done

The owner asked for phase 3, then phase 2. Both are done.

- **Phase 3:**
  - Derived catalog checks: `590212bc`.
  - Always-run tier and selector warning: `7f41d970` and `ef7c16cf`.
  - Spec: `9b5b290e`.
  - Hosted CI green (run 42496853788).
  - Replay: `phase3-replay.md`.
- **Phase 2a:**
  - Sampled sweeps: `573b7543`.
  - Review fixes: `574fcad1`.
  - Spec: `c97cc61f`.
  - Import fix: `11a26465`.
  - Hosted CI green (run 42507761390).
  - Notes: `phase2a-notes.md`.
- **Phase 2b:**
  - Fold and eight parts: `cebc58a2`.
  - Four Vitest shards: `bae8c271`.
  - Spec: `7b676b8c`.
  - Notes: `phase2b-notes.md`.
  - The run for `7b676b8c` was cancelled by a newer master push.
  - The first full hosted run with four shards is 42514768457 for `7c0a83ba` (controls stream docs on top). All four unit shards passed. Job wall times including `npm ci`: shard 1 8:35, shard 2 6:44, shard 3 4:33, shard 4 6:56. Shard 1 is still the critical path, about 515 s, so the predicted ~370 s did not materialize: the rebalance is unproven.
  - The same run has 1 failed Chromium test: `unified-learning.smoke` (bezier, "...ents and translated reading"). This handler's slices changed no app code. The push also carried the controls stream's `src/inputs/PointListInput.tsx` and graph changes. Owner: the controls stream (tell it); not investigated here.
- Evaluation entry: `6a36cf20`.

## Next slices (brief inputs)

1. **Measure and fix the phase 2b shards on CI.** Run 42514768457 left shard 1 at 8:35, against 4:33 for shard 3. Pull per-file durations from that run's shard logs, or Vitest's reporter output, and find what sits on shard 1. Then adjust the assignment and compare with the spec's 518 s / 353 s. Check whether the folded restoration walk is cheaper than restoration plus scene content were (842 s with `BEZEG_SWEEPS=all` at 2 workers locally). Record both in the spec. If the shards are unbalanced, `vite.config.mts`'s `PartSequencer` assigns `.partN` files.
2. **Gate delta path runs the always-run tier.** Phase 1 item 1 asks for this, and phase 3 now provides the tier. `scripts/publish-gate.cjs` `DELTA_CHECKS` is `typecheck`, `lint`, `build`. Add the always-run Vitest step from `scripts/check-changed-always-run.cjs`, which takes 27 s and no slot. Add a `publish-gate.test.cjs` case.
3. **Follow-up from handoff 1, still open:** a fresh `just publish` runs the full checks on its first pass even when a verified-base record matches.
4. **Phase 4 (measure first).** The full local run printed "651 workers spawned, ~1.91 s startup each, at least ~247 s faster with isolate: false". Per-file setup also dominates the always-run step (27 s wall, 1% tests). Evaluate the kernel-only `node` project and lazy JSXGraph setup from the spec, and measure a full run before and after.
5. **Phase 6** (browser smoke, runner minutes) and the **regrowth guard** (`just test-cost`) are not started.
6. **Optional:**
   - Split `sceneReplacementContract.test.tsx` (133 s) by moving its shared helpers and FigureCapture mock into a support module.
   - A changed helper or model file under a graph directory reaches no sweep entry by class name. Consider directory-to-family reach.

## Notes

- **Isolated worker worktrees.** Workers start with an empty or missing `node_modules`. One worker could not create the junction, because the isolation guard refused it. Either run workers in the handler worktree, which has a junction (one worker running commands at a time, because of the per-checkout run claim), or create the junction yourself before dispatch.
- **Moved exports.** When a slice moves an export, have the worker run every importer. A re-export read as `undefined` failed only the gate's full run.
- **Shared paths.** `LESSON_SHARED_PATHS` deliberately excludes `src/localization/`.
- **Gate recipe.** Publish `.github/` changes with `--recipe runtime`.
