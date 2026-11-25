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
2. **Task 08** (branch `board-workspace-2`, all pushed; nothing of 08 on master yet). Done: triage; step 2 (opt-ins `BaseFunctionGraph.functionPanel`, `BaseCurveGraph.declaresCurveWorkspace` + `curveDisplayPuck` veto, `PointSetGraph.declaresPointSetWorkspace`, `IterationController.useLease`; worked examples exponential, bezier, polygon-area; recipes in `briefs/notes/08-base-function.md`, `08-curve-workspace.md`, `08-point-set.md`); step 3 golden files (`__parity__/<id>.golden.json`; all-ids check `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx`; 28 graphs truly show nothing); step 4 partition (`inventory/08-partition.json`, lane table in the 08 task file, rounds 2-22, `sharedTests` per lane); round 1 lanes L06 function-inverse, L05 elevation, L01 bspline-blossom; owner-requested Fable review fixed in batches A-D (`briefs/08-review-fixes.md`, notes `briefs/notes/08-review-fixes.md`, last commit `8533b27d3`); Taylor polynomial clipped (owner's slow count puck: 20 presses 8.3 s -> 0.9 s, `0efefda7c`); strip slot measuring (`95e2b890e`); Coons pilot's declared pucks now show.
   - **Round 1 gate, in progress at handoff:** `just check` was running (log `smoke/08-round1/check2.log`; last line `exit N`). If green: `just build` (4472 preview serves `build/`), then `just graph-check <id> --route <route without leading slash> --base http://127.0.0.1:4472/bezeg-2.0/ --seeds 5` for exponential-function (functions/exponential), bezier (bezier/curve), polygon-area (compgeo/polygon-area), function-inverse (functions/inverse), elevation (bezier/elevation), bspline-blossom (bspline/blossom), plus a Taylor count-puck spot check; then publish round 1 with everything after `40e06cf4`: `just publish --background --recipe runtime --base <origin/master> --commits <ids oldest first>` and `just publish --wait` in the background. Learner-visible: 6 converted graphs, Coons pucks, Taylor speed.
   - **Promised to the visual lead (do next):** guide + lane-brief rule: when a declaration sets `symbol`, its `label`/row `name` is the bare name ("Središče" + `c`); presenters typeset the symbol; puck labels ≤16 characters, long ones become short name + symbol. Fix Taylor's three labels (`TaylorGraph.tsx:391-407`, keys like `taylor_center_label` "Središče c"; Orodja sliders sharing the key must keep their letter: new bare key or slider symbol) and phase portrait's long matrix labels the same way.
   - Then round 2 lanes L38, L40, L46 (shared lane brief `briefs/08-lane.md`; one lane at a time in this worktree so far: a lane is 1-2 worker sessions; parallel lanes need worktrees the handler cannot create from inside this isolated worktree, so launch them as `--agent bezeg-handler` sessions from the main checkout, or keep sequential).
   - Lane cost (round 1): function-inverse 2 worker sessions + 2 fix rounds; elevation 6 min; blossom 2 sessions. Common misses are listed in `briefs/08-lane.md`.
   - Open: `ReadoutsBody.tsx:170` single-group fold title duplicates "Odčitki"; exponential Orodja opens on an empty Uredi tab; exponential caption `2^x` literal `^` (pre-existing); Taylor's board text block repeats Odčitki and legend (captions stay board-drawn in 08; for the owner); `scripts/capture-guided-example-previews.cjs:710` expects the old lesson progress text; linear-map probe `valueWidthDrift null` fails on master too; curve clip only on Taylor (other steep function curves could use `curveViewClip.ts`).
3. **Task 11 visual refinement** (owner: "we want this to look beautiful"; Fable plans and orchestrates, Sonnet implements big parts): side session "Board visual lead 2" (lead 1 stopped), branch `board-styling` (merges `origin/board-workspace-2` into itself; never force), dev 4491, its state `docs/reviews/ux-picks-app-wide/visual-state.md`, launch brief `briefs/11-visual-lead.md` (its Setup should say: a successor enters the existing worktree by path after the previous lead is stopped). It messages this handler with a branch head to merge; owner signs the look off.

- Also open: resizable cards deferred by the owner; keyboard card moves step a pointer.
