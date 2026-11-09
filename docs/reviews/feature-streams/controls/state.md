# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls Wave 1" and "controls Wave 2, compgeo and projective" entries in [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`, rebased on `origin/master`. Run state: **active**. Wave 2's first pair (compgeo, projective) closed 2026-11-09; functions with curves is next. The previous handler handed off at this boundary rather than start the pair mid-budget.
- **Clean publish worktree:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached HEAD, its own `npm ci`. Check out the commit there, run `just check-changed` (about 12 min now), `just build`, `just smoke-lesson <ids>` for affected lessons, serve with `just preview 4327` for browser smoke, then publish. Untracked logs there make builds "dirty"; that is harmless.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Verification-throughput phase 5 applies to every sweep.

## Accepted in Wave 2 so far (on `master`)

- Compgeo and projective sweeps: `2cb0f397` (shared input additions: `Slider` cyclic/typed precision/grid/`unavailableReason`/value text/`onTypedChange`, `NumberInput` `onStepChange` and `reasonShownElsewhere`, `PointListInput` step, `ChoiceSelect` option names), `4361fd7f` (the sweep), `07a8f40d` and `a474efb2` (lesson smoke spec), `f957284b` (smoke fixes). Spec decisions 32–40 in `docs/specs/shared-graph-controls.md`. Both families are out of `controlExemptions`. Published as `1682b238` (rebased; the docs commit); hosted CI green on `1682b238`.
- Evidence: `w2-c1.md`, `w2-c2.md`, `w2-c3.md`, `w2-c3c.md`, `w2-p.md`, `w2-s.md`; smokes `w2-smoke-a.md`, `w2-smoke-b.md`, `w2-smoke-p.md`; 22 guided-lesson rows passed on `a474efb2`.
- Reusable briefs: `w2-common-brief.md` (role, shared files, phase 5 rules, checks, return) and `w2-smoke-brief.md`. Copy them for the next pair and change only the family details.

## Next: functions with curves

Task: [03-family-sweeps](../../../tasks/shared-graph-controls/03-family-sweeps.md). Brief inputs:

- Read the families' rows in `docs/tasks/shared-graph-controls/inventory.md` and their entries in `controlExemptions` (`AxisSelector.tsx` is the curves entry) and `uncaughtSteppers` (four functions graphs and `RationalBezierCurveControls.tsx` go to `CountSetter`).
- Functions status groups move to `LiveReadout` (the compgeo pattern: `src/graphs/compgeo/useStatusReadout.ts`, `StatusLive.tsx`; consider moving these two to `src/graphs/base/controls/` when a second family needs them).
- **Slice size:** Wave 2's four first-round slices of about 10k lines each ran out at 135k with about half the work done. Brief about half that per worker, or plan a continuation per slice from the start.
- Curves: confirm the curve workspace intent (open item below) during the sweep.
- Checks per sweep: focused units, `just check-changed` in the clean worktree, `just build` after localization changes, `just smoke-lesson` for the families' lesson ids (list them from `tests/guided-lessons.smoke.spec.cjs` by path), engineering review per slice group, a UI review, mathematical review where evaluation or constructions change, and broad smoke in Sonnet groups of about six routes.

Alongside: step 6 items 1–2 (inventory open cells, before screenshots at 390×844 and 360×640, prototype). Its implementation waits for Wave 3's C12/C24 playback slice.

## Open items

- From Wave 2, for step 5:
  - Pascal ◀ ▶ steppers and `pointset-row` buttons have no 44 px coarse-pointer rule (UI review, finding 1; predates the sweep).
  - Projective panels keep their visible `role="status"` paragraphs and a nudge region; move them to `LiveReadout` like compgeo (UI review, finding 2).
  - Triangulation still has a hand-written hidden live paragraph (`data-triangulation="live"`).
  - `ChoiceSelect` has no unavailable reason (decision 34); `PointCollection` has no item noun (decision 33).
  - `VoronoiGraph.host.test.tsx`: the test titled "schedules no timers" predates `TracePlayback`, and unmount while playing is untested; `frameFit.test.ts` and `exampleAndFrame.test.ts` duplicate two cases.
  - Not measured: clean test-time deltas (machine load); `scripts/fortune-browser-perf.cjs` was updated but not run; touch checks only on five-point and three-views.
- `sharedControls.graphs.test.tsx`: mount once per group needs a per-graph restore contract in `src/inputs/sharedControlBehaviour.tsx`.
- `NumberInput` integer field: typing 3.5 gives a range hint without saying "whole numbers" (step 5).
- `UnavailableButton`: `title` plus a hidden description can be read twice (step 5).
- Curve workspace: with a curve selected, dragging a control point moves the whole curve; confirm the intent during the curves sweep. Its `onAdd` never refuses, so the refusal path is unexercised.
- Step 3a appearance contracts: no De Casteljau export check; the PH board is checked at unit level only.
- Carried: `ChoiceSelect` clipped at 200% text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; the De Boor and Interpolation count setters' typed path is untested; no screen-reader run, Chromium only; `uncaughtSteppers` (five files); the `.inspector-display-graph` fix is verified in the fixture only.
- Leftover process from Wave 1: a 3b worker's mutation script (`bash /tmp/mut.sh`) may still be running; referred to the owner.

## Risks and working notes

- Concurrent workers in one checkout report each other's half-edited files as failures. Tell them to report only their own paths and to skip `check-changed`, `just build` and the controls fixture; the handler runs those at integration in the clean worktree.
- When the last file leaves an exemption array, delete the whole entry: an empty `files` array stops ESLint from loading its config.
- `check-changed` prints "selector removed" warnings for Playwright specs; read them, they found two stale hooks in Wave 2.
- Line endings: match each file's current endings (Python: `encoding='utf-8', newline=''`). Git warns that CRLF becomes LF on commit; that is the repository's normalisation.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Routing per the handler card; worker cap per the parallel plan.
