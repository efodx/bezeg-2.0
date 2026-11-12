# Authoring-rollout stream state

Written by handler 4 at handoff, 2026-11-12; rewritten by handler 5 at handoff after task 08 batches 2, 3a and 3b. Stream file: [authoring-rollout.md](../../../tasks/feature-streams/authoring-rollout.md). Decisions: [rollout spec, Rollout decisions](../../../specs/lesson-authoring-rollout.md#rollout-decisions). Worktree `.claude/worktrees/stream-authoring-rollout` (branch `worktree-stream-authoring-rollout`).

**`node_modules` is now a local install in this worktree** (`npm ci`), not a junction: the main checkout's `node_modules` was found empty at about 17:00 with nothing reinstalling it. The publish gate links the worktree's own install. The owner has been told that the main checkout needs `npm ci`.

## Done and on master

- Steps 1–5. Task 06 registration is complete: 113/113. `legacyDemonstrationRows` and `graphFactories` are empty, but the empty table, the `Routes.tsx` fallback and `allGraphFactories` still exist; deleting them is task 06 step 4, at close-out. Each batch has an evidence and smoke record here (`06-batch<N>-*.md`).
- Task 08 batch 2 (`PointSetGraph` declaration, `orientation`, `polygon-area`): pushed as master `eabacbaf` (local `7d57383b`). Hosted Browser smoke is green there. [Evidence](08-batch2-evidence.md), [smoke](08-batch2-smoke.md).

## Committed by handler 5, publish started at handoff

- `e63b1ee0` batch 3a: six step graphs, `PointSetStepDeclaration`. [Evidence](08-batch3a-evidence.md), [smoke](08-batch3a-smoke.md) 24/24.
- `deca58bd` batch 3b: convex hull, robustness and the Bezier pair, on the general `PointSetExtension` (named fields with a parser and fallback, `normalise`, `settle`); `persistenceExtension()` on `PointSetGraph`. [Evidence](08-batch3b-evidence.md), [smoke](08-batch3b-smoke.md) 18/18.
- A Sonnet review of 3a and 3b found nothing blocking. Docs commits: `938079cf`, `78387b50` and this note.
- **First action:** check `just publish --status` for the publish of these commits on base `7d57383b`. If it failed, read its log, fix in a new commit and republish. If it pushed, read `just ci <sha>`.

## Carried into batch 4

- Tighten `PointSetPermittedState`'s index signature (`pointSetPersistence.ts` ~18-23) into a separate typed extras record (reviewer proposal; P2). It is non-blocking, because run-time reads go through named parsers.
- Browser coverage gap: no smoke row covers lesson reset, exit, figure return or Preset save/import for point-set ids. The host tests carry these flows (`pointSetPersistence*.host.test.tsx`).
- Ten more ids are now declared. Remaining on the legacy branch: `point-set-triangulation`, `delaunay` (batch 4); `voronoi`, `voronoi-degenerate`, `point-in-polygon` (batch 5); the five plane-geometry ids (batch 6).

## Next slices

1. Task 08 batches 4–6 per `08-inventory.md` §4 (§3.4 for triangulation's `triangles`/`previous`): triangulation, Voronoi and query, plane geometry. Each declares a `PointSetExtension` (see the 3b evidence) and moves its graphs off the legacy branch. The last batch deletes `PointSetGraph.declaresWholeScene()` and the legacy branches (decision P-pointset). Batch 6's three files (`InscribedAngle`, `SimsonLine`, `Inversion`) also need the task 07 disposition (decision O-plane, queue step 6).
2. Then close-out (queue step 7):
   - Step 4 of tasks 06, 07 and 08. Task 06 step 4 deletes the empty legacy table, the `Routes.tsx` fallback and the `scripts/transient-state-scope.cjs:112` read of `graphFactories.ts`, keeping the derived test adapter.
   - `just check`.
   - Architecture and persistence guidance.
3. Small pending item: `tests/guided-lessons.smoke.spec.cjs:1347` still says `linear-map` has "not yet run in a browser".

## Lessons from handler 4

- Read hosted CI (`just ci <sha>`) after every push. The publish gate's `check-changed` did not reach `DemonstrationsPage.test.tsx`, so master stayed red from `85d49b1f` until `980e4716`. A worker's "pre-existing" label was in fact this regression.
- When a structural table empties, search `tests/` and `scripts/` too. The smoke harness (`tests/smoke-catalog.cjs`) parsed the legacy list and required it to be non-empty.
- Background publishes can run while a worker edits the tree. Smokes need a clean tree, so dispatch the next implementation worker only after a smoke's build and run have finished.
- Spawn successors with `--agent bezeg-handler --model opus --permission-mode auto --effort medium` and pass this rule on.

## Lessons from handler 5

- This worktree's `node_modules/.bin` vanished at about 19:57 while the packages stayed, which broke a wide unit run and a publish `check-changed` ("'vitest' is not recognized"). `npm rebuild --ignore-scripts` relinked it without disturbing running tests. Check `ls node_modules/.bin/vitest` before a publish, and tell workers not to reinstall.
- When appending to `evaluation-log.md` with a script, end with exactly one newline: the publish whitespace stage refuses a blank line at EOF. Run `git diff --cached --check` before committing.
- Running a read-only reviewer alongside a smoke costs no wall time. An implementation worker on 10 graphs reached HANDOFF; split batches of more than about 6 graphs.
