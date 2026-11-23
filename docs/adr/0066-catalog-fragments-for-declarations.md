# New declaration text goes into per-family catalog fragments

Accepted on 2026-11-22 (handler, task 02 slice 5b of the [board workspace tasks](../tasks/ux-picks-app-wide/README.md); the plan required the choice to be made here, not left open).

## Context

Graph declarations ([ADR 0065](0065-graphs-declare-presenters-render.md)) carry every word as a typed catalog `Message`, so converting 138 demonstrations in task 08 adds keys: readout names split out of value sentences, legend labels, section titles, action labels. `src/localization/sl.ts` and `en.ts` are single objects of about 6,000 lines each, typed so that `en` has exactly `sl`'s keys, and `sl.ts` changed in 240 commits in November 2026 alone. Task 08 runs parallel lanes, one family each.

## Options

1. **Handler adds each round's keys** to `sl.ts`/`en.ts` before the lanes start (the plan's default). Keeps one file, but every round waits on handler turns (the most expensive turns, [handler cost](../agent-workflow/handler-cost-2026-11-22.md)), and a lane that finds a missing key stops.
2. **Per-family fragments.** Each family's new declaration text lives in `src/localization/fragments/<family>.ts`, one object per language side by side; `sl.ts` and `en.ts` spread every fragment in. A lane owns its family's fragment like its graph file.
3. **Keep adding to the single files from lanes.** Conflicts on every rebase (all lanes append at the end) and no ownership.

## Decision

Option 2. A fragment exports `{sl: {...} as const, en: {...}}` with `en` checked against `sl`'s keys by `satisfies`, so lockstep stays a type error; `sl.ts` and `en.ts` spread the fragments, so `MessageKey`, `t()` and `message()` are unchanged. Existing keys stay where they are; only new declaration text goes into fragments, and a key keeps its family prefix (`taylor_…`). Fragment keys must not collide with each other or with the main catalog (a unit test checks).

## Consequences

- A conversion touches its graph file, its lesson files, its tests and its family's fragment, and no shared file: lanes do not conflict on text, and the handler adds no keys.
- Finding a string now means searching two places; the localization guide names both.
- The `loc` command and the localization tests read the merged objects, so they need no change. `tests/smoke-catalog.cjs` parses the catalog source instead; it skips the fragment spread, since no catalog row reads declaration text (missing this turned master's CI red at `901f055c` until `f9043d0d`).
