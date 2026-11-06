# Handler context efficiency

Status: implemented 2026-11-06; trial open. Owner request: apply proposals 1–3 from the week's [cost evidence](../agent-workflow/handler-cost-2026-11-06.md). Claude handlers only. Codex procedures are unchanged.

## Problem

Handlers were about 69% of estimated cost, and the weekly limit stopped all streams for about 29 hours. Each handler re-reads a 48k startup on every turn, reaches 90k before its first dispatch, and spends turns launching and clearing watchers of which about one in ten fires.

## Decisions

1. **`bezeg-handler` agent.** Main sessions run a tool-restricted agent with no skill listing, reading skills as files. Alternative: drop individual skills from the installation, which would affect every other project and leave the connector tools.
2. **Handoff note plus [handler card](../agent-workflow/handler-card.md) as the required reads.** AGENTS.md no longer sends Claude handlers to the full workflow before dispatch. The card repeats some workflow rules on purpose: the lookup was the cost. Alternative: split stream files, rejected because they are already short status tables.
3. **[Budget hook](../../tools/agent-usage/claude_budget_hook.py) replaces watchers.** The caller is told directly, with no handler turn. The soft threshold becomes the owner's 175k override from 2026-10-28, so the repository and the owner's setting agree. The Claude turn fallback goes: 72% of workers exceeded it at flat cost per turn.
4. **Soft threshold stays at 175k for now.** At the old startup cost a lower threshold costs more per turn. Revisit after the trial.

## Impact

No routes, stored Presets or app code change. Handlers already running keep their loaded procedure until their successor. A stream worktree not yet rebased lacks the agent, so `streams.ps1` falls back to `--agent claude` there. Sessions without transcripts get no budget signal.

## Acceptance

- `--bg` startup under `bezeg-handler` is at most 25k. Observed: 20,048.
- `AGENTS.md`, the memory index and the Agent, SendMessage and TaskStop tools work under it. Observed.
- A worker past its threshold stops, writes its note and returns partial with no handler action. Observed with a lowered threshold.
- A handler receives `BUDGET SOFT` and `BUDGET HANDOFF` by model. Soft observed live; both unit tested.
- `python tools/agent-usage/claude_budget_hook_test.py` passes locally and in the Developer tools workflow.

## Trial

Compare the next ten stream handlers with the [baseline](../agent-workflow/handler-cost-2026-11-06.md) using `tools/agent-usage/claude_turn_usage.py --since <start>`.

- **Keep** if median context at first dispatch is at most 60k and repairs and escaped defects do not rise.
- **Keep the hook** if worker overshoot past the signal stays within about 15k and no worker ignores `HANDOFF`.
- **Then** trial a soft threshold near 120k, changing nothing else.
- **Reject** the card if handlers re-read the workflow anyway or briefs lose required fields.
