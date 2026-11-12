# Authoring-rollout stream state

Written by handler 6 at handoff, 2026-11-13. It follows handler 5's note, which covered task 08 batches 2, 3a and 3b. Stream file: [authoring-rollout.md](../../../tasks/feature-streams/authoring-rollout.md). Decisions: [rollout spec, Rollout decisions](../../../specs/lesson-authoring-rollout.md#rollout-decisions). Worktree `.claude/worktrees/stream-authoring-rollout` (branch `worktree-stream-authoring-rollout`). `node_modules` is a local install here (`npm ci`), not a junction. Do not reinstall it; if `node_modules/.bin/vitest` is missing, run `npm rebuild --ignore-scripts`.

## Done (queue steps 1–6)

- Task 06 registration is complete: 113/113. The empty legacy table, the `Routes.tsx` fallback and `allGraphFactories` remain until task 06 step 4.
- Task 08 point-set rollout is complete. All 22 point-set ids persist through `pointSetPersistence`. `PointSetGraph.declaresWholeScene()` and the legacy branches are deleted (decision P-pointset). Each batch has an evidence and a smoke record here:
  - Batch 4 (triangulation and Delaunay): the triangle list is a named data part.
  - Batch 5 (Voronoi and point-in-polygon): `resetOnBareImport`, and the import-scoped stored `graphState` in `PointSetGraph.importPreset`.
  - Batches 6a and 6b: the plane-geometry graphs.
  - The batch 6b smoke covered all 22 ids, 70/70.
- O-plane is resolved: the plane-geometry trio is excluded from task 07 (`5e075e10`).
- Published on master:
  - batch 4 as `ecd7dcfa` (hosted Browser smoke green);
  - batch 5 as `50a82ab8` (hosted CI was `in_progress` at handoff).

## First action

1. Run `just publish --status`. Batch 6 was started in the background on base `06a76d4b`, with commits `0eda4b52,533ebd12,5e075e10,160db37e,c86ac2b9`.
   - If it failed, read its log, fix in a new commit and republish.
   - If it pushed, read `just ci <sha>` for it and for `50a82ab8`.
2. Then publish this note's commit.

## Next: queue step 7, close-out

Read the stream file's step 7 row and the step 4 sections of tasks [06](../../../tasks/lesson-authoring-architecture/06-legacy-registration-rollout.md), [07](../../../tasks/lesson-authoring-architecture/07-owned-scene-rollout.md) and [08](../../../tasks/lesson-authoring-architecture/08-scene-projection-rollout.md).

- **Task 06 step 4:**
  - delete the empty legacy table, the `Routes.tsx` fallback and `allGraphFactories`;
  - delete the `scripts/transient-state-scope.cjs:112` read of `graphFactories.ts`;
  - keep the derived test adapter;
  - search `tests/` and `scripts/` for readers of the legacy list (handler 4 lesson).
- **Task 07 step 4:** account for all eleven candidates, with the trio as recorded exclusions. Compare the remaining lifecycle code with the inventory and update the architecture guidance.
- **Task 08 step 4:**
  - The three `projective-*` rows of `PRESET_DATA_STATE_KEYS` stay until their independent tests exist (inventory §2). Check whether the batch 1 tests now cover them; if so, remove the rows.
  - No point-set rows are left in that table.
- `just check`, then the architecture and persistence guidance (AGENTS.md, Documentation).

## Carried items

- Browser coverage gap: no smoke row covers Preset save/reopen, file import, lesson reset, exit or figure return for point-set ids. Host tests carry these flows. Adding one Preset round-trip smoke row for a representative point-set id (for example `voronoi`) would close it; decide at close-out.
- `PointSetGraph.importPreset` sets an import-scoped `importing` record and restores the outer one. It is not a mirror of scene state. If `BaseGraph.importPreset` ever passes the stored `graphState` to `importPresetData`, the record can go.

## Lessons from handler 6

- Batches of 2–3 graphs on the shared extension cost a Sonnet worker 100–142k. Batches 4 and 5 reached HANDOFF only after their code and tests were done, so finishing from the handoff note with a fresh small worker was cheap.
- For a shared-base change, run the sweep over every id already declared, not just the batch's ids. Also have the reviewer compare each field's fallback with `getInitialState()`.
- Tell workers to run the 10–20 min sweep in the background with a done marker, and never to return while it runs. Otherwise the handler waits on a marker file.
- A run of `just publish` can take over an hour while sweeps compete for memory. It is progressing as long as its log advances.
- Spawn successors with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium` and pass this rule on.
