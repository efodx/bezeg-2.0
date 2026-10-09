# Implementation delegation

The repository's default is a main-chat handler and reviewer with GPT-6 Luna workers at Max reasoning. This applies automatically to code implementation and fixes; planning and documentation can stay in the main chat.

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
4. Verify the integrated result with checks appropriate to the change, including the repository's required localization, mathematical, interaction, or hosting checks. For meaningful runtime or UI changes, dispatch the smoke tester using [the browser checklist](smoke-tests.md). If the skill is not installed, read its [maintained source](../tools/skills/smoke-tester/SKILL.md) and follow that workflow. Reuse sufficient worker evidence and rerun checks when integration or corrections affect it.
5. Commit only the reviewed task changes. Report the commit hashes, verification results, and material limitations in the main chat.

## Configuration and availability

[`.codex/config.toml`](../.codex/config.toml) sets project-scoped subagent defaults and a limit of three concurrent children. It leaves the main chat's model selection to the user. Explicit spawn settings can override defaults; use the requested worker model and effort consistently.

The [official subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) describes project instructions as a delegation trigger and `[agents]` model and reasoning defaults. Configuration does not expand a running tool's supported model list. Start a new Bezeg chat to load project settings; verify the available spawn options before the first implementation dispatch.

If a future chat cannot select the configured model and effort, the handler reports the limitation and requests a user-selected fallback instead of silently substituting a model. Separate user-owned chats are not an automatic substitute for implementation subagents.

## Evaluate the workflow

Keep the owner's Luna Max preference while collecting evidence on representative tasks: total elapsed time, review and repair rounds, defects found, integration failures, and token usage when available. Compare equivalent task types before recommending a different worker model, effort, or concurrency. A successful spawn establishes availability; it does not establish implementation quality or a speed advantage. See [the research note](agent-delegation-research.md) for sources and the limits of the evidence.
