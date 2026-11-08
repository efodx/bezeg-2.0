# Handler card

A running Claude handler's working summary of [the workflow](../agent-workflow.md). Read your state note, then this card, then start the next slice. Reach the workflow by section when this card names one or a task leaves it. When a rule here changes, change the workflow section too.

**Routing.** Pass the model on every dispatch.

| Assignment | Agent | Model |
| --- | --- | --- |
| Bounded implementation, fixes, tests | `bezeg-worker` | Sonnet `medium` |
| Engineering review of a large diff; difficult mathematics | `bezeg-reviewer` | Sonnet `medium` |
| Routine review slice: one concern, bounded diff, named checklist | `bezeg-reviewer` | Haiku `medium` |
| Broad or first-pass smoke of new UI | `bezeg-smoke` | Sonnet `medium` |
| Named routes, repair rechecks, catalog or asset checks | `bezeg-smoke` | Haiku `medium` |
| Read-only research | `Explore` | Haiku `medium` |

Keep tightly coupled cores with you; delegate tests and smoke. Run at most three workers at once, two in a stream. Give shared files one owner.

**Brief (handoff-v13).** Role and edit permission; goal, source spec and checkable acceptance; owned paths and changes to preserve; entry files and settled decisions; checks per criterion, with an observed failure for each new assertion; a capped return (≤N words, `file:line`, bulky evidence to a named file); a handoff note path. Workers cannot invoke skills, so name skill and checklist paths. The [full field list](../agent-workflow.md#assignment-brief-handoff-v13) covers Presets, routes, UI and browser checks.

**Budgets.** The project hook signals everyone after each tool call. Workers get `HANDOFF` at 135k (Haiku 78k) and return partial with a note. Continue from that note with a fresh worker when the old history is unnecessary.

- `BUDGET SOFT` (175k): dispatch nothing new and start no new step. Finish, integrate and verify.
- `BUDGET HANDOFF` (215k Opus, 190k others): send `HANDOFF` to running workers, collect notes, and close out.

**Accept.** Diff against acceptance, confirm observed pre-change failures, apply [review routing](../agent-workflow.md#review-routing), run focused `just` checks (`just --list`; never bare `npm test`, `npx vitest` or `npx playwright`), and smoke when a route, control, lesson or rendering path changes. Record the [evaluation entry](../../.agents/skills/subagent-flow-evaluation/SKILL.md#do-log).

**Commit and push.** Stage explicit paths, fetch, rebase your new commits onto `origin/master`, recheck, `git push origin HEAD:master`, or run all of that with `just publish` ([command guide](../commands.md)). Never force-push.

**Item batches.** Work that applies one change to many existing items starts with a [blocker triage](../tasks/feature-streams/README.md#item-batches) before any item is written.

**Close out.** Commit verified work, rewrite the [state note](../agent-workflow.md#handler-context-budget-claude) (`docs/reviews/<feature>/state.md`) with the next slice's brief inputs, and launch the successor with `--agent bezeg-handler`.
