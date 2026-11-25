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
- **04 accepted 2026-11-24** (owner: docking feels nice; branch only). Strip rules 2a-2i in `03-layout-design.md`; lesson card `exactCut` keeps Next fixed. Walks: `smoke/04-accept-*`, `smoke/04-visual-*`.
- **05 accepted 2026-11-24** (owner: toggle/choice pucks feel nice, styling later; branch only). Owner: no locked pucks; pucks for what a student flips or compares a lot, setup stays in Orodja, choices of at most 4 options (rule in `05-pucks.md`).
- **07** slice 1 `33d1e988` (fit core `src/workspace/view/`). Slice 2 accepted: director `0e77614c` (design `briefs/notes/07-view-director-design.md`; only learner navigation pauses; Reset/Preset/lesson glide; Esc ends a glide; dispose shows the intent; Samodejno switch `bezeg.view.autofit`), marks on Taylor and the four other 2D pilots `3ee46960` (`briefs/notes/07-marks-2b.md`); all-graph suites switch Samodejno off `9e37efc1` (timing, not state). Slice 3a accepted `5a4e2981` (handler 7; design `briefs/notes/07-morph-design.md`, notes `07-morph-3a*.md`, smoke `smoke/07-morph-3a-remeasure.md`): range parameters glide across Back/Next, one view glide per step on all pilots (adapter emits when a write drops the fit; director holds the shown box and retargets). Slice 4 accepted `7e58f2f5`; slice 5 (old fit only on undeclared graphs) `b2cc1f2a`; slice 3b (fade in / ghost fade out, `briefs/notes/07-reveal*.md`) `29591c41`. All 07 slices in; owner feel check of morph + reveal pending.
- **Movable pucks strip** (owner request 2026-11-24) accepted: layout `576310d7` (rules 2j-2l, design `briefs/notes/05b-movable-strip-design.md`), grip/drag/keyboard `fb3998b4` (`briefs/notes/05b-strip-b.md`; term "krmilniki").
- **06** accepted: slice 1 contract `91942f3b`, slice 2 hover ghost `683141d0`, slice 5 sweep `d434ad91`, slice 3 overview fan `922fec12` (notes `briefs/notes/06-*.md`; decisions at the end of `06-preview-proposal.md`). Slice 4 (back-off for expensive graphs) not started; only the phase portrait previews (`phase-a`).
- 08 to 10: not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the pilots bind parameters and `view` until 08; every board has a `ViewAdapter`.
- 02: text is a catalog `Message` or `FormattedValue`; per-family fragments (ADR 0066); unbound parameters are not declared; display switches are actions with `pressed`; points are rows and legend only.
- 03/04: layout rules as in `03-layout-design.md` (anchor rule, `holdHeight`, `anchorMin`, `exactCut`, strip 2a-2i, drop target by card centre).

## Contract gaps (decide at the 08 gate)

Listed in `docs/guides/converting-a-graph.md` section 6; 07's fit core adds: `ViewMarks` has no reach tier, zoom limits or `equalAxisUnits`.

## Open items

- Phase-portrait linearization at 1280x720: rule 2i folds the Orodja the frame opened for the seed count (one click away). Revisit with 07's view fit or the resizable cards.
- The strip and cards can cover board-drawn texts (JSXGraph texts are not marks); settle in 07/08. No "Reset layout" button (`resetAll` unused). De Casteljau marks read board points. `phase-a` has no `help`, so its fan help card is empty (graph change). Sweep does not shrink the swing to keep marks in view.
- Pre-existing on the branch before 3a (baseline `f9082643`, `briefs/notes/07-morph-3a-crash.md`, `smoke/07-morph-3a-baseline.md`): phase-portrait puck "Matrika A: a" covers the lesson Next button at 1280x720; Taylor lesson Next 9->10 at 1440x900 stalls ~1.1 s; Taylor Back on step 6 returns 3.5 % off; bisection step 13 jumps 53 % in one frame (slice 4).
- Taylor's preset reset does not restore the view after a pan (seen in 07 smoke); likely pre-existing, check against master before 08.
- Deferred (owner 2026-11-24): resizable cards, height first (stored height reuses the cut), width later.
- Keyboard card moves step a virtual pointer, not anchor to anchor; offer anchor hopping if the owner wants it.
- Perf follow-ups: `ReadoutsBody.tsx:82` getBoundingClientRect per row layout effect; a store write re-renders GraphHost, BoardCards and every readout row. Taylor 4x input delay ~11 % above master like for like.
- Free-play script: 15-16 actions per 60 s run fail (likely timeouts, uninvestigated). "Lesson decasteljau exit en" timed out once under load, passes alone.
- `DecasteljauGraph2.tsx` start-after-commit pattern (check in 08); recheck inventory new strings before 08. ErrorPage text dark on dark; Povrni after animation-only changes appears on the next event.

## Next slice's brief inputs

1. **Owner feel check asked 2026-11-25** on the 4472 tailnet preview (serves `922fec12`'s build): movable strip; view director (glides, Samodejno, very wide views at 1280x720); previews (dim the live curve?); sweep (25 % / 4 s, count +-1 within 3, reduced motion = no button, button place); fan (300 ms rest, opacity 0.4/0.7, returns after track hover, wheel ends it). Record his answers; fixes from them come first. Rebuild the preview after any change (`just build`; `vite preview` on 4472 serves `build/` live).
2. 3a is on the 4472 preview too; add the morph to the owner's feel check. Phase-portrait renderer crash fixed (MathJax nesting, `3dd1eeff`; also on master as `a6fb3b3e`, deployed). Slice 4 accepted `7e58f2f5` (design `briefs/notes/07-follow-intent-design.md`, notes `07-follow-intent.md`): `followView`, latest-writer-wins, log-space glide size, bisection declared, morph rules (no morph when a choice/count changes; `morph: false`). Owner feel item: big pans (bisection n11 ~3 widths) move up to 55 % of a width per frame in 250 ms ease-out; offer a longer or ease-in-out glide. Baseline worktree `Desktop/bezeg-bw-baseline` (`f9082643`, preview 4474; unlink node_modules junction with PowerShell before removing). 06 slice 4 (back-off) delegated 2026-11-25 (handoff `briefs/notes/06-backoff.md`).
3. The 03-07 release gate after that: full `just check`, fuzzer on the pilot routes, full smoke, owner sign-off; then publish 03-07 together to master.
