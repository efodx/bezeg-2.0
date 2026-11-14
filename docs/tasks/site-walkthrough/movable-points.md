# Shared movable-point path (M03)

Source: [shell and label polish, recommendation](../../specs/site-walkthrough-shell-polish.md#recommendation-for-the-shared-movable-point-path-m03-waiting-for-the-owner), approved by the owner on 2026-11-14 (both stages). Inventory: [point inventory](../../reviews/site-walkthrough/point-inventory.md). Session: [polish queue](polish.md).

## Stage 1: hover cursor (no visual change)

Every draggable JSXGraph point shows the pointer cursor through `bindMovablePointCursor` (`src/graphs/base/bindMovablePointCursor.ts`), directly or through a shared creator; fixed points do not. No graph writes `style.cursor` itself.

| Batch | Files | Work |
| --- | --- | --- |
| 1a | Every file under `src/graphs` that writes `style.cursor`, except the binding (14 graphs and `JXGRationalBezierCurve.ts`) | Replace the copy with the binding; keep or record any case that is not a movable point. Add the static check. |
| 1b | Graphs with draggable points and no cursor: complex (3), Epicycle, FourierCoefficients, LinearFunction, LinearMap, projective handles (4), Hermite / Interpolation / SubdivisionCurve / BSplineBasis scenes (4) | Bind the cursor where the point is created. |

Static check (spec P5): one unit test that reads the sources under `src/graphs` and mounts nothing. It fails on a `style.cursor` write outside the binding, and on a file that registers a drag handler on a point without reaching the binding, unless the file is on an allow-list with a reason.

Acceptance: a real hover in a browser on at least one graph per family gives `pointer` on a draggable point and `default` after leaving it, and nothing on a fixed point; dragging, snapping, state, lesson actions and Presets are unchanged; existing tests of the touched graphs pass.

## Stage 2: math labels (changes how about 27 graphs look)

Point labels that name a mathematical object take the shared label attributes of `createPointStyles`, as the point-set graphs do. Number readouts and captions stay plain; each batch lists what it left and why. One batch per family, each with before and after screenshots reviewed by the handler. Element names that capture recipes, clip rows, tests or Presets address are not renamed. Batches are listed here once stage 1 is accepted, from what its workers report about each file.

Stage 2 should land before package D recaptures the affected graphs.
