# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls Wave 2, …" entries in [evaluation-log.md](../../../agent-workflow/evaluation-log.md) (compgeo and projective; functions and curves; patches; learning).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`, rebased on `origin/master`. Run state: **active**. Wave 2 (step 4, family sweeps) is complete and pushed: `controlExemptions` lists only the host chrome (`PresetImportDialog`, `PresetSelector`). Wave 3 (step 5) is next. The previous handler handed off at this boundary.
- **Clean publish worktree:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached HEAD, its own `npm ci`. Check out `origin/master`, cherry-pick the slice, run `just check-changed origin/master` (about 9–10 min, includes the build), `just smoke-lesson <ids>` for affected lessons, serve with `just preview 4327` for browser smoke. Publish from the stream worktree with `just publish --background --recipe runtime --base <commit before the slice> --commits <ids>` and check `just publish --status` (ADR 0043); then `just ci <pushed sha>`.
- **Hosted CI:** `81300d01` failed (Taylor smoke locator matched both parts of the new `CountSetter`); fixed in `6ee72917`, green. `7e14b51c` (patches) green. `050612c4` (learning) green: run 42618777343, Browser smoke success.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Verification-throughput phase 5 applies to every sweep.

## Accepted in Wave 2 (on `master`)

- Compgeo and projective: decisions 32–40. Functions and curves: decisions 41–49.
- Patches: `e039252a` (sweep), `934bd9cd` (review repairs), `7e14b51c` (docs); decisions 50–54. Evidence: briefs `w2-pa-common-brief.md`, `w2-pa1/2-brief.md`, `w2-pam-brief.md`, `w2-par-brief.md`, `w2-par-repair-brief.md`, `w2-pa-smoke-brief.md`; results `w2-pa1.md`, `w2-pa2.md`, `w2-pam.md`, `w2-par.md`, `w2-par-repair.md`; smokes `w2-smoke-pa-a.md`, `w2-smoke-pa-b.md`; 24 patch lesson smoke rows passed.
- Learning: the sweep commit `feat: learning sweep moves the playgrounds to the shared controls` and its docs commit (find hashes with `git log --grep`); decision 55. Evidence: `w2-le-common-brief.md`, `w2-le1/2-brief.md`, `w2-le1.md`, `w2-le2.md`, `w2-smoke-le.md`.
- Reusable briefs: `w2-pa-common-brief.md` (full common brief), `w2-le-common-brief.md` (a short brief that reuses it by section), `w2-pa-smoke-brief.md`.

## Next: Wave 3 (step 5)

Task: [04-remaining-controls](../../../tasks/shared-graph-controls/04-remaining-controls.md), items 1–6; plan: step 5 slices two at a time, C29/C30 labels last and alone; step 6's implementation starts once the C12/C24 playback slice lands; step 5a stays gated on Codex's lesson navigation.

Triage done: [w3-triage.md](w3-triage.md) (66 rows, capabilities and build order). It refuted the playback + readouts pairing (they share `LiveReadout`, `PlaybackButtons`, De Casteljau, the compgeo trace controls, Epicycle and the collision files), so the pairs are:

1. **Done: P1** (playback variants + De Casteljau, arc length, parametric roll) and **D1** (`RevealButton`, Linear map switches, `AngleSlider`): `d0a72a48` feature, `c731a291` review repairs; decisions 56–60 and User impact. Evidence: briefs `w3-common-brief.md`, `w3-p1-brief.md`, `w3-d1-brief.md`, `w3-repair-brief.md`, `w3-smoke-brief.md`; results `w3-p1.md`, `w3-d1.md`, `w3-repair.md`; reviews `w3-review-eng.md`, `w3-review-ui.md`; smokes `w3-smoke-a.md` (5 routes passed), `w3-smoke-b.md` (partial), `w3-smoke-r.md` (recheck). Reuse `w3-common-brief.md` for the next slices.
2. **P2** (Euler, Epicycle, collision playground and Inspect, and TRACE-POLICY-SHARED: move `tracePlayback.ts` to base for `IterativeFunctionGraph`, DeBoor, SubdivisionCurve) with **V1** (C9 local Resets: decide D-RESET-LABEL; C10/C25/C26 leftovers: ComplexRoots degree to `CountSetter`; Pascal steppers coarse-pointer rule).
3. **R1** readouts and `StepCounter` (C27; decide D-STATUS) and **O1** operation panel (C15; decide which preview state wins), after P2 because they share the trace controls.
4. C29/C30 alone.

Alongside: step 6 items 1–2 (inventory open cells, before screenshots at 390×844 and 360×640, prototype).

## Open items for step 5

- Playback rows still own-built (P2): Euler Next step / Show all (`aria-disabled`, no reason); Epicycle Play (no reasons); collision playground Play/Step once/New arrangement and Inspect Previous/Next/Play/New (native `disabled`); decisions 56–58 settle their shape. TRACE-POLICY-SHARED: `IterativeFunctionGraph`, DeBoor and SubdivisionCurve still hand-copy `exportBusy`/pause guards.
- Decision 57 gaps: De Casteljau's curve-control commands and Preset load leave a run going; lesson `play` of the parametric roll ignores reduced motion (unchanged).
- Curve operation panels (C15) and readout blocks (C27) unchanged in functions and curves.
- Complex, linear and Bernstein panels (inventory rows 139–143) were in no sweep.
- Pascal ◀ ▶ steppers and `pointset-row` buttons have no 44 px coarse-pointer rule.
- Projective panels keep visible `role="status"` paragraphs and a nudge region; Triangulation keeps a hand-written hidden live paragraph (`data-triangulation="live"`).
- `ChoiceSelect` has no unavailable reason (decision 34); `PointCollection` has no item noun (decision 33).
- Patches (low): Derivatives corner options carry `aria-label` (inconsistently read); `PatchPointEditor` passes a new `points` array each render (clears a graph-level refusal; none exists today).
- Insertion's refusal keeps the old decimal separator after a language switch; knot editor drag refusal reasons (decision 17) not rechecked.
- `VoronoiGraph.host.test.tsx` "schedules no timers" predates `TracePlayback`; duplicate cases in `frameFit.test.ts` and `exampleAndFrame.test.ts`.
- `sharedControls.graphs.test.tsx`: mount once per group needs a per-graph restore contract in `src/inputs/sharedControlBehaviour.tsx`.
- `NumberInput` integer field: typing 3.5 gives a range hint without "whole numbers". `UnavailableButton`: `title` plus hidden description can be read twice.
- Curve workspace `onAdd` never refuses; step 3a: no De Casteljau export check, PH board checked at unit level only.
- Carried: `ChoiceSelect` clipped at 200% text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; no screen-reader run, Chromium only.

## Risks and working notes

- Concurrent workers in one checkout report each other's half-edited files as failures. Name owned regions when two workers share a file (worked in patches), and keep a shared lint entry with the handler.
- Workers run out of budget on follow-ups and then skip mutation evidence. Commit the integrated slice locally, let reviewers read the commit, and give mutations to a separate worker as the only writer.
- Test helpers with unbounded loops hang a shared test slot; ask for bounded loops. After a worker stops, check for orphaned `vitest` processes from this worktree (`Get-CimInstance Win32_Process`, command line containing `stream-controls`) and stop them.
- Workers writing files through shell heredocs can corrupt escapes; prefer the edit tools for source.
- `check-changed` "selector removed" warnings: read them; in Wave 2 all were false positives.
- Line endings: match each file's current endings (Python: `encoding='utf-8', newline=''`).
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
