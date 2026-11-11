# 03 Measurement, state model and graphs (F2a, gated on Controls step 5)

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Before dispatch, recheck this file against the playback and stepper controls step 5 settles, and check whether #11's `LinearMapGraph` eigen-direction mode has landed.

Status: done pending review. Step 1 (measurement, [ADR 0054](../../adr/0054-phase-portraits-separate-graphs-rk4-integer-classification.md) section 2, jsdom placeholder for both graphs; browser numbers owed at F2b), step 2 (`src/dynamics/phaseModel.ts`) and steps 3 and 4 for both graphs (`src/graphs/dynamics/PhasePortraitGraph.tsx` and `LogisticMapGraph.tsx` with their tests) are done. Not done: any browser, touch or screen-reader check (no route yet). Evidence: `docs/reviews/feature-streams/families-prep/notes/f2a-phase-03.md`.

Spec: Implementation Decisions (state, actions); PP1–PP5 "Scene"; Testing Decisions (performance). Decisions: ADR 0054 §1–3.

Scope, in order:

1. The measurement, done first: 12, 24 and 48 trajectories of 500 steps while dragging a matrix handle and while dragging a seed, per [the performance plan](../../performance-plan.md). Record the results in ADR 0054. If the budget fails, stop and report.
2. New `src/dynamics/phaseModel.ts`, with Preset round trip and actionable errors.
3. New `PhasePortraitGraph.tsx` (PP1–PP3) and `LogisticMapGraph.tsx` (PP4–PP5).
4. Tests for each.

No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. Type labels come from the exact classification. Computed periods and trajectories are labelled computed. Stops are shown, never silently clipped.
2. Every handle has a numeric input. Playback works by keyboard and touch, with reduced motion.
3. Explicit ownership and disposal. Component tests cover mount, unmount and a state change.
4. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.
