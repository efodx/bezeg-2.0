# F3 view item: lines and isometries (worker note)

- Lines: VIEW_HALF 17 -> 10 (LineGeometryGraph.tsx:39); spec bullet and test (`toBe(10)`) updated. A foot beyond the view is not guarded by `inView` (only intersections, tangent points); it just falls off the board, and no status mentions it. Spec text states this.
- Isometries: INITIAL_VIEW_HALF = 10 for the opening board; VIEW_HALF = 20 kept as model bound (reasons and rejected option in the spec "F3 decisions" and the task file). Mirror lines and frieze base line reach 2*VIEW_HALF.
- Mirror captions stacked left of the handle (IsometryGraph.tsx, `label(..., lift, shift)`).
- Remaining: at 390 px captions "zrcalo 1/središče" and "slika 2/lik" still touch (text is large against 16 px per unit); at 1280 px only "središče"/"lik" touch.
- Observed failure before the isometry change: view test failed (INITIAL_VIEW_HALF undefined, NaN). Lines test failure before not observed (source and test edited together).
- Logs: .command-logs/f3-view-*.log; shots in .command-logs/f3-view-shots/.

## Fix pass
- Lines: a foot beyond the view is not drawn (marker, drop segment, right angle, distance labels); status adds `line_geometry_status_foot_off_view` (sl "Nožišče zunaj prikaza ni narisano.", en added; next to the arc key). New test with foot (-15.5, 0.5); the old worst-case-foot test was adapted (it asserted the foot was drawn). Failing-before for the new test not run on old code.
- Isometries captions: font 12 instead of 15 when the board has under 20 px per unit (read at build time, not on resize), vertical gaps of one text line in px (`lineGap`), mirror captions left of the handle by text width, motif caption 1.6 lines lower. Test at 12 px per unit failed before ("lik / središče" overlap, observed with the old constants).
- 390 px screenshot: only a slight touch of "zrcalo 1" and "središče" remains; 1280 px clean.
