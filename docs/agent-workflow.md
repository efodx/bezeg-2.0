# Agent workflow

The handler owns scope, integration, acceptance, and Git operations under [AGENTS.md](../AGENTS.md). Delegate substantial, separable work; keep small or tightly coupled changes with the handler. Workers own their assigned slice and evidence, without further delegation, commits, or pushes.

GitHub's [master ruleset](https://github.com/efodx/bezeg-2.0/rules/25172820) blocks non-fast-forward updates to `master`. Worker Git ownership remains an instruction in the shared environment, with the [enforcement limits](specs/agent-workflow-evaluation.md#git-controls) documented separately.

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

1. Read the relevant spec and acceptance criteria, inspect existing changes, and estimate task size before dispatch. Start with one worker; parallelize substantial slices only when their behavior and write ownership are independent. Give shared interfaces and integration files one owner; serialize dependencies. Identify shared verification resources even for file-disjoint slices, and coordinate changes to shared dependencies such as linked `node_modules`.
2. Use exploration separately when it resolves substantial uncertainty or isolates noisy work. Otherwise let the implementing worker investigate its bounded slice. Pass useful findings forward rather than repeating the same exploration.
3. Prefer a fresh context when supported. Supply a self-contained brief using the fields below, relevant project constraints, and settled decisions. Name useful entry files or spec sections; workers start there and expand investigation as needed for acceptance, returning focused excerpts and check results. Research history, workflow evaluation, and model-routing rationale stay with the handler. A fresh conversation still needs applicable repository rules.
4. Before delegated browser verification, establish a stable checkout/build and confirm the preview is reachable from the worker's verification environment. Supply preview ownership, revision/dirty state, and setup status. If access cannot be confirmed until the worker connects, make that its first bounded check; return access failures to the handler and mark dependent coverage blocked before repeated setup attempts.
5. Capture the task start/dispatch timestamp, requested worker settings, and brief revision (`handoff-v6` below). Retain resolved settings or scoped usage if tool results expose them; configured defaults describe intent, not runtime resolution. Keep a source reference or short excerpt of the task-specific acceptance, context, and checks for later feedback; whole conversations are unnecessary.

### Assignment brief: handoff-v6

- **Role:** research, implementation, review, or smoke; edit permission.
- **Goal:** outcome, source spec, and checkable acceptance.
- **Scope:** owned paths/modules, shared owners, existing changes to preserve.
- **Context:** relevant entry files/spec sections, settled decisions, dependencies, shared verification resources and their owners; for browser checks, preview ownership, revision/dirty state, and reachability/setup status.
- **Checks:** map each acceptance criterion to worker checks, handler checks, or sufficient existing evidence. For controls or graph state, check control values and the graph/board after applicable indirect changes: Reset, lesson actions, preset restore, and language switch. For UI work, name applicable routes, viewports, text enlargement, and interactions where required by the spec. Describe presentation goals as visible results, such as a rail visible over child backgrounds or intended headline wrapping at a named viewport.
- **Return:** changes or findings, observed check results, decisions/risks, and unverified cases, within a stated cap (≤N words or lines, flags with `file:line`). Write bulky evidence (inventories, full logs, raw reports) to a named file path and summarize it in the reply. Flag missing or conflicting instructions and mathematical contradictions encountered in the slice; the handler settles contradictions before dependent work proceeds. Ordinary implementation details need no narration.

Use only details that affect the assignment. Research returns relevant sources/files/symbols and a recommended boundary; review returns actionable findings with locations and expected behavior, without editing; smoke returns observed coverage and gaps. Implementation returns its diff and check evidence. Save exact initial and revised briefs only when investigating handoffs or running a prompt-format pilot.

Increment the brief revision when this template changes.

## Review and completion

Derive expected behavior from the spec, review the actual diff and surrounding code, and assess worker evidence. Use the specialist reviews and smoke workflow required by `AGENTS.md`; reuse sufficient checks unless integration or corrections invalidate them. Send repairs to the worker with the location, observed failure, and expected behavior. Repeated failure calls for reconsidering scope or approach. Final acceptance remains with the handler.

Assign extra implementation-worker screenshots where foreseeable layout risk warrants them or the worker needs them for its own verification; let the assigned release reviewer cover the remaining visual acceptance. Reserve deeper independent checking of mathematical premises for difficult mathematics, assumptions shared by dependent slices, or costly downstream rework. Required acceptance checks still apply. Focused repair is an ordinary completion path for local findings; choose preventive work according to the likely total effort through acceptance.

Run integrated acceptance at a stable checkpoint while relevant writers and dependency mutations are idle; record the revision and relevant dirty state. Reproduce failures observed during concurrent edits at that checkpoint before attributing them. Evidence predating relevant edits needs revalidation.

For build-tool, dependency, or artifact-format migrations, inventory affected auxiliary scripts as well as the app build (for example benchmarks, preview capture, and asset provenance). Record exercised commands or explicit coverage gaps. Close each actionable review finding with a verified fix or an explicit deferral and its impact; missing disposition is a gap.

Account for every acceptance criterion with observed evidence or an explicit gap. Distinguish implementation completion from acceptance completion: report partial acceptance while a required criterion is unmet or unverified, unless the owner explicitly revises or defers it. Preserve that deferral and its impact in the record.

Record accepted/blocked time and complete the [evaluation record](../tools/skills/subagent-flow-evaluation/SKILL.md#do-log) from current-task evidence, then commit and push under the repository Git rules. Research, review, and smoke assignments count too; useful handler-only cases provide comparisons. Keep verification gaps explicit.

## Improve the workflow

Use [the evaluation skill](../tools/skills/subagent-flow-evaluation/SKILL.md#suggest-subagents-flow-improvements) when assessing accumulated evidence. It connects both routing choices and task wording to outcomes. Load the log and research then, rather than on ordinary worker assignments.

Compare total effort to accepted work, including implementation, verification, repairs, integration, and repeated setup where observable; report escaped defects separately. First-pass success or fewer repair rounds alone do not establish efficiency. Weigh added preventive checks against the repair work they could avoid, keeping unknown costs explicit.

Keep current task sizes unless outcome evidence supports a change. Compaction alone is not a failure or a reason to split work. Investigate context when it coincides with repeated reading, forgotten requirements, duplicate work, or excessive repairs; correlate the evaluation record's context note with observed symptoms. Treat smaller assignments or a fresh worker for a later role as hypotheses, accounting for repeated setup and lost familiarity. Judge comparisons by completion time, correctness, repairs, and scoped usage when available; fewer compactions alone do not establish improvement.

For a pilot, state the hypothesis and one changed factor before dispatch: model, effort, staffing, or brief wording. Compare similar roles, task classes, and preassigned sizes with stable acceptance and review. Use read-only repeats or isolated checkouts for duplicate trials. Report sample counts, missing data, and alternative explanations; no fixed small sample validates a default. Research pilots inform research routing. The owner may choose provisional defaults from external guidance; pilot results do not silently change policy. See the [evaluation spec](specs/agent-workflow-evaluation.md) for the maintained contract.
