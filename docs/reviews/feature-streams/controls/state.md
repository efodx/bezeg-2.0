# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls Wave 2, …" entries in [evaluation-log.md](../../../agent-workflow/evaluation-log.md) (compgeo and projective; functions and curves; patches; learning), then "controls Wave 3, …" (triage and P1/D1; second pair and O1).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. Wave 3 (step 5) is in progress. Seven local commits are accepted but **not pushed**: `4d56bd95`, `42d85cbb`, `30376aa5`, `a3a713d7`, `24b2c2f4`, `6e27a812`, `7e925b59`, plus the handoff docs commit on top. `origin/master` moved meanwhile (`faac4988`, another stream); `just publish` rebases. The previous handler handed off at BUDGET SOFT after integrating and verifying these.
- **Clean publish worktree:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached HEAD, its own `npm ci`. Check out `origin/master`, cherry-pick the slice, run `just check-changed origin/master` (about 9–10 min, includes the build), `just smoke-lesson <ids>` for affected lessons, serve with `just preview 4327` for browser smoke. Publish from the stream worktree with `just publish --background --recipe runtime --base <commit before the slice> --commits <ids>` and check `just publish --status` (ADR 0043); then `just ci <pushed sha>`.
- **Hosted CI:** `81300d01` failed (Taylor smoke locator matched both parts of the new `CountSetter`); fixed in `6ee72917`, green. `7e14b51c` (patches) green. `050612c4` (learning) green: run 42618777343, Browser smoke success. `d2df201d` (Wave 3 P1/D1) green: run 42648129369. Wave 3 P2a/P2b/V1, O1, R1f, step 6 items 1–2 and repair 3 (`4d56bd95`..`2f0017c0`, 12 commits) published as `68771cb0` on 2026-11-09: green, run 42717545564 (Browser smoke success).
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
2. **Accepted, not pushed: P2a, P2b, V1** (`4d56bd95` briefs, `42d85cbb` feature, `30376aa5` repairs, `24b2c2f4` docs). Reviews `w3-review2-eng.md`, `w3-review2-ui.md`; smokes `w3-smoke-c.md`, `w3-smoke-d.md`, `w3-smoke-r2.md` (all passed after repair). Gaps: Voronoi diagram-overlay-only Reset example covered by a unit test only; Triangulation's empty select has no change to refuse (reason visible, not announced).
3. **Accepted, not pushed: O1** operation panel (decision 64): `a3a713d7` feature, `6e27a812` repairs (handler mutation confirmed the Apply test; the repair worker recorded no other observed failures). Review `w3-review-o1.md`, evidence `w3-o1.md`, `w3-o1r.md`. **Not browser-smoked yet.**
4. **Accepted, not pushed: R1f** shared readout parts and compgeo readouts (decisions 63, 65): `7e925b59`. Reviews `w3-review-r1f-eng.md`, `w3-review-r1f-ui.md`: no blocking finding; `ReadoutScrollTable`'s stale measure (no user yet) and weak assertions carried into the R1b brief. **Not browser-smoked yet.**
   - `just check-changed d2df201d` passed over all of 2–4 at `7e925b59` (896 s); its selector warnings (`.visually-hidden`, `data-testid` in the controls fixture) are false positives.
   - **Successor's first step:** one smoke worker (Sonnet `medium`, frame `w3-smoke-brief.md`) on a preview of HEAD for the O1 routes (`/bezier/extrapolation`, `/bezier/elevation`, `/bezier/subdivision`, `/bezier/subdivision-2`, the rational versions, and the curve workspace Edit tab with a selected curve: preview pressed state, Apply with reason, Shorten parameter, closing a disclosure clears its preview) and the compgeo readout routes (Delaunay, Triangulation, Voronoi, Monotone partition, Euler line, Notable points, Simson, Inversion, Inscribed angle: counters 1-based, chips visible, one announcement per change). Then publish everything: `just publish --background --recipe runtime --base d2df201d --commits 4d56bd95,42d85cbb,30376aa5,a3a713d7,24b2c2f4,6e27a812,7e925b59,<handoff docs commit>` and `just ci <pushed sha>`.
5. **Next slice R1b** (readouts outside compgeo, decisions 63 and 65, plus the R1f carry-over): brief `w3-r1b-brief.md` is ready, not dispatched. It can start while the smoke runs (its files are disjoint from O1 and compgeo).
6. C29/C30 alone. Then task 4 closeout: `just check`, the full browser checklist in both languages, hosted CI.
7. Step 6 (phone playback) implementation is unblocked now that C12/C24 have landed; item 1's code inventory is committed (`9d117eb2`), items 1's screenshots and 2 (prototype) remain.

Pipelining (owner asked why the stream is slow, 2026-11-09): start the next slice in files disjoint from the ones under review or repair instead of waiting for publish and CI; smoke only touched routes with exact selectors and mode preconditions in the brief; workers run unit tests only for their own directories and the handler's `check-changed` catches cross-cutting contracts.

Alongside: step 6 items 1–2 (inventory open cells, before screenshots at 390×844 and 360×640, prototype).

## Open items for step 5

- Decision 57 gaps: De Casteljau's curve-control commands and Preset load leave a run going; lesson `play` of the parametric roll and Epicycle ignore reduced motion (unchanged).
- C30: `ResetExampleButton` borrows the `inspector-playback` wrapper class (R2a); decision 62 wants it out of playback groups. Collision groups carry both `collision-playground__buttons` and `inspector-playback` (resolved by specificity). `hulltrace_step_counter` is a hull-named shared key (C29).
- Collision playground autoplays when in view; Play while out of view does nothing (R2b finding, unchanged).
- `.inspector-playback button:disabled` stays: Voronoi and Delaunay controls still use native `disabled` somewhere (find and move to `UnavailableButton`, C6).
- `ReadoutHeading` is not tied to `ReadoutList` by `aria-labelledby`; `ReadoutScrollTable` stale measure (R1b).
- Voronoi four-point and vertex lists, Ear clipping's `data-result` list and Delaunay's neighbours list are not on the shared readout parts yet.
- `NumberInput` integer field: typing 3.5 gives a range hint without "whole numbers". `UnavailableButton`: `title` plus hidden description can be read twice.
- Patches (low): Derivatives corner options carry `aria-label`; `PatchPointEditor` passes a new `points` array each render. Insertion's refusal keeps the old decimal separator after a language switch; knot editor drag refusal reasons (decision 17) not rechecked.
- Test debts: `VoronoiGraph.host.test.tsx` "schedules no timers" predates `TracePlayback`; duplicate cases in `frameFit.test.ts` and `exampleAndFrame.test.ts`; `sharedControls.graphs.test.tsx` mount once per group needs a per-graph restore contract.
- Carried: `ChoiceSelect` clipped at 200% text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; no screen-reader run, Chromium only. Curve workspace `onAdd` never refuses; no De Casteljau export check.

## Risks and working notes

- Concurrent workers in one checkout report each other's half-edited files as failures. Name owned regions when two workers share a file (worked in patches), and keep a shared lint entry with the handler.
- Workers run out of budget on follow-ups and then skip mutation evidence. Commit the integrated slice locally, let reviewers read the commit, and give mutations to a separate worker as the only writer.
- Test helpers with unbounded loops hang a shared test slot; ask for bounded loops. After a worker stops, check for orphaned `vitest` processes from this worktree (`Get-CimInstance Win32_Process`, command line containing `stream-controls`) and stop them.
- Workers writing files through shell heredocs can corrupt escapes; prefer the edit tools for source. Workers that rewrite `sl.ts`/`en.ts` whole leave CRLF working copies; briefs say "Edit tool only, keep LF". After a slice, re-check-out committed clean files that turned CRLF (`.gitattributes` wants LF in the checkout).
- `just publish` needs the declared commits to be exactly `<base>..HEAD`; do not interleave an unverified slice's commit between verified ones you want to push first.
- `check-changed` "selector removed" warnings: read them; in Wave 2 all were false positives.
- Line endings: match each file's current endings (Python: `encoding='utf-8', newline=''`).
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
