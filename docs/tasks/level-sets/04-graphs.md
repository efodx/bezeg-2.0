# 04 Measurement, state models and graphs (F2a, gated on Controls step 5)

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Before dispatch, recheck this file against the shared 3D view and the playback and stepper controls step 5 settles.

Spec: Implementation Decisions (state, actions); LS1–LS5 "Scene"; Testing Decisions (performance). Decisions: ADR 0053 §1–3.

Scope, in order:

1. The measurement, done first. Measure per [the performance plan](../../performance-plan.md) the contour drawing for \(N\in\{40,80,120\}\) and 1, 5 and 9 levels while dragging the level and the probe, and the \(N=40\) surface mesh. Record both in ADR 0053. If a budget fails, stop and report.
2. The function-surface `SceneMeshOwner` kind.
3. New state models for the contour and LP graphs, with Preset round trip and actionable errors.
4. New `ContourMapGraph.tsx` (LS1–LS4, with modes) and `LinearProgramGraph.tsx` (LS5).
5. Tests for each.

No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. Readouts come from the kernels. Approximate statuses are labelled. Exact statuses (LP optimum, line tangency, the `valley` convergence rule) come from integer or `Rational` tests.
2. Every handle has a numeric input, with keyboard and touch. Descent playback works with reduced motion.
3. Explicit ownership and disposal. Component tests cover mount, unmount and a state change.
4. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.

## Status

Done (uncommitted): items 1–3, and item 4 (`ContourMapGraph` LS1–LS4 and `LinearProgramGraph` LS5; `src/graphs/levelsets/`, the mode, function, level, probe, start, constraint and camera state, the surface panel, the contour preset collection, the `levelsets_graph_*` and `levelsets_graph_lp_*` locale keys, unit and component tests). Open: the production build and the browser smoke test of both graphs. Evidence and review doubts: `docs/reviews/feature-streams/families-prep/notes/f2a-ls-04.md`.
