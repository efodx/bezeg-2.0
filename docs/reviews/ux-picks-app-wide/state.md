# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), ADRs 0062 to 0067. Conversion guide: [`docs/guides/converting-a-graph.md`](../../guides/converting-a-graph.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace`, worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing any worktree). Push with `git push origin board-workspace`, never force. Keep the worktree root as cwd. Never create a worktree inside this one: ESLint then finds two tsconfig roots, and its content cache (`.command-logs/eslintcache.json`) keeps those parse errors until that file is deleted.
- Master carries 01c and 02 as cherry-picks (`901f055c`); a later rebase onto master skips the duplicated patches. Partial publishes: a separate worktree branch from master's base, cherry-pick, link `node_modules`, `just --justfile <wt>/justfile --working-directory <wt> publish --background ...`.
- Prototype reference: branch `ux-picks` frozen at `aff6df6c` (read-only).
- Servers (handler 5's shells; they die with the session or under memory pressure): Vite dev `http://127.0.0.1:4483/bezeg-2.0/` (`npx vite --port 4483 --strictPort --host 127.0.0.1`); production preview 4472 serves this worktree's `build/` (`just preview 4472`; refuses to start if sources changed since `just build`); `tailscale serve` on 4472 is set: `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/`. One heavy run at a time: concurrent runs time unit tests out.

## Standing owner directions (verbatim from the handler-1 prompt, 2026-11-22)

- "Stop and ask the owner before anything the plan marks as his (taste choices, feel-slice previews, stage sign-offs), after rewriting the state note."
- "Tasks 01, 01b, 01c and 02 may go to master when accepted, by the normal publish sequence (`just publish`), because they show a learner nothing new. Tasks 03 to 07 accumulate on the work branch and go to master together."
- "CI deploys only when every job passes: a task that changes the workspace migrates its desktop tests in the same publish. Phone layouts are out of scope until task 09; skip a phone check the work breaks and list it in task 09."
- "When the owner needs to see something, serve it to the tailnet with `tailscale serve` and give the tailnet URL, never localhost."
- Successors start from the main checkout with `claude --bg -n 'Board workspace handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this note>"`, confirm with `claude logs <id>`, and pass this rule on.
- Message the "UX picks app-wide planner" session when a plan statement contradicts the code; code is the authority.
- Owner, 2026-11-22: never end a turn with nothing running and nothing asked.

## Task status

- **01, 01b, 01c, 02 accepted and on master** (`901f055c`); master CI green. Details: `02-sizing.md`, ADR 0067, guide section 6.
- **03 accepted `bea9724f`** (branch only). Design `03-layout-design.md`. Deferred (`smoke/03-acceptance.md`): cards cover data until 07; `readoutHelp` not rendered; fold button named by title; legend drops swatched entries.
- **04 accepted 2026-11-24** (owner: docking feels nice; branch only): all slices in; slice 5 closed by the owner (default stands). Slice 9 specs `8141dd65`, lesson card `bef40272`, strip fit `3a2add33`, measure perf `1b1983b6`, MathJax nesting crash `8ac2ac68`, centre-based docking (owner feedback) in `6091f560`. Strip rules 2a-2i in `03-layout-design.md` (2h/2i: as a last resort side and centre cards fold, even frame-opened ones, never the lesson card); lesson card `exactCut` keeps Next fixed (`2adfc16d`). Acceptance walks: `smoke/04-accept-*`, `smoke/04-visual-*`.
- **05 accepted 2026-11-24** (owner: toggle/choice pucks feel nice; branch only): pucks, test migration `55f9ee99`, catalogue, fuzzer `1d9c9997`, production remeasure `e201b175` (`measure/RESULTS-05-perf-fix.md`). Owner 2026-11-24 in `6091f560`: no locked pucks (inapplicable parameters are not declared); slice 6 rule (pucks for what a student flips or compares a lot; scene setup and housekeeping stay in Orodja; choices of at most 4 options): toggle/choice pucks on Taylor show-error, linear map conic/pivot, phase system/equilibrium, Coons shown/linked corners, De Casteljau full curve, triangle centres (rule and decisions in `05-pucks.md`, notes `briefs/notes/05-toggle-choice-pucks.md`). Owner: feel "okay", styling later.
- **07** slice 1 `33d1e988`: pure fit core `src/workspace/view/` (note `briefs/notes/07-fit-core.md`). interp-runge fixed in the graph's own view `80daef35`. **Slice 2a accepted `0e77614c`**: view director (design `briefs/notes/07-view-director-design.md`, handoff `briefs/notes/07-director-2a.md`), Samodejno switch, Taylor marks; only learner navigation (`ViewAdapter.navigating`, board pan/zoom) pauses; Reset/Preset/lesson view changes glide; Esc ends a glide without pausing; dispose shows the intent (`clearFitted`). Smoke `smoke/07-2a-smoke.log`. Slice 2b (marks on the other 2D pilots) next.
- **06** slice 1 accepted `91942f3b`: `PreviewGeometry` contract, `previewable` mark, phase portrait `phase-a` geometry, experiment removed. Decisions at the end of `briefs/notes/06-preview-proposal.md`. Slice 2 (overlay, hover entry points) next.
- 08 to 10: not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the pilots bind parameters and `view` until 08; every board has a `ViewAdapter`.
- 02: text is a catalog `Message` or `FormattedValue`; per-family fragments (ADR 0066); unbound parameters are not declared; display switches are actions with `pressed`; points are rows and legend only.
- 03/04: layout rules as in `03-layout-design.md` (anchor rule, `holdHeight`, `anchorMin`, `exactCut`, strip 2a-2i, drop target by card centre).

## Contract gaps (decide at the 08 gate)

Listed in `docs/guides/converting-a-graph.md` section 6; 07's fit core adds: `ViewMarks` has no reach tier, zoom limits or `equalAxisUnits`.

## Open items

- Phase-portrait linearization at 1280x720: rule 2i folds the Orodja the frame opened for the seed count (one click away). Revisit with 07's view fit or the resizable cards.
- Movable pucks strip (owner 2026-11-24: one unit by a grip; bottom row left/centre/right or left/right side column; stored; after 07's director, before the 03-07 release; reason: "I could put stuff next to them, but couldn't move them", so cards make room for it like a card). Design `briefs/notes/05b-movable-strip-design.md`.
- Taylor's preset reset does not restore the view after a pan (seen in 07 smoke); likely pre-existing, check against master before 08.
- Deferred (owner 2026-11-24): resizable cards, height first (stored height reuses the cut), width later.
- Keyboard card moves step a virtual pointer, not anchor to anchor; offer anchor hopping if the owner wants it.
- Perf follow-ups: `ReadoutsBody.tsx:82` getBoundingClientRect per row layout effect; a store write re-renders GraphHost, BoardCards and every readout row. Taylor 4x input delay ~11 % above master like for like.
- Free-play script: 15-16 actions per 60 s run fail (likely timeouts, uninvestigated). "Lesson decasteljau exit en" timed out once under load, passes alone.
- `DecasteljauGraph2.tsx` start-after-commit pattern (check in 08); recheck inventory new strings before 08. ErrorPage text dark on dark; Povrni after animation-only changes appears on the next event.

## Next slice's brief inputs

1. Movable strip: slice A `576310d7` (layout, rules 2j-2l); 07 slice 2b `3ee46960` (marks on the four other 2D pilots). Slice B (grip `StripGrip.tsx`, drag, keyboard ring, column rendering, term "krmilniki") is uncommitted; a fix worker adds the 2j fallback (strip widens beyond the column, never above the board top, else bottom-left rules) and grip room in `puckSlots`; notes `briefs/notes/05b-strip-b.md`. Then: review, `just check-changed`, smoke, commit. No "Reset layout" button exists (`resetAll` unused).
2. Open from 2b (`briefs/notes/07-marks-2b.md`): views very wide at 1280x720 (owner feel); the linear-map lesson showed 2 steps at 1280x720 vs 7 at 1440x900 (investigate); De Casteljau marks read board points.
3. 06 slice 2 (ghost overlay, hover on puck track, tools slider, count -/+; tooltip key), then 07 slices 3-5, then the 03-07 release gate (full `just check`, full smoke, owner feel of director, strip and previews on the tailnet preview).
