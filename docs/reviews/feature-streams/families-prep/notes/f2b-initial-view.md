# F2b initial view diagnosis (lines, isometries)

Status: complete, no code changed. Preview port 4323 (stopped); scripts in .command-logs/view-diag/ (box.cjs, drag390.cjs).

Finding: no defect in the Preset wiring or host path. The first-mount box equals `initialView()` fitted to the canvas by `startingBox` (fit margin included).
The figures look small because the chosen views are large by design: lines FIXED_VIEW [-17,17]^2 (LineGeometryGraph.tsx:40, spec analytic-lines-lessons.md:135, so a foot of up to 15.5 stays in view and nothing jumps under the pointer); isometries VIEW_HALF = 20 (src/isometry/isometryModel.ts:31, used at IsometryGraph.tsx:214).

Box at 1280x800 (canvas 848x528), x-left, y-top, x-right, y-bottom, after load:
- isometries: -39.63, 24.67, 39.63, -24.67 (20 * margin, widened to aspect)
- line-geometry: -33.68, 20.97, 33.68, -20.97 (17 * margin)
- functions/unit-circle: -2.26, 3.49, 8.94, -3.49
- triangle-solver: -12.81, 14.34, 26.81, -10.34
- inscribed-angle: -5.42, 7.05, 12.42, -4.05
The earlier smoke screenshot box (about -35..40, y -22..22) is the same behaviour at its canvas size.

390x844 touch (CDP touch events), /line-geometry: dragging P from (-2,1) moved it to (3,5). Dragging works; the smoke script was at fault. Canvas there is 364x295, box -26.2..26.2 by -21.3..21.3 (about 7 px per unit, small touch targets).

Fix options (handler decision, spec-level): reduce the initial view to about [-10,10] (isometries, default scene within a few units) and let off-view points use the existing status text, or keep the fixed view and scale figures/labels. No test added: nothing fails.
