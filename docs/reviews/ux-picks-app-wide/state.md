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

- Setup: done. Planning files from `ux-picks` (`67d7f160`); night tooling copy in `night-tooling/` (lint-excluded, as is this whole review folder).
- **01 accepted and on master**: published `a70174c2` (`just publish`, runtime recipe). CI run 45037401751 was in progress at handoff: check it once with `just ci a70174c2`; if red, fix before pushing anything else.
- **Since the publish, on the work branch only** (head `2155c0f4`, pushed to `origin/board-workspace`, not yet on master; publish them with the next accepted batch, `--base a70174c2`):
  - `1e16c8f8` view-site table for 01b (`view-sites.md`).
  - `da53cdbf` plan corrections asked by the planner (01b count 75 in 49 non-test files and search acceptance incl. other view methods; 01 check covers bound pilots only; 08 binds all and adds an `IterationController` `useLease` passthrough as shared code), 01b design note, arbiter doc comment conditions a-d.
  - `c0ed55bc` learner source/span split (planner condition c): ambient `learner` source only during input-event dispatch; spans only hold changed keys. Tests for conditions a-d with observed failures; all writes, pilot and playback tests pass. Not yet run: full `just check` and the all-graph suites at this head (do that before publishing).
  - `2155c0f4` dev-mode drag check (real input, dev server, strict): no untagged write on any pilot.
- 01b: slice 1 (classification) done; design in [`01b-design.md`](01b-design.md) (adapter per board in `GraphSession`; intent bound as arbiter key `view`; learner pan/zoom recognised through the `boundingbox` event under the learner source; resize not a write; Presets store the intent). Next: slice 1 of the design (adapter core + worker tests).
- 01c: step 1 done; slices 1-5 after 01b. Slice 4 (doubled-path `history-entry-bridge.js` 404 in dev) seen again in the dev check.
- 02 to 10: not started.

## Decisions taken in 01 (handler)

- Source is global: `runAs` scopes, plus an ambient learner source open only during the dispatch of a learner input event (window capture listeners, `learnerInputTagging.ts`). Spans (pointer/key down to release, trusted events only) hold the keys the learner's input changed. Synthetic test events pulse; tests use `beginLearnerGesture()` or `runAs("learner", ...)`.
- The untagged check compares bound readers' values after each store change, at the end of each scope and input dispatch, and on a binding's own change channel; strict = `import.meta.env.DEV`.
- Only the five pilots bind in 01; every graph binds in 08.
- A lease started inside a learner span (Play click) is not blocked by that span's holds.
- Lesson scene replacements (Next/Back) do not check holds; only `parameters.write(key, v, 'lesson')` is refused on a held key.
- Arbiter domain-refusal messages in phase portrait and linear map bindings are English and unused by the UI; localize when pucks (05) consume them.
- Measurement (`measure/RESULTS.md`): no regression; slice 6 gate for task 05 met. Rerun command there.

## Open items

- For the owner (behaviour change, already live on master): touching a control of a playing parameter pauses its playback on the pilots (De Casteljau already did); Play does not start while the learner holds the played value. Holds on the pilots only until task 08.
- 2026-11-22: a worker wiped the shared `node_modules` removing its worktree; restored with `npm ci --prefix <main checkout>`. Only the handler creates or removes worktrees.
- A failed publish worktree `.claude/worktrees/publish-9dfeaddb-9ddf3c` is kept (whitespace failure); the gate removes it after 24 h.
- The owner allowed heavy runs on 2026-11-22; run them one at a time (the machine ran out of memory once).

## Next slice's brief inputs

1. `just ci a70174c2` once; then `just check` at the branch head and publish `1e16c8f8..2155c0f4` (runtime recipe, base `a70174c2`).
2. 01b slice 1: adapter core per `01b-design.md`, pure over a minimal board interface; the handler designs, a `bezeg-worker` writes the tests (brief pattern: `briefs/01-arbiter-tests.md`).
