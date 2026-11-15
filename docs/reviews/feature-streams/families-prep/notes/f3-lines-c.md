# F3 lines Batch C, slice 1 (set-target action and opening probe)

## Written
- `src/learning/model.ts:431-434`: union member `{kind:'lines'; operation:'set-target'; target:'lines'|'circle'}` and comment.
- `src/graphs/lines/LineGeometryGraph.tsx` (`applyLinesAction`, `set-target` branch): validates against `INTERSECT_TARGETS`, one `setState({target})` + `requestRender()`, error `lines set-target: target must be one of lines, circle.`. Equals the target select's onChange. Does not change mode.
- `src/graphs/lines/LineGeometryLessonActions.host.test.tsx`: 4 new tests (control equality both values; sync sequence; checkpoint restore; invalid values). Red: branch routed to never-taken condition, 4 of 9 failed (`.command-logs/lines-c/host-red.log`); green restored (`host.log`, `s1-unit.log`, `s1-tsc.log`, `s1-lint.log`).

## Observed
- Target persists across mode changes (away and back stays `circle`). `set-points` may write O and B while target is `lines` (no restriction, state only). Defaults: mode forms, target lines, intersect handles R(3,-2) S(2,0) = 2x+y=4 (same as T), O(1,0) B(3,1).
- Reset not exercised (calling `graph.reset()` in a host test timed out); by code (`BaseGraph` reset reloads default preset) it returns to the default state, forms mode. Unverified.
- Board view is FIXED_VIEW [-10,10,10,-10] (jsdom bbox in probe is a shim, not real); whether intersection points and circle are inside not verified visually. Default circle (O(1,0), r=sqrt5) lies inside; the circle B(3,2) points are within +-3.

## Probe summary (`.command-logs/lines-c/probe.txt`, sl and en)
- Opening 1 (also default handles): status "Presečišče premic je (4/5; 12/5)." / "The lines meet at (4/5, 12/5)."; rows: both implicit equations, Presečišče (4/5; 12/5) exact, approx (0,8; 2,4). Board texts: only labels l, m. So the meeting point is stated on the first frame, fractions and decimals.
- Parallel (R(-2,-1), S(2,1), x-2y=0): "Premici sta vzporedni in se ne sekata." / row "ni". Same (R(-2,1), S(2,3)): "Premici sovpadata, skupnih točk je neskončno mnogo." / "neskončno mnogo". Learner drags a point of the second line.
- Circle target O(1,0) B(3,1): "Premica je tangenta krožnice v točki (0; 2)."; rows r²=5, a·x₀+b·y₀−c = 5, a²+b²=5, discriminant 0, count 1, tangent point (0; 2) exact. B(3,0): r²=4, disc −5, none. B(3,2): r²=8, disc 15, rows ≈ (−1,5492; 1,2254), (1,5492; 2,7746). All match the spec's numbers (status for two points does not list points; rows do).
- Predictions answered on the first frame: step 1 (meeting point) yes, status and rows. Step 4 (tangent radius): status and rows state tangency with r²=5 and discriminant 0 at once, so the lesson must open from a non-tangent circle (e.g. B(3,2)) or ask before showing.

## Doubts
- Circle drawing and tangent-point marker visibility not checked in probe (only text and point list).
