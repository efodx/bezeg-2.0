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

This covers repository delegation, the authorized default changes, task handoffs, and evidence logging. It does not create permanent worker personas, install skills globally, or change application behavior. The [repeatable evaluation harness](#repeatable-evaluation-harness--2026-10-24) is the only benchmark harness; ordinary task evidence still comes from real work.

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

## Proportionate verification follow-up — 2026-10-16

The owner accepted a lighter revision of the recommendations from Batches B and C: optimize total effort to accepted work, retaining independent release review and focused repairs. Their layout findings and mathematical premise errors justify targeted checks, but the records do not measure whether universal extra worker verification would cost less than repair. Batch C's 31-minute review-fix assignment and 15-minute layout assignment include investigation and checks; they are not measurements of avoidable overhead.

Acceptance for this follow-up:

- Preserve required specialist review, smoke checks, and acceptance criteria. Assign each check to a verifier and reuse valid evidence; request extra implementation-worker screenshots for foreseeable layout risk or when needed for the worker's own verification, rather than duplicating full visual review on every assignment.
- Workers flag mathematical contradictions encountered during their slice; the handler settles them before dependent work. Reserve deeper independent premise checking for difficult mathematics, assumptions shared by dependent slices, or costly downstream rework.
- Prefer focused repairs for local findings. Compare prevention and repair using total effort through acceptance, including verification, repairs, integration and repeated setup when observable; report escaped defects separately. Fewer repair rounds or first-pass success alone do not establish improvement.
- Keep model and task-size defaults unchanged. Keep routine logging compact and record unknown costs honestly; add no mandatory instrumentation or per-task proof audit.
- Increment the brief revision, preserve historical records, and verify the bounded documentation diff and local links. No application behavior changes; product tests and browser smoke do not apply. Runtime effectiveness remains unmeasured.

## Version assessment follow-up — 2026-10-20

Review the numbered handoffs against Git history and recorded assignment outcomes. The owner requested a version-by-version assessment and revisions supported by the evidence.

Acceptance for this follow-up:

- Identify the introducing commit and substantive change for v1–v6; count explicitly versioned task records separately from individual workers, policy announcements, and unversioned historical assignments.
- Trace each verdict to recorded observations, including negative and contradictory evidence. Separate reporting/compliance improvements from delivered quality and total effort; disclose missing timings, usage, and comparable controls.
- Preserve historical records and model/task-size defaults. Apply only a narrow, evidence-backed template revision, marking its future effect unmeasured; name an observation that could support or reject it.
- Verify local links, historical-log preservation, and the bounded documentation diff. No application behavior changes; app tests and browser smoke do not apply.

Assessment and version inventory: [handoff versions](../agent-workflow/handoff-versions-2026-10-20.md).

## v7 assessment follow-up — 2026-10-24

The owner requested a review of the workflow against records since v7 and authorized all six proposed changes.

Acceptance for this follow-up:

- Compare v7 records with the v7 assessment's own refutation criterion; report counts, confounds and positive evidence.
- Apply only the authorized changes: v8 brief wording (observed-failure evidence, reviewer non-vacuity, persisted-data compatibility), browser-environment dispatch defaults, port-scoped Playwright output, routing/smoke alignment and logging fixes. Keep other model, effort and task-size defaults.
- Keep default and CI Playwright output paths unchanged; verify a non-default port writes separate folders.
- Verify local links and the bounded diff; mark future effects unmeasured.

Assessment: [handoff v7 assessment](../agent-workflow/handoff-v7-assessment-2026-10-24.md).

## Context budget trial — 2026-10-24

The owner asked whether usage favors fresh contexts and authorized a worker context budget. [Per-turn measurements](../agent-workflow/claude-turn-usage-2026-10-24.md) put workers at 67% of input, with 73 of 157 peaking above 150k; accumulated history, not the startup prefix, is the reducible part. This revises the 2026-10-16 "retain current task sizes" acceptance for workers only; model and effort defaults are unchanged.

Acceptance for this follow-up:

- Dispatch sizes worker slices to finish in about 40 turns, splitting larger specs into sequential workers linked by handoff notes.
- Brief v9 adds a budget: past about 40 turns, or 150k input where visible (workers usually cannot see their token count), a worker stops at a consistent point, writes a handoff note to a named path, and returns. The handler continues with a fresh worker rather than `SendMessage` when the next step does not need the old history.
- Revision (same day, owner request): brief v10 sets a 100k input budget for Haiku workers (turn fallback about 30) and moves the trigger to the handler, which watches worker input and sends `HANDOFF` about 15k before the budget. Confirmed for Claude by a live probe; the Codex mechanism is inferred from local rollouts and stays untested until a Codex run.
- Revision (2026-10-25, owner request): brief v11 sizes slices to about 20 turns (turn fallback 30, Haiku 20), caps concurrency at three workers, and gives the Claude handler a context budget: soft 150k (no new dispatch, running workers finish), hard 190k (`HANDOFF` to running workers), then a handoff note and an automatic `claude --bg` successor. Codex handlers are out of scope until a self-watch exists. [Evidence](../agent-workflow/lesson-run-usage-2026-10-25.md).
- Record per-turn usage with `tools/agent-usage/claude_turn_usage.py` before and after the trial. Keep the budget only if worker usage falls without more repairs, escaped defects, or longer completion; otherwise revert it.
- Guidance change only; verify links and the bounded diff.

### Codex monitoring implementation — 2026-10-24

The owner authorized implementation after the [Codex control probe](../agent-workflow/codex-handoff-probe-2026-10-24.md). The [monitoring spec](codex-worker-monitoring.md) defines automatic threshold detection and a handler-delivered cooperative handoff, including failure handling and live verification. It supersedes the guidance-only scope for this bounded tooling follow-up; model defaults and the trial budget stay unchanged. A hard token ceiling and efficiency improvement remain unproven.

## Repeatable evaluation harness — 2026-10-24

Observational records compare different tasks, so they cannot separate a workflow change from task difficulty. The owner asked for repeatable synthetic runs at three sizes, defaulting to medium, under the full current tooling; token budget is not a constraint because runs use spare capacity. This revises the earlier scope exclusion of a benchmark harness.

Decision: replay past commits rather than invent tasks, composing each sandbox from three layers (base app commit, the solution's spec, current tooling) instead of a maintained branch or tag. A frozen branch would also freeze the workflow under test, could be pushed by mistake, and its history would expose the solution. Held-back tests from the solution commit grade the result without being visible to the agent.

Acceptance:

- `just eval setup [S|M|L|task]` creates a history-free sandbox outside the repository with no remote, the base app, the task spec, current tooling from `HEAD` (or a chosen revision or directory) and installed dependencies; medium is the default. Evaluation history and research are excluded because they describe the original solutions.
- `just eval grade <run>` runs typecheck, all unit tests and build with the sandbox's tooling, then the solution's held-back tests. Contract tests use only spec-fixed names and behavior and decide acceptance; reference tests of the original design are informational. The report adds commits, uncommitted paths, diff size, and Claude and Codex usage scoped to the sandbox, split into handler and workers.
- `just eval calibrate [task]` must show the reference solution passing every gate and hidden test and the base failing at least one contract test under current tooling. Calibrate after tooling changes; replace a task whose base no longer runs with current tooling.
- A run is invalid when the agent read another checkout. Comparisons follow this spec's one-factor rule, with at least three runs per arm on the same task, and are recorded as a labeled pilot in the evaluation log; the harness verdict does not replace handler review against the spec.

Tasks: S `count-setter` (`4a6c092`), M `chapter-activity-controls` (`aaa5c65`), L `fixed-point-lesson` (`3d37627`, Parts B and C). Procedure, layers and limits: [harness README](../../tools/agent-eval/README.md).

## Related files

- [Agent workflow](../agent-workflow.md)
- [Evaluation log](../agent-workflow/evaluation-log.md)
- [Workflow evaluation skill](../../.agents/skills/subagent-flow-evaluation/SKILL.md)
