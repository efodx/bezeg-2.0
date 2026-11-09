# Verification throughput: handler handoff 3

Written 2026-11-09 by handler 3. Source: [spec](../../specs/verification-throughput.md); its Progress bullets are current. Branch `worktree-verification-throughput-2` (worktree `.claude/worktrees/verification-throughput-2`). Everything below is on `origin/master`; the last push is `38805767`. The evaluation record is in `docs/agent-workflow/evaluation-log.md` (2026-11-09, handler 3).

## Done

- **Hosted run for `e63a6cfb`:** cancelled by a newer push. The run for `e7c03289`, which includes it, was green (42516291702). The `unified-learning` smoke failure did not recur, so the controls stream was not told.
- **Phase 2b on CI:**
  - Shard measurement: `phase2b-ci-shards.md`.
  - Shard-3 pin: `b1b5598a`. It lost on the second run.
  - Per-file shard map: `8f1f2c4d`.
  - Main finding: hosted runner speed varies about 1.6× per job. Assignment is deterministic.
- **Phase 1 item 1:** the gate's delta path runs the always-run unit tier (`6a39ac59`). It ran live on the last publish.
- **Follow-up from handoff 1:** a rerun's first pass uses the verified-base record (`dbabef1e`).
- **Tooling fix:** `commands.test.cjs` fixtures no longer read the host branch's changes (`55c05845`, `git diff --relative`).
- **Regrowth guard:** `just test-cost` (`5029e1df`). Its baseline is local, saved with `--save`.
- **Phase 4:** `kernel` Vitest project in node plus lazy JSXGraph in setup (`56063d5e`, `phase4-notes.md`). The kernel subset runs in 27 s against about 150 s. The first hosted run (42541468552) is ambiguous; see the spec.
- **Phase 6, first slice:** settle via `waitForFunction`, 60 s lesson timeouts, `maxFailures` on CI and spread Exit rows (`e1ebd2df`, `phase6a-notes.md`). Hosted lesson-shard times are not yet observed.

## Next slices (brief inputs)

1. **Judge phase 4 and the shard map on three hosted runs.** Use the runs for `38805767` and the next two pushes with app or test changes, together with 42541468552.
   - Per run, pull each unit job's Vitest `Duration` line with `gh run view --job <id> --log | grep Duration`. Sum setup, environment, import, transform and tests over the four shards.
   - Revert phase 4 (`56063d5e`) if summed non-test time does not fall against 42524584056 and 42527684457: 364 and 357 s of non-test.
   - Revert the per-file map (`8f1f2c4d`) to plain hash plus parts if the mean critical path does not beat about 8:30.
   - Record the result in the spec.
2. **Phase 6a on CI.** From the same runs, record each lesson shard's job wall (lessons-1/2/3, other-specs) against the audit's 4.4 / 5.2 / 3.4 / 5.1 min test step. Also note whether `maxFailures` or the 60 s timeout caused a failure.
3. **Phase 6 remaining:**
   - Scope lesson walks in CI with `scripts/ci-change-scope.cjs`, using the spec's rules: all walks when the runtime, layout or helpers change; matching rows for content; about 20–25 representative rows otherwise. `.github/` changes publish with `--recipe runtime`.
   - Batch the catalogue and clip-decode tests (about 125 s) into one `evaluateAll`.
4. **Phase 1 item 4** is not started; read it in the spec.
5. **Optional:**
   - Split `sceneReplacementContract.test.tsx` (157 s on CI).
   - Directory-to-family reach for graph helper files.
   - Save a `just test-cost --save` baseline after a clean full local run.

## Notes

- **Worker locality.** Workers ran in the handler worktree. One at a time ran heavy commands, and a gh-only worker ran beside them. A stopped worker can leave background runs holding the per-checkout run claim: stop it with TaskStop before your own checks.
- **Local measurement is invalid** when the change touches a sweep shared path (`setupTests.ts`, `vite.config.mts`): the local sample widens. Use kernel-only or CI comparisons.
- **Vitest projects.** With `extends: true`, arrays merge with the root (for example `setupFiles`). Put per-project arrays only on the projects.
- **`just smoke-built` arguments** take no leading `--`. With one, it runs all 794 tests.
- **Gate.** The whitespace check rejects trailing spaces in notes. Strip them before committing.
