# CG-B2-2a: `curve-comb` and `curve-evolute` graphs

Curves handler 46, 2026-11-05. Source: [L3 and L4](../../specs/curve-geometry-lessons.md#l3-curvature-comb-and-spline-joins-glavnik-ukrivljenosti-in-stiki-zlepkov), [ADR 0041](../../adr/0041-curvature-comb-drawing.md), [ADR 0022](../../adr/0022-curvature-overlays-in-demonstration-graphs.md). Neither graph is registered: no route, catalog entry or lesson yet. Both Preset keys sit in `PENDING_ROUTE_KEYS` in `PresetCatalog.test.tsx`; registration removes them.

## What exists

- `src/graphs/curves/comb/`: `curveComb.ts` (pure, kernel only), `CombOverlay.ts` (teeth, tip line and clip marks as 3 curves, plus 1 readout), `CurveCombGraph.tsx`.
- `src/graphs/curves/bezier/`: `EvoluteOverlay.ts` (6 elements), `CurveEvoluteGraph.tsx`. `CurvatureOverlayGraph<S>` is a new abstract base in `CurvatureBezierCurveGraph.tsx`, because generic `setState` cannot be typed without a cast. L2's tests pass unmodified.
- Lesson actions: `comb-curve`, `comb-gain`, `comb-count`, `evolute-trace`; `curve-visibility` targets `curvature-comb`, `evolute-normal`.
- Curve collections take an optional `graphState` rule. The comb and evolute collections use it, so a bad stored mode, gain or count is refused on import.

## Decisions

- **One comb graph for four curves.** A lesson owns one Demonstration, so `CurveCombGraph` switches cubic, C1, C2 and G1 through scene replacement. The task table's "subclasses" wording is superseded. The kind is derived from the live curve, never stored.
- **Comb off by default**, as ADR 0041 says. Posters and lessons must switch it on.
- **Structured editing only for the cubic.** Those tools are Bézier-only and would break on a selected spline, so splines keep the commands of the spline routes. Comb controls render in both modes.
- **Default gain 1.4, range 0.1 to 6**, from measuring the four defaults at 64 teeth. No tooth clips.

| Curve | max \|κ\| | Longest tooth at 1.4 |
| --- | --- | --- |
| cubic | 0.67 | 0.93 |
| C1 | 1.46 | 2.04 |
| C2 | 1.03 | 1.44 |
| G1 | 0.98 | 1.37 |

- **Evolute trace** breaks at undefined or singular samples, between samples of opposite κ sign, and beyond 50 curve extents from the curve. The cut affects only the trace; the readout and the point E use the kernel directly.
- **Two curves in a Preset stay accepted.** Bézier subdivision adds curves, so refusing them would refuse the graph's own exports. The overlays read the first curve, as L2 does. A Bézier of another degree is labelled "cubic" in the selector.
- **Spec correction.** L4 step 4 said "cusp-free"; the parabola's evolute has a cusp at \((0,\tfrac12)\). Corrected in the spec.

## Evidence

- Mathematics review (Sonnet, independent rebuild of the three spline schemes): no blocker. C2 jumps are about 1e-16 at α = 0, 0.5 and 1. Default joins: C1 −0.667, −0.194, −0.375; G1 −0.0427, −0.2625. Spans: C1 4, C2 4, G1 3.
- Engineering review (Sonnet): clean on disposal, kind switching, memo key, L2 refactor and Preset compatibility. Its stale-redraw test gap is closed; its two-curve finding is declined above.
- Mutations: comb 8 plus the stale guard, evolute 17, and the trace-mode Preset check. All fail a test except `no-prev-change-redraw`, an equivalent mutant: the stale check already redraws in every reachable case.

## Known limits

- Two inflections inside one 1/255 parameter step give same-sign neighbours, so the trace draws a chord across them. Reviewer's case: `[(−1.6994,−1.1735),(0.5945,−0.5730),(−0.7052,−2.8463),(−3.5883,3.4459)]`. Accepted: near-degenerate cubics only.
- The G1 default's first join jumps by only −0.0427, too small to see at default gain. L3 should show the second join or move \(b\) first.
- With a singular join present, the readout joins two sentences with a space, not a line break.
- Not browser-checked: no visual, keyboard, accessibility or smoke pass. These belong to CG-B2-2b onward.
