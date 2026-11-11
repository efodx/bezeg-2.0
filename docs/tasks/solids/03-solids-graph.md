# 03 Measurement, state model and solids graph (F2a, gated on Controls step 5)

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Before dispatch, recheck this file against the slider, preset chooser and status controls step 5 settles.

Spec: Implementation Decisions (measurement first, state); SV1–SV5 "Scene"; Testing Decisions (graph). Decisions: ADR 0051 §1.

Scope, in order:

1. The measurement, done first. Measure per [the performance plan](../../performance-plan.md), on desktop and a phone, the frame time while dragging the plane offset on a cube (12 triangles plus the cap), on a 48-segment revolve (about 770 triangles), and on a 200-triangle slab stack, together with the painter's-order sort. Record the results. If they fail the budget, stop and report: ADR 0051 §1 is then reopened.
2. The `SceneMeshOwner` kind `solid` in `surfaceScene.ts`.
3. New `src/solids/solidsModel.ts`: parse and validate the solid choice, plane normal, offset, shear, disc count and camera within the grid ranges, with Preset round trip and actionable errors.
4. New `src/graphs/solids/SolidsGraph.tsx`, a `BaseSurfaceGraph` subclass with the modes `section | stack | volume | revolve`, and tests using `FakeSurfaceView`.

No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. Each mode draws only meshes that pass `isClosed`. Section side counts and areas are available as text. Mesh volumes are labelled next to the exact values.
2. `assertFiniteScene` passes. The integer slider steps by keyboard and touch.
3. Explicit ownership and disposal. Component tests cover mount, unmount and a state change.
4. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.

Status: implemented in the working tree, not committed; acceptance 1 to 4 observed (evidence in [the slice note](../../reviews/feature-streams/families-prep/notes/f2a-sol-03.md)). Review owed: engineering, UI and accessibility, mathematical review of the readouts. The measurement (scope 1) is in ADR 0051 section 1, JSDOM placeholder only; browser and phone figures are owed at F2b.
