# Wave 3 common brief (handoff-v13): remaining controls

Applies to the Wave 3 slice briefs (`w3-*-brief.md`). Read `w2-pa-common-brief.md` in this folder for the sections *Role*, *Phase 5 test rules*, *Checks* (its first, second, fourth and fifth bullets) and *Budget and return*; they apply unchanged, with the differences below.

## Goal and source

[Task 4, remaining controls](../../../tasks/shared-graph-controls/04-remaining-controls.md), spec `docs/specs/shared-graph-controls.md` Order step 5. Read by section: *Capability catalogue* rows for your capabilities, and *Delegated decisions* 13, 18, 38, 39, 48, 55 and the new **56–60** under "Decided in task 4, Wave 3" (search `^56\.`). The triage `w3-triage.md` lists every site with `file:line`; your slice brief names your rows by ID.

## Shared files

- `src/localization/sl.ts` and `en.ts`: the other worker edits them too. Keep them in lockstep, re-read just before each edit, retry if an edit fails because the file changed. Delete keys that become unused (search first). New Slovenian terms follow `docs/localization.md#choosing-new-terms`; `t()` calls are type checked per key (AGENTS.md).
- Your slice brief names which shared control files you own; you may edit those even under `src/inputs/` or `src/graphs/base/`. Do not edit any other file under `src/inputs/**` or `src/graphs/base/**`, nor `eslint.config.mjs`; report a needed change with the smallest proposal instead.
- Lesson content under `src/learning/content/`: edit only a quoted panel text that your change makes wrong, and list it.

## Acceptance (each slice, for its rows)

1. Each row in your slice uses the shared control the decision names; no native `disabled` without a reason (C6); `just lint <your files>` clean.
2. I1–I5 hold in Slovenian and English (spec *Acceptance* 5).
3. Lessons, Presets, routes and synchronous multi-action scenes behave as before apart from the decisions' stated changes. Presets and links valid at HEAD keep working; if a stored field must change, stop and report.
4. Mathematical meaning is unchanged.
5. A thin wiring check per migrated graph (phase 5), plus tests for each new shared-control behaviour; an observed failure for each new assertion.

## Checks

`just typecheck`, `just lint <paths>`, `just unit <test paths>` for your files and the lesson tests of the graphs you touch (find them with `grep -rl` on the graph's lesson action names under `src/learning` and `src/graphs`). Do not run `just check-changed`, `just build`, `just smoke-lesson` or `just controls-fixture`; the handler runs them. Logs to `.command-logs/w3-<slice>-*.log`.

Return at most 350 words as the pa common brief describes; evidence file `docs/reviews/feature-streams/controls/w3-<slice>.md`; handoff note `w3-<slice>-handoff.md` only if you stop early.
