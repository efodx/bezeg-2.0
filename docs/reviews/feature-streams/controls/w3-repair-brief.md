# Wave 3 P1/D1 repair brief (handoff-v13)

Read `w3-common-brief.md` (it reuses `w2-pa-common-brief.md` by section). Slice id: `repair`. You are the only writer in the checkout. Findings: `w3-review-eng.md` and `w3-review-ui.md` in this folder; decisions 56 and 57 in `docs/specs/shared-graph-controls.md` (57 was amended: a board press pauses a continuous run, pan included; keep the `down` pauses).

## Owned paths

`src/graphs/curves/bezier/DecasteljauAnimationControls.tsx` (+ test), `DecasteljauGraph.tsx`, `DecasteljauGraph2.tsx` and their tests, `src/graphs/base/BaseCurveGraph.tsx` tests (a new or existing test file beside it; do not change its source), `src/graphs/curves/arclength/ArcLengthParametrizationGraph.tsx` (+ tests), `src/graphs/curves/parametric/ParametricCurveGraph.tsx` (+ tests), `src/graphs/base/WorkspaceControls.css` (only the rules named below), `src/localization/sl.ts` and `en.ts`.

## Repairs, each with a check

1. **Double announcement (UI 1, medium).** The visible `<output>` in the De Casteljau heading is an implicit live region. Make it non-live (`aria-live="off"`) so only the `LiveReadout` announces, muted while playing. Test: the visible output has `aria-live="off"`; observe it fail before the fix.
2. **Untested pause paths (eng M2).** Add tests that fail when each is reverted, and record each observed failure: the board `down` pause (De Casteljau, one of the two graphs is enough if they share the code path; otherwise both), the `selectedCurveOption` pause, and `BaseCurveGraph`'s pauses in `afterTypedPointEdit` and `removePointAt` (drive a typed point edit and a point removal on De Casteljau while playing and expect the run paused; also a refused removal at the minimum must not pause, decision 57). Revert each line temporarily to observe the failure, then restore it.
3. **Group labels (UI 3).** Arc length and the parametric roll both use the group label `animation_controls` ("Animacija konstrukcije"), which is wrong for both. Give each its own key naming what plays (e.g. arc length: "Gibanje po krivulji" / "Motion along the curve"; parametric: "Kotaljenje" / "Rolling"; check the panels' existing headings and lesson wording first and follow `docs/localization.md#choosing-new-terms`). Keep `animation_controls` if De Casteljau still uses it.
4. **Reduced-motion reason (UI 4).** Extend `playback_block_reduced_motion` to point to the slider, since both graphs that use it have one: "Sistem je nastavljen na manj gibanja, zato predvajanje ni na voljo. Parameter premikajte z drsnikom." / "The system is set to reduce motion, so playback is not available. Move the parameter with the slider." Update any test that pins the text.
5. **Dead CSS (UI 2).** Remove the `.decasteljau-animation-play` rules in `WorkspaceControls.css` (about lines 252–257 and 306–307) and the `.inspector-playback-primary` rules (about 289–299) if `grep -rn "inspector-playback-primary" src` finds no remaining user. No other CSS change.
6. **One-button group width (UI 5).** Check the `.inspector-playback` grid (about line 272) with one button (arc length, parametric): if the single button sits at half width, make a group with one button span the row (e.g. `.inspector-playback > :only-child { grid-column: 1 / -1; }`, or the grid's existing idiom). Record what you found.

## Checks

`just typecheck`, `just lint <touched>`, `just unit` on the touched tests plus `src/graphs/curves` and `src/graphs/base/controls`. Return ≤250 words: each repair with its check and observed pre-fix failure; evidence to `w3-repair.md`.
