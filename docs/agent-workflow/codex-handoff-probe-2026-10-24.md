# Codex handoff probe — 2026-10-24

Source: commit `25bff66b459c18f9642bde13b2afd5126c7af040`, [context budget trial](../specs/agent-workflow-evaluation.md#context-budget-trial--2026-10-24). Review compared `25bff66^` to `25bff66`, excluding the later commit at HEAD.

## Result

The handler could observe a running Codex worker's input and obtain a partial handoff in this local session. Both cooperative messaging and interrupt/follow-up worked. This confirms the control mechanism, not savings from the budget or a portable automatic watcher. The added `claude_worker_watch.py` reads Claude transcripts only and cannot monitor Codex.

## Synthetic assignment and observations

One fresh-context GPT-6 Luna High worker received an ordered eight-file reading task, restricted to the first twelve lines per file, with seven-second sleeps between reads. It had to preserve nonce `ELDERFLOWER-257`, ordered progress, and remaining work. Only a temporary handoff note was writable. No application changes, Git operations, or further delegation were allowed.

- Child rollout metadata identified agent `/root/handoff_probe`, child `01a16d3b-c30c-78f0-9395-d25da9a2d9e7`, and parent `01a16d3a-5c07-72f3-9da5-deeaaa1f1f96`. The handler could read the live rollout under `~/.codex/sessions/2026/10/24`. Its first request recorded `last_token_usage.input_tokens = 34458` and `model_context_window = 258400`. A later request recorded 36416 input versus 390040 cumulative input. Use the request value for a context threshold; the window is capacity, not occupancy.
- Phase A: after the worker reported reading `guardrails.md`, the handler sent `HANDOFF` with `send_message`. The worker wrote a partial note with that one completed file, all seven remaining files, and the correct nonce. It performed no further reads.
- Phase B: `followup_task` asked the same worker to read the next file and sleep for 45 seconds. After `INTERRUPT_READY`, `interrupt_agent` returned `previous_status: running`. A subsequent `followup_task` requested `HANDOFF`. The rewritten note preserved the nonce and both completed files (`guardrails.md`, `future-plan.md`), with six remaining files. The worker reported its sleep was aborted after about 9.4 seconds.
- Two independent fresh-context reviewers found no documented-standards or source-spec defects in the commit. Both used requested GPT-6 Luna High. This review did not exercise the Claude watcher.

The final remaining list was `commands.md`, `agent-workflow.md`, `agent-workflow-evaluation.md`, `package.json`, `justfile`, `AGENTS.md`. The temporary note was removed after inspection.

## Limits and practical use

The signal was manual at low input, not an automatic 135k threshold trigger. No 150k run, compaction, fresh successor implementation, long-running shell process, mathematical operation, or browser interaction was tested. The Claude probe's 15k margin is not a measured Codex overshoot allowance. Interruption was exercised during an idle sleep; arbitrary in-flight writes or shell processes were not tested for safe termination.

For this environment, a cooperative `send_message` requesting `HANDOFF` at a tool boundary works; interrupt/follow-up is an observed fallback. To automate the budget, Codex still needs monitoring that identifies the child rollout and reads `last_token_usage.input_tokens`, with explicit unavailable-telemetry handling. Transcript layout is an implementation detail, not a portable API contract. No workflow defaults were changed by this review.

Official references: [subagent controls](https://learn.chatgpt.com/docs/agent-configuration/subagents), [multi-agent action semantics](https://developers.openai.com/api/docs/guides/responses-multi-agent).
