# 05 Graph: basis and determinant modes (F2a, Batch A)

Spec: L1 and L2 graph needs and acceptance; batch-wide gate items 3–4. Decisions: ADR 0025, task 04's drawing ADR. Uses tasks 01 and 03.

Scope: `src/graphs/linear/LinearMapGraph.tsx`, its controls and tests, and one block of localization keys at the same anchor in `sl.ts` and `en.ts` (after the complex-multiplication keys). No route, catalog or Demonstration registration (task 06).

Acceptance:

1. Two draggable basis handles snapped to \(1/4\), with numeric entry inputs as the accessible alternative (keyboard and touch), and Reset to the identity.
2. Source and image grid by task 04's approach (one NaN-break curve, [ADR 0032](../../adr/0032-linear-map-grid-image-as-one-polyline.md)), unit square and its image with ordered vertex labels, a point probe, the fixture Bézier curve and its derived image with control polygons (never calling the curve API's `rotate`, `scale` or `flip`), and a matrix readout.
3. Determinant mode: signed and absolute area readout, the determinant formula with the numbers, and a status positive / negative / zero. \(\det=0\) draws the collapsed segment or point with a text status and offers no inverse; \(\det=\pm1/16\) draws a thin parallelogram.
4. Lesson actions from task 03 registered through the lesson-action registry; Presets save and restore via `parseLinearMapState`; board objects and listeners are owned and disposed.
5. Readouts and labels update on a live language switch (board text uses `onLanguageChange`). New terms from the README term table are added to the localization table.
6. Unit and component tests: handle drag snaps, numeric input clamps with a message, Reset, Preset round trip and malformed import, singular case, mode switch keeps the matrix, language switch.

Checks: `just unit src/graphs/linear src/linear`, `npx tsc --noEmit --pretty false`, production build, then the full unit suite once. Review: engineering + UI/accessibility.
