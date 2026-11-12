# Authoring-rollout stream state

Written by handler 1 at handoff, 2026-11-12. Stream file: [authoring-rollout.md](../../../tasks/feature-streams/authoring-rollout.md). Decisions: [rollout spec, Rollout decisions](../../../specs/lesson-authoring-rollout.md#rollout-decisions). Worktree `.claude/worktrees/stream-authoring-rollout` (branch `worktree-stream-authoring-rollout`; `node_modules` is a junction to the main checkout).

## Done and on master

- Step 1, the inventories: [06](06-inventory.md), [07](07-inventory.md), [08](08-inventory.md).
- Step 2, task 07 batch 1: the B-spline scenes.
- Step 3, task 08 step 2: the projective trio persistence. Both are in `aa367329`.

## Committed locally; publication state at handoff

Check `just publish --status` first.

- `3aebdb37` B-spline registration and `12ad2f2b` recorded-order test fix: background publish `publish-12ad2f2b-647cf5`. Its first attempt failed `check-changed` on `src/demonstrations.test.ts` flat order, which the fix resolves (decision R-order). If it failed again, read its log and rerun `just publish --background --recipe runtime --base beb539aa --commits 3aebdb37,12ad2f2b`.
- `19a61308`: registration of basics, PH and parameterization. `527c43b3`: task 07 batch 2, the Interpolation, Hermite and Subdivision scenes. Plus a docs commit with this note and the status. Publish them after the previous publish lands: `just publish --background --recipe runtime --base 12ad2f2b --commits <every commit in git log --reverse --format=%h 12ad2f2b..HEAD>`. Those commits are `19a61308`, `527c43b3` and the docs commits after them. Handler 1 did not start this publish.
- The batch 2 smoke passed: [batch2-smoke.md](batch2-smoke.md).

## Next slices

1. **Task 07 batch 3, ParametricCurveGraph.** Inventory section in [07-inventory.md](07-inventory.md). It keeps `disposeFigureScene` for the roll driver. Use the pattern of commits `6ceae2eb` and `527c43b3`.
2. **Task 06, polynomial Bézier (11).** It includes `bezier-clipping`, implemented in `compgeo`, which must stay last in the family. Follow commits `3aebdb37` and `19a61308` and the R-maps, R-owners and R-order decisions. Each batch must also move its rows in `src/demonstrations.test.ts` behind the registered families. Run `just unit src/demonstrations.test.ts` and `src/learning/content` before committing. Then rational (7, needs decision R-circle), splines (5, R-g1), curve geometry, and the rest per [06-inventory.md](06-inventory.md).
3. **Task 08 batch 2, the `PointSetGraph` shared mapping.** This needs the permitted-state generalization in `ScenePersistence.ts`, a shared host change, so do it in its own commit and keep it serialized with task 07. Then queue step 6.

## Lessons from handler 1

- Workers' "no flat-order consumer" claims missed `demonstrations.test.ts`. Name it in registration briefs.
- Workers often stop at the 135k worker budget before final verification. Rerun the full unit set, lint, tsc and `src/learning/content` yourself.
- Revert-and-rerun for pre-change evidence works with `git diff HEAD -- <paths> > patch`, then `git apply -R` and `git apply`. Run each git command on its own: the worktree guard rejects compound git commands.
- Port 4323 is often held by the Families-prep preview, and smoke workers use 4331.
