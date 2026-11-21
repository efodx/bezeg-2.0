# Focus-hull view fit (UX picks design, owner-agreed 2026-11-22)

Owner: "Since we want to be able to make moving cards adjust this views automatically in the future, it would be nice if they could create convex hulls of important stuff and use that to place the view". "yeah fit to points would be replaced by this same function, as it currently is useless on most graphs".

## Decisions (owner answers)

- Scope: pan and zoom within limits each graph declares (e.g. at most 1.6× out from its default), so curves never get tiny.
- Triggers: load, lesson frame change, canvas resize, and a card dropped, folded or opened.
- Learner's own pan/zoom pauses auto-fit; "Prilagodi točkam" runs this fit and resumes auto-fit; a new lesson frame resumes it too.
- Parameter changes: nothing moves during a drag; on release refit only if a must point is now under a card.
- "Prilagodi točkam" is replaced by this fit (fill mode) wherever a graph declares its focus; app-wide it replaces the visible-points fit (`BaseGraph.fitToVisiblePoints`).

## Design

1. The graph declares focus (`GraphUx.focus`) as shapes, not only the points that control it (owner: "hopefully this doesn't mean 'points that control the graph' only, as sometimes the lines matter too"): `point`, `segment`, `curve` (a function or parametric curve sampled over the stretch that matters, e.g. Tₙ over the interval where it is compared with f), `line` (a tangent or asymptote, by the part that matters: an infinite line cannot fit, so the graph gives the interval), `region` (a polygon, disc or band outline: a shaded area, a convergence interval). A shared sampler turns each shape into world points; the hull is taken over all of them. A non-convex set is over-covered by its hull, which errs on the side of keeping content clear. Shapes come in two tiers, `must` (e.g. Taylor: c, x, both ends of the error segment) and `nice` (samples of the curve's visible part of interest), plus `limits` (max zoom out/in relative to its default view). A lesson frame may add or replace focus (`FrameUx.focus`) instead of a hard bounding box.
1a. Prediction (owner: "this must support/predict at least some moving of the parameters, otherwise stuff could run out of view fast"): focus is a pure function of the parameter values, `focus(params)`, not only of the current picture. The layer also evaluates it at nearby values, one parameter at a time (linear cost): default ±25 % of a slider's range around its value (clamped to the range), ±2 steps for a count; a graph may declare its own reach per parameter (e.g. Taylor n up to 6). Those shapes form a third tier `reach`, below `must` and `nice`: the fit tries must+nice+reach, then must+nice, then must. On release after a drag the view refits when a must point is under a card or out of the canvas.
2. Pure module `src/uxPicks/declare/viewFit.ts` (+ `hull.ts`), no React or JSXGraph, unit-tested: convex hull of the focus points; fit given hull, canvas size, card rectangles (obstacles, px), the graph's default view, equal-axis flag, limits, margin. Mode `keep` (automatic triggers): stay at the default scale with the least pan that clears the hull; zoom out stepwise within limits only when needed. Mode `fill` (Prilagodi): largest scale within limits that clears the hull. Tries must+nice, falls back to must, reports must points left covered.
3. No drift by construction: the fit reads no current view; lessons store the un-fitted intent, never a fitted box (the reverted 6a428517 widened views 36 → 52 → 74 by refitting fitted views).
4. Motion: ~250 ms glide, none under reduced motion; never during a drag.
5. Obstacles: rectangles of open and folded cards at their docked or floating places, the pucks strip, and the lesson card, in board pixels.

## Order

1. Geometry core (worker, now): `hull.ts`, `viewFit.ts`, unit tests.
2. Integration (after pilot 1): `GraphUx.focus`/`limits`, `FrameUx.focus`, triggers, pause/resume, Prilagodi replacement under the pick, for taylor, transformations, De Casteljau; GUIDE.md section "View focus".
3. The Haiku/Sonnet trial includes declaring focus.
