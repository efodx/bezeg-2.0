# Task 08 stream B: long-pole lanes (side handler)

Owner, 2026-11-27: task 08 runs as two parallel lane streams. Stream A (the board workspace handler, worktree
`.claude/worktrees/board-workspace`, branch `board-workspace-2`) runs the small lanes and owns integration, gates and
publishes. **Stream B (you)** runs the long-pole lanes, in this order: **L54, L50, L49, L44, L47**
(`inventory/08-partition.json`; L54 has 15 demonstrations in 5 sessions).

## Setup (once)

- In the main checkout (on `master`, clean apart from untracked files), `git merge --ff-only origin/master` first, so the
  project hook there carries the 175k worker signal (the hook runs from `$CLAUDE_PROJECT_DIR`).
- From the main checkout `C:/Users/1337Hacker/Desktop/bezeg-2.0`: `git worktree add -b lane-b .claude/worktrees/lane-b board-workspace-2`,
  then link `node_modules` as a junction to the main checkout's (PowerShell `New-Item -ItemType Junction`). Enter it with
  EnterWorktree by path. Never create a worktree inside another worktree. Before ever removing it, unlink the junction with
  PowerShell first (`(Get-Item <wt>/node_modules).Delete()`), or the shared `node_modules` is wiped.
- Read: the handler card `docs/agent-workflow/handler-card.md`, then the state note `docs/reviews/ux-picks-app-wide/state.md`
  ("Next slice's brief inputs" item 2 and the owner's 2026-11-27 line), then `briefs/08-lane.md` and a finished dispatch
  (`briefs/08-lane-L25.md`) as the brief template.

## Rules

- Work and commit only on branch `lane-b` in your worktree, one commit per lane (or per L54 session). **Never push, never
  publish, never touch master or `board-workspace-2`.** Stream A cherry-picks your commits into `board-workspace-2` and
  publishes; tell it by SendMessage to "Board workspace handler 11" (or its successor named in the state note) with the
  commit ids after each accepted lane.
- One lane at a time; one Sonnet `bezeg-worker` at a time (the owner allows two parallel lanes in total, one per stream).
  Worker HANDOFF is at 175k. Heavy commands queue machine-wide through the test slots; keep lane checks focused (graph-check,
  golden check for the id, own tests, tsc, lint, the lesson test), and run one `just build` + `just smoke-lesson` per lane.
- Standing owner permission: lane workers may wrap untagged writes in any shared test in `runAs('learner', ...)` with
  asserted values unchanged; any other shared-test change stops that parameter and is reported.
- Re-record a golden only when the difference is notes/rows/legend moving to cards (as stream A does). Check Slovenian
  rewording of lesson prose yourself; the term for pucks is *krmilnik*.
- Tough handler choices: consult a Fable advisor (Agent `Plan`, model `fable`, effort `high`, read-only brief with the
  facts and options; owner, 2026-11-27).
- Owner decisions go to the owner (AskUserQuestion) after you update this file's "Status" section.
- Budget: at `BUDGET HANDOFF` update "Status" below, commit it on `lane-b`, and start your successor from the main
  checkout with `claude --bg -n 'Board workspace lane B handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this file>"`, confirm it with `claude logs <id>`, and pass this rule on.
- Never end a turn with nothing running and nothing asked.

## Status

- Handler 1 (2026-11-27): worktree `.claude/worktrees/lane-b` (branch `lane-b` from `board-workspace-2` at `4b5fcd5fa`,
  `node_modules` junction). Dispatch `briefs/08-lane-L54.md` (lesson smoke port 4395). Notes `briefs/notes/08-lane-L54.md`.
- Stream A is now "Board workspace handler 12" (send commit ids there; a14152ab2 still pending pick).
- Stream A, 2026-11-27: every lane also runs `just unit FirstTask` and per id
  `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`; never background
  `bash <script>` for long runs (the cleanup tick kills it); foreground checks under 10 minutes each.
- Three demonstrations exhaust a Sonnet worker's 175k budget; dispatch two per worker.
- Accepted: `fa98874c4` bezier-hulls, convex-hull (+ delaunay parity/markers); sent to stream A.
- Accepted: `644dca72b` delaunay, ear-clipping (delaunay golden re-recorded, notes only); sent to stream A.
- Accepted: `7ff06edc9` fortune, hull-robustness; sent to stream A.
- Accepted: `48f4d392e` interval-sweep, monotone-partition; sent to stream A.
- Accepted: `d0d2acb8c` monotone-triangulation, orientation (golden re-recorded, notes only); sent to stream A.
- Accepted: `a14152ab2` point-in-polygon, point-set-triangulation; sent to stream A. FirstTask and round-trip green for all 12.
- Lane-b Vite dev server (this handler's shell): `http://127.0.0.1:4484/bezeg-2.0/` (`npx vite --port 4484 --strictPort --host 127.0.0.1`).
- Caption check (stream A, 2026-11-27, L30 miss): 8 of 12 ok; monotone-partition, monotone-triangulation, interval-sweep,
  delaunay covered. Cause (shared base): `BaseGraph.tsx:328` returns before binding `view` when a graph has no parameter
  bindings, so point-set graphs get no view director. Stream A: B fixes it on lane-b as its own commit, before further
  conversions (bind `view` for declared graphs only; all-graph suites whole; browser recheck of the 4 steps + polygon-area,
  projective-three-views, projective-five-point; morph no jump). Committed `cb59a901f` (notes `briefs/notes/08-view-binding-fix.md`),
  picked by A as 71b3b08ab (a14152ab2 as fbeb69755). Morph glide and dev-console sweep clean, sent to A. Follow-up
  `2420f7a87` (Fortune `_ticks_` filter, Bezier decision 6 asserts marks) sent to A.
- Accepted: `dfb8498ad` segment-intersections, voronoi (voronoi golden re-recorded, notes only); sent to A.
- **L54 done** with the session 6 commit (voronoi-degenerate; golden re-recorded: notes plus one deg-off ray arrow that
  follows the director's framing; 16 "pod grafom" sentences now name the Odčitki card). Sent to A (with dfb8498ad pending pick).
- Merged board-workspace-2 (incl. ee7a33aa7) into lane-b at `156d36f7c`; A picks only lane commits after it.
- L50 (8 demos; dispatch `briefs/08-lane-L50.md`, ONE per worker for function graphs (accumulation alone took 175k):
  accepted `43e4628db` accumulation, `42d6cb877` convexity (sent to A; A ruled the f'' sign marks are NOT case (c): a
  step names them, so fix in a follow-up (worker running). Rule now in the L50 brief: board text a step tells the learner
  to read must be clear of cards). Darboux running. Then extrema, fixed-point + sequence (IterativeFunctionGraph shared with L42/L47: opt-in hook only), mean-value +
  uniform-convergence. Then L49, L44, L47.
- (old) Uncommitted in the tree: segment-intersections (converted, graph-check green) and voronoi (converted; golden is a
  notes-only diff to re-record after the fix; VoronoiGraph.host.test Fit case ~536 and hull-robustness "untagged view" writes
  fail, probably from the view fix in progress, which the fix worker now owns). After the fix commit: one worker reruns
  family unit, tsc, lint, build, smoke-lesson for both, then commit them. Then + voronoi, voronoi-degenerate; then L50, L49, L44, L47.
- Open, asked of stream A (2026-11-27): `BaseFunctionGraph.caption()` (:643) draws pixel-anchored corner text on ~30
  function graphs; cards cover it (accumulation 1280x720). Stream A decided (c): captions stay board-drawn in 08
  (08 task file :40), never change shared caption() in a lane; extending the Taylor removal is on the owner's list in A's
  state note. Lanes keep corner captions as is (L50, L47).
  Owner, 2026-11-27, asked whether removing captions that repeat the legend/readouts is planned: it is not in any task
  (08 triage :40 defers it to unnamed "feel follow-ups"; 09-11 do not cover it). Owner thinks it should be part of 08;
  **Owner confirmed 2026-11-27: "Yes, remove that. I thought it was part
  of it since you can do it when you move to cards."** Lanes remove repeating caption lines as they convert (rule in the
  L50 brief; carry it into L49/L44/L47 briefs); sweep of converted graphs: B does accumulation + convexity (follow-up
  after the sign-mark fix), A its own; recorded by A in e5e4374fb (08 task file :40).
  A picked 43e4628db as de294bbb1, 42d6cb877 as 45b3cc85c; round 11 on master 6c5c063bf.
- (done) L54 closeout (handler): compgeo lesson prose says "pod grafom" / "under the graph" for readouts that are now cards
  (`compgeoGuidedLessons.ts` ~lines 572, 766, 1133, 1181, 1322, 2802); reword once all L54 demos are in. Take
  inspector-width screenshots of a few converted panels before the final L54 commit.
