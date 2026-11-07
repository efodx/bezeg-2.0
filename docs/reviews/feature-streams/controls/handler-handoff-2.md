# Controls handler handoff 2

Written at `BUDGET SOFT`, 2026-11-07. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue.

## State

- **Worktree and branch:** `.claude/worktrees/stream-controls`, branch `worktree-stream-controls`. `Run state: active`.
- **On `master`:** task 0, and task 1 slice 1a (`26a535af`, CI green).
- **Slice 1b:** accepted. It was publishing together with this note when the note was written. Check with `git log origin/master --oneline -5` for "feat: give shared inputs a boolean field and their own chrome". If it is missing, see the publish log in `.command-logs/` and rerun `just publish --recipe runtime --base <parent> --commits <id>`. Then run `just ci <sha>`; `gh` is at `C:\Program Files\GitHub CLI`, so prefix `PATH="/c/Program Files/GitHub CLI:$PATH"` in Bash. The records for 1b (spec decisions 8–12, user impact, the [evidence](foundation-1b.md), the stream status row and the evaluation entry) are in that commit.
- **Running:** nothing from this stream once the publish ends. No preview or worker is left.

## Next: task 1 slice 2

Slice 2 is the unavailable and refusal protocol (C6, C7, C22, C23) in [01-foundation.md](../../../tasks/shared-graph-controls/01-foundation.md). Decisions 3, 7 and 8 and task 0's entries 3, 6 and 7 in the [spec](../../../specs/shared-graph-controls.md#decided-in-task-0--2026-11-07) define what is refused. Brief inputs:

- The `PlaybackButtons` model for unavailable controls, one notice channel that clears on accept, one guard shared by inspector and lesson paths.
- Task 0 entry 3: the off-grid snap and its notice live in the shared field, with models still refusing. Entry 7: `axisPoint` and B-spline knot-marker refusals gain a reason.
- Carried in from 1a review: a draft in a `NumberInput` that is disabled or unmounted while focused is lost silently (Chrome fires no blur on disable). Decide it as part of the unavailable protocol.
- Carried from 1b: `aria-valuetext` for an open draft is undecided; no screen reader has been run. The checkbox variant, help on a switch and a disabled switch have no browser coverage until slice 5's fixture.
- Name smoke specs as consumers in the brief, and ask for screenshots in the presenting theme and under forced colours, not only the light theme: 1b's brief omitted both, and review found three gaps there.

Then slices 3–5 in order, task 2 (smoke `interp-fifth-point-added` and `hermite-locality-six`), and the queue in [controls.md](../../../tasks/feature-streams/controls.md).

## Risks and working notes

- **`master` moves every few minutes.** Three publishes in this session were rejected as non-fast-forward after the full check passed. Rebase by hand, check the incoming diff for your files, rerun focused checks and smoke, then publish; the gate now runs only affected units, so it is faster.
- **Smoke `ERR_NO_BUFFER_SPACE`** is machine load, not a defect: rerun the test with `--repeat-each=3`.
- **Memory pressure** stopped one background publish. Do not restart a reaped command without the owner.
- **Ports:** 4317 belongs to Codex; use 4327–4329. Stop previews you start.
- **Clips stream** drives controls in its captures. It was told about 1a's commit timing and 1b's switch markup; there is no file overlap.
- **Background exit codes:** a piped command reports the pipe's status. Read the gate's own output.

## Settings

Successor: `--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Routing per the handler card. Each handler launches its own successor at handoff and passes this rule on.
