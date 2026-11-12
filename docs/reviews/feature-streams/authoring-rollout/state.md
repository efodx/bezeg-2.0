# Authoring-rollout stream state

Written by handler 4 at handoff, 2026-11-12; updated by handler 5 after batch 2 was smoked and published. Stream file: [authoring-rollout.md](../../../tasks/feature-streams/authoring-rollout.md). Decisions: [rollout spec, Rollout decisions](../../../specs/lesson-authoring-rollout.md#rollout-decisions). Worktree `.claude/worktrees/stream-authoring-rollout` (branch `worktree-stream-authoring-rollout`).

**`node_modules` is now a local install in this worktree** (`npm ci`), not a junction: the main checkout's `node_modules` was found empty at about 17:00 with nothing reinstalling it. The publish gate links the worktree's own install. The owner has been told that the main checkout needs `npm ci`.

## Done and on master

- Steps 1–5. Task 06 registration is complete: 113/113. `legacyDemonstrationRows` and `graphFactories` are empty, but the empty table, the `Routes.tsx` fallback and `allGraphFactories` still exist; deleting them is task 06 step 4, at close-out. Each batch has an evidence and smoke record here (`06-batch<N>-*.md`).
- Task 08 batch 2 (`56eafed4`, `909bf39b`): [evidence](08-batch2-evidence.md), [smoke](08-batch2-smoke.md) 70/70 over all 22 point-set ids. A Sonnet review against P1–P3 found nothing blocking. Only `orientation`, `polygon-area` and the `CurvePairGraph` base (which has no route of its own) take the declared path; the other subclasses keep the legacy branch unchanged. Published by handler 5 (see the stream file and `just publish --status` for the pushed hash; read `just ci <sha>` after it).

## Carried into batch 3

- Review nit: `PointSetGraph.figurePresetGraphState` (`PointSetGraph.tsx:535`) tests `data === undefined`, while `BaseGraph.tsx:1260` uses `== null`. Align it to `== null` while editing the base.
- Browser coverage gap: no smoke row covers lesson reset, exit, figure return or Preset save/import for point-set ids. Host tests carry these flows (`pointSetPersistence.host.test.tsx`). If a batch changes these flows beyond the host tests, consider adding a browser row.

## Next slices

1. Task 08 batches 3–6 per `08-inventory.md` §4: step/trace family, triangulation, Voronoi and query, plane geometry. Each declares its extension of `pointSetPersistence` and moves its graphs off the legacy branch. The last batch deletes `PointSetGraph.declaresWholeScene()` and the legacy branches (decision P-pointset). Batch 6's three files (`InscribedAngle`, `SimsonLine`, `Inversion`) also need the task 07 disposition (decision O-plane, queue step 6).
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
