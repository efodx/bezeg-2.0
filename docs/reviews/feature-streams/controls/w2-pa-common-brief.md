# Wave 2 common brief (handoff-v13): patches sweep

Applies to every patches slice brief (`w2-pa*-brief.md`). Your slice brief names your files; this file holds what all slices share. Copied from `w2-fc-common-brief.md` with the family details changed.

## Role

`bezeg-worker`, implementation with edit permission in your owned paths only. Do not commit, push, or delegate. Two workers share the checkout `.claude/worktrees/stream-controls`; preserve every change you did not make.

## Goal and source

[Task 3, family sweeps](../../../tasks/shared-graph-controls/03-family-sweeps.md) for patches. Move your panels to the shared controls in `src/inputs/` and `src/graphs/base/controls/` (`NumberInput`, `Slider`, `CountSetter`, `OnOffSwitch`, `BooleanField`, `ChoiceSelect`, `PointListInput`, `UnavailableButton`, `RefusalChannel`, `LiveReadout`), apply the confirmed decisions, and remove `src/graphs/patches/TensorPatchPanels.tsx` from `controlExemptions` in `eslint.config.mjs` once its last raw input is gone (if the entry's `files` array becomes empty, delete the whole entry).

Read by section, not whole: the spec `docs/specs/shared-graph-controls.md` sections *Capability catalogue* (target column for your capabilities), *Likely exceptions* (three patch rows: "Patch control-point choice by index", "Surface camera panel with Reset view", "TensorJoin Back to the two patches"), *Owner decisions* (2 commit timing, 3 out of range, 4 examples are a select, 10 degrees are `CountSetter`), *Delegated decisions* (13, 14, 18, 36, 38, 40–49 are the latest precedents). Your panels' rows are in `docs/tasks/shared-graph-controls/inventory.md` (TensorPatch, TensorSubdivision, TensorJoin, CoonsPatch, TriangularPatch, TensorDeCasteljau, TensorDerivatives; locate by search). Worked patterns: `w2-f1.md`, `w2-k2.md` in this folder.

## Out of scope (step 5, Wave 3)

Do not migrate these and do not count them against your acceptance: C11 reveal buttons, own playback rows (C12, e.g. De Casteljau construction stepping if it has one), readout block styling and step counters (C27), labels (C29, C30). The surface board's own drag and orbit keys are unchanged. Mention any you touched only if unavoidable.

## Acceptance (each slice, for its files)

1. Raw inputs gone from your files and `just lint <your files>` clean; a needed exception is proposed in your return (the handler decides and records it in the spec).
2. Panels use the shared control for each in-scope capability: no native `disabled` without a reason (C6, `UnavailableButton` or `unavailableReason`), refusals through the graph's one `RefusalChannel` where it has one, typed refusals in the field's hint (decision 46), one `LiveReadout` per graph for announcements (decision 18), degrees through `CountSetter` (decision 10), example/starting-patch rows through `ChoiceSelect` (decision 4; decision 38's "custom" entry while the model matches no example), typed coordinates commit on Enter or blur (decision 2, no Apply button). I1–I5 hold in Slovenian and English.
3. Lessons, Presets and routes behave as before apart from the spec's confirmed changes. Presets and links valid at HEAD keep working; if a stored field must change, stop and report instead.
4. Mathematical meaning is unchanged: same nets, degrees, evaluations and camera angles.

## Phase 5 test rules ([spec](../../../specs/verification-throughput.md#phase-5-guardrails-for-the-controls-stream-apply-before-task-3))

- Do not add your graphs to `src/graphs/base/sharedControls.graphs.test.tsx`. Give each migrated graph one thin wiring check in its own test file: the shared control mounts and one edit reaches the model.
- Delete each graph's duplicate control-mechanics cases in the same change (`docs/reviews/verification-throughput/controls-impact.md`). Keep graph-specific mathematical and lesson assertions.
- For each new assertion, report an observed failure against the pre-change code or a deliberate mutation.
- Report the test-time delta for your touched test files (Vitest duration before and after).

## Shared files

- `src/localization/sl.ts` and `en.ts`: the other worker edits them too. Keep them in lockstep, add keys next to the existing `patch_*` keys, re-read just before each edit, and retry if an edit fails because the file changed. Delete keys that become unused (for example `apply_coordinates` only if no other caller remains: search first). New Slovenian terms follow `docs/localization.md#choosing-new-terms`; `t()` calls are type checked per key (AGENTS.md).
- `eslint.config.mjs`: only the slice that removes the last raw input from `TensorPatchPanels.tsx` edits it.
- Do not edit `src/inputs/**` or `src/graphs/base/**`. If a shared control lacks a needed prop, report it with the smallest proposed change instead of forking a local copy.
- Lesson content under `src/learning/content/patch*.ts`, `coonsGuidedLessons.ts`: edit only a quoted panel text that your change makes wrong, and list it.

## Checks

- Use `just` recipes only (`just --list`): `just typecheck`, `just lint <paths>`, `just unit <test paths>`. Never bare `npm test`, `npx vitest`, `npx playwright`.
- Do not run `just check-changed`, `just build`, `just smoke-lesson` or `just controls-fixture`. The handler runs them at integration. Report only failures in your own paths; the other worker's half-done edit may break typecheck elsewhere for a while.
- Run the patch lesson unit tests: `src/graphs/patches/patchLessonActions.test.tsx`, `lessonPatchScene.test.tsx`, `patchCheckpointSweep.test.tsx`, `src/learning/content/patchChapter.test.ts`, `patchExampleIntegration.test.ts`.
- Send full command output to `.command-logs/w2-<slice>-*.log`; quote only failures.
- Write source with the Edit/Write tools, not shell heredocs (escapes have been corrupted that way). Line endings: match each file's current endings.

## Budget and return

Locate with `grep -l`/`-c` before `grep -n`, read at most about 150 lines per call, quote `file:line` instead of pasting code. Your slice is sized to about half a worker budget; if `HANDOFF` arrives, stop at a consistent point (every touched file type-checks) and write your handoff note listing done, not done, and the next step.

Return at most 350 words: files changed by group, acceptance criteria with the check that shows each, observed pre-change failures, test-time delta, proposed exceptions or decisions with reason and rejected alternative, and unverified cases. Bulky evidence goes to your slice's evidence file. Flag any mathematical contradiction or conflicting instruction instead of guessing.
