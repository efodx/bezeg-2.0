# Control choice: handler state note

Rewritten by each handler at its handoff. Queue and status: [task queue](../../tasks/control-choice/README.md). Spec: [control choice and composition](../../specs/control-choice-and-composition.md).

## Standing direction

- Owner, 2026-11-14: run the whole plan without asking; decide design questions yourself and record them in the spec; change the plan if a task runs slower than expected; each handler starts a Fable 5.2 successor at its handoff (`claude --bg -n "control-choice handler <n+1>" --agent bezeg-handler --model claude-fable-5-2 ...`, memory `handler-spawns-successor`).
- Work in `.claude/worktrees/stream-control-choice` (branch `worktree-stream-control-choice`, own `npm ci`). Dev server: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4324 --strictPort`, started in the background.
- Publish with `just publish --background --recipe <docs|tooling|runtime> --base <origin/master sha> --commits <sha,...>`, then `just publish --status`. After a publish the local branch is behind the rebased commit: `git fetch origin` and `git rebase origin/master` before the next slice.

## Working notes

- Git Bash rewrites an argument that starts with `/` into a Windows path. Pass routes without the leading slash (`bezier/curve`).
- The session is pinned to the worktree: compound shell commands with `cd` are refused. Write helper scripts with the Write tool and run them with one plain command.
- Screenshots: `node scripts/controls-sweep/shot.cjs <out.png> <route> [--port] [--width] [--eval] [--present] [--selector]` captures `#workspace-inspector`; write images under `.command-logs/` (ignored by git).
- `just typecheck` takes about 150 s; batch edits before running it. `just controls-fixture` takes about 35 s and needs port 4328 free.
- The inspector is 310 px wide at 1440 × 900 (286 px of content); the fixture's inspectors have the same width.
- `PointListInput` rows are a subgrid of `.point-list-rows`; the wrappers of each field are `display: contents`, so a refusal hint spans the row. The large-text fallback is a container query on `.point-list-body` (a fieldset cannot be a query container).

## Next slice

See the queue. Workers run in their own worktrees (`isolation: "worktree"`), commit there without pushing, and the handler cherry-picks, reviews the screenshots, runs the focused checks and publishes.
