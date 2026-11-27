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

## Next slice's brief inputs

1. **Owner feel check open** : live site or tailnet preview `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/` (`just build` after changes). Items: movable strip, view director, previews, back-off, sweep, fan, lesson morph, glides (offer ease-in-out if bisection step 11 feels abrupt).
2. **Task 08** (branch `board-workspace-2`). Recipes `briefs/notes/08-base-function.md`, `08-curve-workspace.md`, `08-point-set.md`; goldens `__parity__/<id>.golden.json` (all-ids check `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx`; graphs in the partition's `declared` list cannot be re-recorded, patch their golden by hand); per-state compare `node .command-logs/golden-cmp.cjs <golden>`; partition `inventory/08-partition.json`, lane table in the 08 task file.
   - **Master `c37c7bae8`** (handler 13 publish; CI watched, log `.command-logs/h13-ci1.log`): through B fixed-point, B sequence, caption sweeps 1-3, Euler test tsc fix, unused ZBAR, undeclared-graph fixtures moved to `ComplexMultiplicationGraph` (move again when L57 converts it), fourier-coefficients parity re-recorded (batch 2 row a0).
   - **Branch only:** L39 waves `fd9072f80` (all checks pass, review clean; golden not re-recorded: notes/captions only, re-record before publish). **Held from master** on the owner's lesson-mode framing decision (item 5): free column 472 px at 1440, 426 at 1280 on every waves step; wave/sum run under Odčitki; plot ~0.4 of live. Shots `.command-logs/h13-frame-default-1440x900-02.png`, live `h13-live-default-1440x900-02.png`. Review low item: `WavesGraph.tsx:509` tick row vs fixed `SAMPLING_BELOW_PX=44` on a tall board (check test 937-973 covers 1440x900). Playback dev vs live equal (16.67 ms, vsync-bound).
   - **Running:** caption sweep batch 4 worker (lattice-path, counting-tree, logistic-map, growth, cobweb; may delete sl/en keys itself). Sweep 5 owed: declared graphs not in the inventory. Layout bugs to fix (stream A): Fourier series Orodja overlaps a taller Odčitki; at 1280x720 a wrapped puck strip overlaps the Lekcija card bottom (`analysis/sequence?learn=1`). Extrema parity flake: 3 reruns passed. Lint the whole range before publishing (`npx eslint` on `git diff --name-only <base> HEAD`): batch 3 shipped lint and tsc errors.
   - **Publish:** `just publish --background --recipe runtime --base <origin/master> --commits <base..HEAD oldest first>`, then `just publish --wait` in the background, then `gh run watch`. It takes the whole range after base. No heavy worker while a publish gate runs. Smoke refuses a build made stale by a worker editing the tree: run browser checks when no worker edits.
   - **Gate** (foreground pieces under 10 min): tsc; golden all ids; `just check-changed origin/master`; `just unit FirstTask`; `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx`; `just build`; smoke-lesson per changed id (`.command-logs/round11-smoke.sh` pattern); every `tests/*.spec.cjs` that greps for a changed id or route (round 11 CI broke on curve-ownership).
   - **Stream B** ("Board workspace lane B handler 2", `lane-b.md`, branch `lane-b`, dev server 4484) sends commit ids. Cherry-pick between lanes, never during a gate. Resolve `fragments/index.ts` conflicts with `node .command-logs/resolve-fragments.cjs`. B merged our tip at `156d36f7c`: never pick merges. Picks over uncommitted lane edits: `git diff <file> > patch`, checkout, pick, `git apply --3way`, `git restore --staged`. B runs L50 (sequence next) and sweeps its own graphs. Rule: anything a lesson step names that a card covers is fixed in the lane; text that only repeats a card is dropped.
   - **Next lanes:** L43, then table order, skipping B's lanes (L54, L50, L49, L44, L47); hold L42, L41, L32, L33 until B's conflicting lane is picked; L31 waits for B's L49.
   - **Browser sweep owed:** rounds 1-10 graphs never had the caption-under-card check; one bezeg-visual pass over their lessons at 1440/1280.
   - Lane practice: dispatch `briefs/08-lane-L<id>.md` (latest `08-lane-L35.md`) plus shared `08-lane.md`; lanes take 2-4 worker sessions. When committing a lane, stage its untracked new files (fragment, `__parity__/*.json`, declaration test). Framing pattern: must-marks on the key points, a tight `followView`, never a canvas-sized intent (`89e4245ee`). Check Slovenian rewording yourself (*krmilnik*). The chapter lessons `lattice-paths-cb1/3/4` have no `smoke-lesson` id.
   - Open: `ReadoutsBody.tsx:170` fold title duplicates "Odčitki"; exponential Orodja opens on an empty Uredi tab.
3. Task 11 and audit 2026-11-26 on master (`visual-state.md`, `audit-2026-11-26.md` lists open architecture items).
5. **Still for the owner:** the strip covers phase portrait board text; a wrapped top-centre strip puts the help card over its lower rows; in lesson mode the free column between lesson card and Odčitki (~470 px at 1440) needs more zoom-out than the director 2.2 limit, so wide content sits under cards (L35 prob-simulation rs1/rs3/rs5/rs6, `1c799c6d0`; now also every waves step, L39 held): raise the limit, narrow Odčitki, or accept. **Asked again by handler 13, 2026-11-27.** Taylor (546 px) clear, extrema mostly clear.

- **Owner, 2026-11-27:** two parallel lane streams (A here, B per `lane-b.md`); standing permission to wrap untagged writes in any shared test in `runAs('learner', ...)` with values unchanged; worker HANDOFF 175k; Opus workers for recipe-less lanes L29, L53, L55, L58; tough choices may go to a Fable advisor (Agent `Plan`, model `fable`, effort `high`), for workers by relay (`QUESTION:`); owner-reserved decisions still go to him.
