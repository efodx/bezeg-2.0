# Sonnet 5.5 handler pilot

Status: planned 2026-10-31, owner-scheduled for later the same day. Source: [agent workflow evaluation](../../specs/agent-workflow-evaluation.md#repeatable-evaluation-harness--2026-10-24); follows the [delegation arms pilot](../../agent-workflow/delegation-arms-pilot-2026-10-31.md).

## Question

Main-session (handler) turns dominated cost in the delegation arms pilot ($2.03–$3.86 of Opus per run). Does a Claude Sonnet 5.5 handler, at half the per-token price, reach the same graded correctness on the current workflow, and at what cost and elapsed time?

One changed factor: the handler model. Workflow, prompt, task and worker routing stay as committed on master.

## Runs

- Task: `chapter-activity-controls` (M). Recalibrate first if tooling changed: `just eval calibrate M`.
- Arms: Sonnet 5.5 handler × 2 (`--model claude-sonnet-5-5`). Compare with the pilot's two current-workflow Opus runs ($2.34 / 35 min and $3.43 / 55 min); add fresh Opus runs only if tooling changed enough to make those incomparable.
- Setup: `just eval setup M` per run; accept the workspace trust prompt once in each new `repo` folder; give each sandbox its own `SMOKE_PORT`; launch with `claude --bg -n "eval M sonnet-handler <n>" --agent claude --model claude-sonnet-5-5 --permission-mode auto "<prompt.md contents>"` from the sandbox `repo` folder. Run the pair concurrently and grade after both settle.
- Completion: a session is finished when its log shows the final recap, even if `claude agents --json` still reports `busy` because of a leftover background shell.

## Acceptance

- Both runs graded with `just eval grade <run directory>`: verdict, gates, contract smoke, estimated cost and span recorded.
- Results table and a short reading appended to the delegation arms pilot record (or a sibling record), plus an `evaluation-log.md` entry.
- Note any repeated reading, forgotten requirements or extra repairs from the Sonnet handler, since those would offset its lower price.
- Sandboxes and transient servers removed after the record is committed.
