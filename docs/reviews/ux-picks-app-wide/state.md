# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), ADRs 0062 to 0067. Conversion guide: [`docs/guides/converting-a-graph.md`](../../guides/converting-a-graph.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace-2` (cut from master `40e06cf4` after the 03-07 release; the old `board-workspace` branch is superseded, never force-push it), worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing any worktree). Push with `git push origin board-workspace-2`, never force. Keep the worktree root as cwd. Never create a worktree inside this one: ESLint then finds two tsconfig roots, and its content cache (`.command-logs/eslintcache.json`) keeps those parse errors until that file is deleted.
- Master carries 01-07 (release `40e06cf4`, CI green, deployed 2026-11-25). Publishes: `just publish --background --recipe runtime --base <origin/master> --commits <ids oldest first>` (`git diff --check` must be clean, including evidence logs). Partial publishes: a separate worktree branch from master's base, cherry-pick, link `node_modules`, `just --justfile <wt>/justfile --working-directory <wt> publish --background ...`.
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

- The strip and cards can cover board-drawn texts (JSXGraph texts are not marks); settle in 07/08. No "Reset layout" button (`resetAll` unused). De Casteljau marks read board points. `phase-a` has no `help`, so its fan help card is empty (graph change). Sweep does not shrink the swing to keep marks in view.
- Pre-existing (`smoke/07-morph-3a-baseline.md`): Taylor lesson Next 9->10 stalls ~1.1 s; Taylor Back on step 6 returns 3.5 % off.
- Perf: `ReadoutsBody.tsx:82` measures per row; a store write re-renders GraphHost, BoardCards and every row.

## Next slice's brief inputs

1. **Owner feel check open** (his notes come first): live site or tailnet preview `http://desktop-a0j72sv.tail2032db.ts.net:4472/bezeg-2.0/` (`just build` after changes). Items: movable strip, view director, previews, back-off, sweep, fan, lesson morph, glides (offer ease-in-out if bisection step 11 feels abrupt).
2. **Task 08** (branch `board-workspace-2`). Recipes `briefs/notes/08-base-function.md`, `08-curve-workspace.md`, `08-point-set.md`; goldens `__parity__/<id>.golden.json` (all-ids check `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx`); partition `inventory/08-partition.json`, lane table in the 08 task file (rounds 2-22, `sharedTests` per lane).
   - The `runtime` publish recipe runs no browser smoke: run the affected smoke specs before any publish.
   - **Master `1d60477a6`** (CI green 2026-11-26): rounds 1-8. Run no heavy worker while a publish gate runs (load timeouts). `just publish` refuses a partial range (`--commits a,b,c`, comma-separated), so browser-check runtime fixes before they share a publish with lanes.
   - **Master `4b5fcd5fa`** (CI green): rounds 1-9, owner items (a) NURBS t and (c) LP legend card (390 phone walk skipped, task 09). **Round 10 gated** (L26, L28, L29, Taylor text block (d), stream B L54 sessions 1 and 2a cherry-picked, round-trip contract tag `fa336eebe`; `smoke/08-round1/round10-*`) and published by handler 11. **Stream B** ("Board workspace lane B handler N", `lane-b.md`, branch `lane-b`) messages commit ids; cherry-pick them between lanes (never while a gate runs), resolve `fragments/index.ts` both-added conflicts with `.command-logs/resolve-fragments.cjs`. Pending pick: `7ff06edc9` (fortune, hull-robustness). **Next: round 11** (L27, L30, L31); hold L42, L41, L32, L31, L33 until B's conflicting lane (L50/L47, L44, L49/L54) is picked (so L31 waits; take L35 or L37 instead). **Gates run in the foreground in pieces under 10 min** (check-changed ~8 min, then smoke loop): the session-cleanup tick kills a backgrounded `bash <script>` as orphaned (`.command-logs/session-cleanup.log`; tooling bug to fix). Check Slovenian rewording of lesson prompts yourself (pucks are *krmilniki*). Graph-check `--route` takes no leading slash; marking a status paragraph `data-readout-note` gives a notes-only golden difference the handler re-records.
   - Lane practice: one lane at a time; most lanes take 2-3 worker sessions (budget handoffs), so continuation briefs name the note. Every brief lists the common misses up front (see the L10 dispatch in `briefs/notes/08-lane-L10.md` or `08-lane.md`). Handler re-records goldens (`BEZEG_PARITY_GOLDEN_RECORD=1 BEZEG_PARITY_GOLDEN_ID=<id> just unit src/graphs/base/declare/parityGolden.test.tsx`) only when the difference is notes/rows moving to cards, retained or slider read-offs, or TeX labels. Parity: symbol-aware rows, per-sample `accepted` lists. Preset import self-tags `learner` (`6c4248f48`). Fuzz skips closed `details`. Open nit: root-finding legend "start" tracks only x0 under secant.
   - Open: `ReadoutsBody.tsx:170` single-group fold title duplicates "Odčitki"; exponential Orodja opens on an empty Uredi tab; exponential caption `2^x` literal `^` (pre-existing); Taylor's board text block repeats Odčitki and legend (captions stay board-drawn in 08; for the owner); `scripts/capture-guided-example-previews.cjs:710` expects the old lesson progress text; linear-map probe `valueWidthDrift null` fails on master too; curve clip only on Taylor (other steep function curves could use `curveViewClip.ts`).
3. **Task 11** signed off and on master (`visual-state.md`). Legenda starts open where it fits (rule 5b `reopenWhenRoom`).

4. **Audit 2026-11-26** (`audit-2026-11-26.md`): fixed and on master. Help card may land on the wrong side if opened while the strip is still moving to its dock (seen once). Open architecture (a) drop `useToolsSectionsWithContent` once every tools control names `tab`, (b) board-level undo owner (small step now: registry in `jumpUndo.ts`), (c) split BoardCards measure/persist/render.
5. **Owner decisions 2026-11-26** (a)-(d) done. Still for the owner: the strip covers phase portrait board text; a wrapped top-centre strip puts the help card over its lower rows.

- Speed-up consult (Fable, 2026-11-27; 92 demos/31 lanes left, ~35-40 h): two parallel lanes in sibling worktrees off the main checkout (stub fragments first), slim lane checks + one gate, an Explore pre-pass per lane pasted into dispatches, bigger rounds, long poles (L54, L50, L49, L44, L47) first. **Owner, 2026-11-27:** two parallel lanes (not three); standing permission for lane workers to wrap untagged writes in any shared test in `runAs('learner', ...)` with values unchanged (anything else still stops); worker HANDOFF raised 135k->175k (hook `tools/agent-usage/claude_budget_hook.py:54`); Opus workers for the recipe-less lanes L29, L53, L55, L58. Owner: this stream may consult a Fable advisor (Agent `Plan`, model `fable`, effort `high`, read-only brief with facts and options) on tough choices, also for workers by relay (worker returns `QUESTION:`, handler asks Fable, continues the worker by SendMessage; `08-lane.md` "Tough choices"); owner-reserved decisions still go to him.
- Open: resizable cards (deferred); keyboard card moves step a pointer.
