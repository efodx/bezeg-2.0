# Curves stream: handler handoff 62

Handler 62 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired. It replaces [handoff 61](handler-handoff-61.md).

## State

- **On `origin/master`:** everything through this note, including the AB-A-6 gate. **Batch A is released.**
- `origin/curves-lessons-d1-d3` is a safety copy, already on `master`. Delete nothing. The remote `worktree-stream-curves` is stale; never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 11.2 GB free when last read; check it first.
- FFmpeg and `gh` as in [handoff 58](handler-handoff-58.md#state). Read hosted CI with the public API (`/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>`) through `curl`.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `be40684a` | Reduced curve dashed: D1 no longer relies on colour | [Gate](../../advanced-bezier/ab-a-6-gate.md#repair-the-reduced-curve-relied-on-colour) |
| `f0f0b615` | Criterion audit, [Batch B plan](../../../tasks/advanced-bezier/README.md#batch-b-plan-d2-handler-62-2026-11-06) | [Audit](../../advanced-bezier/ab-a-6-criterion-audit.md) |
| This note's commit | Recaptured `reduction` poster and card, gate record, statuses, delegation log | [Gate](../../advanced-bezier/ab-a-6-gate.md) |

Hosted CI of `2845a375` passed, every job read (run 42158824892). `just check` passed on `2845a375`. `just check` has not run on this session's three commits; hosted CI is their first full run.

## Next steps, in order

1. **Read hosted CI** for this push: the jobs, not only the conclusion. A failure here reopens the gate.
2. **Batch B (D2):** AB-B-1 to AB-B-6, in the [plan](../../../tasks/advanced-bezier/README.md#batch-b-plan-d2-handler-62-2026-11-06). Nothing has started. AB-B-1 touches `BezierHullsGraph`; the Geometry stream is complete, so no coordination is needed. Read the plan before the spec: it fixes the tolerance select, the status list and the half-unit pair. The gate needs a D2 drag measurement.
3. The rest of Batch C.
4. The low-priority list, unchanged from [handoff 61](handler-handoff-61.md#next-steps-in-order) step 4.

## Open for the owner

Unchanged from [handoff 60](handler-handoff-60.md#open-for-the-owner).

## Risks and notes

Handoff 61's "Risks and notes" still apply, and those it inherits.

- **A smoke brief must state expected behaviour from the UI or spec, not from a code comment.** Both "failures" of this gate's browser pass came from expectations that the app does not promise: a slider disabled while playing, and `/ph/cubic`'s handles on the hodograph board.
- **A criterion audit classified by title needs spot reads.** Here the audit's main rows held, but one row called a checkpoint restore a real session.
- **`echo` after a command hides its exit code from the task notification.** Read the printed value.
- **The card capture refuses `PREVIEW_EXAMPLE_IDS` after a build change;** run the whole family and compare manifests as JSON.
- The worker's transcript does not hold its final report as extractable text: write audit files from the report you received.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-62.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
