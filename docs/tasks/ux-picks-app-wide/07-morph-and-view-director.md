# 07 Lesson morph and view director

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) requirements A2, A5; [view fit design](../../reviews/ux-picks/view-fit.md) (owner-agreed 2026-11-22). Reference: `src/uxPicks/b1/`, `src/uxPicks/declare/viewDirector.ts`, `viewFit.ts`, `hull.ts`, `fitIntent.ts`, `viewPort.ts` and their tests at the frozen commit.

## Goal

Lesson Back and Next glide the scene and the view together in one motion. On every graph the view fits the declared content into the board area free of cards.

## Slices

1. **Pure fit core** ported with its unit tests: hull of the declared marks, fit into the layout function's free rectangle, zoom limits, pan before zoom-out.
2. **Director** on the view adapter of task 01b, as an `animation` writer of the fitted view (surface demonstrations have a camera, not a bounding box: the director does not run there, and their cards rely on placement alone): triggers are load, lesson frame change, board resize, a changed card rectangle and a released parameter; never during a drag; learner pan or zoom pauses it; "Samodejno" switches it on and off globally; the fit button resumes it. It reads only the intent view.
3. **Morph:** Back and Next interpolate the scene (new content draws in, old fades) on the same clock as the view glide; a learner press ends it at once and the press is kept (owner decision); one glide per step, including when a card settles mid-motion.
4. **State-following intent:** a graph's intent may follow its state (bisection zooms to the current bracket on each step).
5. **Old fit removed:** the visible-points fit is replaced wherever a graph declares marks.

## Acceptance

- Unit tests: a learner pan ends a director glide and the view is the learner's; a fit never changes the stored intent; repeated fits of an unchanged state return the same box (no drift); a learner write during a morph ends it and the value is the learner's.
- The wider board of task 04 breaks a lesson whose view is fixed: at step 4 of `interp-runge` (1440x900, board 1330x569) three Chebyshev semicircle markers sit above the fixed `DEFAULT_VIEW` top (2.5), because the semicircle is drawn as a true circle (`RungeInterpolationGraph.tsx:141`) and its height grows with the canvas aspect. Runge declares no marks, so the director never fits it (see below): the graph's own view logic keeps the whole semicircle visible by widening the x range rather than squashing the arc (fixed on the work branch by handler 5, outside this task). Evidence: `docs/reviews/ux-picks-app-wide/smoke/04-runge-probe.log`. Check other undeclared graphs whose drawings keep screen proportions for the same effect.
- Probe on the pilots and bisection, both sizes: at most one glide per lesson step, no jump after a lesson action, Back returns to the step's view within 2 %.
- Visual check per pilot and frame, as the owner asked: the content the learner needs is visible and clear of cards (screenshots judged, not only numbers). Board cover is reported against the 35 % target.
- A preview taken during a morph leaves the preset export unchanged, and a preview causes no refit (moved here from task 06).
- A graph without declared marks keeps its own view logic and is never fitted.
- Reduced motion: scene and view jump.
- Critique: at most two rounds; P1s fixed, P2s fixed or logged here.

## Known from the prototype, to settle here

Release refits on Taylor felt abrupt to reviewers (the owner's Samodejno rule stands); the bisection zoom can centre under cards; contours stays small in its fixed window.
