# Agent workflow evaluation

## Problem

The current delegation guidance sets a single worker model and effort for most delegated work, while the evaluation log does not consistently record the handler model, task role, assignment completeness, elapsed time, or resolved worker configuration. The initial entries are mostly related UI tasks, so they show review and repair patterns but cannot tell us whether a different model, effort, or worker count would improve results.

## Direction

Adopt provisional task-fit defaults from the [external evidence assessment](../agent-workflow/external-evidence-2026-10-15.md): Codex uses GPT-6 Luna High for bounded work; Claude uses Haiku 5.5 Medium for narrow exploration and Sonnet 5.5 Medium for implementation. Select higher effort or a stronger model for foreseeable reasoning difficulty or diagnosed reasoning failures. These are starting choices, not measured Bezeg winners. The owner authorized this revision on 2026-10-15.

Keep dispatch guidance concise and separate it from evaluation history. The feedback loop must improve both model/effort routing and the orchestrator's assignment writing. Record enough task-specific brief evidence to connect omissions, clarifications, and repairs to narrow instruction changes without storing whole conversations. Compare one factor at a time; observational records do not establish causation.

## Acceptance criteria

- The delegation workflow provides a compact brief for research, implementation, review, and smoke assignments, including scope, write access, source criteria, dependencies, checks, and returned evidence.
- A compact core record covers research, implementation, review, and smoke assignments, plus useful handler-only comparisons: task class/size, dispatch reason, handler and worker settings with observable resolution, acceptance/checks/gaps, repair rounds and failure cause, timestamp boundary, and usage with scope when available. Set size before dispatch and keep it unchanged.
- Per worker, handoff evidence identifies the brief revision and task-specific wording or a saved reference, material omissions or clarifications, the instruction added or changed, and the observed outcome. Capture successes as well as failures; separate observed facts from suspected causes. Record `none observed` only after inspection, not as a substitute for missing evidence.
- Full brief capture, field-by-field completeness, staffing/concurrency detail, and detailed finding counts are conditional on a handoff investigation or labeled pilot. Preserve exact initial and revised prompts in a bounded repository-local evidence file for prompt-format pilots; ordinary records need only decision-bearing excerpts or references.
- Capture task size, start/dispatch time, requested worker settings, and completion time prospectively. Read resolved settings and scoped usage from tool results only when exposed. Ordinary records omit unavailable optional telemetry and non-applicable fields; omission means unavailable or inapplicable, never zero or successful. State missing evidence explicitly when it limits acceptance or a comparison. No elapsed time, usage, severity, defect, or causal result is inferred.
- Assignment checks account for every acceptance criterion with an assigned verifier or existing evidence; UI presentation criteria describe visible results. Completion distinguishes implementation completion from acceptance completion, with unmet or unverified required criteria reported as partial.
- Historical entries remain intact. New records use the compact format; logging does not require reading the entire history, and workers do not load evaluation or research material for ordinary assignments.
- The workflow, repository pointer, and Codex configuration agree on the adopted defaults. Model routing has one documented source of truth. Explicit supported escalations and labeled pilots are recorded; unavailable settings are reported without silent cross-family substitution.
- Pilot comparisons group tasks by similar class and estimated size, keep acceptance and handler review consistent, report sample counts and missing data, and avoid competing writers on the same task.
- The evaluation instructions state when the evidence is too sparse or incomparable to recommend a default change.
- Handoff recommendations trace an observed pattern to a concrete brief/template wording change, alternatives, and a subsequent comparable observation that could support or reject it. There is no fixed sample-count gate or requirement to prove an untested starting preference before the owner can choose a new provisional default.
- Logging remains cheap: use current-task evidence, omit unavailable optional values, and commit records with normal task work. Model, effort, staffing, and prompt-format pilots retain separate hypotheses; research findings inform research routing only.

## Scope

This covers repository delegation, the authorized default changes, task handoffs, and evidence logging. It does not create permanent worker personas, install skills globally, introduce a benchmark harness, or change application behavior.

## Historical follow-up — 2026-10-15

The owner authorized practical improvements from the ten [backfilled Claude tasks](../agent-workflow/evaluation-log.md#backfilled-claude-code-delegation-records-2026-10-10-to-2026-10-14). These used the earlier workflow; they do not measure today's defaults or handoff format. Repeated findings concern stale controls after indirect state changes, verification against concurrent edits, and migration omissions in auxiliary scripts.

Acceptance for this follow-up:

- Assignment checks include applicable control/graph consistency after Reset, lesson actions, preset restore, and language changes.
- Dispatch accounts for shared dependencies and verification resources even with file-disjoint workers. Integrated acceptance identifies a stable revision and dirty state; transient failures are reproduced there before attribution.
- Migration acceptance inventories affected auxiliary scripts and records exercised commands or explicit gaps; review findings have a recorded disposition.
- Inspect supported Git controls, add a GitHub rule blocking non-fast-forward pushes to `master` while preserving handler commits and fast-forward pushes, and document any worker-isolation gap. Instructions or shell command matching alone do not establish worker isolation.
- Preserve historical records and model defaults, increment the changed brief revision, and verify documentation links and the bounded diff. No application behavior changes; product/browser tests are unnecessary.

### Git controls

Checked on 2026-10-15: [Codex subagents inherit parent sandbox and approval settings](https://learn.chatgpt.com/docs/agent-configuration/subagents#approvals-and-sandbox-controls); a custom agent cannot replace them. The current dispatch tool exposes no worker-specific permission control. [Claude command rules](https://code.claude.com/docs/en/permissions#tool-specific-permission-rules) match command text and can miss equivalent Git invocations. Shared local hooks cannot establish worker identity. No worker-only restriction was installed; hard isolation requires a separately controlled execution environment and Git access.

GitHub reported `master` unprotected and no applicable rules before this change. Added active [ruleset 25172820](https://github.com/efodx/bezeg-2.0/rules/25172820), targeting only `refs/heads/master`, with one `non_fast_forward` rule and no bypass actors. This uses GitHub's [force-push restriction](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#block-force-pushes); ordinary fast-forward pushes remain allowed. This protects remote history and does not distinguish handler from worker or prevent local commits.

## Context follow-up — 2026-10-16

The owner authorized the calibrated recommendations from a local Codex transcript review. The October 8–15 sample contained 142 workers: 17 had compaction events during their work, including 4 of the most recent 38. Fifteen additional workers had startup compaction records excluded using a timing heuristic. Three October 15 workers first compacted after roughly 14–23 minutes. This is local observational evidence, excludes Claude, and does not establish context loss or excessive task size. Some transcript content was encrypted; causes could not be fully reconstructed.

Acceptance for this follow-up:

- Retain current task-size and model defaults. Treat compaction as a continuation mechanism; task splitting or fresh workers for later roles remain hypotheses to test when quality or efficiency suffers.
- Before delegated browser verification, the handler establishes a stable checkout/build and confirms preview reachability from the worker's verification environment. The brief identifies preview ownership, revision/dirty state, and setup status; access failures return to the handler with dependent coverage blocked.
- Keep briefs and investigation focused on relevant entry points and sufficient evidence, while allowing expansion needed to verify the outcome.
- Routine evaluation includes a compact context note for the handler and each worker: starting/peak input tokens, reported context-window size, and compactions during work, with source, scope, and startup exclusions. Unexposed context data is marked unavailable; ordinary logging requires no transcript scan or extra instrumentation. Cumulative usage is not context occupancy. Context investigation correlates these values with observed repeated reading, forgotten requirements, duplicate work, or excessive repairs.
- Compare one proposed change on similar assignments using completion time, correctness, repairs, and usage when available. Fewer compactions alone do not establish improvement.
- Preserve historical records, increment the changed brief revision, and verify links, skill structure, and the bounded diff. This changes guidance only; product/browser tests are unnecessary. Runtime effectiveness remains unmeasured until subsequent assignments.

## Related files

- [Agent workflow](../agent-workflow.md)
- [Evaluation log](../agent-workflow/evaluation-log.md)
- [Workflow evaluation skill](../../tools/skills/subagent-flow-evaluation/SKILL.md)
