"""PostToolUse hook for the Claude Agent tool: remind the handler to start a worker's budget watcher.

Reads the hook payload on stdin. For a background worker launch it prints the exact
claude_worker_watch.py command, with the signal threshold for the worker's resolved model,
as additional context for the handler. Prints nothing for other results.
"""
import json, sys

# Signal thresholds: Haiku stops under its 100k budget including the ~12k overshoot after the
# signal and the handoff note; other models keep the 15k margin under 150k.
THRESHOLDS = {'haiku': 78000}
DEFAULT_THRESHOLD = 135000


def threshold(model):
    return next((v for k, v in THRESHOLDS.items() if k in (model or '')), DEFAULT_THRESHOLD)


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    result = payload.get('tool_response')
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except ValueError:
            return
    if not isinstance(result, dict) or result.get('status') != 'async_launched' or not result.get('agentId'):
        return
    agent, model = result['agentId'], result.get('resolvedModel') or 'unknown model'
    until = threshold(model)
    message = (
        f"Worker {agent} ({model}) launched. Start its budget watcher now as a background command: "
        f"python tools/agent-usage/claude_worker_watch.py {agent} --until {until} "
        "— when it exits at the threshold, send the worker HANDOFF with SendMessage (docs/agent-workflow.md#dispatch)."
    )
    print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PostToolUse', 'additionalContext': message}}))


if __name__ == '__main__':
    main()
