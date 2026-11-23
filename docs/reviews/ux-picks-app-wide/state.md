# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), ADRs 0062 to 0067. Conversion guide: [`docs/guides/converting-a-graph.md`](../../guides/converting-a-graph.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace`, worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing any worktree). Push with `git push origin board-workspace`, never force. Keep the worktree root as cwd.
- Master carries 01c and 02 as cherry-picks (`901f055c`); the branch has the same changes under other ids, plus task 03 work. A later rebase onto master skips the duplicated patches. To publish only part of the branch, handler 3 used a separate worktree branch from master's base, cherry-picked the slice, linked `node_modules`, and ran `just --justfile <wt>/justfile --working-directory <wt> publish --background ...` (worked; the guard allows `git -C <nested worktree>`).
- Prototype reference: branch `ux-picks` frozen at `aff6df6c` (read-only).
- Servers: dev `http://127.0.0.1:4483/bezeg-2.0/` (Vite); production previews 4471 (old build) and 4472 (handler 5, `build/`, tailnet). One heavy run at a time: concurrent runs time unit tests out.

## Standing owner directions (verbatim from the handler-1 prompt, 2026-11-22)

- "Stop and ask the owner before anything the plan marks as his (taste choices, feel-slice previews, stage sign-offs), after rewriting the state note."
- "Tasks 01, 01b, 01c and 02 may go to master when accepted, by the normal publish sequence (`just publish`), because they show a learner nothing new. Tasks 03 to 07 accumulate on the work branch and go to master together."
- "CI deploys only when every job passes: a task that changes the workspace migrates its desktop tests in the same publish. Phone layouts are out of scope until task 09; skip a phone check the work breaks and list it in task 09."
- "When the owner needs to see something, serve it to the tailnet with `tailscale serve` and give the tailnet URL, never localhost."
- Successors start from the main checkout with `claude --bg -n 'Board workspace handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this note>"`, confirm with `claude logs <id>`, and pass this rule on.
- Message the "UX picks app-wide planner" session when a plan statement contradicts the code; code is the authority.
- Owner, 2026-11-22: never end a turn with nothing running and nothing asked.

## Task status

- **01, 01b, 01c, 02 accepted and on master** (`901f055c`); master CI green, deployed `b2dc3e47`. Details: `02-sizing.md`, ADR 0067, guide section 6.
- **03 accepted `bea9724f`** (branch only; owner signed off feel and `maxSpan` 1600). Design `03-layout-design.md`, presenter `src/workspace/presenter/BoardCards.tsx`, acceptance `smoke/03-acceptance.md`. Deferred: cards cover data until 07's view fit; `ReadoutsBody.available` not passed; measure layer duplicates `[data-card-id]`; fold button's name is the card title; `readoutHelp` not rendered; legend drops entries a readout row swatches.
- **04** (branch only, slices 1-3, 6, 10 in): design `04-design.md` (§9 handler decisions; layout additions in `03-layout-design.md`). Orodja card (last open card never folds, priority 2.5 below Odčitki); lesson card (portal slot, no locks, Povrni, fold = explore, line cuts, placement stored, fold not); header `dccb2b46`; docs `f8c5e694`. Accepted by the handler apart from slice 5 (owner taste) and the feel slice: Taylor walk at 1440/3440 passes (`smoke/04-accept-*`); undeclared graphs at 1024 pass (`smoke/04-visual-*`); live measure is observer-driven (`1b1983b6`).
  Slice 9 (handler 5): Playwright specs migrated `8141dd65` (notes `briefs/notes/04-slice9.md`; fold button 44 px hit target); lesson-card fixes `bef40272` (fold pauses and refocuses; `holdHeight`; nav outside the scroller; anchor rule with `anchorMin`); strip fit `3a2add33` (rule 2 a-g in `03-layout-design.md`). Guided-lessons smoke: 323 pass, 1 fail = interp-runge (task 07, see its acceptance), 20 skipped (phone, listed in 09).
- **05** (branch only): components `77f35732`; strip wired `3f054a66`; graph test migration done `55f9ee99` (`briefs/05-test-migration.md`, notes `05-tests-a/b.md`, `05-puck-fixes.md`): `RangeParameter.bigStep` (value units; composition angle 6 = quarter turn), typed off-grid value snaps with notice `puck_snapped` "Zaokroženo na {value0}.". Browser strip checks pass at 1440/1024 on five pilots (`smoke/05-strip.*`). Harness: `waitForPucks`/`puckControl`/`typePuck`/`openTools`; graph tests need `installBoardShims` plus a `vi.mock` of `loadMathJax`. Catalogue entry, fuzzer and remeasure done; left: slice 6 (owner) and the feel slice.
- 06 to 10: not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the pilots bind parameters and `view` until 08; every board has a `ViewAdapter`.
- 02: text is a catalog `Message` or `FormattedValue` (no letters; math with letters uses a fragment template key); per-family fragments (ADR 0066); unbound parameters are not declared; display switches are actions with `pressed`; statuses in `status`; points are rows and legend only; parity counts a control's read-off as covered by the parameter with that symbol.
- 03: layout rules as in `03-layout-design.md` (band of `maxSpan` for defaults, stored docked placements at board edges, strip reserves only the left column, centre width capped between side columns, drag freezes folds, integer order).

## Contract gaps (decide at the 08 gate; list in the guide, section 6)

Full list in `docs/guides/converting-a-graph.md` section 6 (section placement, Orodja main action, frame lock reason, Formula kind, `FormattedValue` width hint, point parameters, numeric choices, captions, status highlight, 3-highlight cap, live playback value, parity and `status`, multi-object legend, inherited declarations).

## Open items

- Crowding at 1024 (`smoke/04-visual-lesson-pp3.png`, phase-portrait linearization step 3): four locked matrix pucks take two strip rows, each repeating "Zaklenjeno v tem koraku razlage"; the strip sits over plotted curves; cards cover board text. No card overlaps. For the 05 feel slice (owner): compact locked pucks with one shared lock note; strip vs data is 07's view fit.

- Keyboard card moves step a virtual pointer (10/40 px) and drop on Enter, not anchor to anchor; a few presses may land on the same anchor. Offer anchor hopping in feel round 2 if the owner wants it. A fold waits one measure pass (~70 ms) before it responds.
- `DecasteljauGraph2.tsx` has the same start-after-commit pattern as the fixed I1 bug (check in 08).
- Probe gaps (`measure/probe-baseline.md`): board pan measured nothing on transformations and at 1024 on De Casteljau and phase portrait.
- Inventory's 6 new-string candidates looks low; recheck before 08.
- For the owner (stage sign-off): Esc pauses playback on board graphs, and touching a playing parameter pauses it (both on master now). ADR 0067 reverses the spec's preview recommendation (shadow board first) on measured numbers.

## Next slice's brief inputs

1. **Waiting on the owner** (asked by handler 5, 2026-11-23 evening; he said he breaks overnight). Preview: production build of `e201b175` on `just preview 4472` (handler 5's shell), tailnet `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/`. If the shell is gone: `just build`, `just preview 4472`, `tailscale serve --bg --http=4472 http://127.0.0.1:4472`. Questions: (a) 04 slice 5 taste, where a frame's Orodja action shows (`04-design.md` §8): Orodja opens at that section beside the lesson card (default) vs a button on the lesson card; on `/analysis/taylor?learn=1` and `/analysis/bisection?learn=1`. (b) 04 feel (cards, lesson card fold/cut/anchor, Orodja) and 05 feel (pucks: drag, keys, typed entry, De Casteljau Play) incl. the crowding item below. (c) 05 slice 6 choice/toggle puck candidates. (d) Stage sign-off items under Open items. After answers: implement, then 04/05 acceptance closes; next tasks 06 and 07.
2. Gate state at `43ab3eff`+: `just check` passes (930 s); full smoke 562 pass, 1 fail = interp-runge (task 07 acceptance), 26 skipped (phone, task 09). Later commits `8ac2ac68` (MathJax nesting in the measure pass crashed the tab after ~16 folds), `dcd28928` (controls catalogue Puck entry), `1d9c9997` (fuzzer puck actions, 50 seeds x 6 routes clean), `e201b175` (constant puck width, production remeasure `measure/RESULTS-05-perf-fix.md`): unit/eslint/build checked per commit; rerun full check + smoke before the 03-07 release.
3. Perf follow-ups (not blocking): `ReadoutsBody.tsx:82` getBoundingClientRect in each row's layout effect forces layout on every value change; a store write re-renders GraphHost, BoardCards and every readout row (2 commits per pointer move). Taylor 4x input delay ~11 % above master like for like.
4. Free-play script: 15-16 actions per 60 s run fail (likely click/drag timeouts, not investigated; `smoke/04-mjx-leak-*`).
5. Minor: ErrorPage text dark on dark; Povrni after animation-only changes appears on the next event. Prototype dev server on 4460 (`npx vite <ux-picks worktree> --port 4460`) was started by handler 4 for comparisons.
