# Wave 2 slice PAM: mutation evidence for the patches sweep

Read `w2-pa-common-brief.md` (Phase 5 test rules, Checks, line endings). Role: `bezeg-worker`; you edit source only to apply a deliberate mutation and revert it. You are the only writer in the checkout; reviewers read commit `3c4be65e`. Do not commit.

**Goal:** for each new assertion added by the patches sweep (commit `3c4be65e`), show an observed failure under a deliberate mutation of the code it guards, then revert. Before you start, record `git status --short` and confirm `git diff -- src` is empty; at the end `git diff -- src` must be empty again (that is the acceptance check).

**Assertions to cover** (find them with `git show 3c4be65e -- <test file>`):
- PA1: `PatchPointChooser.test.tsx` (none clears; the Coons, Triangular and Join call shapes), `PatchPointEditor.test.tsx` (commit on Enter, commit on blur, untouched axis keeps the exact value, empty draft refused), `TensorPatchPanels.test.tsx` (starting-patch select, custom entry, choosing the shown entry does nothing, degree `CountSetter`), `TensorPatchGraph` `startingPatchIndex`.
- PA2: `SurfaceCameraPanel.test.tsx` (one preset, Reset view, one slider), Subdivision's unavailable Elevate reason, Derivatives corner select (corner shown, not-at-corner entry) and its `LiveReadout`, `joinSceneIndex` and the Join custom entry, the Triangular wiring tests (degree stepper, starting select, camera), Coons `data-coons-live`.

Batch mutations: apply several mutations in different files at once when each targets a different test file, run `just unit <those test files>` once, record which assertion failed, revert all, confirm with `git diff -- src`. A mutation no test catches is a finding; report it with the test that should exist (do not write it).

**Durations:** after reverting, run `just unit` on the touched patch test files (list: `git show --stat 3c4be65e -- 'src/**/*.test.tsx'`) and record per-file Vitest durations. The handler measures the pre-change baseline in the clean worktree; do not use that worktree.

**Return:** at most 250 words: a table assertion × mutation × observed result, uncaught mutations, the duration delta. Full table to `w2-pam.md` in `docs/reviews/feature-streams/controls/`. Handoff note path: `w2-pam-handoff.md`.
