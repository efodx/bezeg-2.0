# Platform stream: handler handoff 3

Written 2026-11-01 by platform handler 3 at its context threshold.

## State

- Worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- **Accepted and on `master`:** step 2. `1b847578` A10, `a628ceca` A9b, `f95f14ca` acceptance record, `8ead6cdd` hash fix. `G-REG` is open.
- **Committed, not accepted:** `b7cd63bc` A4 and `492cb256` A7 convexity pilot, plus this note. Pushed to `origin/worktree-stream-platform-3`. The old `origin/worktree-stream-platform` predates two rebases; a force-push is not allowed, hence the new branch.

## Step 3 evidence so far

- **A4:** [evidence](../../../tasks/architecture-deepening-backlog/04-generic-spline-changes.evidence.md).
  - Engineering and mathematics reviews done. The mathematics review found the degree limit off by one: degree d needs d+1 points (`GenericBezierSpline.ts` build, `points.slice(0, degree + 1)`). The repair set the limit to max(1, n−1) and observed the new tests red before the fix. Rollback test added.
  - Focused set: 450 passed; 28-file set: 1034 passed, with 2 timeouts under load (`lessonRestoration.part1` circle and spline-g1) that pass alone.
  - Breaking (minor): the Cn counter's top value drops by one; recorded in the commit and the ADR 0010 amendment. Skipped low finding: the constructor builds twice for a non-default stored pair (needs a constructor restructure).
- **A7 pilot:** [evidence](../../../tasks/architecture-deepening-backlog/07-function-model-rules.evidence.md).
  - 1191 tests passed in the focused set, 7 mutations, 60-case preset comparison identical.
  - Handler fix: edit-message bounds use `currentLanguage()`.
  - Review: no blocking finding. Slice-2 inputs (lazy `DomainError` text on `LocalizedError`, issue kinds for non-numeric fields) are in the evidence file.

## Next steps, in order

1. Integrated `just check` on HEAD. It was killed twice by OS memory pressure; ask the owner before restarting after a kill. Watch the two `lessonRestoration.part1` timeouts.
2. Haiku `bezeg-smoke` on port 4311, from a fresh `just build`:
   - **A4:** `/bezeg-2.0/spline/cnspline` (resolve the path in `src/demonstrations.ts`). Check degree and continuity counters, that the top degree is points−1, add/remove points, Reset, and preset restore. Walk the spline lessons with `just smoke-lesson spline-cn spline-c1 spline-c2`.
   - **A7:** on the convexity route, invalid a/b/t input in SL and EN (localized hint, nothing applied). Preset import of a valid file and of an invalid convexity file, which needs an actionable localized error.
3. If clean: mark A4 accepted (stream file, backlog README, task file). A7 stays in progress. Rebase onto `origin/master`, recheck, push `HEAD:master`.
4. A7 slice 2: the other ten models plus every function graph family on master. The inventory is in the A7 evidence. Split it into about three Sonnet `medium` slices of 3–4 models. Apply the slice-2 inputs first: `DomainError` on `LocalizedError`, as a small slice of its own.
5. Evaluation record for step 3 (see below). Then steps 4–6 as in the stream file.

## Delegation telemetry for the record

- A4 worker: Sonnet `high`, dispatched 23:08Z, ~116k / 76 tools / 48 min; repair round ~138k total / 26 tools / 34 min.
- A7 worker: Sonnet `high`, 23:08Z, ~100k / 60 tools / 17 min, no repair.
- Reviews: Sonnet ×3 (A4 engineering ~30k, A4 mathematics ~24k, A7 ~31k; under 1 min each). The mathematics review caught the off-by-one that the worker's own equivalence experiment hid, because it compared against the equally wrong old constructor.
- Budget watchers failed with "no transcript for this session/agent id" after the date rollover; budgets were tracked by hand.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto`. Workers: `bezeg-worker` Sonnet `medium` (`high` for design-shaped slices). Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Haiku for rechecks and narrow checks. Port 4311 (4312 for a second concurrent preview). Never force-push; push only `HEAD:master` fast-forwards or new branch names.
