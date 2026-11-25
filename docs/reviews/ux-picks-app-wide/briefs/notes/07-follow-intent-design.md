# Task 07 slice 4: state-following intent (handler 7, 2026-11-25)

Source: [task 07](../../../../tasks/ux-picks-app-wide/07-morph-and-view-director.md) slice 4 ("bisection zooms to the current bracket on each step") and its acceptance; director design `07-view-director-design.md`; morph `07-morph-design.md`. Known from the prototype: "the bisection zoom can centre under cards".

## Today

- `BisectionGraph` (`src/graphs/functions/BisectionGraph.tsx:61`, extends `IterativeFunctionGraph`) declares nothing: no `declaration()`, no `parameterBindings()`, so no arbiter, no `view` binding, no director. Its lesson (`src/learning/content/analysisGuidedLessons.ts:76`) steps with the `next-step` animation; only `bisection-free-scene` sets a view.
- Smoke: lesson step 13 at 1440x900 jumps 53 % of the box width in one frame (pre-existing; `smoke/07-morph-3a-remeasure.md`).
- `declaration()` is a pure function of `this.state`, so marks already follow state; what is missing is an intent that follows state.

## Contract

- `GraphDeclaration` gains optional `followView?: ViewBox` (computed in `declaration()` from state, like marks): the box the view should frame for the present state (bisection: the current bracket `[a_n, b_n]` padded by 25 % of its width on each side, never narrower than a floor that keeps the function's sign change readable, with y from the function's range over that box plus padding). Absent: the stored intent is the base, as today.
- The director's fit base is `followView` when present, the stored intent otherwise. `followView` never writes the stored intent (presets and exports keep the intent; "a fit never changes the stored intent" still holds). The pass that keeps `must` marks clear of cards (keep mode) runs on top, so the bracket is never centred under a card.
- Trigger: a change of `followView` (relative tolerance 1e-9 of the box size) caused by a non-learner write (lesson action, `animation` such as `next-step`, Reset, Preset) glides; within a lesson step it is the step's one glide (it retargets a running frame glide). A learner write that changes it (dragging `a` or `b`) glides at the gesture end only if Samodejno is on, like a released parameter. Learner pan or zoom pauses the director as today; the fit button and a new frame resume it.
- Reduced motion: jump.

## Bisection conversion (minimal, for this slice)

- Bind `bisect-a`, `bisect-b` (range), `bisection-example` (choice) and `view` to the arbiter; declare them with catalog text that already exists (no new strings unless needed; new Slovenian terms follow `docs/localization.md#choosing-new-terms`).
- Marks: `must` = the bracket endpoints on the x-axis and the current midpoint; `nice` = the function curve sampled over the bracket.
- `followView` from the bracket as above. Remove nothing else of its view logic in this slice (slice 5 removes the old fit).
- Follow `docs/guides/converting-a-graph.md` for the declaration; `just graph-check` on bisection must pass.

## Acceptance

- Unit (director, fake clock): a `followView` change from an `animation` write glides once to the new base; a learner pan pauses and later `followView` changes do nothing until the fit button; the stored intent is unchanged after any number of follows; two fits of an unchanged state write once.
- Unit (bisection): `followView` contains the bracket for each iteration of the lesson's example functions; it shrinks monotonically as iterations advance until the floor.
- Browser (handler gate): bisection lesson at 1280x720 and 1440x900: at most one glide per step, no single-frame jump over 30 % of the box width (step 13 included), Back returns to the step's view within 2 %, the bracket and midpoint visible and clear of cards.
