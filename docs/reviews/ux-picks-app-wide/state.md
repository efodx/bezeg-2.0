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
- 01: implemented and reviewed on the work branch, head `2ab68635` (pushed); NOT yet on master.
  - Code: `src/graphs/base/writes/` (`writeSource.ts` ambient source, learner gesture, scope-end notification; `parameterArbiter.ts` holds, leases, outcomes, untagged check; `learnerInputTagging.ts` window capture listeners). BaseGraph `parameterBindings()`/`parameters`; lesson actions and scenes `lesson`; Preset/Reset/import/figure batch `learner` via `SceneReplacementPlan.source`; a lesson step/frame change ends all leases (as `lesson`); `AnimationDriver.useLease` (chainable). GraphSession `on` defers removal during dispatch, `once()`.
  - Bound pilots: Taylor, transformations, De Casteljau (+ rational, inherits), phase portrait, linear map. Each has a writes test with a seeded untagged write (observed failures recorded). Test harness `perturbModel` runs as learner.
  - Checks done: focused unit runs per file; all-graph suites (GraphTransientState*, graphTeardownContract, PresetRoundTrip.contract, controlsSignature) passed at `694a655c` and at `90f5da1b` per worker; tsc and eslint clean. Engineering review (Sonnet): no blocker; two should-fix applied in `2ab68635` (gesture leaks: context menu, Meta key up, focus loss; rebind releases the old arbiter).
  - NOT done: full `just check` (stopped by Claude Code for low system memory on 2026-11-22 ~14:15; owner asked before restarting), smoke of the five pilot routes plus one lesson, the slice 6 "after" measurement (`measure/RESULTS.md` has the rerun command; needs a build and a preview the handler runs), publish to master.
  - For the owner (behaviour change list): touching a control of a playing parameter stops (pauses) its playback. De Casteljau already paused on seek and on board press on master; phase portrait and linear map now pause when the learner writes the played value. Play does not start while the learner is holding the played value.
- 01b, 02 to 10: not started.

## Decisions taken in 01 (handler)

- Source is global (one JS thread): `runAs` scopes plus an ambient learner gesture from window capture listeners, instead of wrapping each control and the 68 board-handler files. Trusted pointer/key events hold; synthetic (test) events pulse.
- The untagged check compares bound readers' values after each store change, at the end of each write scope and gesture, and on a binding's own change channel; strict = `import.meta.env.DEV`.
- In 01 only the pilot graphs bind; every other graph binds in task 08 (its declaration). Unbound graphs run as before.
- Holds: explicit `hold(key)` (controls that know their key, from task 05) and gesture holds. A lease started inside a learner gesture is not blocked by that gesture's holds (Play click).
- Lesson scene replacements (Next/Back) do not check holds: the learner pressed Next. Only `parameters.write(key, v, 'lesson')` is refused on a held key.
- Linear map takes its own lease because `IterationController` keeps its driver private; a `useLease` passthrough on the controller is a follow-up for task 08.
- Arbiter domain-refusal messages (English, in phase portrait and linear map bindings) are never shown to a learner yet; localize them when a consumer appears (task 05 pucks).

## Open items

- Daily scheduled run 2026-11-22: success.
- 2026-11-22: a measurement worker wiped the shared `node_modules` when removing its worktree; restored with `npm ci --prefix <main checkout>`. Only the handler creates or removes worktrees; briefs forbid it.
- Workers once restored a handler file from their own backup: briefs say back up and restore only owned files.

## Next slice's brief inputs

- When the owner allows heavy runs: `just check` on `board-workspace`; then build, preview (handler), `bezeg-smoke` Sonnet on Taylor, transformations, De Casteljau (play, seek during play), phase portrait (play, slider during play), linear map (iteration play), one Taylor lesson Next/Back; then the measurement rerun; then `just publish --background` of 01 (commits `815e3ac5`..`2ab68635` plus docs), `just publish --wait` in the background.
- After 01 on master: 01b (view adapter), worker table of the 149 `setBoundingBox(` sites first (`docs/reviews/ux-picks-app-wide/view-sites.md`).
