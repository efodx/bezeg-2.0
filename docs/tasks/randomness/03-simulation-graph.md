# 03 State model and simulation graph (F2a, gated on Controls step 5)

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Step 5 supplies the seed field, the Replay action and playback with reduced motion. Before dispatch, recheck this file against those controls.

Spec: Implementation Decisions (state, performance); RS1–RS6 "Scene"; Testing Decisions (graph). Decisions: ADR 0049 §1–3.

Scope:

- new `src/random/randomModel.ts`: parse and validate seed, \(n\), mode parameters, playback position and the generator version tag, with Preset round trip and actionable errors;
- new `src/graphs/random/SimulationGraph.tsx` with the modes `galton | frequency | area | walk | markov | interval`;
- tests for both.

No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. Each mode draws the simulated tallies next to the exact curve, from the kernel. Readouts state how far a run normally is from the exact value.
2. The seed field, Replay and reduced motion work by keyboard and touch. A text status mirrors the visual state.
3. Explicit ownership and disposal: no timers or animation frames leak on dispose. Component tests cover mount, unmount and a state change. Derived tallies are never read from a Preset.
4. The time to first frame at \(n=10^4\) and \(10^5\), the playback frame time on a phone, and the choice between `BigInt` and two halves and between SVG and canvas are measured per [the performance plan](../../performance-plan.md).
5. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.

## Status (F2a, implemented, uncommitted)

- [x] `randomModel.ts` with the stored fields `areaShape`, `overlay`, `seed2`, `stopMs`; Preset round trip and named errors.
- [x] `SimulationGraph.tsx` with all six modes, the overlay switch with the second seed, the area shape select, the speed slider, captions for every element a readout names.
- [x] Tests: scene (oracle values by hand), graph (controls, playback on a fake clock, language, rebuild and disposal), model.
- [x] `tsc`, `just lint`, `just build`, unit tests pass; JSDOM placeholder timings in the [evidence note](../../reviews/feature-streams/families-prep/notes/f2a-rand-03.md).
- [x] Route and caption overlaps done at F2b (handler 8, 2026-11-11). Browser and phone timings and the `BigInt`/SVG verdicts were done at F2b, 2026-11-11 ([results](../../bezier-performance-results.md#f2b-simulation-and-kinematics-browser-timings--2026-11-11)); the galton \(10^5\) phone miss is open.
