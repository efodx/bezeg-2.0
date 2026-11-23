# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), ADRs 0062 to 0067. Conversion guide: [`docs/guides/converting-a-graph.md`](../../guides/converting-a-graph.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace`, worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing any worktree). Push with `git push origin board-workspace`, never force. Keep the worktree root as cwd.
- Master carries 01c and 02 as cherry-picks (`901f055c`); the branch has the same changes under other ids, plus task 03 work. A later rebase onto master skips the duplicated patches. To publish only part of the branch, handler 3 used a separate worktree branch from master's base, cherry-picked the slice, linked `node_modules`, and ran `just --justfile <wt>/justfile --working-directory <wt> publish --background ...` (worked; the guard allows `git -C <nested worktree>`).
- Prototype reference: branch `ux-picks` frozen at `aff6df6c` (read-only).
- Servers (handler 3's shells): dev `http://127.0.0.1:4483/bezeg-2.0/` (Vite, strict); production preview `http://127.0.0.1:4471/bezeg-2.0/` (build of `af70b47c`). 4482 is handler 2's. Memory was short once (Claude Code stopped shells): one heavy run at a time.

## Standing owner directions (verbatim from the handler-1 prompt, 2026-11-22)

- "Stop and ask the owner before anything the plan marks as his (taste choices, feel-slice previews, stage sign-offs), after rewriting the state note."
- "Tasks 01, 01b, 01c and 02 may go to master when accepted, by the normal publish sequence (`just publish`), because they show a learner nothing new. Tasks 03 to 07 accumulate on the work branch and go to master together."
- "CI deploys only when every job passes: a task that changes the workspace migrates its desktop tests in the same publish. Phone layouts are out of scope until task 09; skip a phone check the work breaks and list it in task 09."
- "When the owner needs to see something, serve it to the tailnet with `tailscale serve` and give the tailnet URL, never localhost."
- Successors start from the main checkout with `claude --bg -n 'Board workspace handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this note>"`, confirm with `claude logs <id>`, and pass this rule on.
- Message the "UX picks app-wide planner" session when a plan statement contradicts the code; code is the authority.
- Owner, 2026-11-22: never end a turn with nothing running and nothing asked.

## Task status

- **01, 01b, 01c, 02 accepted and on master** (`901f055c`, pushed 2026-11-23). Its CI went red: `tests/smoke-catalog.cjs` rejected the fragment spread in `sl.ts`/`en.ts` (tooling tests and the guided-lessons smoke job). Fix `f9043d0d` on master via a background publish started by handler 3 (branch copy `7225b332`); confirm with `just ci <pushed sha>` that both workflows pass and deploy ran. 01c: 50-seed matrix passed on four pilot routes and the Taylor lesson after one real fix (`057fc189`, a De Casteljau play start surviving a learner write); every other failure was Vite HMR or a 500 from workers editing under the dev server, and its replay passed. 02: all eight pilots declare and pass `just graph-check <id>`; preview mechanism ADR 0067 (geometry from state; shadow board rejected on 4× numbers); sizing in `02-sizing.md`.
- **03** (branch only): slice 1 design `03-layout-design.md` + pure `src/workspace/layout/boardLayout.ts` (18 tests, `0acfc95b`); slice 1a measure pass `measureCards.ts`/`useMeasuredCards.ts` (`49f4bb6c`, lint fix `af70b47c`); slice 4 `storedLayout.ts` (`e64662c1`). Slice 2 card shell `src/workspace/cards/CardShell.tsx` and slice 3 bodies (`ReadoutsBody`, `LegendBody`, `SectionBody`, `Tex`) in `dd089ff9`, with fragments `workspace.ts` and `workspace-shell.ts` (handler rewrote the Slovenian announcements around "kartica" for gender agreement). Nothing wired or rendered yet. Remaining: the presenter that mounts cards on the pilots (layoutBoard + useMeasuredCards + CardShell + bodies + stored layout; old readout/legend hidden on declared graphs), 1b (board input, surface camera, figure export), 5 label halo, 6 docking feel (owner preview), acceptance. Open from the workers: fold button's accessible name is the card title; `readoutHelp` not rendered; group folds plan in a layout effect from an `available` prop; legend drops entries a readout row already swatches.
- 04 to 10: not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the pilots bind parameters and `view` until 08; every board has a `ViewAdapter`.
- 02: text is a catalog `Message` or `FormattedValue` (no letters; math with letters uses a fragment template key); per-family fragments (ADR 0066); unbound parameters are not declared; display switches are actions with `pressed`; statuses in `status`; points are rows and legend only; parity counts a control's read-off as covered by the parameter with that symbol.
- 03: layout rules as in `03-layout-design.md` (band of `maxSpan` for defaults, stored docked placements at board edges, strip reserves only the left column, centre width capped between side columns, drag freezes folds, integer order).

## Contract gaps (decide at the 08 gate; list in the guide, section 6)

Formula value kind; point and point-set parameters; numeric choice values; board captions and insets; highlighting a status line; the 3-highlight cap (Coons interior net); live value during playback (state lags); parity ignores `status`; multi-object legend entries; `RationalDecasteljauGraph` inherits De Casteljau's declaration; Coons legend visibility derives from switches, not meshes; linear map's five unrecorded modes now render from the declaration.

## Open items

- Measure hook remeasures only on id/width change or one font/typeset event; slice 3 needs a content key (row group appearing, language switch).
- `DecasteljauGraph2.tsx` has the same start-after-commit pattern as the fixed I1 bug (check in 08).
- Probe gaps (`measure/probe-baseline.md`): board pan measured nothing on transformations and at 1024 on De Casteljau and phase portrait.
- Inventory's 6 new-string candidates is implausibly low; recheck before 08.
- For the owner (stage sign-off): Esc pauses playback on board graphs, and touching a playing parameter pauses it (both on master now). ADR 0067 reverses the spec's preview recommendation (shadow board first) on measured numbers.

## Next slice's brief inputs

1. The CI fix is on master (`f9043d0d`, publish worktree removed). Run `just ci f9043d0d`: both workflows green and deploy ran. If red, fix before anything else is pushed.
2. Task 03 presenter: mount the cards on the pilots only, wired to `layoutBoard`, `useMeasuredCards`, `CardShell`, the bodies and `storedLayout`. An undeclared graph keeps its present panels until task 04's fallback. Prototype references: `git show aff6df6c:src/uxPicks/dock/DockCard.tsx`, `.../declare/ReadoutCard.tsx` (behaviour only, not visuals). The owner's drag rules are in task 03 slice 2. Tests that address the inspector move in the same publish as the 03-07 release.
3. Slice 1b: point-set board clicks (triangle centres), surface camera drags (Coons), figure export without cards.
4. Slice 6 feel and the `maxSpan` value: show the owner a tailnet preview (`tailscale serve`) after rewriting this note.
