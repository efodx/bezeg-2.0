# Claude per-turn input usage — 2026-10-24

Evidence for the [context budget trial](../specs/agent-workflow-evaluation.md#context-budget-trial--2026-10-24). The [2026-10-16 measurements](claude-context-usage-2026-10-16.md) recorded starting and peak input; this snapshot measures input re-read on every turn, which drives usage.

## Method

`python tools/agent-usage/claude_turn_usage.py --exclude <current session>` over local Claude Code transcripts in `~/.claude/projects/*bezeg*` (main checkout and worktree project directories). Handlers are top-level transcripts, workers are `subagents/*.jsonl`. Input per request is `input + cache_creation + cache_read` tokens, once per message ID. Cost weighting (1.25× cache writes, 0.1× cache reads, 5× output) is a relative price, not a bill.

## Results

| | Handlers | Workers |
|---|---|---|
| Contexts | 44 | 157 |
| Share of all input | 33% | 67% |
| Turns, median (max) | 44 (302) | 33 (145) |
| Starting input, median | 45k | 37k |
| Mean input per turn, median | 96k | 102k |
| Peak input, median (max) | 141k (548k) | 136k (493k) |
| Over 40 turns / peak over 150k | 25 / 20 | 67 / 73 |
| Cost-weighted input | 69M | 133M |

Since 2026-10-16, workers are 71% of input (48 contexts, median 34 turns, peak median 135k).

A content breakdown of the main-checkout project directory (67 transcripts, tool results weighted by the turns they remain in context, characters ÷ 4) attributed about 21% of input to the fixed startup prefix (system prompt, tools, `AGENTS.md`, memory), about 48% to conversation and unattributed residue, about 14% to code and test reads, 4% to `git diff/show/log`, about 2% each to logs, screenshots and documentation, and under 1% to the localization catalogs. A four-worker A/B of a 73% shorter `docs/localization.md` changed worker usage by about 2% with equal correctness.

## Handler-side signal

**Claude, confirmed by probe.** A background Haiku worker read 15 files in sequence under a rule to stop on a `HANDOFF` message. The handler read its live input from the worker transcript (`tools/agent-usage/claude_worker_watch.py`) while it ran, then sent `HANDOFF` with `SendMessage` at turn 5 and about 88k input. The message was queued for the worker's next tool round. The worker stopped after file 6 of 15 at turn 8 and about 100k input, wrote its handoff note, and returned. The overshoot was about 12k, one further read. The completion notice reported 100,629 `subagent_tokens`, matching the transcript.

**Codex, inferred from 46 local rollouts and not run live** (the CLI is not installed on this machine):

- `list_agents` and `wait_agent` return status only, with no usage.
- Each child writes its own rollout under `~/.codex/sessions`. `session_meta` records the parent thread and agent path, and `token_count` events record `last_token_usage` and `model_context_window`.
- Parents have used `send_message`, `followup_task`, and `interrupt_agent`. `interrupt_agent` returned `previous_status: running`.
- A parent could therefore read child usage from disk if its sandbox permits, and request a handoff with `interrupt_agent` followed by `followup_task`.
- Whether a `send_message` reaches a child mid-task could not be separated from initial task delivery in the logs.

## Interpretation

The startup prefix is re-read every turn but is paid again by any fresh context, so it scales with total turns, not sessions. Accumulated history is what a fresh context avoids: a worker at 150k re-reads about 110k more per turn than a fresh one, while a new worker costs one ~37k cache write plus re-reading its entry files. Long workers are therefore the main reducible cost. Rewriting documentation is not.

No correlation with correctness, repairs, or forgotten requirements was measured. The 40-turn and 150k thresholds are trial defaults to evaluate, not derived optima.
