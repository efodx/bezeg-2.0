# Wave 3 repair evidence
Mutation run: all five pause/aria-live lines reverted at once, `just unit` on bezier + BaseCurveGraph.test: 7 failures (log .command-logs/w3-repair-mut.log), sources restored (grep MUT = 0).
1 aria-live off: DecasteljauAnimationControls.test (existing assertion changed to 'off') failed.
2 board down (Graph, Graph2), selectedCurveOption (Graph, Graph2), afterTypedPointEdit, removePointAt: each new test failed. Refused removal at minimum (CURVE_POINTS_MIN=1) is a guard, passes.
3 keys arcparam_playback_group, parametric_roll_group (sl+en). 4 reduced-motion text extended; PlaybackButtons.test:117 updated.
5 dead CSS removed (no other user of the classes). 6 added `.inspector-playback > :only-child {grid-column: 1 / -1}`; the grid was 2 columns, so a lone button sat at half width (static finding, no browser).
Checks: typecheck, lint, unit (src/graphs/curves, base/controls, BaseCurveGraph.test) passed.
