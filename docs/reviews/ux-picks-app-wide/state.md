# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), ADRs 0062 to 0067. Conversion guide: [`docs/guides/converting-a-graph.md`](../../guides/converting-a-graph.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace-2` (cut from master `40e06cf4` after the 03-07 release; the old `board-workspace` branch is superseded, never force-push it), worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing any worktree). Push with `git push origin board-workspace-2`, never force. Keep the worktree root as cwd. Never create a worktree inside this one: ESLint then finds two tsconfig roots, and its content cache (`.command-logs/eslintcache.json`) keeps those parse errors until that file is deleted.
- Publishes: `just publish --background --recipe runtime --base <origin/master> --commits <ids oldest first>` (`git diff --check` clean, evidence logs included), then `just publish --wait` in the background, then `gh run watch` the master run.
- Servers (handler 5's shells, still up 2026-11-25; they die with the session or under memory pressure): Vite dev `http://127.0.0.1:4483/bezeg-2.0/` (`npx vite --port 4483 --strictPort --host 127.0.0.1`); production preview 4472 serves this worktree's `build/` (`just preview 4472`; refuses to start if sources changed since `just build`); `tailscale serve` on 4472 is set: `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/`. One heavy run at a time: concurrent runs time unit tests out.

## Standing owner directions (verbatim from the handler-1 prompt, 2026-11-22)

- "Stop and ask the owner before anything the plan marks as his (taste choices, feel-slice previews, stage sign-offs), after rewriting the state note."
- "Tasks 01, 01b, 01c and 02 may go to master when accepted, by the normal publish sequence (`just publish`), because they show a learner nothing new. Tasks 03 to 07 accumulate on the work branch and go to master together."
- "CI deploys only when every job passes: a task that changes the workspace migrates its desktop tests in the same publish. Phone layouts are out of scope until task 09; skip a phone check the work breaks and list it in task 09."
- "When the owner needs to see something, serve it to the tailnet with `tailscale serve` and give the tailnet URL, never localhost."
- Successors start from the main checkout with `claude --bg -n 'Board workspace handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this note>"`, confirm with `claude logs <id>`, and pass this rule on.
- Message the "UX picks app-wide planner" session when a plan statement contradicts the code; code is the authority.
- Owner, 2026-11-22: never end a turn with nothing running and nothing asked.

## Task status

- **01-02** on master; details `02-sizing.md`, ADR 0067, guide section 6 (contract gaps; 08 triage decisions in the 08 task file).
- **03-07 on master** (designs and sign-offs in Git history, `03-layout-design.md`, `05-pucks.md`). Owner on 05: no locked pucks; pucks for what a student flips or compares a lot, setup stays in Orodja, choices of at most 4 options.
- 08 in progress (below); 09, 10 not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the pilots bind parameters and `view` until 08; every board has a `ViewAdapter`.
- 02: text is a catalog `Message` or `FormattedValue`; per-family fragments (ADR 0066); unbound parameters are not declared; display switches are actions with `pressed`; points are rows and legend only.
- 03/04: layout rules as in `03-layout-design.md` (anchor rule, `holdHeight`, `anchorMin`, `exactCut`, strip 2a-2i, drop target by card centre).

## Open items

- Clip/preview capture recipes (`scripts/demonstration-preview-recipes.cjs`) name old control labels for ~25 converted graphs (now pucks); CI reads only `controlPointCount`. Repoint all rows in one slice before the next clip capture (also B's `curve-geometry.cjs:15,22,34,40,49`, recipes `:32-36,45,46`, `preview-curve-motion.cjs:382,423`, `offset-gate-perf.cjs`, `comb-gate-perf.cjs:121`, `envelope-gate-perf.cjs:93`).
- No "Reset layout" button (`resetAll` unused). De Casteljau marks read board points. `phase-a` has no `help`, so its fan help card is empty (graph change).

## Next slice's brief inputs

1. **Owner feel check open** : live site or tailnet preview `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/` (`just build` after changes). Items: movable strip, view director, previews, back-off, sweep, fan, lesson morph, glides (offer ease-in-out if bisection step 11 feels abrupt).
2. **Task 08** (branch `board-workspace-2`). Recipes `briefs/notes/08-base-function.md`, `08-curve-workspace.md`, `08-point-set.md`; goldens `__parity__/<id>.golden.json` (all-ids check `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx`; graphs in the partition's `declared` list cannot be re-recorded, patch their golden by hand); per-state compare `node .command-logs/golden-cmp.cjs <golden>`; partition `inventory/08-partition.json`, lane table in the 08 task file.
   - **Master `c37c7bae8`** (CI green after rerun): through B fixed-point and sequence, caption sweeps 1-3. Undeclared-graph test fixtures use `ComplexMultiplicationGraph` (L57) and `rational-elevation` (typedPointPaths, L57).
   - **Branch, pushed, unpublished (~40 commits):** L39 waves `fd9072f80` (**held** on owner item 5; re-record its golden before publish: `sh .command-logs/h13-golden-rec.sh waves`), then B L50 rest, B L49 all six, B L44 spline-c1/c2/cn/g1/g1-symmetric, sweep batch 4, board legends (logistic/growth/cobweb, counting-tree leaves), parity determinism `05f203d21` + MathJax fail-fast default in `installBoardShims`, L43 complete, L42 complete, L31 + L32, goldens re-recorded for all of them. Last full unit green before L42 (after L43); every lane since ran its own dirs. Before publishing run `sh .command-logs/h13-gate.sh` (lint range, tsc, golden, round trip, full unit; its tsc/unit lines once exited 127, rerun them directly). Publishing needs the owner's L39 answer, or a `git revert fd9072f80` commit (revert the revert later).
   - **In flight at handoff:** L33 mechanics-descent session 2 (notes `notes/08-lane-L33.md`), uncommitted in the tree; check `git status` and the notes. Then re-record its golden and commit.
   - **Owed:** sweep 5 (declared graphs not in the inventory); layout bugs: Fourier series Orodja overlaps a taller Odčitki, 1280x720 wrapped puck strip over Lekcija (`analysis/sequence?learn=1`), growth at 1280 lesson under the lesson card (director limit); lesson card clips its prompt at 720 px height (L42, L43). `sharedControls.graphs.test.tsx` `openEditTools` uses a fixed 200 ms wait. Geometric-series animation-write fix has no unit test.
   - **Publish:** `just publish --background --recipe runtime --base <origin/master> --commits <base..HEAD oldest first, comma-separated>`, then `just publish --wait` in the background, then `gh run watch`. No heavy worker during a gate.
   - **Stream B** ("Board workspace lane B handler 3", `lane-b.md`, branch `lane-b`) sends ids; pick with `sh .command-logs/h13-pick.sh <id>` (keeps uncommitted edits of shared files; resolve `fragments/index.ts` with `node .command-logs/resolve-fragments.cjs`, take theirs for `lane-b.md`), then warn running workers to re-read. Never pick merges. B next: L44 spline-parameterization, then L47 (free; L42 done).
   - **Next A lanes:** L51 (euler-line, inscribed-angle; inversion, simson-line), L52 bspline-basis (conflicts with done lanes only), then table order; skip B's (L54, L44, L47). Brief template: `briefs/08-lane-L31-L33.md` (rules learned so far). Sonnet workers take 2-4 sessions per demonstration: order work so a handoff leaves a consistent tree.
   - **Browser sweep owed:** rounds 1-10 lessons, caption-under-card check at 1440/1280.
   - Lane practice: shared `08-lane.md` plus a lane brief. When committing a lane, stage its untracked new files (fragment, `__parity__/*.json`, declaration test). Framing pattern: must-marks on the key points, a tight `followView`, never a canvas-sized intent (`89e4245ee`). Check Slovenian rewording yourself (*krmilnik*). The chapter lessons `lattice-paths-cb1/3/4` have no `smoke-lesson` id.
   - Open: `ReadoutsBody.tsx:170` fold title duplicates "Odčitki"; exponential Orodja opens on an empty Uredi tab.
3. Task 11 and audit 2026-11-26 on master (`visual-state.md`, `audit-2026-11-26.md` lists open architecture items).
5. **Still for the owner:** the strip covers phase portrait board text; a wrapped top-centre strip puts the help card over its lower rows; in lesson mode the free column between lesson card and Odčitki (~470 px at 1440) needs more zoom-out than the director 2.2 limit, so wide content sits under cards (L35 prob-simulation rs1/rs3/rs5/rs6, `1c799c6d0`; now also every waves step, L39 held): raise the limit, narrow Odčitki, or accept. **Asked again by handler 13, 2026-11-27.** Taylor (546 px) clear, extrema mostly clear.

- **Owner, 2026-11-27:** two parallel lane streams (A here, B per `lane-b.md`); standing permission to wrap untagged writes in any shared test in `runAs('learner', ...)` with values unchanged; worker HANDOFF 175k; Opus workers for recipe-less lanes L29, L53, L55, L58; tough choices may go to a Fable advisor (Agent `Plan`, model `fable`, effort `high`), for workers by relay (`QUESTION:`); owner-reserved decisions still go to him.
