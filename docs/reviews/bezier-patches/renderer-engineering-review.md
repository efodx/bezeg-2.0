# Renderer spike engineering review — 2026-10-26

Read-only review of task 02 and recorded prototype evidence. No browser or benchmark was run.

## Findings

- **P1 — JSXGraph has open task gates.** Evidence records touch z movement changing XY, tainted-canvas PNG failure, listener counts rising 15→21 over three remounts, and inconclusive visible mesh updates/depth ordering. These are required interaction, export, lifecycle, and rendering criteria; keep them open pending fallback comparison. See [prototype-functional.md](prototype-functional.md).
- **P1 — Three.js remount can race setup.** `setup()` checks disposal after module import but not after the teapot-data fetch, then allocates the renderer, observers, listeners, and RAF. Disposal/remount during that fetch can leave a stale mount alive. Add a generation/cancellation check after each await before accepting lifecycle evidence. Evidence: `three-prototype.js:37,57-61`.
- **P1 — Three.js depth/export are not comparable yet.** HTML labels are overlaid using only projected z (`z < 1`), so nearer geometry cannot occlude them. SVG painter-sorts faces but assigns every line depth 0 and appends labels last. SVG/PNG have no content assertions or browser evidence. Keep these outputs out of acceptance until checked against the same scenes. Evidence: `three-prototype.js:35,54-55`; [three-prototype.md](three-prototype.md).
- **P2 — Harness probes do not establish visual fidelity.** SVG checks only substrings/elements; PNG counts all opaque white-background pixels as visible. Touch z asserts height changed but not that XY stayed fixed, despite the recorded drift. Listener counts omit JSXGraph callbacks and point nodes. Strengthen these checks before treating reruns as passes. Evidence: `verify-functional.mjs:29-42,155-175,242-246`.
- **P2 — Keyboard parameter access is absent.** Both pages support focused arrow-key orbit, but neither exposes keyboard input for the parameter inset, which the product contract requires. Track it as UI/adapter work, not renderer capability. Evidence: `index.html:25-29`, `three.html:22-26`, `bezier-patches.md:115,124`.

## Measurement caveat

Timing is a headless desktop proxy: rAF includes idle frames, update samples include no-op/suspended calls, and UV samples measure programmatic rebuilds rather than input-to-visible latency. It establishes neither phone budget nor renderer comparison. See [renderer-spike.md](renderer-spike.md) and `measure.mjs:15-16,35-50,53-60`.

No renderer selection recommendation is made.
