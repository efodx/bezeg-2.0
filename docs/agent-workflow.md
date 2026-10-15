# Agent workflow

This workflow supports both Claude and Codex as the main orchestrator. The orchestrator owns scope, task boundaries, integration, verification, and final review. Delegate only when a worker can make meaningful progress on a bounded, separable slice; small or tightly coupled changes can stay with the orchestrator. Planning and documentation can stay in the main chat (see `AGENTS.md`).

## Model assignments

Detect whether Claude or Codex is the active orchestrator before choosing a worker. Select by that environment, not by whichever models happen to be available. Use the prescribed model and effort when supported; do not automatically switch between Claude and Codex model families. If a prescribed model or effort is unavailable, report the limitation and continue useful independent work without silently substituting another model.

| Task | Claude orchestrator (Opus/Sonnet) | Codex orchestrator |
| --- | --- | --- |
| Research and codebase exploration | Haiku 5.5 Max | GPT-6 Luna Max |
| Coding and implementation | Sonnet 5.5 High | GPT-6 Luna Max |
| Fixes and tests | Sonnet 5.5 High | GPT-6 Luna Max |
| Final review and integration | Main agent | Main agent |

The main agent means the Claude or Codex orchestrator handling the task. Keep final integration and acceptance with that agent so the implementer does not approve its own work. If the active environment cannot select its preferred worker model and effort, state what is available and continue useful work that does not depend on an unavailable delegation option.

## Dispatch

1. Read the relevant spec and acceptance criteria. Record the initial working-tree state so existing changes can be distinguished from the assignment.
2. Delegate substantial tasks that benefit from a separate context or bounded assignment. Handle small or tightly coupled tasks directly. Avoid unnecessary spawning, duplicate research, and overlapping file modifications.
3. Check the available delegation tool and supported models/efforts, then follow the active orchestrator's row in the model table. In Codex, select `gpt-6-luna` with `max` for research, implementation, and fixes. In Claude, use Haiku 5.5 Max for research and exploration, and Sonnet 5.5 High for implementation and fixes. If model overrides require a fresh or partial history, supply a self-contained assignment rather than a full-history fork.
4. When practical, keep research and implementation as separate assignments. Research workers investigate and return concise, actionable findings without modifying files: relevant files and symbols, dependencies, risks, and recommended implementation boundaries. Pass these findings to coding workers to prevent repeated exploration. This separation also applies in Codex, even though both roles use the same model.
5. Give coding workers the goal, source spec, acceptance criteria, owned files or modules, relevant research findings, dependencies, required checks, and existing changes to preserve.
6. Start with one worker; add workers when assignments are independent and substantial. Run independent slices in parallel within the available capacity. Serialize assignments that share files or depend on unfinished work; reserve integration files for one owner. Workers must not recursively delegate or push. They leave edits available for review. The orchestrator owns Git staging, commits, and any push.

Workers return changed files, anything the orchestrator needs to know to review or continue, and whether the assignment is complete. Keep handoffs brief; include check results, blockers, or risky decisions when they affect acceptance or follow-up. The orchestrator inspects the diff and verifies required checks.

## Review and completion

1. The orchestrator derives expected behavior and edge cases from the spec, then inspects the actual diff and relevant surrounding code against those expectations and repository constraints. A worker's completion report is evidence to assess, not acceptance by itself. Keep implementation with the worker so the orchestrator retains an independent review role.
2. For substantial code reviews, use the specialist review subagents required by `AGENTS.md`; the orchestrator combines their findings and makes the final decision. Review controls and visual behavior for UI and accessibility as applicable.
3. Send concrete findings back to the implementing worker, including file references, the failing behavior, and expected behavior. Review the corrections until actionable findings are resolved; document any remaining limitation. If successive attempts repeat the same failure, revisit the task boundary or approach rather than repeating identical instructions. Follow the no-substitution rule in Model assignments if a preferred model or effort is unavailable.
4. Verify the integrated result with checks appropriate to the change, including the repository's required localization, mathematical, interaction, or hosting checks. When the `AGENTS.md` smoke-test rule applies, dispatch the smoke tester using [the browser checklist](smoke-tests.md). If the skill is not installed, read its [maintained source](../tools/skills/smoke-tester/SKILL.md) and follow that workflow. Reuse sufficient worker evidence and rerun checks when integration or corrections affect it.
5. Commit only the reviewed task changes. Only the handler may push, following the Git workflow in [AGENTS.md](../AGENTS.md); workers must never push. Report the commit hashes, verification results, and material limitations in the main chat.

## Environment configuration

Codex settings in [`.codex/config.toml`](../.codex/config.toml) set subagent defaults and a limit of three concurrent children; explicit spawn settings override them. Claude's model selection and delegation limits depend on its configured environment. The model table above is the repository preference for both. Delegation evidence and open questions are in [the research note](agent-delegation-research.md).

## Evaluate the workflow

Record completed or blocked coding tasks in the [agent workflow evaluation log](agent-workflow/evaluation-log.md) using the [`do-log` and `suggest-subagents-flow-improvements` skill](../tools/skills/subagent-flow-evaluation/SKILL.md). Compare equivalent task types and report sample sizes and missing data; observations are not controlled experiments and do not establish causation. Keep the owner's model and effort preferences unless the owner asks to reconsider them. A successful spawn establishes availability; it does not establish implementation quality or a speed advantage. See the [research note](agent-delegation-research.md) for the limits of external evidence.
