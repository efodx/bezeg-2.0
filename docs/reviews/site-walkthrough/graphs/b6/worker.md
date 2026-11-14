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

## Part B

conic-focal: recipe window [-5.3, 3.6, 6.5, -3.6] (was [-8, 8, 8, -8]); ellipse x -5..5, directrix x 6.25 at eps 0.8. Path changed to [0.8, 1.6, 0.8, 0.5, 0.8] (was dip 0.2): the directrix sits at x = 4 + 1.8/eps, 13 at eps 0.2, 7.6 at 0.5; the ellipse at 0.5 spans x 0.4..5.2. Hyperbola branches and P/F2 near eps 1.25 leave the frame (declared offCamera). Text `{keep:[], strip:[]}`; textHidden is the four readouts plus "0,0"; nothing kept; axes and ticks retained. Clip 275975 bytes.
projective-three-views: window [-11.6, 7.2, 11.6, -7] (was [-12, 10.5, 12, -10.5]). The panels span x -11.5..11.5 (two panels, not the brief's +-9); the sweep sends image points Q1', Q2' to x 11.5, y 7, so the window cannot be tighter without loosening the in-frame check (a tighter first try failed at frame 28). Stale label corrected: slider "Višina premice L (c)" (was "... (c, v desetinkah)"); the slider now counts c itself, so step 0.1 and path [2, -0.4, 2] (was step 1, [20, -4, 20]) (projective.cjs:22-25). Text empty; hidden: captions and "L: y = 2". Clip 236903 bytes.
Manifest: only these two ids changed (captures and motions). No check edits. src clean.
R1-R8 posters: conic: R1-R4, R6-R8 met; R5 met (ellipse about 60% wide). three-views: colours and frames met, R5 only partly (panels about 74% wide, 77% tall; padding and the sweep limit it).
Clip frames (ffmpeg): conic stays in frame apart from the declared eps-near-1 crossing; three-views hyperbola stays in the panel.
Drag: conics P (0, 3) -> (0.233, 2.997) after a 30 px drag (it slides along the conic). Three views: L is fixed, only the slider moves it: c = 2 -> 1,3 after a 30 px slider drag. SVG export contains #a8503c (1) and #6175ad (2).
Live: b6/live/. Inspector 310 px; legend (in the Edit tab inspector) shows two new lines, blue and rust swatches, wraps cleanly in sl and en. Live segments are thinner than on the poster; blue and rust clearly different.
