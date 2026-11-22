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
- 01: in progress on the work branch (not yet on master).
  - Done: arbiter core `src/graphs/base/writes/` (`writeSource.ts` ambient source + learner gesture; `parameterArbiter.ts` holds, leases, outcomes, untagged check; `learnerInputTagging.ts` window capture listeners, trusted pointer/key events hold, synthetic ones pulse). BaseGraph `parameterBindings()`/`parameters`, bound at mount, observed on every store change; lesson actions/scenes `lesson`, Preset/Reset/import/figure batch `learner` via `SceneReplacementPlan.source`; lesson step/frame change ends all leases; `AnimationDriver.useLease`. GraphSession `on` defers removal during dispatch, `once()` (slice 7). Taylor bound (worked example `015c05a4`) with seeded untagged-write test (observed failure recorded). Commits `815e3ac5`, `71bb7bce`, `015c05a4`, `ad0487fa`.
  - Running: pilot bindings (brief `briefs/01-bind-pilots.md`): De Casteljau + transformations; then phase portrait + linear map. Measurement baseline at `057d8d22` done (`measure/RESULTS.md`; only the 4x Taylor drag rows and Taylor input delay are sensitive; rerun command there).
  - Remaining: phase portrait + linear map bindings; all-graph suites with bindings; slice 6 "after" measurement and the selector-read question (De Casteljau's LiveParameter already gives per-key subscription); De Casteljau playback exception check for the owner; review; publish 01 to master.
- 01b, 02 to 10: not started.

## Decisions taken in 01 (handler)

- Source is global (one JS thread): `runAs` scopes plus an ambient learner gesture from window capture listeners, instead of wrapping each control and the 68 board-handler files.
- The untagged check compares bound readers' values after each store change and at the end of each write/frame scope; strict = `import.meta.env.DEV` (tests and dev).
- In 01 only the pilot graphs bind; every other graph binds in task 08 (its declaration). Unbound graphs run exactly as before.
- Holds: explicit `hold(key)` (for controls that know their key, used from task 05) and gesture holds (keys changed during an open trusted gesture). A lease started inside a learner gesture is not blocked by that gesture's holds (Play click).

## Open items

- Daily scheduled run 2026-11-22: success.
- Workers restoring files by backup once reverted a handler edit: briefs now say keep `cp` backups only of owned files and never restore others.
- 2026-11-22: the measurement worker wiped the shared `node_modules` when removing its worktree (junction); restored with `npm ci --prefix <main checkout>`. Only the handler creates or removes worktrees now; briefs forbid it.

## Next slice's brief inputs

- Pilot binding dispatch for phase portrait (`src/graphs/dynamics/PhasePortraitGraph.tsx`, has AnimationDriver) and linear map (`src/graphs/linear/LinearMapGraph.tsx`), same brief.
