# Handler cost, 2026-11-14 to 2026-11-22

Evidence for the token-efficiency changes of 2026-11-22: the shell and batching rules in the [agent definitions](../../.claude/agents/), the `bezeg-visual` agent, `just shot`, `just publish --wait`, and the state note limit in the [budget hook](../../tools/agent-usage/claude_budget_hook.py). It follows [the 2026-11-06 measurement](handler-cost-2026-11-06.md) and uses the same relative units: cache reads at 0.1×, one-hour cache writes at 2×, output at 5×, Opus at twice Sonnet. Fable is weighted like Opus, which is an assumption. Source: 2,505 local Claude transcripts from 2026-10-20 to 2026-11-22; the figures below cover sessions started from 2026-11-14 unless a row says otherwise.

## Cost

| Measure | Value |
| --- | --- |
| Handlers (108 Opus and Fable sessions) | 652 units |
| `bezeg-worker` (415 contexts) | 203 units |
| Cost of one handler turn against one worker turn | about 4.3× |
| Handler cost that is cache reads, all dates | 64% |
| Handler cost in turns above 200k context | 47%, at 1.8× the cost per turn below it |
| Handler turns with a single tool call | 81% |
| A lone read-only call directly after another one | 17% of handler turns, 25% of worker turns; about 10% of each one's cost |
| Handler sessions that dispatched no worker | 39 of 108 |
| UX prototype sessions | 28 sessions, 231 units, median 0 workers, median 26 screenshots read |
| Handler sessions started near 50k instead of 22k (no `--agent bezeg-handler`) | 43 of 108: 25 in the main checkout, 15 UX lanes |
| Context at first dispatch | median 72k after 20 turns; the [spec](../specs/handler-context-efficiency.md) aimed at 30k |
| Screenshots read by handlers | 1,489, about 1.1k tokens each; the largest source of context during orientation |
| State notes | `ux-picks` 124 KB, `families-prep` 78 KB, `graph-control-first-use` 48 KB; a healthy note is 5 to 9 KB |
| Publishing | 163 publishes, 226 `--status` polls, 296 `gh run` calls: 772 handler turns, 6.5% of handler cost |
| Replies to a handler idle for over an hour | 32 full cache rebuilds, 4.6% of handler cost, about 1 unit each at 300k |

About 58% of handler cost was hands-on turns: shell `grep`, `cat` and `sed`, 768 `python -` patch heredocs, edits and code reads. More than half of output tokens were thinking, and handler output made up 42% of handler context growth.

## Time

| Measure | Value |
| --- | --- |
| Worker tool time | 88 hours across 415 contexts |
| Worker wait loops (`until`, `timeout`, `sleep`, `for`) | 966 calls, 20 hours, mostly polling a log for a queued `just unit` or typecheck |
| One-off Playwright scripts | 1,036 inline heredocs and 356 scratch scripts by handlers, workers and smoke workers |
| Handler wall time | 316 hours, of which 53 in tools, about 25 in model latency and 11 waiting on `AskUserQuestion` |

Median tool latency was healthy (Grep 0.4 s, Edit 2 s), and the budget hook reads only the transcript tail.

## Failed calls

1,186 tool calls failed, about 3% of all calls. The avoidable classes:

| Class | Count | Cause | Rule now in the definitions |
| --- | --- | --- | --- |
| Worktree guard refusal | 279 (232 in workers) | A command that opens with `cd`, or carries a heredoc or a long loop, in a worktree | Start from the working directory; create files with Write |
| Blocked `sleep` | 134 | `sleep N; <command>` | One `timeout ... until` call, or a foreground check with a long timeout |
| Heredoc syntax error | 93 | A quote inside a heredoc body | Create files with Write |
| Missing tool | 70 | Workers called Monitor (57) and TaskStop (13), which the `sleep` refusal suggests | Named as unavailable |
| Auto-mode denial | 61 | `pkill`, `taskkill`, `sed -i`, `python -` patches | Change source with Edit |
| Report file refused | 22 | `bezeg-smoke` wrote `report.md`, which its definition asked for | The reply is the report |
| File not there yet | 111 | Reading a shot or log before the run finished | Foreground checks; `just shot` waits for the preview |

PowerShell failed in 14% of handler calls against 2% for Bash.

## Not changed

The handler thresholds stay at the owner's values of 2026-11-14 and 2026-11-20. Handing off near 200k would save about 15% of handler cost after paying for the extra orientations; the changes above slow context growth instead.
