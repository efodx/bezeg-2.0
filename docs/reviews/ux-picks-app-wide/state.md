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
- **07** all slices in (branch only): fit core `33d1e988`; director `0e77614c` (design `briefs/notes/07-view-director-design.md`; Samodejno `bezeg.view.autofit`); marks `3ee46960`; morph 3a `5a4e2981` (`07-morph-design.md`); follow view 4 `7e58f2f5` (`07-follow-intent-design.md`; latest writer wins; log-space glide size; bisection declared, `equalAxisUnits` false `0e86c5f6`); old fit only on undeclared graphs 5 `b2cc1f2a`; reveal 3b `29591c41` (`07-reveal-design.md`).
- **Movable pucks strip** accepted: `576310d7`, `fb3998b4` (`briefs/notes/05b-*.md`); lesson Back/Next kept clear of the strip `a10ef63c` (rule 2i last step).
- **06** all slices in: contract `91942f3b`, hover ghost `683141d0`, sweep `d434ad91`, fan `922fec12`, back-off `88772b95` (8 ms budget, 150 ms rest; notes `briefs/notes/06-*.md`).
- **03-07 release gate passed 2026-11-25 at `b9f6b091`** (`smoke/release-0307.md`, fixes `briefs/notes/release-0307-fixes.md`): full `just check`; fuzzer 50 seeds on Taylor, transformations (2 load flakes, replays pass), De Casteljau (1), linear-map, phase portrait, bisection, Taylor lesson; other specs 239/0 failed; guided lessons all pass. Waiting for the owner's sign-off.
- MathJax nesting crash fix also on master (`a6fb3b3e`, deployed).
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
- Pre-existing (`smoke/07-morph-3a-baseline.md`): Taylor lesson Next 9->10 at 1440x900 stalls ~1.1 s; Taylor Back on step 6 returns 3.5 % off. Phase-portrait lesson at 1280x720: the strip now covers the right column's folded heads (Orodja, Legenda) instead of Back/Next. Bisection's next-step button sits in the folded Orodja card outside lessons. During a morph a preview capture runs the morph's `atTargets` writes (redraws per morph frame). Phone: bisection 390x844 view check failed once (task 09).
- Taylor's preset reset does not restore the view after a pan (seen in 07 smoke); likely pre-existing, check against master before 08.
- Deferred (owner 2026-11-24): resizable cards, height first (stored height reuses the cut), width later.
- Keyboard card moves step a virtual pointer, not anchor to anchor; offer anchor hopping if the owner wants it.
- Perf follow-ups: `ReadoutsBody.tsx:82` getBoundingClientRect per row layout effect; a store write re-renders GraphHost, BoardCards and every readout row. Taylor 4x input delay ~11 % above master like for like.
- Free-play script: 15-16 actions per 60 s run fail (likely timeouts, uninvestigated). "Lesson decasteljau exit en" timed out once under load, passes alone.
- `DecasteljauGraph2.tsx` start-after-commit pattern (check in 08); recheck inventory new strings before 08. ErrorPage text dark on dark; Povrni after animation-only changes appears on the next event.

## Next slice's brief inputs

1. **Owner asked 2026-11-25 (handler 7)** for (a) sign-off of the 03-07 release and (b) the feel check on the 4472 tailnet preview `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/` (serves the `b9f6b091` build): movable strip; view director (glides, Samodejno, wide views at 1280x720); previews (dim the live curve?), back-off budget 8 ms / rest 150 ms; sweep (25 % / 4 s); fan (300 ms rest, opacity 0.4/0.7); lesson morph (250 ms ease-out) and reveal (fade in, ghost fade out); big pans (bisection step 11 moves up to 55 % of a width per frame): longer or ease-in-out glide? Record his answers; fixes first, then rebuild (`just build`; 4472 serves `build/` live).
2. After sign-off: publish 03-07 to master together (`just publish --background` with `--recipe runtime --base <origin/master> --commits <ids>` from a worktree off master, or rebase the branch; master already has 01-02 cherry-picks and `a6fb3b3e`, so expect skipped duplicates), `just publish --wait`, `just ci <sha>`. Then task 08 (blocker triage first).
