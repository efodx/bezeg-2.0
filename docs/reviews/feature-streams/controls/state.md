# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls Wave 1", "controls Wave 2, compgeo and projective" and "controls Wave 2, functions and curves" entries in [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`, rebased on `origin/master`. Run state: **active**. Wave 2's second pair (functions, curves) closed 2026-11-09 and is pushed; patches is next. The previous handler handed off at this boundary on `BUDGET SOFT`.
- **Clean publish worktree:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached HEAD, its own `npm ci`. Check out the commit there, run `just check-changed origin/master` (about 14 min), `just build`, `just smoke-lesson <ids>` for affected lessons, serve with `just preview 4327` for browser smoke, then publish. Untracked logs there make builds "dirty"; that is harmless.
- **Hosted CI for `81300d01`:** failure (run 42579563632): `tests/lesson-graph-access.smoke.spec.cjs` Taylor test, `getByLabel('Degree n')` matched both the `CountSetter` group and its typed field after the functions sweep. Fixed by targeting the spinbutton; the spec passed 3/3 against a build of `0b81cdad` in the clean worktree. Recheck hosted CI on the fix commit.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Verification-throughput phase 5 applies to every sweep.

## Accepted in Wave 2 (on `master`)

- Compgeo and projective: decisions 32–40; see the evaluation entry.
- Functions and curves: `b09c6de8` (status helpers to `src/graphs/base/controls/`), `bf77d72e` (`FunctionStatus`), `e4457b0d` (`CountSetter` decimals/step/names), `d7752af6` (functions sweep), `3373d7da` (curves sweep), `5e2bfc47` (review repairs: `guardField`, `BooleanField`/`OnOffSwitch` `unavailableReason`, `CountSetter` `typedMin`, curve-named typed lists), `f3292c0a` (Darboux limit once), and the docs commit. Spec decisions 41–49. `uncaughtSteppers` is gone (empty).
- Evidence: briefs `w2-fc-common-brief.md`, `w2-f{1,2,3}-brief.md`, `w2-k{1,2,3,4}-brief.md`, `w2-rf-brief.md`, `w2-rk-brief.md`; results `w2-f1.md`–`w2-f3.md`, `w2-k1.md`–`w2-k4.md`, `w2-rk.md`; reviews `w2-fr.md`, `w2-kr.md`, `w2-fcu.md`; smokes `w2-smoke-fa|fb|fc|kd|ke|kf.md`; 161 lesson smoke rows for 70 lessons passed on `5e2bfc47`.
- Reusable briefs: `w2-fc-common-brief.md` (role, scope limits, shared files, phase 5 rules, checks, return) and `w2-fc-smoke-brief.md`. Copy them for patches and change only the family details.

## Next: patches

Task: [03-family-sweeps](../../../tasks/shared-graph-controls/03-family-sweeps.md). Brief inputs:

- Inventory rows (`docs/tasks/shared-graph-controls/inventory.md`): TensorPatch, TensorSubdivision, TensorJoin, CoonsPatch, TriangularPatch, TensorDeCasteljau, TensorDerivatives (rows 98–102, 123–124). Exemption: `src/graphs/patches/TensorPatchPanels.tsx` in `controlExemptions`.
- Listed exceptions that apply: "Patch control-point choice by index" (one shared chooser replaces three `NO_INDEX` copies and Coons's `NO_SELECTION`), "Surface camera panel with Reset view" (one shared camera panel replaces three copies), "TensorJoin Back to the two patches". `DEGREES` select copies become `CountSetter` (decision 10). Starting-patch button rows become `ChoiceSelect` (decision 4). `PointEditor` with Apply becomes commit on Enter or blur (decision 2).
- Sizing: one family, about seven panel files plus two shared parts (index chooser, camera panel). Suggested slices: P1 shared index chooser and `PointEditor` (with TensorPatch), P2 camera panel (with Coons and Triangular), P3 the rest (Subdivision, Join, DeCasteljau, Derivatives). Plan a continuation for any slice that rewrites many host tests.
- Checks as before: focused units, `just check-changed` in the clean worktree, `just build` after localization changes, `just smoke-lesson` for patch lessons (the `patches` row in `tests/guided-lessons.smoke.spec.cjs` uses `patchDemoPaths`), engineering review, UI review, mathematical review if a construction changes, broad smoke in Sonnet groups.
- After patches: the learning sweep (`CollisionPlayground.tsx`, `LookUnderneath.tsx` exemption), then Wave 3 (step 5).

Alongside: step 6 items 1–2 (inventory open cells, before screenshots at 390×844 and 360×640, prototype). Its implementation waits for Wave 3's C12/C24 playback slice.

## Open items

- From Wave 2 functions and curves, for step 5:
  - Own playback rows still natively disabled: De Casteljau animation buttons and its `aria-live` t readout; arc-length Play under reduced motion (natively disabled, so not focusable); Euler Next step / Show all; Epicycle Play.
  - Reveal buttons (C11), curve operation panels (C15), readout blocks (C27) unchanged in both families.
  - Insertion's refusal keeps the old decimal separator after a language switch until the next edit; Basis's knot notice clears only on a knot edit (probably unreachable).
  - Complex, linear and Bernstein panels (inventory rows 139–143) were not in any sweep: include them in step 5 or a small extra sweep.
  - Knot editor drag refusal reasons (decision 17) were not rechecked.
  - Not measured: clean test-time deltas (machine shared); several new assertions not mutation-checked (K2 wiring, kept weights, no-refit-inside, Blossom host Reset).
- From Wave 2 compgeo and projective, for step 5:
  - Pascal ◀ ▶ steppers and `pointset-row` buttons have no 44 px coarse-pointer rule.
  - Projective panels keep visible `role="status"` paragraphs and a nudge region; move them to `LiveReadout`.
  - Triangulation still has a hand-written hidden live paragraph (`data-triangulation="live"`).
  - `ChoiceSelect` has no unavailable reason (decision 34); `PointCollection` has no item noun (decision 33).
  - `VoronoiGraph.host.test.tsx` "schedules no timers" predates `TracePlayback`; unmount while playing untested; duplicate cases in `frameFit.test.ts` and `exampleAndFrame.test.ts`.
- `sharedControls.graphs.test.tsx`: mount once per group needs a per-graph restore contract in `src/inputs/sharedControlBehaviour.tsx`.
- `NumberInput` integer field: typing 3.5 gives a range hint without saying "whole numbers" (step 5).
- `UnavailableButton`: `title` plus a hidden description can be read twice (step 5).
- Curve workspace: `onAdd` never refuses, so the refusal path is unexercised.
- Step 3a appearance contracts: no De Casteljau export check; the PH board is checked at unit level only.
- Carried: `ChoiceSelect` clipped at 200% text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; no screen-reader run, Chromium only; the `.inspector-display-graph` fix is verified in the fixture only.

## Risks and working notes

- Concurrent workers in one checkout report each other's half-edited files as failures. Tell them to report only their own paths and to skip `check-changed`, `just build` and the controls fixture; the handler runs those at integration.
- Workers writing files through shell heredocs can corrupt escapes (`"\n"` became a literal line break once and broke every Vitest run). Prefer the edit tools for source.
- Ask for an observed failure by deliberate mutation in every brief; workers' own pre-change runs are rarely possible in a shared checkout.
- When the last file leaves an exemption array, delete the whole entry: an empty `files` array stops ESLint from loading its config.
- `check-changed` prints "selector removed" warnings for Playwright specs; read them. In Wave 2's second pair they were false positives from computed `data-*` keys (`FunctionStatus` `dataAttribute`).
- Line endings: match each file's current endings (Python: `encoding='utf-8', newline=''`). Git warns that CRLF becomes LF on commit; that is the repository's normalisation.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
