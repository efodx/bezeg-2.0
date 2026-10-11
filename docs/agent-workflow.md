# Implementation delegation

The repository's default is a main-chat handler and reviewer with GPT-6 Luna workers at Max reasoning. It applies to multi-file features and spec slices; small fixes, planning, and documentation stay in the main chat (see `AGENTS.md`).

## Dispatch

1. Read the relevant spec and acceptance criteria. Record the initial working-tree state so existing changes can be distinguished from the assignment.
2. Split the implementation into bounded slices. Give each worker the goal, source spec, acceptance criteria, owned files or modules, dependencies, required checks, and existing changes to preserve.
3. Check the spawn tool's supported models and efforts. Select `gpt-6-luna` and `max` explicitly when the tool supports them. If model overrides require a fresh or partial history, supply a self-contained assignment rather than a full-history fork.
4. Start with one worker; add workers when slices can progress independently. Run independent slices in parallel within the available capacity. Serialize assignments that share files; reserve integration files for one owner. The handler owns Git staging and commits, and workers leave their edits available for review.

Workers report changed files, behavior, checks with results, and unresolved risks or blockers. They return to the handler when the assigned acceptance criteria are met or a dependency prevents progress.

## Review and completion

1. The handler derives expected behavior and edge cases from the spec, then inspects the actual diff and relevant surrounding code against those expectations and repository constraints. A worker's completion report is evidence to assess, not acceptance by itself. Keep implementation with the worker so the handler retains a separate review role.
2. For substantial code reviews, use the specialist review subagents required by `AGENTS.md`; the handler combines their findings and makes the final decision. Review controls and visual behavior for UI and accessibility as applicable.
3. Send concrete findings back to the implementing worker, including file references, the failing behavior, and expected behavior. Review the corrections until actionable findings are resolved; document any remaining limitation. If successive attempts repeat the same failure, revisit the task boundary or approach rather than repeating identical instructions. Changing the worker model or effort requires the user's choice.
4. Verify the integrated result with checks appropriate to the change, including the repository's required localization, mathematical, interaction, or hosting checks. When the `AGENTS.md` smoke-test rule applies, dispatch the smoke tester using [the browser checklist](smoke-tests.md). If the skill is not installed, read its [maintained source](../tools/skills/smoke-tester/SKILL.md) and follow that workflow. Reuse sufficient worker evidence and rerun checks when integration or corrections affect it.
5. Commit only the reviewed task changes. Report the commit hashes, verification results, and material limitations in the main chat.

## Configuration

[`.codex/config.toml`](../.codex/config.toml) sets Codex subagent defaults and a limit of three concurrent children; explicit spawn settings override them. Model fallbacks follow `AGENTS.md`. Delegation evidence and open questions are in [the research note](agent-delegation-research.md).
