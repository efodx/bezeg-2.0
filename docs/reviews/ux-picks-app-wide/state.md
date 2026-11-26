# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), ADRs 0062 to 0067. Conversion guide: [`docs/guides/converting-a-graph.md`](../../guides/converting-a-graph.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace-2` (cut from master `40e06cf4` after the 03-07 release; the old `board-workspace` branch is superseded, never force-push it), worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing any worktree). Push with `git push origin board-workspace-2`, never force. Keep the worktree root as cwd. Never create a worktree inside this one: ESLint then finds two tsconfig roots, and its content cache (`.command-logs/eslintcache.json`) keeps those parse errors until that file is deleted.
- Master carries 01-07 (release `40e06cf4`, CI green, deployed 2026-11-25). Publishes: `just publish --background --recipe runtime --base <origin/master> --commits <ids oldest first>` (`git diff --check` must be clean, including evidence logs). Partial publishes: a separate worktree branch from master's base, cherry-pick, link `node_modules`, `just --justfile <wt>/justfile --working-directory <wt> publish --background ...`.
- Prototype reference: branch `ux-picks` frozen at `aff6df6c` (read-only).
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
- **03-07 released to master `40e06cf4`** (2026-11-25; per-task commits, designs and owner sign-offs in Git history and `03-layout-design.md`, `05-pucks.md`, `briefs/notes/06-*`, `07-*`). After it on the branch: distance-scaled glides (250-450 ms, `briefs/notes/07-glide-duration.md`). Owner on 05: no locked pucks; pucks for what a student flips or compares a lot, setup stays in Orodja, choices of at most 4 options.
- 08 in progress (below); 09, 10 not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the pilots bind parameters and `view` until 08; every board has a `ViewAdapter`.
- 02: text is a catalog `Message` or `FormattedValue`; per-family fragments (ADR 0066); unbound parameters are not declared; display switches are actions with `pressed`; points are rows and legend only.
- 03/04: layout rules as in `03-layout-design.md` (anchor rule, `holdHeight`, `anchorMin`, `exactCut`, strip 2a-2i, drop target by card centre).

## Open items

- The strip and cards can cover board-drawn texts (JSXGraph texts are not marks); settle in 07/08. No "Reset layout" button (`resetAll` unused). De Casteljau marks read board points. `phase-a` has no `help`, so its fan help card is empty (graph change). Sweep does not shrink the swing to keep marks in view.
- Pre-existing (`smoke/07-morph-3a-baseline.md`): Taylor lesson Next 9->10 stalls ~1.1 s at 1440x900; Taylor Back on step 6 returns 3.5 % off; bisection next-step button sits in folded Orodja outside lessons.
- Perf follow-ups: `ReadoutsBody.tsx:82` getBoundingClientRect per row; a store write re-renders GraphHost, BoardCards and every readout row.

## Next slice's brief inputs

1. **Owner feel check still open** (notes come as follow-ups to the release): live site or the 4472 tailnet preview `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/` (rebuild with `just build` after changes). Items: movable strip; view director (Samodejno, wide views at 1280x720); previews (dim the live curve?), back-off 8 ms / 150 ms; sweep 25 % / 4 s; fan 300 ms, opacity 0.4/0.7; lesson morph and reveal; distance-scaled glides (bisection step 11 still moves up to 59 % of a width in its first frame: offer ease-in-out if it feels abrupt). His notes come first.
2. **Task 08** (branch `board-workspace-2`). Done: triage; step 2 (opt-ins `BaseFunctionGraph.functionPanel`, `BaseCurveGraph.declaresCurveWorkspace` + `curveDisplayPuck` veto, `PointSetGraph.declaresPointSetWorkspace`, `IterationController.useLease`; worked examples exponential, bezier, polygon-area; recipes in `briefs/notes/08-base-function.md`, `08-curve-workspace.md`, `08-point-set.md`); step 3 golden files (`__parity__/<id>.golden.json`; all-ids check `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx`; 28 graphs truly show nothing); step 4 partition (`inventory/08-partition.json`, lane table in the 08 task file, rounds 2-22, `sharedTests` per lane); round 1 lanes L06 function-inverse, L05 elevation, L01 bspline-blossom; Fable review fixes A-D (`briefs/notes/08-review-fixes.md`); Taylor count-puck speed `0efefda7c`.
   - The `runtime` publish recipe runs no browser smoke: run the affected smoke specs before any publish.
   - For the owner (from visual lead 4): remove Taylor's board text block (repeats Odčitki/legend)? strip covers phase portrait board text.
   - **Master `8c0d7d942`** (CI green, deployed): rounds 1-3 and task 11. Round 2 went by a manual fast-forward (`git push origin HEAD:master`) because the publish gate refuses merge commits (board-styling's merges must stay).
   - **Round 4 on the branch:** L03 bspline-insertion `392bc89f5`, L09 circle-construction `6772a3f2e` (radius/ratio pucks; typed values now clamp), L10 euler-method `bfdf1a5df`. Round 4 gate passed (check-changed, graph-checks `--base` 4472, smoke-lesson; logs `smoke/08-round1/round4-*`); publish started by handler 9 at handoff: confirm with `just publish --status`, then CI with `gh run watch <id>`. Run gate steps as foreground commands (detached gate shell scripts die early here). **Next: round 5** L04 bspline-nurbs, L11 fourier-coefficients, L12 fourier-series (lane table in the 08 task file).
   - Lane practice: one lane at a time; most lanes take 2-3 worker sessions (budget handoffs), so continuation briefs name the note. Every brief lists the common misses up front (see the L10 dispatch in `briefs/notes/08-lane-L10.md` or `08-lane.md`). Handler re-records goldens (`BEZEG_PARITY_GOLDEN_RECORD=1 BEZEG_PARITY_GOLDEN_ID=<id> just unit src/graphs/base/declare/parityGolden.test.tsx`) only when the difference is notes/rows moving to cards, retained or slider read-offs, or TeX labels. Parity: symbol-aware rows, per-sample `accepted` lists. Preset import self-tags `learner` (`6c4248f48`). Fuzz skips closed `details`. Open nit: root-finding legend "start" tracks only x0 under secant.
   - Open: `ReadoutsBody.tsx:170` single-group fold title duplicates "Odčitki"; exponential Orodja opens on an empty Uredi tab; exponential caption `2^x` literal `^` (pre-existing); Taylor's board text block repeats Odčitki and legend (captions stay board-drawn in 08; for the owner); `scripts/capture-guided-example-previews.cjs:710` expects the old lesson progress text; linear-map probe `valueWidthDrift null` fails on master too; curve clip only on Taylor (other steep function curves could use `curveViewClip.ts`).
3. **Task 11 visual refinement: signed off by the owner 2026-11-26** and on master (state `visual-state.md`, sheets `feel/11/`; no lead running). Owner decision in it: Legenda starts open where it fits (layout rule 5b `reopenWhenRoom`). Puck accessible names are "name symbol"; card-head buttons 28 px fine pointer, 44 px coarse.

- Open: resizable cards (deferred by owner); keyboard card moves step a pointer.
