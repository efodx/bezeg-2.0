# 02 — Renderer spike and ADR

Status: in progress; acceptance partial. [Current evidence](../../reviews/bezier-patches/renderer-spike.md) records pinned-runtime browser findings, an interrupted timing attempt, verified actual teapot data and an isolated three.js fallback. PNG export, touch z editing, listener cleanup, drawing fidelity, complete measurements and ADR remain open. No renderer is selected. Source: [spec P2 and the rendering/interaction contract](../../specs/bezier-patches.md#rendering-and-interaction-contract). Dependencies: 01 merged. Role: renderer investigation owner.

Earlier [repair verification](../../reviews/bezier-patches/renderer-repair-verification.md) closes three.js raycaster and async/remount failures and validates bounded timing probes. Its combined-touch target uncertainty is resolved by the further evidence below. JSX findings, the full comparison matrix and renderer ADR still require work.

Further [touch diagnosis](../../reviews/bezier-patches/three-touch-target.md) identifies a nearer overlapping point rather than z drift; the [depth/export repair](../../reviews/bezier-patches/three-export-depth.md) hides occluded labels and retains scene depth in mixed raster/vector SVG. Implementation and handler browser checks pass all eight preset/export cases and a visible-owner combined touch edit; delegated smoke coverage and its stalled download are explicit. [JSX batching](../../reviews/bezier-patches/jsx-batching.md) now has a fair tiny before/after comparison with exact construction checks. Full matched measurements and the renderer ADR remain open; later tasks are not yet created.

The [matrix attempt](../../reviews/bezier-patches/renderer-matrix-attempt.md) completed192 attempts with56 failed Three verification cases. It retains all raw evidence but does not close matched measurement acceptance. Diagnose those paths, then complete actual teapot measurements and the ADR.

Decide how patches are drawn and edited, using measurements. The spike code is throwaway: keep it on a branch or under `docs/prototypes/`, never in production routes. Only the evidence and the ADR ship.

1. Build a prototype page on the upgraded JSXGraph with `view3d` inside a board created as `GraphSession` does. It shows:
   - a bicubic tensor patch (16-point net) and a cubic triangular patch (10 points);
   - patch surfaces with shaded faces, iso-curves, boundary curves and the control net;
   - a de Casteljau construction at a draggable `(u, v)`;
   - orbit and preset views;
   - point drag in the horizontal plane and along `z`;
   - a parameter-domain inset as a separate 2D board.

   Triangular patches need a mesh path. Compare a reparameterized `parametricsurface3d` with Bezeg-built triangle faces (`polyhedron3d`/`face3d`). Use simple inline Bernstein evaluation; the shared kernels from task 03 are not required.
2. Measure, following [performance-plan.md](../../performance-plan.md), on desktop and the representative phone:
   - drag frame time;
   - orbit frame time;
   - `(u, v)` sweep cost.

   Use iso-grids of 8×8 and 16×16 and shaded tilings of 8×8 and 16×16. Also try the 32-patch teapot.
3. Check, and record pass/fail with screenshots:
   - depth ordering of net vs patch at the four preset views;
   - SVG/PNG figure export with labels;
   - Presentation mode and resize;
   - touch orbit and drag, including a `z` mode toggle without Shift;
   - keyboard orbit and focus behaviour;
   - disposal (no leaked boards or listeners after unmount).
4. If JSXGraph fails a must-have (depth order, drag usability, or the frame budget at 8×8), prototype the same scene with three.js, lazy-loaded and isolated, and measure the same things.
5. Write the ADR (next free number in `docs/adr/`), covering:
   - the chosen renderer and the rejected alternatives with reasons;
   - the surface-view adapter boundary;
   - the drag rule for `z`;
   - the triangular mesh approach;
   - the drag/orbit frame budget, iso-grid and tiling defaults for later slices;
   - whether the teapot capstone is feasible.

Completion: evidence in `docs/reviews/bezier-patches/renderer-spike.md` (numbers, devices, screenshots, prototype commit hash) and the accepted ADR, both linked from the spec. Afterwards, the handler creates the next task files (patch geometry, adapter and `patch-tensor`, `patch-triangular`, remaining demonstrations, chapter and lessons, acceptance).
