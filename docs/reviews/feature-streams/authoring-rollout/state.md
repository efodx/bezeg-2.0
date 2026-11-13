# Authoring-rollout stream state

Written by handler 7, 2026-11-13. Stream file: [authoring-rollout.md](../../../tasks/feature-streams/authoring-rollout.md), run state **complete**. Decisions: [rollout spec, Rollout decisions](../../../specs/lesson-authoring-rollout.md#rollout-decisions). Worktree `.claude/worktrees/stream-authoring-rollout` (branch `worktree-stream-authoring-rollout`).

## Done (queue steps 1–7)

- Tasks 06, 07 and 08 are complete. Their status lines and the [close-out record](closeout.md) hold the dispositions.
  - 06: 113/113 registered. The legacy table, the route fallback and `legacyDemonstrationRows` are deleted (`97d704ea`).
  - 07: 8 graphs migrated. The plane-geometry trio is excluded (O-plane).
  - 08: 25/25 rows declared. No baseline `PRESET_DATA_STATE_KEYS` row remains.
- `just check` passed: 17482 tests. Smoke: [closeout-smoke.md](closeout-smoke.md). Batch 6 is on master as `e13750a1`, with hosted Browser smoke green.
- The close-out commits are published with this note. Confirm with `just publish --status` and `just ci <sha>`.

## Carried items, not scheduled

- `checkRegistrations` in `src/graphs/registrationIntegrity.ts` still takes a `legacy` argument, and every caller passes it empty. Narrowing it touches 11 Families-prep composition tests, so do it there or in a later cleanup.
- `PointSetGraph.importPreset` sets an import-scoped `importing` record. If `BaseGraph.importPreset` ever passes the stored `graphState` to `importPresetData`, the record can go.
- A future `PointSetGraph` scene slot would reopen the trio exclusion of task 07.

## Lessons from handler 7

- Name `just lint` in any brief that edits tests. A focused tsc, unit and build run passed, but the full check failed on one unused argument.
- Check smoke-brief premises against the UI: the catalog page groups cards by family, so its first card is not the first definition row.
- Spawn successors with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium` and pass this rule on.
