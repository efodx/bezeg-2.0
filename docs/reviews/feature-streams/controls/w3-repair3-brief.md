# Wave 3 repair 3 brief: smoke E findings (O1 operation panel, compgeo readouts)

Read `w3-common-brief.md` first (role, checks, return rules; it reuses `w2-pa-common-brief.md` by section). Slice id: `repair3`. Evidence: `w3-smoke-e.md` (failures 1–4 and observations). Spec `docs/specs/shared-graph-controls.md` decisions 18, 63, 64; the handler adds decision 66 from your result.

Another worker (R1b) is editing at the same time: `src/graphs/projective/**`, `src/graphs/complex/**`, `LinearMapGraph.tsx`, function graphs and `FunctionReadout`, `BezierClippingControls.tsx`, patch panels, `src/learning/playground/collisions/**`, `ReadoutParts.*`, `sl.ts`/`en.ts`. Do not touch those. If you need a new localization key, report it; do not edit `sl.ts`/`en.ts`.

## Owned paths

`src/graphs/base/controls/BezierCurveControls.tsx`, `RationalBezierCurveControls.tsx` and the CSS that styles the operation graphs' command buttons (find it), `src/inputs/PointCollection.tsx` (+ css), the `useStatusReadout(...)` call lines in `src/graphs/compgeo/*Controls.tsx` except `BezierClippingControls.tsx`, and their tests.

## Work and acceptance

1. **Apply reason shown on press** (smoke failure 2). `OperationTool`'s Apply and the rational Reset weight pass `onBlockedPress` and show the reason as visible text in a polite region that is empty until pressed, following `src/inputs/ResetExampleButton.tsx:18-25` (keyed by a press counter so a repeated press re-announces). Check the rational base route's first render: the smoke saw Reset weight enabled at weight 1 (`w3-smoke-e.md` observations); find why (initial selection or weight read) and fix if the button should be unavailable there.
2. **44 px Apply under a coarse pointer** (failure 3). The operation graphs' command buttons (`/bezier/extrapolation`, `/bezier/elevation`, `/bezier/subdivision`, rational versions) measure 34 px at 390×844 touch. Add the coarse-pointer rule the inputs use (`@media (pointer: coarse), (max-width: 700px)`, see `src/inputs/Slider.css:13-14`) to the shared class these buttons carry, not per graph.
3. **Trace readouts settle during drags** (failure 1). On `/compgeo/delaunay`, dragging a point changes `[data-delaunay-live]` mid-drag because `useStatusReadout(text)` replaces immediately (`src/graphs/base/controls/useStatusReadout.ts:10-12`). Decision (66, handler): a compgeo graph whose readout text can change from a point drag passes `settled = true`, so the announcement comes once after the 500 ms quiet period; step presses then announce after that period too, which is accepted. Apply to each such caller you can confirm has draggable input (Delaunay, Voronoi, Triangulation, Ear clipping, Monotone partition/triangulation, Bentley–Ottmann, Interval sweep, Bezier hulls: check each); leave a caller unchanged if no drag changes its text and say so.
4. **Visible count is not live** (failure 4, decision 63). `PointCollection.tsx:120` puts `role="status"` on the always-visible "Točk: N od največ M". Remove it. Announce a count change after Add or Remove through the existing region at `PointCollection.tsx:154` (it stays empty until something happens; drags do not change the count). If that region's current use makes this awkward, report and leave the count unannounced instead.

## Checks

Unit tests for each item, each with an observed failure (revert, run, restore) recorded in `w3-repair3.md` as you go: reason text appears on blocked press; the coarse rule exists (a CSS-source assertion is acceptable if layout is not measurable in jsdom); a settled caller does not publish during a sequence of rapid changes (fake timers) and publishes once after; the count `p` has no `role`. Run `just unit` for `src/graphs/base`, `src/graphs/compgeo`, `src/inputs`, and grep `tests/` and `src/learning` for `point-collection-count`, `data-delaunay-live` and the other changed hooks' readers.

## Return

≤250 words: per item, done or not, `file:line`, the observed failures, and anything left. Bulky output to `w3-repair3.md`. On `HANDOFF`, write done/remaining there and stop.
