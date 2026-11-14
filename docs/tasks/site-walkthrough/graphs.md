# Site walkthrough queue: graphs (package D)

Run state: pilot in progress; batches wait for the owner's approval

Source: [graphs and captures spec](../../specs/site-walkthrough-graphs-and-captures.md) (proposed). State: [state note](../../reviews/site-walkthrough/graphs/state.md). Port 4333. Worktree `walkthrough-graphs`, branch `worktree-walkthrough-graphs`.

Rule from the planning session, 2026-11-14: propose, show a preview, wait. No graph, style or capture change is pushed to `master`, and no batch starts, before the owner approves the pilot and the capture-text policy. Documentation and investigation may be pushed.

| # | Slice | Intake IDs | State |
| --- | --- | --- | --- |
| 1 | Spec: capture-text policy, example table with ids, typography research, G06 cause, reference yardstick, acceptance | G01–G07 | Done, proposed |
| 2 | Pilot on the branch: `prob-correlation`, `curve-envelope`, `interp-subdivision`, with before and after on the preview | G02, G03 | In progress |
| 3 | Owner approval of the pilot and the policy | G01–G06 | Waiting |
| 4 | Capabilities C1–C5 completed (capture text, caption lines, tooling test, typography, convexity sweep) | G01, G03, G04, G06 | After 3 |
| 5 | Blocker triage over all 118 captures | G02, G03 | After 4 |
| 6 | Batches B1–B8 by family | G02–G04 | After 5 |
| 7 | B9 epicycles | G07 | After the owner's pick, proposed by `design` |
