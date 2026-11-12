# Authoring-rollout stream state

Written by handler 2 at handoff, 2026-11-12. Stream file: [authoring-rollout.md](../../../tasks/feature-streams/authoring-rollout.md). Decisions: [rollout spec, Rollout decisions](../../../specs/lesson-authoring-rollout.md#rollout-decisions). Worktree `.claude/worktrees/stream-authoring-rollout` (branch `worktree-stream-authoring-rollout`; `node_modules` is a junction to the main checkout).

## Done and on master

- Steps 1–3 (handler 1). Step 5 (task 07 batches 2 and 3, all eight eligible curve graphs in the owned slot): `ca331226`.
- Task 06 registration: B-splines, basics, PH, parameterization (`ca331226`), polynomial Bézier (`69df5e31`).

## Committed locally, not published

`1d1759e6` rational, `1e49abb7` its smoke, `565e4247` splines, `7b192f6e` its smoke, `5947d7b3` curve geometry (42/113 registered).

- The publish of the first four (`publish-7b192f6e-820129`) failed at `whitespace`: `curvePresetCollections.ts` had a blank line at EOF. `5947d7b3` rewrote that file, and `git diff --check 1e49abb7~1 HEAD` is clean. Publish the five together: `just publish --background --recipe runtime --base 9a37863d --commits 1d1759e6,1e49abb7,565e4247,7b192f6e,5947d7b3,<this docs commit>`.
- **Before publishing:** (1) smoke curve geometry (Haiku `bezeg-smoke`, same brief as [06-batch5-smoke.md](06-batch5-smoke.md); the 6 IDs plus the catalog tests; record in `06-batch8-smoke.md`; also check that the curve-geometry family lists the six before `curve-kinematics` and `mechanics-descent`). (2) Wait for master CI to go green on `scripts/transient-state-scope.test.cjs` (below).

## Master CI is red because of be876eff (Bézier registration)

`scripts/transient-state-scope.test.cjs` reads graph classes from the imports of `graphFactories.ts`, and the Bézier move removed `BezierCurveGraph` from those imports. Three of 57 tests fail. The families-prep handler (handler 12) offered to patch the fixtures. Handler 2 accepted and asked for the robust fix: read the family runtime loaders, as the projective test does. Check `gh run list --branch master` before publishing. If it is still red and families-prep has not landed a patch, fix it yourself in its own commit. Every batch removes more classes from `graphFactories.ts`. **Process gap:** the publish gate's `check-changed` does not run `scripts/*.test.cjs`. Run `node --test scripts/transient-state-scope.test.cjs` (or the recipe that wraps it; see `docs/commands.md`) on every registration batch, and name it in worker briefs.

## Next slices

1. Curve geometry smoke, then publish (above).
2. Task 06 batch 9, interpolation (5): `interp-lagrange`, `-hermite`, `-runge`, `-least-squares`, `-subdivision`. Three standalone collections, two in `functionPresetCollections` (fnMap, R-maps). Copy the brief of batch 8: the worker brief is in this handler's transcript, but the pattern is fully in [06-batch8-evidence.md](06-batch8-evidence.md). Add to the brief: (a) **a catalog family can hold Families-prep rows already registered** (curve geometry did), so spread the new rows before any registered rows of the same catalog family, and check per-family order, not only flat order; (b) the scripts test above.
3. Then patches (7), functions (14), analysis (16, split 8+8), probability (5), maps (3), plane geometry (5), computational geometry (16) per [06-inventory.md](06-inventory.md).
4. Task 08 batch 2, the `PointSetGraph` shared mapping (unchanged from handler 1's note): permitted-state generalization in `ScenePersistence.ts`, in its own commit.

## Lessons from handlers 1 and 2

- Workers' "no flat-order consumer" claims missed `demonstrations.test.ts`. Name it in registration briefs.
- Batch 2 deleted `removeScene` and left two contract tests that depended on it: `sceneReplacementContract.test.tsx` (fixed in `a6e00110`) and the `GraphTransientState` perturbation (fixed in `402510d1`). Neither ran in the focused checks. For any scene-lifecycle batch, run `src/graphs/base/sceneReplacementContract.test.tsx` and `src/graphs/base/GraphTransientState -t <ids>`.
- Workers often stop before final verification, or run lint before their last edit. Rerun the unit set, lint, tsc and `src/learning/chapter` yourself.
- Run each git command on its own: the worktree guard rejects compound git commands. A blanket `git checkout -- .` is denied by auto mode; Python rewrites leave CRLF in the working copy, which git normalizes on add.
- Port 4323 is often held by the Families-prep preview, so smoke workers use 4331.
- Evaluation entries for handler 2's dispatches (3 Haiku smokes, 4 Sonnet registration workers, all accepted; 1 worker deviation on family order corrected by the handler) are not yet logged per `.agents/skills/subagent-flow-evaluation/SKILL.md#do-log`.
