# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), [ADR 0064](../../adr/0064-source-tagged-scene-writes.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace`, worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing the worktree). Cut from `origin/master` at `057d8d22`; no upstream set, push with `git push origin board-workspace`, never force.
- Prototype reference: branch `ux-picks` frozen at `aff6df6c` (read-only; never merge, never copy its param registry or `set`/`setRaw` write paths). Prototype preview on port 4460 is stopped.
- No dev server or tailnet serve is running.

## Standing owner directions (verbatim from the handler-1 prompt, 2026-11-22)

- "Stop and ask the owner before anything the plan marks as his (taste choices, feel-slice previews, stage sign-offs), after rewriting the state note."
- "Tasks 01, 01b, 01c and 02 may go to master when accepted, by the normal publish sequence (`just publish`), because they show a learner nothing new. Tasks 03 to 07 accumulate on the work branch and go to master together."
- "CI deploys only when every job passes: a task that changes the workspace migrates its desktop tests in the same publish. Phone layouts are out of scope until task 09; skip a phone check the work breaks and list it in task 09."
- "When the owner needs to see something, serve it to the tailnet with `tailscale serve` and give the tailnet URL, never localhost."
- Successors start from the main checkout with `claude --bg -n 'Board workspace handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this note>"`, confirm with `claude logs <id>`, and pass this rule on.
- Message the "UX picks app-wide planner" session when a plan statement contradicts the code; code is the authority.

## Task status

- Setup: done. Planning files on the branch (`67d7f160`); night tooling copied (`9e1e58ce`, `docs/reviews/ux-picks-app-wide/night-tooling/`, excluded from ESLint).
- 01c: step 1 (copy) done; slices 1 to 5 not started (after 01 and 01b, as the README orders).
- 01: in progress — exploring master's write paths for the arbiter core design.
- 01b, 02 to 10: not started.

## Open items

- Daily scheduled run 2026-11-22: success.

## Next slice's brief inputs

- Task 01 slice 1 (arbiter core): handler-owned design, pure TS, no React/JSXGraph.
