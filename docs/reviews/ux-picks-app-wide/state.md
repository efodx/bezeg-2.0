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
- Pre-existing (`smoke/07-morph-3a-baseline.md`): Taylor lesson Next 9->10 at 1440x900 stalls ~1.1 s; Taylor Back on step 6 returns 3.5 % off. Phase-portrait lesson at 1280x720: the strip now covers the right column's folded heads (Orodja, Legenda) instead of Back/Next. Bisection's next-step button sits in the folded Orodja card outside lessons. During a morph a preview capture runs the morph's `atTargets` writes (redraws per morph frame). Phone: bisection 390x844 view check failed once (task 09).
- Perf follow-ups: `ReadoutsBody.tsx:82` getBoundingClientRect per row layout effect; a store write re-renders GraphHost, BoardCards and every readout row. Taylor 4x input delay ~11 % above master like for like.

## Next slice's brief inputs

1. **Owner feel check still open** (notes come as follow-ups to the release): live site or the 4472 tailnet preview `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/` (rebuild with `just build` after changes). Items: movable strip; view director (Samodejno, wide views at 1280x720); previews (dim the live curve?), back-off 8 ms / 150 ms; sweep 25 % / 4 s; fan 300 ms, opacity 0.4/0.7; lesson morph and reveal; distance-scaled glides (bisection step 11 still moves up to 59 % of a width in its first frame: offer ease-in-out if it feels abrupt). His notes come first.
2. **Task 08**: triage committed (`docs/reviews/ux-picks-app-wide/inventory/08-triage.md`; contract decisions in `08-convert-all-graphs.md` "Triage decisions": no contract change). Step 2 slice 1 **committed `c21078608`** (branch only, not pushed): `BaseFunctionGraph.functionPanel()` opt-in, exponential worked example; recipe for lanes in `briefs/notes/08-base-function.md`. Parity rule: a bare slider read-off is covered only by a declared row of the parameter's own symbol. Guided-example fingerprints omit a frame's `declare` (cards hidden in captures), so lesson conversions need no recapture.
   - Committed (branch only, not pushed): lease passthrough `4f0ff0be1` (`IterationController.useLease`; the 9 own-driver graphs already call `driver.useLease`, nothing to do; linear-map playback smoke passed); curve workspace `650ccf4bf` (`declaresCurveWorkspace()` opt-in, worked example `bezier` at route `bezier/curve`, recipe in `briefs/notes/08-curve-workspace.md`; puck strip shows action pucks for graphs without a parameter store; graph-check parity `n/a` when a declaration shows no values; graph-check needs `--route` when the route is not `analysis/<id>`).
   - Point-set `c88ffc88e` (`declaresPointSetWorkspace()`, worked example `polygon-area`, recipe `briefs/notes/08-point-set.md`; fan/lattice board pucks; no duplicate controls checked in the browser). Step 4 partition `5427f7d60`: 55 lanes, 19 rounds, lane table in the 08 task file, data `inventory/08-partition.json` (round 1: bspline-blossom, elevation, function-inverse). `just check-changed` over step 2 passed after `688294ccf` (Coons pilot's declared pucks now show, since the strip fix). All pushed to `origin/board-workspace-2`.
   - Visible change for the next master publish: the Coons pilot now shows its shown-surface and linked-corners pucks on the board (declared before, hidden by a strip bug).
   - In flight: step 3 golden values (brief `briefs/08-golden.md`, notes `briefs/notes/08-golden.md`): auto-recorded `__parity__/<id>.golden.json` for the 125 remaining. Then step 5 catalog keys per round (fragments) and step 6 lanes, round 1 (lane brief = the three recipes plus guide; one shared lane brief file to write).
   - Found in slice 1 (not fixed): `src/workspace/cards/ReadoutsBody.tsx:170` shows a group fold title even for a single group (duplicates the card title "Odčitki"; pilots too; consider `groups.length > 1`); exponential board caption `f(x) = 2^x` shows a literal `^` (pre-existing, `ExponentialFunctionGraph.tsx:92`); `scripts/capture-guided-example-previews.cjs:710` expects the old lesson progress text "Korak 1 od N · Okvir 1 od N" (now "Korak 1/7 · del 1/4"), so a full preview recapture fails until fixed; linear-map graph-check probe `valueWidthDrift null` fails on master too (pre-existing); after opening Orodja the puck strip moves from top-left to bottom-left.

- Also open (Git history has details): resizable cards deferred by the owner; keyboard card moves step a pointer, not anchors; free-play script timeouts.
