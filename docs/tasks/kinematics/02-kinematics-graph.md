# 02 State model and kinematics graph (F2a, gated on Controls step 5)

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Step 5 supplies playback and the time stepper. Before dispatch, recheck this file against them.

Spec: Implementation Decisions (state, host-held time); KN1–KN5 "Scene"; Testing Decisions (edges, performance). Decisions: ADR 0050 §1–3.

Scope:

- new `src/kinematics/kinematicsModel.ts`: parse and validate the motion id, parameters snapped to the steppers and the reparametrization \(b\), with Preset round trip and actionable errors. Time and the playing flag are not stored;
- new `src/graphs/curves/kinematics/KinematicsGraph.tsx`;
- tests for both.

No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. The graph draws the point, the velocity and acceleration arrows, the optional \(a_T\)/\(a_N\) split and a trace, all from the kernel. Units, \(g\) and both arrow-scale labels are on screen. At the cusp there is no arrow and a status is shown.
2. Play, pause and scrubbing work by keyboard and touch, with reduced motion and a text status.
3. Explicit ownership and disposal: no animation frames leak. Component tests cover mount, unmount and a state change.
4. Playback redraws are measured per [the performance plan](../../performance-plan.md).
5. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.

## Status

Built (uncommitted, no route): `src/kinematics/kinematicsModel.ts`, `src/graphs/curves/kinematics/KinematicsGraph.tsx`, tests and the `kinematics_graph_*` locale block. Acceptance 1–3 and 5 are covered by tests and checks. Acceptance 4 is a jsdom placeholder only; the browser measurement is owed at F2b (route). Evidence and open doubts: `docs/reviews/feature-streams/families-prep/notes/f2a-kin-02.md`.
