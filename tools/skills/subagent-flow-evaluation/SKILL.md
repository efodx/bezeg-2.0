---
name: subagent-flow-evaluation
description: Log completed coding-task evidence about Bezeg's handler/subagent workflow with `do-log`, or analyze accumulated entries and suggest evidence-backed workflow edits with `suggest-subagents-flow-improvements`.
---

# Subagent flow evaluation

Use this skill only for the project's implementation delegation workflow described in [AGENTS.md](../../../AGENTS.md) and [docs/agent-workflow.md](../../../docs/agent-workflow.md).

## `do-log`

At the end of each completed or blocked implementation task, append one entry to [`docs/agent-workflow/evaluation-log.md`](../../../docs/agent-workflow/evaluation-log.md), including handler-only work when it is useful as a comparable case. Use the current record format for new entries and preserve the historical rows. Always commit the log entry: include it in the task's normal commit when that commit is still pending, or make a small follow-up commit if the task work was already committed. Never leave a completed log entry uncommitted. Follow the repository's Git workflow for pushing commits.

Use the current task context, agent reports, command results, timestamps, and available usage data. Record unknowns as `unknown`; do not infer durations, token usage, defects, severity, or causation. A concise task summary is enough; avoid copying private or sensitive content into the log.

Capture:

- date, task identifier/link when available, and a concise task class/size description;
- workflow mode (handler-only or delegated), worker model/effort and count when applicable;
- elapsed time only if start and accepted/blocked times are observable, with the measurement boundary stated;
- number of handler-to-worker repair rounds; for handler-only tasks use `n/a`;
- actionable findings from handler review, separated by severity where known, and whether any escaped into integration or required a post-acceptance repair;
- integration/check failures attributable to the task, and whether acceptance criteria passed, partially passed, or were blocked;
- token/usage data only if available, including what it covers (worker, handler, or total).

Also record task class, estimated size, source spec or concise scope, and why the handler delegated or kept the work. Include the handler model/effort and, for each worker role, requested and resolved model/effort when visible, worker count, and peak parallel count. Note whether the brief covered the goal, acceptance, owned paths, context to preserve, dependencies, checks, and evidence to return; identify omissions or clarifications.

Measure wall-clock elapsed time from first dispatch, or handler start for handler-only work, through acceptance or block. Note external waits that make a duration incomparable. Separate unique findings by phase and reviewer role, state repair status and escaped defects, and distinguish code-caused failures from environment, sandbox, or tool failures. Label any pilot hypothesis and the single changed variable.

Do not turn confidence, apparent effort, or an agent's self-assessment into quality scores. Distinguish observed facts from handler judgments. Keep the handoff brief and do not run extra checks solely to populate the record.

Set task size before dispatch: S is one localized outcome with one clear owner; M has several files or behavior branches with one primary owner; L crosses modules or divides into independently verifiable slices. Use `unknown` for unavailable values and `n/a` only when a field does not apply. Do not infer duration, usage, severity, defects, or causation.

## `suggest-subagents-flow-improvements`

Read the evaluation log and the current [delegation workflow](../../../docs/agent-workflow.md) and [repository instructions](../../../AGENTS.md). If the log is absent or too sparse, report that and identify which additional comparable tasks would resolve the uncertainty; do not manufacture a recommendation to satisfy the command.

Group only reasonably comparable task classes, size bands, and workflow modes. Report sample counts and missing data alongside descriptive summaries (prefer medians/ranges for elapsed time and repair rounds; counts/rates for distinct findings, escaped defects, environment failures, and acceptance). Attribute findings to handler, worker, or reviewer where evidence permits. Do not count duplicate reports as separate defects, aggregate incomparable work into one score, claim causality from observational records, or treat worker self-reports as verified outcomes.

Recommend a workflow or default-setting change only when a repeated, meaningful pattern connects to a specific decision rule. For each recommendation, state the observed pattern and sample sizes for each setting, uncertainty and alternative explanations, the narrow proposed wording or setting change, and what future observations would show whether it helped. Separate high-confidence process corrections from hypotheses that need more data. A pilot changes only its labeled variable and does not silently replace the project default. Change model preferences only when the owner explicitly asks and the comparison is sufficiently comparable; otherwise preserve the baseline and propose the next useful pilot.

The owner's model/effort preferences are policy choices, not conclusions implied by small samples. Preserve them unless the user explicitly asks to reconsider them and the evidence is sufficiently comparable.
