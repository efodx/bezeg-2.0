# Worker input budgets

## Codex: monitor, then relay

Run from the repository with Node 24.15 or newer. After each child dispatch, start one watcher in the parent chat's shell:

```powershell
node tools/agent-usage/codex_worker_watch.cjs --agent-path /root/worker_name
```

The parent defaults to `CODEX_THREAD_ID`; otherwise supply `--parent-thread-id <parent-thread-id>`. Sessions default to `CODEX_HOME/sessions`, or `~/.codex/sessions` when unset; `--sessions-root <directory>` overrides it. Metadata must match the exact parent and canonical agent path; duplicate matches fail. Do not use a child's environment to target its sibling.

The default trigger is 135000 request-input tokens (150000 budget minus 15000 margin). `--budget` and `--margin` change those settings; `--until <positive-integer>` overrides the trigger for testing. Cached input is already included; cumulative usage and context-window capacity are not request input. Crossings followed by a lower sample in the same active turn are retained. The latest worker turn is selected at attachment; launch a new watcher for a later follow-up turn.

### Handler procedure

1. Launch with `exec_command` as a background command. Retain its process/session handle alongside the worker path; do not detach it with an unmanaged process launcher.
2. Consume output while the worker runs. If the command yields a session ID, check it alongside useful handler work. When idle, batch `write_stdin` waits inside one `functions.exec` execution (for example, five-second process waits for up to fifty seconds), returning on terminal output or process exit. Do not use a separate model turn for every five-second poll. Retain the session handle across bounded batches and yield promptly on output; if an execution cell yields, resume that cell instead of launching another watcher. Process exit alone does not guarantee a Codex wakeup. Do not wait solely on `wait_agent` with unread watcher output.
3. Parse the terminal JSON. On `handoff_required`, call collaboration `send_message` with `target` equal to the event's `agent_path`: `HANDOFF: input budget trigger reached. Stop at a consistent point, write the assigned handoff note with state, remaining work, touched files and checks, and return partial.` The initial brief must name a handoff-note path. Do not assign more work to that child.
4. Inspect the partial response and note. If no response arrives at the next tool boundary, use `interrupt_agent` then `followup_task` requesting the note. Interruption does not guarantee cancellation of external processes or safe partial writes; inspect affected files/processes. Continue with a fresh worker from the note when its old history is unnecessary.
5. On `completed`, review the actual worker result separately. On telemetry failure, report monitoring as unverified, inspect the reason, and retain the brief's 40-turn fallback. Missing usage never means below budget. If the worker is cancelled or the handler finishes early, stop any remaining watcher using its retained process/session handle and record incomplete coverage.

The Node process cannot invoke hosted collaboration tools: detection is automatic and the handler relays the handoff. This is cooperative enforcement, not a hard cap. Telemetry describes completed requests; polling and delivery add delay; a single request can cross the entire margin. The 15k margin is not a proven Codex overshoot bound. Transcript layout is an implementation detail; unsupported telemetry is a monitoring failure.

### Handler overhead

The Node polling loop makes no model requests. Handler launches, empty polls, execution-cell resumes and handoff messages do consume model usage, including rereading cached history. In the first live probe, six monitoring-only responses plus the relay processed about 760k input (758016 cached) and 590 output tokens; four mixed polling/work responses added 438326 input and 870 output, which cannot all be attributed to monitoring. See the [measured overhead](../../docs/specs/codex-worker-monitoring.md#handler-overhead-follow-up) for scope and limits.

Account for handler overhead when assessing the budget trial. Prefer polling alongside useful work and batching idle waits within tools; compare total model-weighted handler and worker usage, including handoff and fresh-worker setup, against avoided worker usage. A lower worker peak alone is not an efficiency win. Longer handler wait batches reduce model round trips, but may delay the relay; no revised batch setting has a validated overshoot bound.

A [controlled 40-second comparison](../../docs/specs/codex-worker-monitoring.md#observed-comparison) measured five handler model calls / 769k input for separate polls versus one model call / 155k input for batched waits. Both received the threshold event promptly. The successful batched arm's Standard-rate credit illustration was 71.4% lower; counting its failed instrumentation attempt reduced that advantage to 49.3%. This one pair supports batching waits, but does not establish net worker-budget savings or full relay latency. Keep waits bounded and only retain process handles when a running process actually returned one.

### Output and exits

One JSON terminal event is written to stdout, with `event`, `parent_thread_id`, `agent_path`, nullable `observed_input_tokens`, nullable `threshold_input_tokens` (the crossing sample), `threshold`, nullable `rollout_path`, and optional `reason`. Argument errors print usage to stderr and exit 2; `--help` prints help and exits 0.

| Event | Exit | Handler action |
| --- | ---: | --- |
| `handoff_required` | 0 | Relay `HANDOFF` to the identified child |
| `completed` | 10 | No handoff; inspect the completed/aborted worker result |
| `unavailable` | 11 | Missing rollout/usage; inspect access/schema |
| `idle` | 12 | Rollout stopped growing; inspect worker status |
| `error` | 1 | Ambiguous identity/read/runtime failure; inspect reason |

`--interval <seconds>` defaults to 1; `--timeout <seconds>` bounds discovery and initial valid-usage wait (default 60); `--idle-timeout <seconds>` bounds lack of growth after usage appears (default 300). Waits must be positive finite numbers. Completed/aborted turns terminate monitoring even without usage. A current turn already complete when read does not request another handoff.

```powershell
node --test tools/agent-usage/codex_worker_watch.test.cjs
```

The Developer tools workflow runs these tests on Windows and Linux. See the [monitoring spec](../../docs/specs/codex-worker-monitoring.md) for acceptance and live evidence.

## Claude

`claude_worker_watch.py` reads Claude Code transcripts only. See [dispatch guidance](../../docs/agent-workflow.md#dispatch); it cannot monitor Codex.
