# Haiku worker context — 2026-10-25

The owner asked why Haiku workers exceed 100k input, the cheaper pricing tier. Source: the 39 Haiku subagent transcripts in `~/.claude/projects/*bezeg*/` (Claude Code request usage, input + cache read + cache write per request).

## Findings

- 29 of 39 runs peaked above 100k, usually crossing between turns 20 and 50. 58% of Haiku requests and 74% of Haiku input tokens were above 100k. 34 runs predate v9; implementation has since moved to Sonnet.
- Startup input was about 37.5k under `general-purpose` and 20k under `Explore`. System prompt (~3k characters), skill listing (~18k characters), and `AGENTS.md` with memory (~2k tokens) were similar; the gap is tool definitions.
- Over 100k runs averaged 92 turns and 122k growth: roughly 20k model output (thinking and tool inputs) and 75–80k tool results, mostly `sed -n` and `grep -n` slices. Screenshots averaged three per run.
- Large tool results measured about 2 characters per token from per-request input deltas, not the 4 assumed in [claude-turn-usage](claude-turn-usage-2026-10-24.md); its code-read share is likely understated by half.
- Requests added a median of about 500 input tokens beyond the previous output even when the tool result was under 200 characters.
- Since v10, three Haiku runs: the handoff probe and one review stopped by `HANDOFF` at about 100k; one `Explore` research worker reached 119k in 22 turns with no watcher started, while the handler watched its Sonnet worker and itself.
- A headless probe of the v12 agents `bezeg-smoke` and `bezeg-worker` on Haiku measured first-request input of 9,064 and 9,454. Both still loaded `AGENTS.md` and memory; they omit the skill listing and deferred-tool list. The launch hook delivered the watcher command with the 78k threshold.

## Consequences

v12 routes Claude workers through the tool-restricted agents, makes a launch hook name the watcher command for every background worker, lowers the Haiku signal from 85k to 78k (the probe stopped at 100,021 after an 88k signal), and caps read size in the brief. Evaluate as before with `tools/agent-usage/claude_turn_usage.py`; startup savings apply per request, so they matter most to long workers.
