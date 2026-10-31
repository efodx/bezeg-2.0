# Functions stream: handler handoff 8

Handler 8 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-10-31 after slice 05d. Only gated work remains, so the stream is set to `Run state: waiting on G-FN, G-REG` and no successor was launched.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master`:** `1ad15dd3` (05d code: density 360, hull-guided `refine`, `just projective-conic-bench`) and `5099a7ff` (05d records), plus this note.
- **CI:** the `52ba7b08` run (05c) passed. A `rational-subdivision` lesson smoke failure on the sweep-line F0 run did not repeat on the next run.
- **05d result:** [ADR 0033 measurement addendum](../../../adr/0033-projective-conics-exact-kernel-and-family.md#measurement-addendum-2026-10-31-slice-05d) and the [05d acceptance record](../../../tasks/projective-conics/05-batch-a-graphs.md#05d-acceptance-record-2026-10-31). `DIRECTION_BOUND` stays 14, so no index or Preset changed.

## When a gate opens

1. **`G-REG`:** projective task 06 (routes, `PresetImport` registration for `projective-cross-ratio`, `projective-pascal`, `projective-pole-polar`). It must also measure browser frames for the K2 handle drag on each conic, the K3 P drag and a conic switch, and add them to the ADR 0033 addendum. Then smoke-test the three graphs: layout, label offsets, marker faces, touch and pointer dragging, the live SL/EN switch and the status live regions. After 06: 07 F2a (K4, K5), then F2b–F6.
2. **`G-FN`:** re-read A7's result, then the graph slices of families 1, 2 and 4.

## Owner decisions and risks

All items from [handoff 7](handler-handoff-7.md#owner-decisions-and-risks) still stand. New:

- A board that zooms in, or an export above about 4000 px, would need resampling for its view; polylines are cached per conic at the fixed view.
- Fix briefs that touch a hot path should ask for a before/after timing; the 05d hull fix passed all tests at 30 times the sampling cost.

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`; workers and reviewers `bezeg-worker` / `bezeg-reviewer` Sonnet `medium`; name the projective term table in Slovenian briefs; smoke port 4315.
