# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation record for Wave 1: the last "controls Wave 1" entry in [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`, rebased on `origin/master`. Run state: **active**. Wave 1 closed 2026-11-08; Wave 2 is next.
- **Clean publish worktree:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached HEAD, has its own `npm ci`. Wave 1 used it to verify and publish while workers kept the stream worktree dirty: check out the commit there, run `just typecheck`, the focused units and `just build`, serve with `just preview 4327` (positional port), then push from it. Remove the untracked copies of docs before checking out a commit that adds them.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Verification-throughput phase 5 applies to every sweep (stream file, Notes, last item).

## Accepted in Wave 1 (all on `master`)

- Step 2, shared point controls: P1–P5 earlier; follow-ups in `19bd0dd0`, among them decision 31 (placement never duplicates a point; see the spec's task-2 section); smoke repairs `34d8b831` (pushed with this note). Evidence: `points-w1.md`, `points-review-ui.md`, `points-smoke.md` (with "Repair recheck").
- Step 3, contracts task 2 (`ac0dc04d`) and task 3 (`6606083a`, then `19bd0dd0`): `src/graphs/compgeo/tracePlayback.ts` drives all eleven trace graphs. Evidence lives beside the tasks in `docs/tasks/mathematical-runtime-contracts/`; smoke in `contracts-3a-smoke.md` and `contracts-3b-smoke.md`.
- Step 3a, appearance contracts: `c25cfa5b` and `1f91b7e9` (a CI hover fix). `src/graphs/styles/RenderedPointRoles.test.ts`, `tests/rendered-appearance.smoke.spec.cjs`.
- Master smoke repair after `97d22db4`: `ea98f719`; hosted CI green on `1f91b7e9`.
- Task files for steps 7, 8 and 9: `docs/tasks/lesson-authoring-architecture/05-…`, `04-…` and `03-…`.
- Step 6, partial code inventory: `docs/tasks/mobile-graph-playback/graph-adjacent-controls.inventory.md`.

## Next: Wave 2, family sweeps

Order (parallel plan): compgeo with projective in parallel, then functions with curves, then patches. Task: [03-family-sweeps](../../../tasks/shared-graph-controls/03-family-sweeps.md). Brief inputs per sweep:

- Read the family's rows in `docs/tasks/shared-graph-controls/inventory.md`, and its entries in `controlExemptions` (`eslint.config.mjs`). Split the family by panel, at about 10k lines read per worker, with one owner per shared file. `sl.ts`, `en.ts` and `controlExemptions` conflicts are mechanical.
- Acceptance: the family's exemptions are gone apart from recorded exceptions; I1–I5 hold in both languages; lessons and Presets behave as before apart from confirmed changes; mathematical meaning is unchanged.
- Phase 5 rules: run the full shared behaviour on two graphs per kind and give the others one thin wiring check; delete migrated graphs' duplicate mechanics tests in the same commit; give each placement or view rule a pure test plus one real-graph case; report the test-time delta per slice.
- Compgeo:
  - PointSet segments and intervals still have their own add and remove buttons and native `disabled` (`PointSetControls.tsx`).
  - Nine compgeo live paragraphs and the function status groups move to `LiveReadout`.
  - Trace panels now use `TracePlayback`, so do not reintroduce per-graph controller code.
- Projective: take the Pascal table-index readout with this sweep (stream file, Notes, "From Clips").
- Checks per sweep: focused units, `just check-changed`, `just build` after localization changes, engineering review, a UI review where controls change, and a smoke of the family's routes. Haiku smoke manages about five routes with five checks each; split longer lists or use Sonnet.

Alongside Wave 2, step 6 items 1–2 may run: the open cells of the inventory, the before screenshots at 390×844 and 360×640, and the prototype. Its implementation waits for the C12/C24 playback slice in Wave 3.

## Open items

- `sharedControls.graphs.test.tsx`: mount once per group is not done, because cases mutate the graph. It needs a per-graph restore contract in `src/inputs/sharedControlBehaviour.tsx`.
- `NumberInput` integer field: typing 3.5 gives a range hint without saying "whole numbers" (`points-smoke.md`, failure 4). Goes to step 5.
- `UnavailableButton`: `title` plus a hidden description can be read twice (UI review, finding 3). Step 5.
- Curve workspace: with a curve selected, dragging a control point moves the whole curve. This looks like existing behaviour; confirm the intent during the curves sweep.
- The curve workspace `onAdd` never refuses today, so its refusal path is unexercised.
- The step 3a appearance contracts have no De Casteljau export check, and the PH board is checked at unit level only.
- Contracts task 3: some trace graph class comments still describe `advance()` and `IterationController` choreography in prose. Fix them in the compgeo sweep.
- Carried: `ChoiceSelect` is clipped at 200% text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; the De Boor and Interpolation count setters' typed path is untested; no screen-reader run, Chromium only; `uncaughtSteppers` (five files); the `.inspector-display-graph` fix is verified in the fixture only.
- **Leftover process:** a 3b worker's mutation script (`bash /tmp/mut.sh`) may still be running. The worker could not stop it, and the handler referred it to the owner instead of stopping it on the worker's behalf.

## Risks and working notes

- Concurrent workers in one checkout break each other's `check-changed`, and its checkout lock stalls the others. Tell workers to report only failures in their own paths, and to skip `check-changed` while another worker's run is active. The handler runs it at integration in the clean worktree.
- Machine load: a full `check-changed` takes about 20–23 minutes.
- Line endings: match each file's current endings. With Python, use `encoding='utf-8', newline=''`.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Routing per the handler card; worker cap per the parallel plan.
