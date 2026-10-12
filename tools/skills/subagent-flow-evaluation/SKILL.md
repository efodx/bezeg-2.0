---
name: subagent-flow-evaluation
description: Log completed coding-task evidence about Bezeg's handler/subagent workflow with `do-log`, or analyze accumulated entries and suggest evidence-backed workflow edits with `suggest-subagents-flow-improvements`.
---

# Subagent flow evaluation

Use this skill only for the project's implementation delegation workflow described in [AGENTS.md](../../../AGENTS.md) and [docs/agent-workflow.md](../../../docs/agent-workflow.md).

## `do-log`

At the end of a completed or blocked coding task, append one entry to [`docs/agent-workflow/evaluation-log.md`](../../../docs/agent-workflow/evaluation-log.md). Create the file with its schema header if needed. Preserve existing entries. Do not commit or push as part of logging.

Use the current task context, agent reports, command results, timestamps, and available usage data. Record unknowns as `unknown`; do not infer durations, token usage, defects, severity, or causation. A concise task summary is enough; avoid copying private or sensitive content into the log.

Capture:

- date, task identifier/link when available, and a concise task class/size description;
- workflow mode (handler-only or delegated), worker model/effort and count when applicable;
- elapsed time only if start and accepted/blocked times are observable, with the measurement boundary stated;
- number of handler-to-worker repair rounds; for handler-only tasks use `n/a`;
- actionable findings from handler review, separated by severity where known, and whether any escaped into integration or required a post-acceptance repair;
- integration/check failures attributable to the task, and whether acceptance criteria passed, partially passed, or were blocked;
- token/usage data only if available, including what it covers (worker, handler, or total).

Do not turn confidence, apparent effort, or an agent's self-assessment into quality scores. Distinguish observed facts from handler judgments. Keep the handoff brief and do not run extra checks solely to populate the record.

## `suggest-subagents-flow-improvements`

Read the evaluation log and the current [delegation workflow](../../../docs/agent-workflow.md) and [repository instructions](../../../AGENTS.md). If the log is absent or too sparse, report that and identify which additional comparable tasks would resolve the uncertainty; do not manufacture a recommendation to satisfy the command.

Group only reasonably comparable task classes and workflow modes. Report sample counts and missing data alongside descriptive summaries (prefer medians/ranges for times and repair rounds; counts/rates for failures, review findings, and acceptance). Do not aggregate incomparable work into a single score, claim causality from observational records, or treat worker self-reports as verified outcomes.

Recommend a workflow edit only when a repeated, meaningful pattern connects to specific wording or a decision rule in the files. For each recommendation, state the observed pattern and sample size, uncertainty/alternative explanations, the narrow proposed wording change, and what future observations would show whether it helped. Separate high-confidence process corrections from hypotheses that need more data. Do not change the workflow or model preferences unless the user asks; present a concrete patch for review when requested.

The owner's model/effort preferences are policy choices, not conclusions implied by small samples. Preserve them unless the user explicitly asks to reconsider them and the evidence is sufficiently comparable.
