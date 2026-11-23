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

- **01, 01b, 01c, 02 accepted and on master** (`901f055c`). Master CI is green and deployed at `b2dc3e47` (handler 4, 2026-11-23): `f9043d0d` fixed the catalog parser; `b2dc3e47` (branch `233ff51e`) fixed a MathJax load timeout that fired after jsdom teardown (`window.clearTimeout` → global timers). 01c: 50-seed matrix passed on four pilot routes and the Taylor lesson after one real fix (`057fc189`, a De Casteljau play start surviving a learner write); every other failure was Vite HMR or a 500 from workers editing under the dev server, and its replay passed. 02: all eight pilots declare and pass `just graph-check <id>`; preview mechanism ADR 0067 (geometry from state; shadow board rejected on 4× numbers); sizing in `02-sizing.md`.
- **03** (branch only): slice 1 design `03-layout-design.md` + pure `src/workspace/layout/boardLayout.ts` (18 tests, `0acfc95b`); slice 1a measure pass `measureCards.ts`/`useMeasuredCards.ts` (`49f4bb6c`, lint fix `af70b47c`); slice 4 `storedLayout.ts` (`e64662c1`). Slice 2 card shell `src/workspace/cards/CardShell.tsx` and slice 3 bodies (`ReadoutsBody`, `LegendBody`, `SectionBody`, `Tex`) in `dd089ff9`, with fragments `workspace.ts` and `workspace-shell.ts` (handler rewrote the Slovenian announcements around "kartica" for gender agreement). Slice 5 label halo `b37ec6d1` (CSS on `#jgbox .JXGtext`). Presenter `e082af01`: `src/workspace/presenter/BoardCards.tsx` mounted by `GraphHost` when `getDeclaration()` is defined, layer a sibling of `#jgbox` in `.workspace-board-stage`; old pilot panels carry `data-declared-panel` and are hidden under `[data-board-cards]`; card rows use `data-card-readout`/`data-card-legend`. Smoke `smoke/03-presenter.md`: board clicks (triangle centres), Coons camera drag, PNG/SVG export without cards, keyboard moves with announcements, persistence, presentation mode, chapter activity page, no console errors on the eight routes: pass. Round-1 fixes `fac2c655` (grip drag, fold-then-reload width, one settled live region per Odčitki card, value width reservation: Taylor 319 px constant over a sweep). Slice 6 feel `466f15ea`: transform-only glides (0.26 s ease-out-quart), clip reveal instead of size animation, lift shadow, landing ghost; last settled layout held until a remeasure settles (review P2); evidence `feel/03/note.md` (PNG sheets local only). Engineering review (Sonnet): no P1; its P2/P3 fixed in `466f15ea`. Browser rechecks 1-3 in `smoke/03-presenter.md`. **Accepted `bea9724f`; owner signed off the feel and `maxSpan` 1600 (2026-11-23).** Acceptance `smoke/03-acceptance.md`: no size change after first show, band and far-edge persistence at 3440, fuzzer clean on seven pilots (patch-coons: `scripts/fuzz/fuzz.cjs:52` waits for `[data-navigation], canvas` and times out; harness gap, fix before 05's 50-seed run), inspector clean at 310 px, no page errors at 390 px. Cold first show on Taylor 3.6 s on dev. Known, deferred: cards cover plotted data on linear map, transformations, cross-ratio, De Casteljau, Taylor at 1440 (task 07 view fit, task 08 defaults); lesson highlights unwired (`TODO(task 07)` in BoardCards); `ReadoutsBody.available` (group folds) not passed; first show took ~3.5 s cold on dev; the measure layer duplicates `[data-card-id]` in the DOM. Open from earlier workers: fold button's accessible name is the card title; `readoutHelp` not rendered; legend drops entries a readout row already swatches.
- 04 to 10: not started.

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

1. Running: task 05 puck components unwired (`briefs/05-puck-components.md`, owns `src/workspace/pucks/**` and fragment `workspace-pucks.ts`); task 04 design note (`briefs/04-design.md` → `04-design.md`). Review the note, decide its open points (owner taste choices go to him), split into worker slices with one owner per shared file.
2. Task 05 slice 0 gate (selector-read measurement, playing De Casteljau no costlier than master) before pucks subscribe; then wire the strip into `BoardCards` (`pucks` input of `layoutBoard`) after 04's card layer settles. Fix the fuzz harness for patch-coons first.
3. Feel slices of 04 and 05 go to the owner on a tailnet preview (`just preview <port>` or the 4471 preview, `tailscale serve --bg --http=<port> http://127.0.0.1:<port>`).
