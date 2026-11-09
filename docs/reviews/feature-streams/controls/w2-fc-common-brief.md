# Wave 2 common brief (handoff-v13): functions and curves sweeps

Applies to every functions or curves slice brief (`w2-f*-brief.md`, `w2-k*-brief.md`). Your slice brief names your files; this file holds what all slices share. Copied from `w2-common-brief.md` with the family details changed.

## Role

`bezeg-worker`, implementation with edit permission in your owned paths only. Do not commit, push, or delegate. Up to four workers share the checkout `.claude/worktrees/stream-controls`; preserve every change you did not make.

## Goal and source

[Task 3, family sweeps](../../../tasks/shared-graph-controls/03-family-sweeps.md) for functions and curves. Move your panels to the shared controls in `src/inputs/` and `src/graphs/base/controls/` (`NumberInput`, `Slider`, `CountSetter`, `OnOffSwitch`, `BooleanField`, `ChoiceSelect`, `PointListInput`/`PointCollection`, `UnavailableButton`, `RefusalChannel`, `LiveReadout`), apply the confirmed decisions, and remove your files from `controlExemptions` and `uncaughtSteppers` in `eslint.config.mjs`.

Read by section, not whole: the spec `docs/specs/shared-graph-controls.md` sections *Capability catalogue* (target column for your capabilities), *Likely exceptions*, *Owner decisions*, *Delegated decisions* (1–40; 32–40 are the compgeo and projective precedents), *Acceptance*. Your panels' rows are in `docs/tasks/shared-graph-controls/inventory.md` (functions lines 13–50, curves lines 80–138, typed paths 160–203); line numbers there are stale, locate by search. Evidence with `file:line` is in `docs/reviews/feature-streams/controls/inventory-part-*.md` if a row is unclear. The compgeo sweep's evidence (`w2-c2.md`, `w2-c3.md`) shows worked patterns.

## Out of scope (step 5, Wave 3)

Do not migrate these; leave them as they are and do not count them against your acceptance: C11 reveal buttons (a shared Reveal button does not exist yet), own playback rows (C12: Euler, Epicycle, Parametric roll, ArcLength play, De Casteljau animation), curve operation panels (C15: Elevate, Extrapolate, Subdivide buttons, `CurveWorkspaceControls`, `BezierCurveControls`), readout block styling and step counters (C27), labels (C29, C30). Mention any you touched only if unavoidable.

## Acceptance (each slice, for its files)

1. Its files are gone from `controlExemptions` and `uncaughtSteppers` (or a needed exception is proposed in your return; the handler decides and records it in the spec). `just lint <your files>` is clean.
2. Panels use the shared control for each in-scope capability they offer: no native `disabled` without a reason (C6, `UnavailableButton` or `unavailableReason`), refusals through the graph's one `RefusalChannel` (C22, decision 14), one `LiveReadout` per graph for announcements (C21, decision 18), counts and degrees through `CountSetter` (C5, C26, decision 10), selects through `ChoiceSelect` (C10, C25). I1–I5 hold in Slovenian and English.
3. Lessons, Presets and routes behave as before apart from the spec's confirmed changes. Presets and links valid at HEAD keep working; if a stored field must change, stop and report instead.
4. Mathematical meaning is unchanged: same constructions, evaluations, clamps or snaps where the spec keeps them (decisions 3, 7 and 8 cover typed refusals, drag clamps and grid snaps).

## Phase 5 test rules ([spec](../../../specs/verification-throughput.md#phase-5-guardrails-for-the-controls-stream-apply-before-task-3))

- Do not add your graphs to `src/graphs/base/sharedControls.graphs.test.tsx`. Give each migrated graph one thin wiring check in its own test file: the shared control mounts and one edit reaches the model.
- Delete each graph's duplicate control-mechanics cases in the same change (list: `docs/reviews/verification-throughput/controls-impact.md`). Keep graph-specific mathematical and lesson assertions.
- Each placement or view rule you add or change gets a pure test plus one real-graph case.
- For each new assertion, report an observed failure against the pre-change code or a deliberate mutation.
- Report the test-time delta for your touched test files (Vitest duration before and after).

## Shared files

- `src/localization/sl.ts` and `en.ts`: other workers edit them too. Keep them in lockstep, add keys next to your family's existing keys, re-read just before each edit, and retry if an edit fails because the file changed. Delete keys that become unused. Follow `docs/localization.md#choosing-new-terms` for new Slovenian terms; `t()` calls are type checked per key (AGENTS.md).
- `eslint.config.mjs`: delete only your own file names from `controlExemptions` and `uncaughtSteppers` (one small edit each). If an exemption's `files` array becomes empty, delete the whole entry (an empty array stops ESLint loading its config).
- Do not edit `src/inputs/**` or `src/graphs/base/**` unless your slice brief gives you that file. If a shared control lacks a needed prop, report it with the smallest proposed change instead of forking a local copy.
- Lesson content under `src/learning/` may need a quoted panel text changed; edit only the lesson files your slice's graphs back, and say so.

## Checks

- Use `just` recipes only (`just --list`): `just typecheck`, `just lint <paths>`, `just unit <test paths>`. Never bare `npm test`, `npx vitest`, `npx playwright`.
- Do not run `just check-changed`, `just build`, `just smoke-lesson` or `just controls-fixture`: other workers share this checkout. The handler runs them at integration. Report only failures in your own paths; another worker's half-done edit may break typecheck elsewhere for a while.
- Run the lesson unit tests for lessons your graphs back (`grep -rl '<graph id>' src/learning`).
- Send full command output to `.command-logs/w2-<slice>-*.log`; quote only failures.
- Line endings: match each file's current endings (Python: `encoding='utf-8', newline=''`).

## Budget and return

Locate with `grep -l`/`-c` before `grep -n`, read at most about 150 lines per call, quote `file:line` instead of pasting code. Your slice is sized to about half a worker budget; if `HANDOFF` arrives, stop at a consistent point (every touched file type-checks) and write your handoff note listing done, not done, and the next step.

Return at most 350 words: files changed by group, acceptance criteria with the check that shows each, observed pre-change failures, test-time delta, proposed exceptions or decisions with reason and rejected alternative, and unverified cases. Bulky evidence goes to your slice's evidence file. Flag any mathematical contradiction or conflicting instruction instead of guessing.
