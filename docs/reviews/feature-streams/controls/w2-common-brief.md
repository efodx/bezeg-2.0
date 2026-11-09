# Wave 2 common brief (handoff-v13): compgeo and projective sweeps

Applies to every Wave 2 slice brief (`w2-*-brief.md`). Your slice brief names your files; this file holds what all slices share.

## Role

`bezeg-worker`, implementation with edit permission in your owned paths only. Do not commit, push, or delegate. Four workers share the checkout `.claude/worktrees/stream-controls`; preserve every change you did not make.

## Goal and source

[Task 3, family sweeps](../../../tasks/shared-graph-controls/03-family-sweeps.md) for compgeo and projective. Move your panels to the shared controls in `src/inputs/` and `src/graphs/base/controls/` (`NumberInput`, `Slider`, `CountSetter`, `OnOffSwitch`, `BooleanField`, `ChoiceSelect`, `PointListInput`/`PointCollection`, `UnavailableButton`, `RefusalChannel`, `LiveReadout`), apply the confirmed decisions, and delete your files from `controlExemptions` in `eslint.config.mjs`.

Read by section, not whole: the spec `docs/specs/shared-graph-controls.md` sections *Capability catalogue* (target column for your capabilities), *Likely exceptions*, *Owner decisions*, *Delegated decisions*, *Acceptance* (I1–I5). Your panels' rows are in `docs/tasks/shared-graph-controls/inventory.md` (lines 51–79); line numbers there are stale, locate by search. Evidence detail with `file:line` is in `docs/reviews/feature-streams/controls/inventory-part-*.md` if a row is unclear.

## Acceptance (each slice, for its files)

1. Its files are gone from `controlExemptions` (or a needed exception is recorded: you propose it in your return, the handler decides and records it in the spec). `just lint <your files>` is clean.
2. Panels use the shared control for each capability they offer; I1–I5 hold in Slovenian and English.
3. Lessons, Presets and routes behave as before apart from the spec's confirmed changes. Presets and links valid at HEAD keep working; if a stored field must change, stop and report instead.
4. Mathematical meaning is unchanged: same constructions, same clamps or snaps where the spec keeps them (decision 3/8 cover typed clamps: read them).

## Phase 5 test rules ([spec](../../../specs/verification-throughput.md#phase-5-guardrails-for-the-controls-stream-apply-before-task-3))

- Do not add your graphs to `src/graphs/base/sharedControls.graphs.test.tsx` (full behaviour already runs on two graphs per kind there). Give each migrated graph one thin wiring check in its own test file: the shared control mounts and one edit reaches the model.
- Delete each graph's duplicate control-mechanics cases in the same change (list: `docs/reviews/verification-throughput/controls-impact.md`). Keep graph-specific mathematical and lesson assertions.
- Each placement or view rule you add or change gets a pure test plus one real-graph case.
- For each new assertion, report an observed failure against the pre-change code or a deliberate mutation.
- Report the test-time delta for your touched test files (Vitest duration before and after).

## Shared files

- `src/localization/sl.ts` and `en.ts`: other workers edit them too. Keep them in lockstep, add keys next to your family's existing keys, re-read just before each edit, and retry if an edit fails because the file changed. Delete keys that become unused. Follow `docs/localization.md#choosing-new-terms` for new Slovenian terms; `t()` calls are type checked per key (AGENTS.md).
- `eslint.config.mjs`: delete only your own file names from the exemption arrays (one small edit each). If an array becomes empty, leave it; the handler tidies.
- Do not edit `src/inputs/**` or `src/graphs/base/**` beyond `src/graphs/base/controls/LiveReadout*` when your slice brief gives it to you. If a shared control lacks a needed prop, report it with the smallest proposed change instead of forking a local copy.

## Checks

- Use `just` recipes only (`just --list`): `just typecheck`, `just lint <paths>`, `just unit <test paths>`. Never bare `npm test`, `npx vitest`, `npx playwright`.
- Do not run `just check-changed`, `just build`, or `just controls-fixture`: other workers share this checkout. The handler runs them at integration. Report only failures in your own paths; another worker's half-done edit may break typecheck elsewhere for a while.
- Send full command output to `.command-logs/w2-<slice>-*.log`; quote only failures.
- Line endings: match each file's current endings (Python: `encoding='utf-8', newline=''`).

## Budget and return

Locate with `grep -l`/`-c` before `grep -n`, read at most about 150 lines per call, quote `file:line` instead of pasting code. On `HANDOFF` stop at a consistent point and write your handoff note.

Return at most 350 words: files changed by group, acceptance criteria with the check that shows each, observed pre-change failures, test-time delta, proposed exceptions or decisions with reason and rejected alternative, and unverified cases. Bulky evidence goes to your slice's evidence file. Flag any mathematical contradiction or conflicting instruction instead of guessing.
