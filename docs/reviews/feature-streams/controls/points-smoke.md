# Shared point controls: browser smoke (controls task 2)

Target: http://127.0.0.1:4327/bezeg-2.0, production preview of the clean build in `.claude/worktrees/agent-a18d8a9709fec93af` (HEAD 9fd0790b, build reused). Chromium via Playwright, 1280x800 desktop, 390x844 and 310x844 touch (`hasTouch`, coarse pointer true). Scripts in the worker's temp dir. Baseline comparison on another build was not done, so failures are not attributed to task 2.

## Failures

1. **PH hodograph (`/ph/cubic`): a typed w edit leaves the list field stale.** Steps: select Curve1; type -3 in w0 x, Enter (also tried Tab, waits to 1.5 s). Expected: the field keeps -3. Observed: the hodograph board point moves to (-3.00, -1.70) and the curve control points change, but the field shows -3.5 again. Same for w1 x = -1 (field stayed -1.707). Clear selection and reselect shows -1. A board drag of w1 updates the list correctly (-1.707, 1.105). The typed refit works (see passes).
2. **Per-row remove drops focus to `body` in the curve workspace (`/bezier/curve`).** Steps: select Curve1, click or press Enter on "Remove p1" (also the last row). Expected: focus on a remove button or the collection. Observed: `document.activeElement` is BODY after each remove, with 4, 3 and 2 rows left.
3. **Same on PointSet segments and intervals (`/compgeo/segment-intersections`, `/compgeo/interval-sweep`).** Click the last row's remove "x": focus goes to BODY (the open item about their own add/remove buttons). PointSet points and polygon modes use Remove selected: focus stays on that button, passes.
4. Minor, PointSet new-point field: typing 3.5 (grid step 1) and pressing Tab clears the field and shows "Enter a value between -33554432 and 33554432." with `aria-invalid` true. The hint does not say whole numbers (the page says "Grid step: 1. Coordinates are whole numbers of steps."). Enter keeps 3.5 in the field.

## Observations (not judged)

- With a curve selected in the curve workspace, dragging a control point (p1, p2) moved the whole curve: all four points changed. Unselected, a drag moves only that point and the list shows it after selecting. Unknown whether this is the intended select-curve behaviour.
- In the Hermite lesson `hermite-locality-six` the board view never changed at 1440x900, 1280x800 or 1100x700 (-4.65,4.7,9.65,-4.2 at 1280). The lesson starts wide enough that the second add stays inside. The refit exists on the page: zoomed in three times (view -1.16..6.16), count + keeps the view on add 1 and refits on add 2 (-3.89,5.6,10.89,-3.6). Only the unit test (`interpolationLessonViews.test.ts`, start box [-1.95,5.45,6.95,-4.95]) exercises the refit as lesson text states.

## Passes

- PointSet points (`/compgeo/convex-hull`, sl and en): Add point 9 to 10, select P1 `aria-pressed` true, Remove selected 10 to 9, typed add (7, -6) appends a row, count line "Points: N of at most 40", fill to 40, typed add at the limit: reason "The maximum number of points (40) is reached. Remove a point before adding another." shown, Add stays `aria-disabled`, typed values 3 and 4 kept. Clear all gives 0.
- PointSet polygon (`/compgeo/point-in-polygon`, `/compgeo/ear-clipping`): same checks pass; mode toggle Points/Polygon, status "The polyline is simple.", closed checkbox present.
- PointSet segments (12 limit) and intervals (10 limit): add, per-field Enter and Tab commit, count line, refusal notice "The maximum number of segments (12) is reached...", reason shown in one status region.
- Interpolation and Hermite (`/interpolation/lagrange`, `/interpolation/hermite`, sl and en): count +/- 4 to 5 to 6, max 12 gives "The maximum number of points (12) is reached...", min gives "At least 2.". Per-field typed edit commits on Enter and on blur. A typed y=40 refits the view; typing y=1 afterwards leaves the view. Adds inside the view leave it unchanged; adds outside refit (zoomed-in check, both graphs). No typed add exists on these two graphs (count setter only).
- Lesson `interp-fifth-point-added`: walked interp-lagrange; frames with 5 points keep the view (-3.57,4.8,7.57,-1.8 throughout).
- Curve workspace: list edit x1 = -2 moves the board point; board drag of p1 updates the list; per-row remove at 1 point gives "At least 1." (title and status); Delete point mode on the last point (via the collapsed "Editing mode" panel) shows "At least 1."; Reset (Save tab) clears it ("No curve selected."). Typed y=60 refits the board (-62.86,67.35,61.72,-10.22).
- PH: typed w0 y = 30 refits only the hodograph board (jxgBoard8987049 to -6,18.5,6,6.5), curve board unchanged; PH has no remove/count controls.
- Keyboard (sl): Tab order Add > Remove selected > Clear > Add by tapping > x > y > Add at coordinates > Izberi: P1 > x > y > Izberi: P2 ...; toggles named "Izberi: P1", "Izberi daljico s1". Focus after Remove selected stays on that button.
- Touch 390x844: no control under 44 px high or wide in PointSet, Hermite, bezier and PH; no horizontal overflow. At 310 px the row (256 wide) wraps y to a second line, no overflow, 44+ px targets.
- Both languages: sl and en strings render for the above; no key placeholders seen.
- Console: no console errors or page errors in any run (apart from one 404 from a mistyped route of the worker).

## Not covered

- `just smoke-lesson interp-fifth-point-added hermite-locality-six` cannot run: the ids are scene ids, not LESSON_SPEC rows (the recipe rejected them); the rows `interp-lagrange interp-hermite` failed because Playwright refused the occupied port 4327. Lessons were walked by hand instead.
- 3-axis rows at 310 px: no shipped route reached (rational/base has no point list); only 2-axis rows checked.
- Large text (200%), forced colors, screen reader announcement of the two PointSet status regions, focus after a board count change, typed add via Enter in Interpolation/Hermite (none exists), PointSet segments/intervals typed add, English touch layout.
