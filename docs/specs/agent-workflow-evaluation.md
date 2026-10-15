# Agent workflow evaluation

## Problem

The current delegation guidance sets a single worker model and effort for most delegated work, while the evaluation log does not consistently record the handler model, task role, assignment completeness, elapsed time, or resolved worker configuration. The initial entries are mostly related UI tasks, so they show review and repair patterns but cannot tell us whether a different model, effort, or worker count would improve results.

## Direction

Keep the current worker assignments as the baseline. Make handoffs easier to execute consistently and record enough evidence to compare similar tasks. Treat model, effort, worker-role, worker-count, and prompt-format changes as separate pilots. Do not turn a small observational sample into a claim of causal improvement.

## Acceptance criteria

- The delegation workflow provides a compact brief for research, implementation, review, and smoke assignments, including scope, write access, source criteria, dependencies, checks, and returned evidence.
- The evaluation record captures task class and estimated size, delegation rationale, handler configuration, each worker role and configured/resolved model and effort, staffing and peak concurrency, brief completeness, elapsed boundary, repair rounds, distinct findings and escapes, integration failures, acceptance and verification coverage, and usage when available.
- Unavailable evidence is marked `unknown`; non-applicable fields are marked `n/a`. No elapsed time, usage, severity, defect, or causal result is inferred.
- Historical entries remain intact. The new record format is used for future entries.
- The workflow keeps current model and effort settings as the baseline while allowing an explicitly labeled pilot to vary one primary factor at a time.
- Pilot comparisons group tasks by similar class and estimated size, keep acceptance and handler review consistent, report sample counts and missing data, and avoid competing writers on the same task.
- The evaluation instructions state when the evidence is too sparse or incomparable to recommend a default change.

## Scope

This covers repository delegation, model and effort selection, task handoffs, and evidence logging. It does not create permanent model-specific worker personas, change the project defaults, or introduce a benchmark harness.

## Related files

- [Agent workflow](../agent-workflow.md)
- [Evaluation log](../agent-workflow/evaluation-log.md)
- [Workflow evaluation skill](../../tools/skills/subagent-flow-evaluation/SKILL.md)
