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

Include a compact context note for the handler and each worker: starting/peak input tokens, reported context-window size, and compactions during work when exposed. Name the source and scope, separate startup compaction records, and disclose heuristic exclusions. Omit unexposed context fields rather than stating each is unavailable; use already available telemetry without requiring a transcript scan or extra instrumentation for ordinary logging. Cumulative token usage is separate from context occupancy.

For each worker, add brief handoff evidence: brief revision and decision-bearing wording or saved reference; material omissions or clarifications; the exact or faithful short instruction added/changed; and the observed follow-up outcome. Include suspected attribution only when useful and label it as such. Record positive outcomes too.

Capture size, start/dispatch time, requested settings, and completion time prospectively; read the dispatch and acceptance times from a clock command (for example `date -u`) when they happen rather than reconstructing them. Use resolved settings and scoped usage only when tools expose them; defaults and worker self-reports do not establish runtime resolution. Omit unavailable optional telemetry (including exact handler settings, resolved worker settings, usage, severity, and later escaped-defect status) and non-applicable fields. Omission means unavailable or inapplicable, never zero or successful. Keep missing required checks, missed capture that limits a comparison, and material uncertainty explicit. Report facts separately from judgments; do not infer telemetry, defects, severity, duration, or causation.

Use partial acceptance when required criteria remain unmet or unverified; distinguish completed implementation from completed acceptance. Record an owner's explicit revision or deferral of criteria when applicable.

Capture full initial/revised prompts, field-by-field completeness, staffing detail, or finding counts only for a handoff investigation or labeled prompt-format pilot. Keep pilot evidence in a bounded repository-local file. Ordinary records need only short excerpts or references; do not create a file per task or run extra checks to fill fields.

For a context investigation prompted by repeated reading, forgotten requirements, duplicate work, or excessive repairs, correlate context data with observed symptoms and their timing. Disclose unreadable content and limits on attribution. A compaction event alone establishes neither context loss nor task-size failure.

## `suggest-subagents-flow-improvements`

When asked to analyze, compare relevant records with the current workflow and repository instructions. Report sample counts, missing data, comparability, and alternative explanations. Separate role-specific quality; research evidence informs research routing only. Observational evidence suggests patterns but does not prove causation.

Evaluate prevention and repair by total effort through acceptance, including implementation, verification, repairs, integration, and repeated setup when observable; report escaped defects separately. First-pass success or fewer repair rounds alone do not establish efficiency. Keep unknown costs explicit and use existing task evidence without adding routine instrumentation.

Turn repeated patterns into a narrow proposed routing rule or task/template wording, cite evidence counts and alternatives, and name a comparable future observation that could support or reject it. There is no fixed sample-count gate. Do not delay an owner-authorized provisional choice while waiting to prove it; keep model, effort, staffing, and prompt-format hypotheses distinct. Read the current log and format only as needed for the requested analysis.

For context-related proposals, compare one change on similar assignments using completion time, correctness, repairs, and scoped usage when available. Account for repeated setup and lost familiarity when splitting tasks or replacing workers between roles. Fewer compactions alone do not establish improvement; keep observed symptoms separate from proposed causes.

Propose edits for the owner's decision; apply them only when authorized. Identify provisional choices based on outside guidance separately from conclusions supported by local observations.
