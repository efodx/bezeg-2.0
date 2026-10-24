# Task 03 part (b): smoke spec changes (proposed, not applied)

File: `tests/guided-lessons.smoke.spec.cjs`. Step counts, titles, frame counts, scene action values (pieces 3,3,4,6,12; weights per step; exit steps) are unchanged for all five rows, so the existing assertions stay valid. Only the items below need a decision.

## `rationalElevation` (line 107): unchanged
Title and 5 steps unchanged; prose changed only (worked example, check, step 3). No assertion touches prose. Optional: none.

## `rationalSubdivision` (line 287): unchanged
Prose only (steps 2 and 3). Weights/point counts per step identical.

## `rationalExtrapolation` (line 371): comment fix, optional strengthening
Steps 3 and 4 are now fixture scenes (same points `(-4,-3),(-3,3),(3,3),(4,-1)` and weights `(1,2,1,1)`) with widened starting views `[-7,8,17,-6]` and `[-34,9,6,-6]`. Step 4 title changed to "Advanced: a negative weight, yet no pole" (not pinned). Weights and point positions asserted in `stepProbe` are unchanged and still hold.

Old (line 389):
```js
        // The third control point (negative weight) lies at (-29.5, 6), outside the default view; the lesson says so and points to Zoom out.
        if (step === 4) { await expectPointNear(page, [-2.8, 4.2]); await expectPointNear(page, [-29.5, 6]); }
```
New (comment is stale: the lesson no longer mentions Zoom out, the view includes the point):
```js
        // The third control point (negative weight) lies at (-29.5, 6); the scene's starting view [-34, 9, 6, -6] includes it.
        if (step === 4) { await expectPointNear(page, [-2.8, 4.2]); await expectPointNear(page, [-29.5, 6]); }
```
Line 388 (step 3 `[13.54, 2.54]`) is unchanged; that point is now inside the view `[-7,8,17,-6]`.

Optional additional assertions (not required): in `stepProbe`, for steps 3 and 4 check the board bounding box equals the scene view (`[-7,8,17,-6]`, `[-34,9,6,-6]`) via the board's `getBoundingBox()`; and after exit (`assertUserState`) that the user's view is restored (existing row only checks slider, weight labels, point count).

## `farin` (line 489): unchanged
Scenes unchanged (weights `(1,2,1,1)`x3, `(1,3,9,27)`, `(1,1,1,1)`); changes are prose in steps 3 and 5.

## `circle` (line 530): optional strengthening
Steps 1 and 2 (n=3) now start with view `[-7,8,7,-5]`; steps 3-5 set no view. `stepProbe` (pieces `[3,3,4,6,12]`, 3 curves, `3*pieces` points) still holds. Optional add to `stepProbe` for steps 1 and 2 (apex `(0,6)` and middle points `(+-5.196,-3)` visible):
```js
        if (step <= 2) { await expectPointNear(page, [0, 6]); await expectPointNear(page, [5.196, -3]); }
```
(same helper as `rationalExtrapolation`; verify it accepts these points when the lesson view is applied).
