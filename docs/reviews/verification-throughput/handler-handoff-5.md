# Verification throughput: handler handoff 5

Written 2026-11-09 by handler 5. Source: [spec](../../specs/verification-throughput.md); its Progress bullets are current. Branch `worktree-verification-throughput-2` (worktree `.claude/worktrees/verification-throughput-2`). Evaluation record: `docs/agent-workflow/evaluation-log.md` (2026-11-09, handler 5).

## Done

- **Hosted confirmation:**
  - 42557268766 (`65a9a2eb`) and 42559644939 (`ba4d421b`) were green.
  - The Windows background launch works live.
  - The scope job's `gh api` lookup is confirmed; see Follow-ups in the spec.
- **First scoped lesson run** (42559644939):
  - The lessons shards ran 25 / 25 / 24 tests, against about 97 each before, with job walls of about 2 min.
  - Unit shard 1 (7:55) now bounds the run, at 8:39 from trigger to deploy.
  - Recorded in [phase4-6a-hosted.md](phase4-6a-hosted.md).
- **Gate timings, partial record:** [gate-timings.md](gate-timings.md), 2026-11-07 to 11-09. Full-check slices went from a median of 38.7 min and 2.36 attempts to 18.9 min and 1.20 attempts. The scratch parsers are `gt.cjs` and `gt2.cjs` in the main checkout's `.command-logs/`.
- **Family reach** (`e5b7ef34`): a changed helper or model file under `src/graphs/<dir>/` selects the graph classes in that directory and below, for every sweep.
- **`--background` for every stream:** the handler card and the feature-streams README now offer it.
- **Rejected:** the `sceneReplacementContract` split (reasons in the spec Progress, handler 5). The support module is kept in `.command-logs/scene-replacement-split-support.tsx.txt`.

## Next slices (brief inputs)

1. **Hosted runs, confirmed by handler 5:** 42562519206 (`4a20683e`), 42564120472 (`afbe6a72`) and 42566070968 (`854b8add`, carrying `e5b7ef34`) were green. The last one walked every lesson row (98 / 97 / 97), as designed: `scripts/transient-state-scope.cjs` is in `SHARED_PATHS`, so it is also a lesson-shared path. Check this correction's own run with `just ci <sha>`.
2. **Gate timings: closed.** On 2026-11-09 the owner accepted the three-day record as the verdict ([gate-timings.md](gate-timings.md)). This stream has no required work left.
3. **Optional items: done by handler 5.**
   - Real family-reach sweep: all five projective graphs were mounted.
   - `test-cost` baseline: 3,629 file-s over 664 files at `0b81cdad`.
   - Other streams' handlers were messaged about `--background`.
   - Remaining small follow-up: `test-cost` should skip deleted files still in Vitest's cache.

The items below are superseded and kept for history.
3. **Optional:**
   - Run one real sweep with a family selected: a scratch edit to a projective model file not in SHARED_PATHS, then `just unit src/graphs/base/GraphTransientState.part1`. The placeholder count should drop by the projective family. Revert the scratch edit.
   - Save a `just test-cost --save` baseline after a clean full local run.
   - Do not rebalance the `GraphTransientState` parts. Per-part CI times swing from 85 to 190 s between runs, and the heaviest part changes (phase2b-ci-shards.md lines 31–35 against run 42559644939's 183 / 111 / 106 / 172). That is runner variance, not the partition.

## Notes

- Per-file CI times: `gh run view <id> --log`, then strip the `^[[…m` escapes (they arrive as literal text). Match the lines ` ✓  dom|kernel  <file> (N tests) <ms>ms`. Example extraction: `.command-logs/run42559644939-unit-files.txt`.
- Background publish: one live run per checkout. The result is in `.command-logs/publish-<id>.json`.
- Pushes cancel older runs' jobs; do not push while a measurement run is in flight.
