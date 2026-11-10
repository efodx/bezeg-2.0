# f2a-lines-02 final evidence (line graph, analytic-lines task 02)

Files (uncommitted): `src/graphs/lines/lineGeometryModel.ts` (+ test, 52 tests), `LineGeometryGraph.tsx`, `LineGeometryGraph.test.tsx` (19 tests), one `line_geometry_*` block (about 75 keys) after `linear_degenerate_note` in `sl.ts` and `en.ts` (lockstep), four term rows in `docs/tasks/analytic-lines/README.md`.

Fixes this round: the `as typeof pair` cast in `buildView` is gone (the two circle points are destructured and each checked); `LineGeometryDerived` is used by `View`, so the import stays. Test fixes found by the first run: the graph owns 7 listener removers (one per handle, each taking off drag, over and out), and `curve.X(t)` needs `suspendUpdate`.

## Checks (observed)
- `npx tsc --noEmit --pretty false`: 0 errors (the earlier compgeo error was gone by the last run).
- `just unit src/graphs/lines src/compgeo/lineForms`: passed (3 files, graph 19 + model 52 + lineForms).
- `just lint src/graphs/lines`: passed. `just build`: passed (run before the one-line test-only `arc.X(s, true)` fix). No trailing whitespace in own files (Grep ` +\r?$`: none), no CR in the edited files.

## Hand oracles in the graph test (spec numbers)
Forms x - 2y = -4 (all rows); normal: arrow from (1, 2.5) along (1, -2)/sqrt5, length 3, a1b2 - a2b1 = 5, dot 0, parallel and "neither" (5 and 5) cases; angle 45 degrees between x - 2y = -4 and y = 3x, arc radius 3 about (4/5, 12/5) spanning 45 degrees; distance foot (4/5, 12/5), d^2 = 121/5, d = 4,9193, right-angle legs orthogonal; intersect (4/5, 12/5), parallel, same; circle tangent (0, 2), two points (2, 2) and (-1, -1), none; off-view crossing (-24, -23); worst-case foot (-15.5, 0.5) for P(-8,-7) Q(-7,-8) T(-8,8) lies in the view (the earlier note's tuple was wrong).

## Mutations (each restored; `cmp` identical to the backup; `sl.ts` was reverted by the inverse `sed`, not a whole-file restore, because another worker edits it)
- `NORMAL_ARROW_LENGTH` 3 -> 2: normal test failed. `ARC_RADIUS` 3 -> 2: angle test failed.
- foot x + 1: distance test and view test failed. Line through P and R instead of P and Q: forms test failed.
- skip `this.listeners.push`: three ownership tests failed. Skip `board.removeObject`: ownership test failed.
- `HANDLE_TOUCH_RADIUS` 26 -> 10: touch test failed. `VIEW_HALF` 17 -> 12: off-view test failed.
- drop `describedBy`: help test failed. Tangent point name "X" -> "Y": circle test failed.
- first-pair coincident status removed: coincident test failed. sl point format "; " -> ", ": normal and angle tests failed.

## Drag measurement
JSDOM PLACEHOLDER, not a performance result. A browser measurement per docs/performance-plan.md is owed when the graph gets a route. Method: vitest/jsdom, 720 frames in angle mode, each frame `setPosition` of P on a circle of radius 7.4 then `triggerEventHandlers(['drag'])` in `act` plus `board.update()`, timed with `performance.now()`. Machine heavily loaded by parallel runs. Result: median 11.4 ms, p95 17.0 ms. Temporary test file deleted.

## Open
- Not smoke-tested in a real browser (no route registered; registration is outside this slice).
- Status text for the sl strings was written without a second reader; the terms are in the README table.

## Doubts
- Intersection points, circle points and the angle arc anchor outside `[-17,17]^2` (nearly parallel lines, circle radius up to 22.6) are not drawn; the status says so (`status_off_view`, `status_arc_off_view`). Alternative: a dynamic view; left for the reviewer.
- The normal arrow has a fixed drawn length (3); only its direction is exact. The readouts carry the exact (a, b).
- The second line is given by two points R, S (the spec allows a point and a direction or a second pair).
- `viewCache` is keyed by the state string; it is a cache of derived values, not a mirror of the state.

## Review repairs

1. `view()` caches on `this.state` identity (LineGeometryGraph.tsx `view()`); `stateKey` stays for `drawnKey`. JSDOM PLACEHOLDER, not a performance result (720 frames, each moving P to a different grid point through the drag handler, no extra board.update; 720/720 frames changed state): before (string key) median 2.63 ms, p95 4.07 ms; after (identity) median 2.62 ms, p95 4.30 ms. No measurable jsdom difference; a browser measurement is still owed. Temporary test deleted.
2. F to T segment captioned "PTₙ"; readout "Pravokotna projekcija PT na normalo (PTₙ)"; "d ≈" kept.
3. Normal mode now draws both arrows, captioned n₁ and n₂; readouts "Normalni vektor n₁/n₂ ...".
4. Row "s" labelled `line_geometry_row_s`.
5. Key help and typographic minus in the range text, both languages.
6. Readouts gain "(ℓ)" and "(m)".
7. "naklon" replaced by "smerni koeficient" in the block; tangent row key renamed `line_geometry_row_tangent_point` ("Dotikališče" / "Point of tangency"); "Presečišče 1/2" kept for two.
Mutation checks (caption n₁/n₂, PTₙ, Dotikališče, key help) failed 4 tests, then restored and cmp'd.
