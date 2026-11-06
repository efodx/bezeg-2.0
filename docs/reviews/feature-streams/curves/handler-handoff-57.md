# Curves stream: handler handoff 57

Handler 57 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired. It replaces [handoff 56](handler-handoff-56.md).

## State

- **On `origin/master`:** everything through this note. Family 1 is complete: the [Batch 3 gate](../../curve-geometry/cg-b3-6-gate.md) passed. `just check` passed on `135ac9d7`, and hosted CI with deploy passed on `f705b486` (run 42141125109). This note's push is documentation only, so it skips application checks.
- The branch is local `worktree-stream-curves`. The remote `worktree-stream-curves` is stale and diverged; leave it and never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** about 9.8 GB free at the last reading; check it first.
- FFmpeg 9.0.2 is under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*\ffmpeg-*\bin`, not on PATH. Set `PREVIEW_FFMPEG` and `PREVIEW_FFPROBE` for a poster capture.
- `gh` is not installed. Read hosted CI with `just ci` or the public API (`/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>`).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `fe1c0dc9` | The envelope family draws under the curve, with a drawing-order test | [Gate](../../curve-geometry/cg-b3-6-gate.md#layer-repair) |
| `82ee0a7d` | `curve-envelope` poster recaptured | Same |
| `135ac9d7` | Spec: L6's seven steps, L5's circle-arc row | [Gate](../../curve-geometry/cg-b3-6-gate.md#records) |
| `5115d0bb` | **Unit suite in three shards**: shard 1 hit its 15-minute limit on `705b76f8`, which skipped deploy | [Gate](../../curve-geometry/cg-b3-6-gate.md#hosted-ci-unit-shard-over-its-limit) |
| `f705b486` | Gate record, delegation log | |
| This note's commit | Task status, playbook wording | |

## Next steps, in order

1. **Family 5, Batch A (D1, D3).** Start from [its tasks](../../../tasks/advanced-bezier/README.md) and [spec](../../../specs/advanced-bezier-lessons.md). The kernels AB-1a to AB-1d and D4 are done. Handler 57 read only the top of the plan and started nothing. The task rows below AB-1d were not read; check them and plan the slices first. Gates: `G-CURVE` for the D1 and D3 graphs; confirm it in the Platform stream's file. D2's graph is unblocked: `CurvePairGraph` is on `master`, see geometry handler 53's note in [geometry.md](../../../tasks/feature-streams/geometry.md).
2. The low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) step 5, with its polish items.

## Open for the owner

Unchanged from [handoff 55](handler-handoff-55.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices.

## Risks and notes

Handoff 56's "Risks and notes" still apply, and those it inherits.

- **Do not push while a code run is in progress.** The workflow cancels running jobs on a new push, including a documentation push. Wait for `deploy`.
- **`cancelled` can hide a timeout.** A job at its limit reports `cancelled`, and `smoke` then fails and deploy is skipped. Read the jobs, not only the run's conclusion.
- **Unit shards are uneven:** 12.3, 8.0 and 6.5 minutes. Shard 1 has room for now; watch it, and rebalance the part files if it nears 15 minutes.
- `PREVIEW_BASE_URL` takes no trailing slash: `http://127.0.0.1:4314/bezeg-2.0`.
- A selective capture rewrites much of the manifest as text, as `preservedCaptureIds` shifts. Compare it as JSON.
- **Check a smoke failure against the code before accepting it.** The 390 px collinear failure and the toggle finding did not reproduce. The `curve-envelope` board caption omits the note on a narrow board on purpose; look in the inspector.
- The public deep link returns HTTP 404 from Pages with the app's fallback page; check the root and the body, not the status alone.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-57.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
