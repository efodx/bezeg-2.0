# 02 State model and descent graph (F2a, gated on Controls step 5)

Status: in review (state model, `DescentGraph` and tests written, no route; evidence in `docs/reviews/feature-streams/families-prep/notes/f2a-mech-02.md`).

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Step 5 supplies play and step controls. Before dispatch, recheck this file against them.

Spec: Implementation Decisions; MC1–MC3 "Scene"; Testing Decisions. Decisions: ADR 0056 §1–2.

Scope:

- new `src/mechanics/trackModel.ts`: parse and validate the mode, quarter-grid end points and control points, with Preset round trip and actionable errors. Elapsed time is not stored;
- new `src/graphs/mechanics/DescentGraph.tsx`;
- tests for both.

No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. The race, track and tautochrone modes draw from the kernel. Times are labelled computed. Inadmissible tracks show their status and no time.
2. Every control point has a numeric input. Playback and the time slider work by keyboard and touch, with reduced motion.
3. Explicit ownership and disposal. Component tests cover mount, unmount and a state change.
4. Dragging a control point, which recomputes the time, is measured per [the performance plan](../../performance-plan.md).
5. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.
