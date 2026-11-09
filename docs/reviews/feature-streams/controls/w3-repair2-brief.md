# Wave 3 second-pair repair brief (handoff-v13): R2a and R2b

Read `w3-common-brief.md` (it reuses `w2-pa-common-brief.md` by section). Findings: `w3-review2-eng.md`, `w3-review2-ui.md` in this folder (and `w3-smoke-c.md` if present). Two workers run at once with disjoint paths; `sl.ts`/`en.ts` are shared (edit with the Edit tool, never by rewriting the whole file). For each new or changed assertion, record an observed failure (revert the fix line, run, restore) in your evidence file `w3-<slice>.md`.

## R2a (slice id `r2a`): Voronoi, Reset example, ChoiceSelect, trace policy evidence

Owned: `src/graphs/compgeo/VoronoiGraph.tsx` and `VoronoiControls.tsx` and their tests, `src/inputs/ResetExampleButton.tsx` (+ test, + a CSS file if needed), `src/inputs/ChoiceSelect.tsx` (+ test, CSS), `src/graphs/base/tracePlayback.test.ts`, tests of `src/graphs/functions/*` iteration graphs, B-spline Extraction/Insertion/Nurbs tests, `LinearMapGraph` tests, `ComplexRootsGraph` tests.

1. **Voronoi `atExample()` (eng medium):** compare every overlay against what `resetExample()` produces, so changing only the diagram overlay makes Reset example available; fix the doc comment and the `status()` formatting join. Add an `atExample` test covering a diagram-overlay-only change.
2. **Reset example look and wording (UI 5):** give `.reset-example` the same look as the other inspector action buttons (find the class those use, e.g. in `WorkspaceControls.css`; reuse, do not invent). Reason text: "Prizor je že enak primeru." / "The scene already matches the example."
3. **`ChoiceSelect` refused change (UI 4):** when `reason` is set and the user changes the value, announce the reason once in a polite status line, as `UnavailableButton` does on a blocked press (C6); the value stays. Test.
4. **Missing observed failures:** V1's new assertions (ResetExampleButton, ChoiceSelect reason, Linear map identity, ComplexRoots CountSetter wiring, B-spline availability) and P2b's "at end" guard (Next/Play at the end of a function run do nothing): record an observed failure for each, adding a test where none would fail.

## R2b (slice id `r2b`): playback order, collisions, Epicycle

Owned: `src/graphs/base/controls/PlaybackButtons.tsx` (+ test), `src/learning/playground/collisions/**` (components, CSS, tests), `src/graphs/functions/EpicycleGraph.tsx` and its tests, `src/graphs/functions/EulerGraph.tsx` tests.

1. **Inspect order (UI 1):** add an optional `leading` slot to `PlaybackButtons`, rendered before the buttons, and put Previous there, so the order is Previous, Next, Play, New. DOM-order test.
2. **Collision labels (UI 2):** read what Inspect's Next/Previous and Play actually advance (sweep events or object motion) and give each group a label naming that; if Play moves the objects, restore a motion cue in the group label (not in the shared Play label). Both languages.
3. **Collision CSS (UI 3):** the group has both `collision-playground__buttons` (flex) and `inspector-playback` (grid) with equal-specificity button rules. Make the intended layout win explicitly (keep the playground's own toolbar layout), and remove the now unused `:disabled` rule.
4. **Pause on edit (eng low):** `pauseForEdit` reads React `playing`, which lags the worker; send the pause unconditionally (it is idempotent) or read a ref of the latest state. Test.
5. **Epicycle tests (eng low, vacuous):** the reduced-motion test must assert Pause stays available, and the first test must assert `playing` after its click. Record observed failures.
7. **Euler Next wraps (smoke C, fail):** on `/analysis/euler-method` Next step goes 1, 2, then back to 1 and never becomes unavailable (`nextRevealed` in `src/analysis/eulerModel.ts` returns null at the end; Next from null gives 1). First check with `git log -S nextRevealed` and the Euler lessons whether the wrap is intended; if not, Next at the last step is unavailable with the "no more steps" reason (decision 56). If a lesson relies on the wrap, stop and report. Test with observed failure. (`src/analysis/eulerModel.ts` is yours for this item.)
8. **First Play ignored (smoke C note):** on `/learn/sweep-algorithms` the first Play click about 2.5 s after load did nothing; the second worked. Find out whether Play is pressed before the worker is ready; if so, either queue the command or keep Play unavailable with a reason until ready. Record what you found.
6. **Missing observed failures:** P2a's new assertions (Euler reasons, Epicycle reduced motion and pause rule, collision Step once and Previous reasons): record an observed failure for each.

## Checks and return

`just typecheck`, `just lint <touched>`, `just unit` on touched tests and their directories. Return ≤250 words: each item with its check and observed failure.
