# Authoring-rollout stream state

Written by handler 4 at handoff, 2026-11-12. Stream file: [authoring-rollout.md](../../../tasks/feature-streams/authoring-rollout.md). Decisions: [rollout spec, Rollout decisions](../../../specs/lesson-authoring-rollout.md#rollout-decisions). Worktree `.claude/worktrees/stream-authoring-rollout` (branch `worktree-stream-authoring-rollout`).

**`node_modules` is now a local install in this worktree** (`npm ci`), not a junction: the main checkout's `node_modules` was found empty at about 17:00 with nothing reinstalling it. The publish gate links the worktree's own install. The owner has been told that the main checkout needs `npm ci`.

## Done and on master

- Steps 1–5. Task 06 registration is complete: 113/113. `legacyDemonstrationRows` and `graphFactories` are empty, but the empty table, the `Routes.tsx` fallback and `allGraphFactories` still exist; deleting them is task 06 step 4, at close-out. Each batch has an evidence and smoke record here (`06-batch<N>-*.md`).
- Last push `496c5afe` (local equivalent `706c98a2`). Master CI is green there: Browser smoke and Developer tools.

## Committed locally, not published

`56eafed4` (the `ScenePersistence` type parameter `P`, shared host code in its own commit) and `909bf39b` (`pointSetPersistence`, the `PointSetGraph` rewiring, the two contract rows removed). Both sit on `706c98a2`. Worker checks passed: `just unit` on compgeo, projective and base/presets, and wide `just unit src` with the six `BEZEG_*` sweeps over the 22 point-set ids; typecheck; lint. Handler review: diff read, decision P-pointset recorded. **Not smoked, not published.**

1. Smoke it. This changes the shared `PointSetGraph` base, so smoke the routes of all 22 point-set ids (inventory `08-inventory.md` §3.2), not only orientation and polygon-area: render rows, lesson walks and, if the harness has them, Preset save/reopen and import rows for `compgeo-*`. Use Sonnet `bezeg-smoke` (broad), modelled on `06-batch16-smoke.md`, and write the record to `08-batch2-smoke.md`. Spec P3 also asks for lesson reset/exit and figure return, so name those flows in the brief.
2. Optionally route a Sonnet `bezeg-reviewer` over `909bf39b` against P1–P3, since it is a shared-base change.
3. Commit the record and stream status, then run `just publish --background --recipe runtime --base 706c98a2 --commits 56eafed4,909bf39b,<this state-note commit>,<smoke docs commit>`.

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
