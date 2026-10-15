# Agent workflow

The handler owns scope, integration, acceptance, and Git operations under [AGENTS.md](../AGENTS.md). Delegate substantial, separable work; keep small or tightly coupled changes with the handler. Workers own their assigned slice and evidence, without further delegation, commits, or pushes.

## Model routing

These are provisional starting choices based on [external guidance](agent-workflow/external-evidence-2026-10-15.md), not measured Bezeg winners. Select the active orchestrator's column and check the tool's supported model and exact effort names before dispatch.

| Assignment | Claude orchestrator | Codex orchestrator |
| --- | --- | --- |
| Narrow research and code exploration | Haiku 5.5 `medium` | GPT-6 Luna `high` |
| Bounded implementation, fixes, and tests | Sonnet 5.5 `medium` | GPT-6 Luna `high` |
| Independent review or smoke | Sonnet 5.5 `medium` | GPT-6 Luna `high` |
| Integration and final acceptance | Handler | Handler |

Choose supported higher effort or a stronger model within the active family for substantial ambiguity, difficult mathematics, or complex interactions; record the reason and selected setting. Assess foreseeable difficulty before dispatch. After a failure, distinguish missing context, unclear acceptance, ownership conflicts, environment problems, and reasoning errors before escalating. Reserve XHigh/Max for demanding reasoning or a labeled comparison. If the intended setting is unavailable, report it and continue independent work; do not silently substitute across families. Requested settings are not proof of resolved settings.

Codex child defaults are in [`.codex/config.toml`](../.codex/config.toml); the handler retains its selected model. Claude applies this table through its available dispatch tool. Explicit task settings override defaults.

## Dispatch

1. Read the relevant spec and acceptance criteria, inspect existing changes, and estimate task size before dispatch. Start with one worker; parallelize substantial slices only when their behavior and write ownership are independent. Give shared interfaces and integration files one owner; serialize dependencies.
2. Use exploration separately when it resolves substantial uncertainty or isolates noisy work. Otherwise let the implementing worker investigate its bounded slice. Pass useful findings forward rather than repeating the same exploration.
3. Prefer a fresh context when supported. Supply a self-contained brief using the fields below, relevant project constraints, and settled decisions. Workers read only assignment-relevant sources; research history, workflow evaluation, and model-routing rationale stay with the handler. A fresh conversation still needs applicable repository rules.
4. Capture the dispatch timestamp and identify the brief revision (`handoff-v1` below). Keep a source reference or short excerpt of the task-specific acceptance, context, and checks for later feedback; whole conversations are unnecessary.

### Assignment brief: handoff-v1

- **Role:** research, implementation, review, or smoke; edit permission.
- **Goal:** outcome, source spec, and checkable acceptance.
- **Scope:** owned paths/modules, shared owners, existing changes to preserve.
- **Context:** relevant sources, settled decisions, dependencies.
- **Checks:** required mathematical, test, browser, or other evidence. For UI work, name applicable routes, viewports, and interactions.
- **Return:** changes or findings, observed check results, decisions/risks, and unverified cases. Flag missing or conflicting instructions that affected the work; ordinary implementation details need no narration.

Use only details that affect the assignment. Research returns relevant sources/files/symbols and a recommended boundary; review returns actionable findings with locations and expected behavior, without editing; smoke returns observed coverage and gaps. Implementation returns its diff and check evidence. Save exact initial and revised briefs only when investigating handoffs or running a prompt-format pilot.

Increment the brief revision when this template changes.

## Review and completion

Derive expected behavior from the spec, review the actual diff and surrounding code, and assess worker evidence. Use the specialist reviews and smoke workflow required by `AGENTS.md`; reuse sufficient checks unless integration or corrections invalidate them. Send repairs to the worker with the location, observed failure, and expected behavior. Repeated failure calls for reconsidering scope or approach. Final acceptance remains with the handler.

Record accepted/blocked time and complete the [evaluation record](../tools/skills/subagent-flow-evaluation/SKILL.md#do-log) from current-task evidence, then commit and push under the repository Git rules. Research, review, and smoke assignments count too; useful handler-only cases provide comparisons. Keep verification gaps explicit.

## Improve the workflow

Use [the evaluation skill](../tools/skills/subagent-flow-evaluation/SKILL.md#suggest-subagents-flow-improvements) when assessing accumulated evidence. It connects both routing choices and task wording to outcomes. Load the log and research then, rather than on ordinary worker assignments.

For a pilot, state the hypothesis and one changed factor before dispatch: model, effort, staffing, or brief wording. Compare similar roles, task classes, and preassigned sizes with stable acceptance and review. Use read-only repeats or isolated checkouts for duplicate trials. Report sample counts, missing data, and alternative explanations; no fixed small sample validates a default. Research pilots inform research routing. The owner may choose provisional defaults from external guidance; pilot results do not silently change policy. See the [evaluation spec](specs/agent-workflow-evaluation.md) for the maintained contract.
