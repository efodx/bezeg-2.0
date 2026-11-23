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

- **01, 01b, 01c, 02 accepted and on master** (`901f055c`). Master CI is green and deployed at `b2dc3e47` (handler 4, 2026-11-23): `f9043d0d` fixed the catalog parser; `b2dc3e47` (branch `233ff51e`) fixed a MathJax load timeout that fired after jsdom teardown (`window.clearTimeout` → global timers). 01c/02 details: `02-sizing.md`, ADR 0067, guide section 6.
- **03 accepted `bea9724f`** (branch only; owner signed off feel and `maxSpan` 1600). Pure layout `boardLayout.ts` (design `03-layout-design.md`), measure pass, `storedLayout`, `CardShell` and bodies, presenter `src/workspace/presenter/BoardCards.tsx`, halo `b37ec6d1`, feel `466f15ea` (evidence `feel/03/note.md`), acceptance `smoke/03-acceptance.md`. Deferred: cards cover data until 07's view fit; `ReadoutsBody.available` not passed; measure layer duplicates `[data-card-id]`; fold button's name is the card title; `readoutHelp` not rendered; legend drops entries a readout row swatches.
- **04** (branch only, in progress): design `04-design.md` (§9 handler decisions). Slice 1 layout API `284a690c` (`reserve`, `defaultFolded`, `budget`, `expanded`, CardShell `headActions`, live measure). Slice 2 Orodja card `fda81ebb` (WIP) + `9efb62c0` (Orodja in the first commit; rule 5 never folds a column's last open card) + `873fbae0` (live-measure commit loop fixed: every route crashed) + `e705f727` (cut at blocks, Več bar reserve, board stage clamp `100svh - 360px` in `DemonstrationWorkspaceIdentity.css` as a stopgap for slice 6, Orodja priority 2.5 below Odčitki). Graph suites migrated `d4c48367` (harness shim only). Slice 3a lesson side uncommitted (portal slot, `registerFrameDeclaration`, locks removed, Povrni with per-frame baseline, `presentation: 'card'`; `LessonSession.reset` change under review) — a worker is finishing checks (`briefs/notes/04-slice3a.md`).
- **05** (branch only): components `77f35732` (range/count pucks, undo pill, help; unwired). Slice 0 gate already met (`measure/RESULTS.md`, `6cb52aed`); remeasure once pucks subscribe.
- 06 to 10: not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the pilots bind parameters and `view` until 08; every board has a `ViewAdapter`.
- 02: text is a catalog `Message` or `FormattedValue` (no letters; math with letters uses a fragment template key); per-family fragments (ADR 0066); unbound parameters are not declared; display switches are actions with `pressed`; statuses in `status`; points are rows and legend only; parity counts a control's read-off as covered by the parameter with that symbol.
- 03: layout rules as in `03-layout-design.md` (band of `maxSpan` for defaults, stored docked placements at board edges, strip reserves only the left column, centre width capped between side columns, drag freezes folds, integer order).

## Contract gaps (decide at the 08 gate; list in the guide, section 6)

Section placement (no field says a section lives in Orodja, so all declared sections stay `section:` cards); no field names a graph's main action in Orodja (budget puts tools first only for undeclared graphs); frame lock reason (pucks take a `lockReason` prop); Formula value kind; `FormattedValue` has no width hint (cards reserve 12ch by sniffing numeric text, `ReadoutsBody.tsx` `numberReserve`); point and point-set parameters; numeric choice values; board captions and insets; highlighting a status line; the 3-highlight cap (Coons interior net); live value during playback (state lags); parity ignores `status`; multi-object legend entries; `RationalDecasteljauGraph` inherits De Casteljau's declaration; Coons legend visibility derives from switches, not meshes; linear map's five unrecorded modes now render from the declaration.

## Open items

- Keyboard card moves step a virtual pointer (10/40 px) and drop on Enter, not anchor to anchor; a few presses may land on the same anchor. Offer anchor hopping in feel round 2 if the owner wants it. A fold waits one measure pass (~70 ms) before it responds.
- `DecasteljauGraph2.tsx` has the same start-after-commit pattern as the fixed I1 bug (check in 08).
- Probe gaps (`measure/probe-baseline.md`): board pan measured nothing on transformations and at 1024 on De Casteljau and phase portrait.
- Inventory's 6 new-string candidates is implausibly low; recheck before 08.
- For the owner (stage sign-off): Esc pauses playback on board graphs, and touching a playing parameter pauses it (both on master now). ADR 0067 reverses the spec's preview recommendation (shadow board first) on measured numbers.

## Next slice's brief inputs

1. Accept slice 3a (review `LessonSession.reset` callers verdict; `just unit src/learning src/graphs/base`), commit. Then slice 3b: lesson card in `BoardCards` (`cardSpecs` lesson spec id `lesson`, priority Infinity, anchor `tl`; append `host.lesson.slot` into its body; live measure; react to `host.lesson.foldRequest`; `lessonCard` prop on DemonstrationWorkspace from GraphHost; frame highlights and `usesTools` from `host.frame`, filling `TODO(task 07)`).
2. Then 04 slice 4 (budget/A9 frame wiring checks), slice 5 taste (Orodja opens at the section vs button on lesson card: owner, with Taylor and bisection shots), slice 6 header (replace the 360 px stage clamp with a flex fill; slim header from 701 px; counter "Korak 1/8 · del 5/5"), slice 9 Playwright test migration (list in `04-design.md` §6; handler-owned), slice 10 documents (ADR 0061 superseded, DESIGN.md, lesson layout spec).
3. Task 05 wiring: puck strip as `layoutBoard`'s `pucks` input in `BoardCards`, pucks subscribe per key; then remeasure (`measure/measure-01.cjs`), fuzzer 50 seeds with puck actions, slice 6 choice/toggle candidates for the owner.
4. Minor: ErrorPage text is dark on the dark background (seen during the loop crash).
