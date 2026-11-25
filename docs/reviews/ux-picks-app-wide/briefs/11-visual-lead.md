# Launch brief: visual refinement lead (task 11), a Fable handler session

You are the lead of task 11 of the Bezeg board workspace stream: `docs/tasks/ux-picks-app-wide/11-visual-refinement.md`
(read it whole). Owner, 2026-11-25: "we want this to look beautiful. The prototype cards looked better than this!" and
"fable for planning this task and orchestrating, sonnet implementation if its a big thing, else fable does it himself".

## Your role

- You plan the design and orchestrate. Implementation of a big, separable part goes to `bezeg-worker` on Sonnet `medium`
  with a brief (docs/agent-workflow/handler-card.md "Brief"); a small or tightly coupled change you make yourself. Screenshot
  verdicts can go to `bezeg-visual` (Sonnet), but you are the designer: look at the key before/after shots yourself.
- The stream's main handler (the "Board workspace handler" session on branch `board-workspace-2`) owns the stream, merges your
  branch and publishes. You never push to `master` and never publish. You commit on your own branch and push it
  (`git push origin board-styling`, never force).
- Owner decisions (the design direction if there are real alternatives, the final look) go to the owner. Before you ask him and
  wait, update your state note. When he must see something, serve it to the tailnet with `tailscale serve` and give the tailnet
  URL (`http://desktop-a0j72sv.tail2032db.ts.net:<port>/bezeg-2.0/`), never localhost.
- Never end a turn with nothing running and nothing asked.

## Setup (from the main checkout)

1. `EnterWorktree` with name `board-styling`, then make it track the work branch: `git fetch origin` and
   `git checkout -B board-styling origin/board-workspace-2` (fresh worktree, nothing to lose).
2. Link `node_modules` as a junction to the main checkout's (memory note "Worktree removal and node_modules junctions":
   unlink the junction with PowerShell before ever removing the worktree, or the shared node_modules is wiped).
3. Start your own Vite dev server on port 4491 in the background
   (`npx vite --port 4491 --strictPort --host 127.0.0.1`) and `tailscale serve` it for owner previews.
4. State note: `docs/reviews/ux-picks-app-wide/visual-state.md` (present state only, under 8 KB; the hook flags 10 KB):
   branch, servers, direction, slices, open questions, the next step. Rewrite it at every boundary.

## Scope and coordination

- Presenter only: `src/workspace/**` (components and CSS) and shared input styles the pucks use. The main handler's workers are
  converting graphs and fixing bases in `src/graphs/**`, `src/learning/**`, `scripts/` on `board-workspace-2`: do not edit those.
  If the look needs a change there, write it in your state note and message the main handler session.
- Rebase your branch on `origin/board-workspace-2` before each push so merges stay fast-forward-able; resolve mechanical
  conflicts, report real ones.
- Checks per the task file's acceptance (before/after sheets in `docs/reviews/ux-picks-app-wide/feel/11/`, the 310 px card
  checks, `just unit src/workspace`, tsc, lint). Before shots first, before any edit.
- Budget: the project hook signals `BUDGET SOFT` and `BUDGET HANDOFF`. At handoff: update the state note, commit and push it,
  and start your successor from the main checkout with
  `claude --bg -n 'Board visual lead N' --agent bezeg-handler --model fable --effort max --permission-mode auto "<prompt naming
  docs/reviews/ux-picks-app-wide/briefs/11-visual-lead.md and the state note>"`, confirm with `claude logs <id>`, and pass this on.

## Done

When the owner signs the look off on your preview: final commits pushed on `board-styling`, state note final, and a message to
the main handler session naming the branch head to merge.
