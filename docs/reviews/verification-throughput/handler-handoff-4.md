# Verification throughput: handler handoff 4

Written 2026-11-09 by handler 4. Source: [spec](../../specs/verification-throughput.md); its Progress bullets are current. Branch `worktree-verification-throughput-2` (worktree `.claude/worktrees/verification-throughput-2`). The evaluation record is in `docs/agent-workflow/evaluation-log.md` (2026-11-09, handler 4).

## Done

- **Hosted runs.**
  - 42545997964 (`38805767`) and 42546128156 (`1247d217`, docs only) were green.
  - 42552202709 (`0c672035`) was green and was the third measurement run.
  - `65a9a2eb` was pushed by the first live background publish; its hosted run was not checked by handler 4.
- **Slice 1, judged on three hosted runs** ([phase4-6a-hosted.md](phase4-6a-hosted.md)):
  - Phase 4 stays: mean unit non-test time is 310 s against about 360 s.
  - The per-file shard map stays: the mean critical path is 8:23 against the 8:30 bar, a margin inside runner variance.
- **Slice 2, phase 6a on CI:** the lesson shards fell, and other-specs went from 5.5 to 4.7 min after catalogue batching. Neither `maxFailures` nor the 60 s timeout fired.
- **Slice 3, phase 6:**
  - Catalogue and clip-decode batching (`72ec80c8`).
  - Lesson-walk scoping, `lesson_grep` from `ci-change-scope.cjs` (`378a0eb7`). The representative set plus extras is 74 of 292 tests. The handler added the standalone extras describes (Bernstein, Rational elevation, Observation flow, Inversion) to every scoped grep.
- **Slice 4, phase 1 item 4:**
  - [ADR 0043](../../adr/0043-background-publish-worktree.md) and `just publish --background` / `--status` (`a5eec7a9`).
  - Review fixes were folded in before commit, including a blocking one: the internal flags could delete a foreground checkout.
  - Windows launch without pipe inheritance (`ff37bc26`).
  - The first live background run published `a5eec7a9` and `65a9a2eb`, recorded its result, and removed its worktree.

## Next slices (brief inputs)

1. **Confirm the hosted runs** for `65a9a2eb` and for handler 4's last push (`just ci <sha>`). That push carries `ff37bc26` and this note, published with `--background` from the handler's Bash tool. If the Bash call did not return within seconds of "Background publish started", the Windows launch fix failed live. Its unit test passes on the old code too, so only the live run proves it. Reopen it, and reproduce with a temporary justfile (`.command-logs/adr0043-launch.md`).
2. **First scoped lesson run.** The next push that changes app code outside the shared paths should run 74 lesson tests across the three lessons shards. Check the scope job's step summary ("Guided lesson rows: 24 representative …"). Also check that `--grep` reached Playwright: per-shard test counts are about 25 instead of about 97. Record each lessons shard's job wall in `phase4-6a-hosted.md`.
3. **Gate timings week** (spec Follow-ups): record median gate time and reruns per published slice against the 2026-11-07 baseline. Background results are in `.command-logs/publish-*.json` of each publishing checkout.
4. **Optional:**
   - Split `sceneReplacementContract.test.tsx` (157 s on CI). It is still the heaviest file; see phase2b notes for its shared helpers.
   - Directory-to-family reach for graph helper files.
   - Save a `just test-cost --save` baseline after a clean full local run.
   - Tell other streams about `just publish --background` once item 1 confirms it. Their handlers keep working while the gate runs, but must check `--status` before reporting a slice published.

## Notes

- **Background publish.** It refuses while an earlier run from the same checkout is live. The result lands in `.command-logs/publish-<id>.json` of the invoking checkout, and the worktree goes under the main checkout's `.claude/worktrees/publish-*`, removed on success. The invoking checkout may be dirty.
- **Measurement.** Use three hosted runs per CI-time judgement; runner speed varies about 1.6×. Non-test time is setup + environment + import from Vitest's `Duration` line; transform is excluded.
- **Pushes cancel older runs' jobs.** Do not push while a measurement run is in flight.
- **`gh run list --commit`** wants a full sha; `just ci <sha>` takes a short one.
