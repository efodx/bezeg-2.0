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
- Three demonstrations exhaust a Sonnet worker's 175k budget; dispatch two per worker.
- Accepted: `fa98874c4` bezier-hulls, convex-hull (+ delaunay parity/markers); sent to stream A.
- Accepted: `644dca72b` delaunay, ear-clipping (delaunay golden re-recorded, notes only); sent to stream A.
- Accepted: `7ff06edc9` fortune, hull-robustness; sent to stream A.
- In progress: interval-sweep + monotone-partition. Then monotone-triangulation + orientation, point-in-polygon + point-set-triangulation,
  segment-intersections + voronoi, voronoi-degenerate; then L50, L49, L44, L47.
- L54 closeout (handler): compgeo lesson prose says "pod grafom" / "under the graph" for readouts that are now cards
  (`compgeoGuidedLessons.ts` ~lines 572, 766, 1133, 1181, 1322, 2802); reword once all L54 demos are in. Take
  inspector-width screenshots of a few converted panels before the final L54 commit.
