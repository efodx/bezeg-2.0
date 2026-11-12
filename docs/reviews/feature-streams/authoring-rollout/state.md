# Authoring-rollout stream state

Written by handler 3 at handoff, 2026-11-12. Stream file: [authoring-rollout.md](../../../tasks/feature-streams/authoring-rollout.md). Decisions: [rollout spec, Rollout decisions](../../../specs/lesson-authoring-rollout.md#rollout-decisions). Worktree `.claude/worktrees/stream-authoring-rollout` (branch `worktree-stream-authoring-rollout`; `node_modules` is a junction to the main checkout).

## Done and on master

- Steps 1–3, step 5 (handlers 1 and 2).
- Task 06 registration, 84/113: B-splines, basics, PH, parameterization, polynomial Bézier, rational, splines, curve geometry, interpolation, patches, functions, analysis. Last push `85d49b1f`. Each batch has an evidence and smoke record in this directory (`06-batch<N>-*.md`).

## Committed locally, not published

`1b16e809` probability (5), batch 13, on top of `85d49b1f`. The handler verified it: the unit set including every `registrationLoading` and `registrationComposition` test, typecheck, lint and the scripts tests all passed. **Not yet smoked.**

1. Smoke it. Haiku `bezeg-smoke`, copy the brief from batch 12 (record `06-batch12-smoke.md`): IDs `prob-density`, `prob-binomial-normal`, `prob-clt`, `prob-summary`, `prob-correlation`; record `06-batch13-smoke.md`.
2. Commit the record and update the stream status to 89/113 with links.
3. Publish: `just publish --background --recipe runtime --base 85d49b1f --commits 1b16e809,<this state-note commit>,<smoke docs commit>`. Run `git log --oneline 85d49b1f..HEAD` and list exactly those commits. If master moved the registration roots, rebase locally first. Earlier conflicts were all in `guidedLessonOwnership.ts`: Families-prep adds owner rows beside rows this stream deletes. Keep their rows.

## Next slices

1. Maps (3), plane geometry (5), computational geometry (16) per [06-inventory.md](06-inventory.md). Then task 08 batch 2 (the `PointSetGraph` shared mapping: permitted-state generalization in `ScenePersistence.ts`, in its own commit), then step 6 and close-out.
2. Brief pattern: the batch 9–13 briefs. The closest model for the remaining families is [06-batch13-evidence.md](06-batch13-evidence.md). Each brief names:
   - in-family order: spread before registered Families-prep rows of the same catalog family, add a placement test, and observe it failing with the spread misplaced;
   - explicit owners as primary owners in the registration;
   - `scripts/probe-demonstration-clip-routes.cjs` row sources;
   - `node --test scripts/ci-change-scope.test.cjs scripts/transient-state-scope.test.cjs scripts/probe-demonstration-clip-routes.test.cjs`.
3. The maps batch registers `linear-map`, which the three batch 11–13 loading tests used as a legacy route before this handler switched them; all family loading tests now use `/bezeg-2.0/compgeo/orientation`. **Computational geometry is the last batch and makes that route non-legacy**: it must delete or rework every family's "a legacy route still resolves" test (14+ files), since the legacy table then empties.
4. A catalog family whose legacy rows would split across batches must register whole (batch 12 did all 16 analysis rows). Legacy rows precede registered ones, so a half-registered family reorders.

## Lessons from handler 3

- `check-changed` in the publish gate caught what focused runs missed: 11 family loading tests hard-coded `/bezeg-2.0/functions/linear` as their legacy example. In every batch, run `registrationLoading registrationComposition` (Vitest name filter) with the focused set.
- Batch publishes pass the gate in about 20–40 minutes; prepare the next batch meanwhile. When master moves during a publish, the local commits remain as duplicates. Publish the next slice with `--base <last local published commit>`; the gate rebases. Rebase locally only when no worker is editing.
- Sonnet registration workers finish a 5–16 ID family in 20–28 minutes at about 90–105k tokens; Haiku smokes in 2–10 minutes.
