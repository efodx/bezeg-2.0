# Implementation delegation

The repository's default is a main-chat handler and reviewer with GPT-6 Luna workers at Max reasoning. Delegate code implementation and fixes when a worker can make meaningful progress on a bounded, separable slice; small or tightly coupled changes can stay with the handler. Planning and documentation can stay in the main chat (see `AGENTS.md`).

## Dispatch

1. Read the relevant spec and acceptance criteria. Record the initial working-tree state so existing changes can be distinguished from the assignment.
2. Split the implementation into bounded slices. Give each worker the goal, source spec, acceptance criteria, owned files or modules, dependencies, required checks, and existing changes to preserve.
3. Check the spawn tool's supported models and efforts. Select `gpt-6-luna` and `max` explicitly when available. If Luna Max cannot be selected and the tool offers Sonnet 5.5 at High, use Sonnet 5.5 automatically. If neither option is available, report the limitation and continue useful independent work without delegating until an approved model option is available. If model overrides require a fresh or partial history, supply a self-contained assignment rather than a full-history fork.
4. Start with one worker; add workers when slices can progress independently. Run independent slices in parallel within the available capacity. Serialize assignments that share files; reserve integration files for one owner. The handler owns Git staging, commits, and any push. Workers must never push; they leave their edits available for review.

Workers return changed files, anything the handler needs to know to review or continue, and whether the assignment is complete. Keep handoffs brief; the handler inspects the diff and verifies required checks. Include check results, blockers, or risky decisions when they affect acceptance or follow-up.

## Review and completion

1. The handler derives expected behavior and edge cases from the spec, then inspects the actual diff and relevant surrounding code against those expectations and repository constraints. A worker's completion report is evidence to assess, not acceptance by itself. Keep implementation with the worker so the handler retains a separate review role.
2. For substantial code reviews, use the specialist review subagents required by `AGENTS.md`; the handler combines their findings and makes the final decision. Review controls and visual behavior for UI and accessibility as applicable.
3. Send concrete findings back to the implementing worker, including file references, the failing behavior, and expected behavior. Review the corrections until actionable findings are resolved; document any remaining limitation. If successive attempts repeat the same failure, revisit the task boundary or approach rather than repeating identical instructions. Changing from Luna Max to the authorized Sonnet 5.5 High fallback does not require another user choice; other model or effort changes do.
4. Verify the integrated result with checks appropriate to the change, including the repository's required localization, mathematical, interaction, or hosting checks. When the `AGENTS.md` smoke-test rule applies, dispatch the smoke tester using [the browser checklist](smoke-tests.md). If the skill is not installed, read its [maintained source](../tools/skills/smoke-tester/SKILL.md) and follow that workflow. Reuse sufficient worker evidence and rerun checks when integration or corrections affect it.
5. Commit only the reviewed task changes. Only the handler may push, following the Git workflow in [AGENTS.md](../AGENTS.md); workers must never push. Report the commit hashes, verification results, and material limitations in the main chat.

## Configuration

[`.codex/config.toml`](../.codex/config.toml) sets Codex subagent defaults and a limit of three concurrent children; explicit spawn settings override them. Model fallbacks follow `AGENTS.md`. Delegation evidence and open questions are in [the research note](agent-delegation-research.md).

## Evaluate the workflow

Record completed or blocked coding tasks in the [agent workflow evaluation log](agent-workflow/evaluation-log.md) using the [`do-log` and `suggest-subagents-flow-improvements` skill](../tools/skills/subagent-flow-evaluation/SKILL.md). Compare equivalent task types and report sample sizes and missing data; observations are not controlled experiments and do not establish causation. Keep the owner's model and effort preferences unless the owner asks to reconsider them. A successful spawn establishes availability; it does not establish implementation quality or a speed advantage. See the [research note](agent-delegation-research.md) for the limits of external evidence.
