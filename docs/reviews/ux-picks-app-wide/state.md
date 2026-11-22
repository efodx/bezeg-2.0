# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), [ADR 0064](../../adr/0064-source-tagged-scene-writes.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace`, worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing the worktree). No upstream set: push with `git push origin board-workspace`, never force. Use absolute paths or the worktree root as cwd: a `cd` into a subfolder persists and the worktree guard then refuses `git -C`.
- Prototype reference: branch `ux-picks` frozen at `aff6df6c` (read-only; never merge, never copy its param registry or `set`/`setRaw` write paths).
- Handler 2 ran a production preview on 4471 and a dev server on 4482 (both local, no tailnet serve); they may be gone. Start your own if needed (`just preview <port>`; dev: `npx vite --port <p> --strictPort --host 127.0.0.1`).

## Standing owner directions (verbatim from the handler-1 prompt, 2026-11-22)

- "Stop and ask the owner before anything the plan marks as his (taste choices, feel-slice previews, stage sign-offs), after rewriting the state note."
- "Tasks 01, 01b, 01c and 02 may go to master when accepted, by the normal publish sequence (`just publish`), because they show a learner nothing new. Tasks 03 to 07 accumulate on the work branch and go to master together."
- "CI deploys only when every job passes: a task that changes the workspace migrates its desktop tests in the same publish. Phone layouts are out of scope until task 09; skip a phone check the work breaks and list it in task 09."
- "When the owner needs to see something, serve it to the tailnet with `tailscale serve` and give the tailnet URL, never localhost."
- Successors start from the main checkout with `claude --bg -n 'Board workspace handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this note>"`, confirm with `claude logs <id>`, and pass this rule on.
- Message the "UX picks app-wide planner" session when a plan statement contradicts the code; code is the authority.
- Owner, 2026-11-22 (handler 2): "fix it so it doesnt get cleaned up constantly" (the session-cleanup sweep killing background dev servers) — done in `d124fc82`.

## Task status

- **01 accepted, on master** (`a70174c2`, follow-ups `f271c708`, CI green for `a70174c2`).
- **01b accepted** 2026-11-22: `ac5f963b` adapter core, `d8bcbb5f` session/BaseGraph/pilot wiring, `14210c0c` remaining 60 sites, `38fc48c3` smoke evidence and evaluation entry. On master with `d124fc82` (cleanup fix). Design and settled rules: [`01b-design.md`](01b-design.md).
- 01c: step 1 done (copy in `night-tooling/`); slices 1-5 now unblocked (fuzzer, replay cases, probe, doubled `history-entry-bridge.js` path, smoke checklist text).
- 02 to 10: not started.

## Decisions in force (01 and 01b, handler)

- Source is global: `runAs` scopes plus an ambient learner source only during learner input dispatch; spans hold only changed keys. Strict untagged check = `import.meta.env.DEV`.
- Only the five pilots bind parameters and `view` until task 08; every board (main and secondary) has a `ViewAdapter` (`BaseGraph.boardView`; `createAuxiliaryBoard` returns `view`; the surface view has its own).
- `setIntent` (initial, Reset, Preset, lesson, fit, setters), `following` (views derived from scene state in post-commit syncs; not a write), `resizing` (container size; not a write). Task 08 rechecks every `following` site of a graph it binds (`WavesGraph`/`KinematicsGraph` `syncReplacedScene` noted).
- Presets store the intent box (a Preset saved from a hidden board now keeps its view).
- Lesson scene replacements do not check holds; only `parameters.write(key, v, 'lesson')` is refused on a held key. Arbiter domain-refusal messages are English and unused; localize when pucks (05) consume them.

## Open items

- **01b + cleanup fix pushed to master as `38fc48c3`**; check CI once with `just ci 38fc48c3`; if red, fix before anything else. The main checkout was fast-forwarded to it, so the cleanup hook (it runs `$CLAUDE_PROJECT_DIR`'s copy, the main checkout's) keeps listening dev servers now. After a later publish of a hook change, fast-forward the main checkout again.
- For the owner (behaviour on master since task 01): touching a control of a playing parameter pauses its playback on the pilots; Play does not start while the learner holds the played value.
- Heavy runs one at a time (memory). Only the handler creates or removes worktrees.

## Next slice's brief inputs

1. 01c slice 4 first (small, removes the one console error every dev smoke sees): the dev server requests `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js`; find the script tag in `index.html`/Vite config and fix the URL; check in dev and production preview.
2. 01c slices 1-3: port the fuzzer, replay cases and probe from `night-tooling/` behind `just` recipes (task file `01c-check-tooling.md`); the strict dev smoke harness `smoke/devcheck-01b.cjs` is a reference for real-input Playwright on the pilots.
3. Then task 02 (declaration contract; handler keeps the contract types' design).
