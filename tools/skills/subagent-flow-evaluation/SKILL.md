---
name: subagent-flow-evaluation
description: Record Bezeg delegation outcomes with `do-log`, or use comparable records to suggest evidence-backed changes to worker routing and assignment wording with `suggest-subagents-flow-improvements`.
---

# Subagent flow evaluation

Use for Bezeg's delegation workflow in [AGENTS.md](../../../AGENTS.md) and [agent-workflow.md](../../../docs/agent-workflow.md).

## `do-log`

After each completed or blocked task, append one compact record to [`evaluation-log.md`](../../../docs/agent-workflow/evaluation-log.md), covering its research, implementation, review, and smoke workers together. Standalone assignments count as tasks; include useful handler-only comparisons. Commit the record with task work or in a small follow-up commit under the repository's push policy. The handler owns the record; workers return evidence for it.

Use current-task context, reports, command results, timestamps, and available usage data. Do not read accumulated history for logging. Set task class and estimated size before dispatch and retain the estimate: S is one localized outcome with one owner; M has several files or behavior branches with one primary owner; L crosses modules or has independently verifiable slices. Record:

- task date, identifier/link if available, role, class/size, and concise scope;
- dispatch reason, worker count (including 0), and each worker's role and requested model/effort; add handler settings and resolved worker settings when exposed by the environment or tool results;
- accepted outcome, checks, coverage gaps, and attributable integration failures;
- repair rounds and failure cause, separating code issues from environment or tool failures;
- elapsed time only with observable start and acceptance/block boundaries, noting external waits; usage only with its scope (handler, worker, or total).

For each worker, add brief handoff evidence: brief revision and decision-bearing wording or saved reference; material omissions or clarifications; the exact or faithful short instruction added/changed; and the observed follow-up outcome. Include suspected attribution only when useful and label it as such. Record positive outcomes too.

Capture size, start/dispatch time, requested settings, and completion time prospectively. Use resolved settings and scoped usage only when tools expose them; defaults and worker self-reports do not establish runtime resolution. Omit unavailable optional telemetry (including exact handler settings, resolved worker settings, usage, severity, and later escaped-defect status) and non-applicable fields. Omission means unavailable or inapplicable, never zero or successful. Keep missing required checks, missed capture that limits a comparison, and material uncertainty explicit. Report facts separately from judgments; do not infer telemetry, defects, severity, duration, or causation.

Use partial acceptance when required criteria remain unmet or unverified; distinguish completed implementation from completed acceptance. Record an owner's explicit revision or deferral of criteria when applicable.

Capture full initial/revised prompts, field-by-field completeness, staffing detail, or finding counts only for a handoff investigation or labeled prompt-format pilot. Keep pilot evidence in a bounded repository-local file. Ordinary records need only short excerpts or references; do not create a file per task or run extra checks to fill fields.

## `suggest-subagents-flow-improvements`

When asked to analyze, compare relevant records with the current workflow and repository instructions. Report sample counts, missing data, comparability, and alternative explanations. Separate role-specific quality; research evidence informs research routing only. Observational evidence suggests patterns but does not prove causation.

Turn repeated patterns into a narrow proposed routing rule or task/template wording, cite evidence counts and alternatives, and name a comparable future observation that could support or reject it. There is no fixed sample-count gate. Do not delay an owner-authorized provisional choice while waiting to prove it; keep model, effort, staffing, and prompt-format hypotheses distinct. Read the current log and format only as needed for the requested analysis.

Propose edits for the owner's decision; apply them only when authorized. Identify provisional choices based on outside guidance separately from conclusions supported by local observations.
