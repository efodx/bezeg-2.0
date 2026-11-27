# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), ADRs 0062 to 0067. Conversion guide: [`docs/guides/converting-a-graph.md`](../../guides/converting-a-graph.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace-2` (cut from master `40e06cf4` after the 03-07 release; the old `board-workspace` branch is superseded, never force-push it), worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing any worktree). Push with `git push origin board-workspace-2`, never force. Keep the worktree root as cwd. Never create a worktree inside this one: ESLint then finds two tsconfig roots, and its content cache (`.command-logs/eslintcache.json`) keeps those parse errors until that file is deleted.
- Publishes: `just publish --background --recipe runtime --base <origin/master> --commits <ids oldest first>` (`git diff --check` clean, evidence logs included), then `just publish --wait` in the background, then `gh run watch` the master run.
- Prototype: branch `ux-picks` at `aff6df6c` (read-only).
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

- No "Reset layout" button (`resetAll` unused). De Casteljau marks read board points. `phase-a` has no `help`, so its fan help card is empty (graph change). Sweep does not shrink the swing to keep marks in view.
- Pre-existing (`smoke/07-morph-3a-baseline.md`): Taylor lesson Next 9->10 stalls ~1.1 s; Taylor Back on step 6 returns 3.5 % off.
- Perf: `ReadoutsBody.tsx:82` measures per row; a store write re-renders GraphHost, BoardCards and every row.

## Next slice's brief inputs

1. **Owner feel check open** (his notes come first): live site or tailnet preview `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/` (`just build` after changes). Items: movable strip, view director, previews, back-off, sweep, fan, lesson morph, glides (offer ease-in-out if bisection step 11 feels abrupt).
2. **Task 08** (branch `board-workspace-2`). Recipes `briefs/notes/08-base-function.md`, `08-curve-workspace.md`, `08-point-set.md`; goldens `__parity__/<id>.golden.json` (all-ids check `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx`); partition `inventory/08-partition.json`, lane table in the 08 task file (rounds 2-22, `sharedTests` per lane).
   - The `runtime` publish recipe runs no browser smoke: run the affected smoke specs before any publish.
   - `just publish` takes the whole range after base (`--commits a,b,c`). No heavy worker while a publish gate runs.
   - **Master `d837327a8`** (CI green 2026-11-27): rounds 1-10, owner items (a)-(d), stream B L54 sessions 1, 2a, 2b.
   - **Branch, unpublished (round 11):** L27 `8006a3804`, B L54 3a `5c0d6fcb7`, L30 counting-tree `31c98b45b`, B L54 3b `e069e6766`, handoff `1c23fa330`, L30 lattice-paths `e743a87f6` (`frameBox()`), B L54 4 `fbeb69755`, B base fix `71b3b08ab` (declared graphs without pucks now bind `view`), B test tightening `9e112fea9`, missed L30 fragment `ee7a33aa7` (when committing a lane, stage its untracked new files: fragments, `__parity__/*.json`, declaration tests; L37 has `fragments/recursion-cobweb.ts`). Chapter lessons `lattice-paths-cb1/3/4` have no `smoke-lesson` id. Golden per-state compare: `node .command-logs/golden-cmp.cjs <golden path>`.
   - Then L30 decl test `4a940ce59`, L37 recursion-cobweb `89e4245ee`, B L54 5a `d9ac567f1`, 6 `797de24ec`, fortune golden `9f03b9d46` (ray arrows after the view fix). Round 11 gate passed (tsc, golden, check-changed, FirstTask, round trip, build, smoke `smoke/08-round1/round11-smoke.log`); publish started. Pick after publish: B `43e4628db` (L50 accumulation).
   - **Stream B** ("Board workspace lane B handler 1", `lane-b.md`, branch `lane-b`, dev server 4484) sends commit ids; cherry-pick between lanes, never during a gate; `fragments/index.ts` both-added conflicts: `node .command-logs/resolve-fragments.cjs`. B merged our tip into lane-b at `156d36f7c` (never pick that merge; pick only lane commits after it). B running L50.
   - **Round 11 gate**, foreground in pieces under 10 min (the session-cleanup tick kills a backgrounded `bash <script>`): tsc; golden all ids; `just check-changed origin/master`; `just unit FirstTask`; `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx`; `just build`; smoke-lesson per lesson (`.command-logs/round10-smoke.sh`). Round 10 CI broke on a FirstTask case check-changed did not select.
   - **Next lanes:** L31 waits for B's L49; take L35 or L37, then table order, skipping B's lanes (L54, L50, L49, L44, L47) and holding L42, L41, L32, L33 until B's conflicting lane is picked.
   - **Browser sweep owed:** rounds 1-10 graphs never had the caption-under-card check; one bezeg-visual pass over their lessons at 1440/1280.
   - Lane practice: dispatch `briefs/08-lane-L<id>.md` (latest `08-lane-L30.md`) plus shared `08-lane.md`; lanes take 2-4 worker sessions; accept a puck set when a lesson step names each puck. Re-record goldens only for notes/rows/legend moving to cards, or jsdom-only caption drops after a browser check. Check Slovenian rewording yourself (*krmilnik*). Graph-check `--route` takes no leading slash.
   - Open: `ReadoutsBody.tsx:170` fold title duplicates "Odčitki"; exponential Orodja opens on an empty Uredi tab; `scripts/capture-guided-example-previews.cjs:710` expects old progress text; linear-map probe `valueWidthDrift null` fails on master too.
3. **Task 11** signed off and on master (`visual-state.md`). Legenda starts open where it fits (rule 5b `reopenWhenRoom`).

4. **Audit 2026-11-26** (`audit-2026-11-26.md`): fixed and on master. Help card may land on the wrong side if opened while the strip is still moving to its dock (seen once). Open architecture (a) drop `useToolsSectionsWithContent` once every tools control names `tab`, (b) board-level undo owner (small step now: registry in `jumpUndo.ts`), (c) split BoardCards measure/persist/render.
5. **Owner decisions 2026-11-26** (a)-(d) done. Still for the owner: the strip covers phase portrait board text; a wrapped top-centre strip puts the help card over its lower rows; extend the Taylor decision (`e0bfe3576`) to the ~30 function graphs whose pixel-anchored `BaseFunctionGraph.caption()` (`:643`) corner caption repeats legend and readouts and sits under cards (accumulation at 1280; lanes keep it per 08 triage line 40).

- **Owner, 2026-11-27:** two parallel lane streams (A here, B per `lane-b.md`); standing permission to wrap untagged writes in any shared test in `runAs('learner', ...)` with values unchanged; worker HANDOFF 175k; Opus workers for recipe-less lanes L29, L53, L55, L58; tough choices may go to a Fable advisor (Agent `Plan`, model `fable`, effort `high`), for workers by relay (`QUESTION:`); owner-reserved decisions still go to him.
- Tooling bug: session-cleanup kills backgrounded gate scripts as orphaned (`.command-logs/session-cleanup.log`).
- Open: resizable cards (deferred); keyboard card moves step a pointer.
