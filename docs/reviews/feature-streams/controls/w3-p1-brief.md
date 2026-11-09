# Wave 3 slice P1 brief: playback variants and the curve runs

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Slice id for logs and evidence: `p1`.

## Rows (from `w3-triage.md`)

C12-01, C12-02, C12-03, C12-04, C24-08, C24-09, C24-10: decisions 56 and 57.

## Owned paths

- `src/graphs/base/controls/PlaybackButtons.tsx` and `PlaybackButtons.test.tsx` (shared control owner for this wave).
- `src/graphs/curves/bezier/DecasteljauAnimationControls.tsx`, `DecasteljauGraph.tsx`, `DecasteljauGraph2.tsx`.
- `src/graphs/curves/arclength/ArcLengthParametrizationGraph.tsx`.
- `src/graphs/curves/parametric/ParametricCurveGraph.tsx` (and its `rollDriver` file if the pause rule needs it).
- Tests beside those files; `sl.ts`/`en.ts` shared (common brief).

The other worker (slice D1) owns `src/inputs/**`, the function and complex graphs' reveal buttons, Linear map and three compgeo angle panels. Do not touch those.

## Work

1. `PlaybackButtons`: make `onNext`/`nextLabel` and `onReset` optional (a button is left out when its handler is absent; keep every existing caller compiling and rendering the same); add `reduced-motion` to `PlaybackBlock` with a reason string (reuse the existing reduced-motion text in `sl.ts`/`en.ts` if one fits; search `reduced`). Extend `PlaybackButtons.test.tsx` for the omitted buttons and the new reason.
2. De Casteljau (both graphs): replace the own Play/Pause/Stop/Replay buttons with `PlaybackButtons` (Play/Pause and Reset = Stop; Replay goes), with reasons for blocked buttons; the `t` readout becomes a `LiveReadout` muted while playing, number through `formatNumber` (Slovenian decimal comma). Edits pause the run (decision 57): check what an edit does today and record it.
3. Arc length: Play becomes `PlaybackButtons` with Reset where the graph has a run reset (l.160), blocked with `reduced-motion` under reduced motion; remove the separate reason paragraph and native `disabled`. Keep its existing pause triggers and check them against decision 57.
4. Parametric roll: Play/Stop becomes `PlaybackButtons`; apply decision 57 (find out and record what edits do today; make accepted edits pause the roll). Check reduced motion: if the roll animates without a reduced-motion check, record it, and block Play with `reduced-motion` only if the graph has an equivalent static view; otherwise leave it and report.

## Accepted visible changes

Only those in decision 56 (Replay gone, Stop labelled as the shared Reset or the run Reset label, the `t` readout now silent while playing, decimal comma) and 57 (an accepted edit pauses). List every visible change in your return so the handler can copy it to the spec's *User impact*.

## Checks

Beyond the common checks: `just unit` on the curve lesson tests that drive these graphs (De Casteljau animation, arc length and parametric/roll lesson actions; find them by search), and any Taylor-style smoke-locator risk: if an e2e test under `tests/` or `e2e/` locates these buttons by text, name it (do not run it).
