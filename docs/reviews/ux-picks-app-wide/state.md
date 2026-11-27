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

- No "Reset layout" button (`resetAll` unused). De Casteljau marks read board points. `phase-a` has no `help`, so its fan help card is empty (graph change).
- Pre-existing (`smoke/07-morph-3a-baseline.md`): Taylor lesson Next 9->10 stalls ~1.1 s; Taylor Back on step 6 returns 3.5 % off.
- Perf: `ReadoutsBody.tsx:82` measures per row; a store write re-renders GraphHost, BoardCards and every row.

## Next slice's brief inputs

1. **Owner feel check open** : live site or tailnet preview `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/` (`just build` after changes). Items: movable strip, view director, previews, back-off, sweep, fan, lesson morph, glides (offer ease-in-out if bisection step 11 feels abrupt).
2. **Task 08** (branch `board-workspace-2`). Recipes `briefs/notes/08-base-function.md`, `08-curve-workspace.md`, `08-point-set.md`; goldens `__parity__/<id>.golden.json` (all-ids check `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx`; graphs in the partition's `declared` list cannot be re-recorded, patch their golden by hand); per-state compare `node .command-logs/golden-cmp.cjs <golden>`; partition `inventory/08-partition.json`, lane table in the 08 task file.
   - **Master `69a98f150`** (CI green 2026-11-27): rounds 1-12b (through L35, L36, L37, caption sweeps 1-2, B L50 accumulation/convexity/darboux/extrema, math choice control plan for later).
   - **Branch, unpublished:** B fixed-point `8a47d502d` (conflicts resolved: AnalysisFirstTask keeps recursion-cobweb `later: []`; parity.test keeps both imports). L39 waves session 2 running (session 1 left only an uncommitted, unrecorded parity SAMPLE; plan `notes/08-lane-L39.md`; time rows notify about 10 Hz while playing, plus on pause/step/reset; frame time measured against the live site). Sweep batches still owed: 3 complex + linear-map, 4 combinatorics/dynamics/recursion, 5 the declared graphs the inventory did not list (`briefs/08-caption-sweep.md`, notes `notes/08-caption-sweep.md`). Fourier series: Orodja overlaps a taller Odčitki.
   - **Publish:** `just publish --background --recipe runtime --base <origin/master> --commits <base..HEAD oldest first>`, then `just publish --wait` in the background, then `gh run watch`. It takes the whole range after base. No heavy worker while a publish gate runs. Smoke refuses a build made stale by a worker editing the tree: run browser checks when no worker edits.
   - **Gate** (foreground pieces under 10 min): tsc; golden all ids; `just check-changed origin/master`; `just unit FirstTask`; `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx`; `just build`; smoke-lesson per changed id (`.command-logs/round11-smoke.sh` pattern); every `tests/*.spec.cjs` that greps for a changed id or route (round 11 CI broke on curve-ownership).
   - **Stream B** ("Board workspace lane B handler 2", `lane-b.md`, branch `lane-b`, dev server 4484) sends commit ids. Cherry-pick between lanes, never during a gate. Resolve `fragments/index.ts` conflicts with `node .command-logs/resolve-fragments.cjs`. B merged our tip at `156d36f7c`: never pick merges. Picks over uncommitted lane edits: `git diff <file> > patch`, checkout, pick, `git apply --3way`, `git restore --staged`. B runs L50 (sequence next) and sweeps its own graphs. Rule: anything a lesson step names that a card covers is fixed in the lane; text that only repeats a card is dropped.
   - **Next lanes:** L43 after L39, then table order, skipping B's lanes (L54, L50, L49, L44, L47); hold L42, L41, L32, L33 until B's conflicting lane is picked; L31 waits for B's L49.
   - **Browser sweep owed:** rounds 1-10 graphs never had the caption-under-card check; one bezeg-visual pass over their lessons at 1440/1280.
   - Lane practice: dispatch `briefs/08-lane-L<id>.md` (latest `08-lane-L35.md`) plus shared `08-lane.md`; lanes take 2-4 worker sessions. When committing a lane, stage its untracked new files (fragment, `__parity__/*.json`, declaration test). Framing pattern: must-marks on the key points, a tight `followView`, never a canvas-sized intent (`89e4245ee`). Check Slovenian rewording yourself (*krmilnik*). The chapter lessons `lattice-paths-cb1/3/4` have no `smoke-lesson` id.
   - Open: `ReadoutsBody.tsx:170` fold title duplicates "Odčitki"; exponential Orodja opens on an empty Uredi tab; `scripts/capture-guided-example-previews.cjs:710` expects old progress text; linear-map probe `valueWidthDrift null` fails on master too.
3. **Task 11** signed off and on master (`visual-state.md`). Legenda starts open where it fits (rule 5b `reopenWhenRoom`).

4. **Audit 2026-11-26** (`audit-2026-11-26.md`): fixed and on master. Help card may land on the wrong side if opened while the strip is still moving to its dock (seen once). Open architecture (a) drop `useToolsSectionsWithContent` once every tools control names `tab`, (b) board-level undo owner (small step now: registry in `jumpUndo.ts`), (c) split BoardCards measure/persist/render.
5. **Owner decisions 2026-11-26** (a)-(d) done. Still for the owner: the strip covers phase portrait board text; a wrapped top-centre strip puts the help card over its lower rows; in lesson mode the free column between lesson card and Odčitki (~470 px at 1440) needs more zoom-out than the director 2.2 limit, so wide content sits under cards (L35 prob-simulation rs1/rs3/rs5/rs6, `1c799c6d0`): raise the limit, narrow Odčitki, or accept.

- **Owner, 2026-11-27:** two parallel lane streams (A here, B per `lane-b.md`); standing permission to wrap untagged writes in any shared test in `runAs('learner', ...)` with values unchanged; worker HANDOFF 175k; Opus workers for recipe-less lanes L29, L53, L55, L58; tough choices may go to a Fable advisor (Agent `Plan`, model `fable`, effort `high`), for workers by relay (`QUESTION:`); owner-reserved decisions still go to him.
