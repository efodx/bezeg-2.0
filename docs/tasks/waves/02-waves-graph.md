# 02 State model and waves graph (F2a, gated on Controls step 5)

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Step 5 supplies animated time and the steppers. Before dispatch, recheck this file against them.

Spec: Implementation Decisions (state, host-held time); WV1–WV5 "Scene"; Testing Decisions. Decisions: ADR 0055 §1–3.

Scope:

- new `src/waves/wavesModel.ts`: parse and validate the mode, the components (integer frequencies, snapped amplitudes and phases), the sampling rate and options, with Preset round trip and actionable errors. Time is not stored;
- new `src/graphs/functions/WavesGraph.tsx`;
- tests for both.

No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. Each mode draws from the kernel. The sampler strip uses the instants \(n/f_s\) and never the frame rate. The continuous wave is drawn at 2048 points per second.
2. Play, pause and scrubbing work by keyboard and touch, with reduced motion and a text status.
3. Explicit ownership and disposal: no animation frames leak. Component tests cover mount, unmount and a state change.
4. Playback is measured per [the performance plan](../../performance-plan.md).
5. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.

## Status

Implemented, uncommitted, awaiting review. Evidence: [f2a-waves-02](../../reviews/feature-streams/families-prep/notes/f2a-waves-02.md). Not smoke-tested in a browser (no route); the playback measurement is a jsdom placeholder.
