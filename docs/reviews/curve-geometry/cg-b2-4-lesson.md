# CG-B2-4: L4 evolute lesson

Evidence for the [L4 lesson](../../specs/curve-geometry-lessons.md) on `curve-evolute`: six steps, 13 frames, chapter section and registration. Lesson text is [one-shot](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Scene contract: [handoff 49](../feature-streams/curves/handler-handoff-49.md#l4-scenes-the-drafts-contract), except step 5's view below.

## Acceptance

| Item | Check | Result |
| --- | --- | --- |
| 1. Closed form to 1e-9 | Real-graph test on the board's E point, \(E=(-4x^3, 3x^2+\tfrac12)\) | Passed |
| 2. Normal through E | Real-graph test, plus tangency against a finite difference of the drawn trace | Passed |
| 3. Clean break at \(\kappa=0\) | Real-graph test on the S-cubic at \(t=0{,}5\): E invisible, NaN break in the trace, no segment across; browser: broken pieces, no joining line | Passed |
| 4. Disposal and reset | Cycling scenes keeps the board count without tick labels; Reset test | Passed |
| 5. Both languages | Quoted values in `sl` and `en`, readouts in both; browser step 5 in English | Passed |

Each new assertion group failed under a deliberate mutation: scene t, normal direction, inflection break, trace sampling, the S-cubic control point, quoted values in each language, overlay disposal, deferred trace action. Removing the `stale` guard in `CurveEvoluteGraph.tsx` `extraStateChanged` is not caught by these tests; `CurveEvoluteGraphReal.test.tsx` covers that guard, not run against that mutation.

## Mathematical review

Sonnet reviewer, with a separate `node` script from the definitions. Every quoted value confirmed, including the sign of \(\kappa\) under the left-normal convention, that `CURVATURE_S_CUBIC` is \(x=3t\), \(y=6t(1-t)(1-2t)\), and \(\mathrm{d}E/\mathrm{d}s=(1/\kappa)_s N\). No false statement.

- "Where \(\kappa'=0\) there is a cusp" holds generically (\(\kappa''\ne0\)); loose, not false for the curves shown. Text unchanged.
- `EvoluteOverlay.ts` also drops centres farther than 50 scale units, so the trace breaks near the inflection, not exactly at it.
- Two substring checks in `EVOLUTE_QUOTES` are weak (`'2'`, `'0,5'`, `'0,75'`). Accepted: \(\kappa\) and \(R\) are pinned exactly in a separate test, and each scene's t by the contract test.

## Browser walk

`bezeg-smoke` (Sonnet) on the production build of `6f5088fe`, Chromium, 1920 by 1080 and 1280 by 720. Screenshots of all six steps; no console error. The free route's t input and slider read correctly at 0 and 1, and the chapter link opens step 1, frame 1.

**Fixed: step 5 at 1280 by 720.** With `sCubicView` the curve and circle sat under the lesson panel. Step 5 now uses `EVOLUTE_S_CUBIC_VIEW` `[-1.5, 4.9, 4.5, -2.5]`, which keeps \(y=0\) low on the board. The handler rechecked both sizes on a rebuild: curve, E, circle and both cusps are clear of the panel, no horizontal scroll, no console error. L3 keeps `sCubicView`.

### Layout findings for the gate

- At 1280 by 720 the panel covers the board readout's values in every step; only the labels show. Same family-wide overlap as the [L3 walk](cg-b2-3-lesson.md#layout-findings-for-the-gate). "Opazuj na grafu" clears it, and the panel can be moved.
- Step 1, frame 1 at 1920: the expository panel covers E and the top of the circle; frame 2 does not.
- Step 4: the label E sits on the dashed normal. Step 5: `p0` is half hidden by the curve and label E. Step 6: labels N and T crowd near `p2`.
- Step 5 at \(t=0{,}5\): the dashed lines cross the long red "Točke evolute ni" readout.

## Not covered

- The lesson's own reset control in the browser (unit-tested), and observe mode at 1280 by 720.
- Weak-device performance and the drag check: CG-B2-6.
