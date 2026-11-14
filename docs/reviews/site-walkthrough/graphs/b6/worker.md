# B6 part A worker (conics, three views)

Changes
- src/graphs/functions/ConicFocalGraph.tsx: |PF| blue (comparisonCurve), |Pd| rust (emphasis), both solid at 1.5x the conic width (3 at default); second-focus segment referenceCurve, thin, dashed; directrix width displayThinWidth(0.8) (was 0.6); legend "distances" split into pf (blue) and pd (rust).
- src/localization/sl.ts, en.ts: conic_legend_distances replaced by conic_legend_pf and conic_legend_pd (lockstep).
- src/graphs/projective/ThreeViewsGraph.tsx: frames tick colour, width 0.5 (FRAME_WIDTH, was referenceCurve 1); image conic comparisonCurve; line L emphasis, width max(2, display width), layer 5. Asymptote rays (constructionAccent, dashed) untouched: not L.
- Tests: ConicFocalGraph.host.test.tsx (roles, widths, dash, |PF| = eps|Pd| on drawn segments); ThreeViewsGraph.host.test.tsx (roles).

Pre-change failures (graph files reverted to HEAD): conic "expected false to be true" (no blue/rust/referenceCurve segments); three views "expected [ 2, +0, +0 ] to deeply equal [ 1, 1, 1 ]".

Checks: just unit ConicFocal passed (16); src/graphs/projective passed; src/learning/content passed; just typecheck passed; just lint passed (full).
Existing math tests kept passing: conic ratio/readout tests, threeViewsModel.test.ts, host tests.

Copy search: patterns oker/ochre/oranž/orange/vijoličn/violet/siv/grey/zelen/green/črtkan/dashed/modr/blue/rdeč over learning/content (three-views lesson, preview copy), localization conic_*, conicFocalMessages, threeViewsText: no sentence names the old colours; only the legend changed. Slovenian "rdeča" used (no envelope wording for rust found).

Not done: no smoke/screenshot review; localization changed, handler runs production build.
