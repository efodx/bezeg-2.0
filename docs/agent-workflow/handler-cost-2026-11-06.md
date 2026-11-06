# Handler cost, 2026-10-30 to 2026-11-06

Evidence for the [handler context efficiency spec](../specs/handler-context-efficiency.md). Source: local Claude transcripts for 106 handler and 418 worker contexts. Codex sessions (72, 304 MB) were not analysed. The evaluation log holds 58 records for this period, so repair counts are partial.

Costs are relative units: token counts priced from CLI-reported probe costs, which put Opus at about twice Sonnet per token, with cache reads at 0.1×, writes at 1.25× (5-minute) or 2× (1-hour) and output at 5×. They are not a bill, and weekly-limit accounting may weight usage differently.

## Observed

| Measure | Value |
| --- | --- |
| Estimated cost, all contexts | 1,483 units |
| Handlers, all Opus | 1,020 units (69%) |
| `bezeg-worker` / `bezeg-smoke` / `bezeg-reviewer` | 376 / 47 / 39 units |
| Handler input at first request | median 48k; workers 11k |
| Stream handler context at first dispatch | median 90k, after 14 turns and about 80 KB of tool results |
| Handler peak | median 193k, about 87 turns, 1.65k growth per turn |
| `agent-workflow.md` reads during orientation | 256 across 94 stream handlers |
| Claude worker watchers launched | 423, and 174 self-watchers |
| Workers reaching 135k | 43 of 418; 5 reached 150k |
| `bezeg-worker` turns | median 40; 163 of 225 past the 30-turn fallback |
| Worker cost per turn by length | flat, 0.034–0.045 units from under 20 to over 60 turns |

Stream handler cost by phase, from a heuristic classifier of each turn's tool calls: orientation 23%, reading docs and logs 20%, code review 13%, text-only turns 12%, self-run verification 8.5%, dispatch 6%, docs and handoff 5.5%, Git 5.5%, watcher-only turns 4%. About 220 text-only turns were notification wake-ups, many from watcher exits.

The weekly limit stopped all three streams at 18:36 UTC on 2026-11-03, after about 1,021 units since the previous reset, until the owner resumed them at 23:30 UTC on 2026-11-04.

## Probes

| Launch | First-request input |
| --- | --- |
| `claude --bg --agent claude`, Opus, auto | 48,127 |
| `claude --bg --agent bezeg-handler`, Opus, auto | 20,048 |

The difference is mostly the skill listing, a 42 KB attachment. Handlers invoked a skill 8 times in about 8,900 tool calls. `AGENTS.md` and the memory index still load under `bezeg-handler`, and Agent, SendMessage and TaskStop remain available.

Budget hook, with lowered thresholds through `--settings`:

- A handler received `BUDGET SOFT` and declined to start a worker.
- A `bezeg-worker` received `HANDOFF` inside its tool result and, before its definition named the hook, ignored it as untrusted tool output. After the definition change it stopped after one of five steps, wrote the note and returned partial.
- With `--no-session-persistence` no transcript exists and the hook stays silent.

## Model

Token-equivalents per productive handler turn, counting cached reads and startup, excluding output and context growth. Assumes the observed 1.65k growth per turn.

| Context after orientation | Handoff peak | Per turn |
| --- | --- | --- |
| 90k (old) | 193k | 18.6k |
| 90k (old) | 150k | 19.7k |
| 30k (target) | 193k | 11.8k |
| 30k (target) | 150k | 10.0k |
| 30k (target) | 120k | 8.8k |

Lowering the threshold pays only once orientation is cheap. This is a model, not a measurement.
