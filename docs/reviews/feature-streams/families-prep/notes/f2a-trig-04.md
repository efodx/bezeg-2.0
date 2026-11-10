# f2a-trig-04 final evidence (unit-circle graph)

Files (uncommitted): `src/graphs/trig/UnitCircleGraph.tsx`, `UnitCircleGraph.test.tsx` (13 tests), `unit_circle_*` keys in `sl.ts`/`en.ts`, three rows in `docs/tasks/trigonometry/README.md` terms table.

Fixes this round: `handleAttributes` annotated `: JXG.PointAttributes` (this removed the TS2345/TS2740 union-overload errors); test readout selector now reads the `dd` only; test class uses `disposeNow()` (the graph's `disposeScene` is private) and typed `EventedPoint` helpers.

## Checks (observed)
- `npx tsc --noEmit --pretty false`: 0 errors outside src/random and src/kinematics (other workers' files).
- `just unit src/graphs/trig src/trig`: passed (6 files).
- `just lint src/graphs/trig`: passed. `just build`: passed (Sass deprecation warnings only). No trailing whitespace in own files.

## Mutations (each restored; file identical to the pre-mutation copy, `cmp`)
- `Math.round` -> `Math.floor` in `dragTo`: the drag snapping test failed.
- `HANDLE_TOUCH_RADIUS` 26 -> 10: the touch hit zone test failed.
- `ANGLE_STEP_DEGREES` 0.5 -> 1: the keyboard steps test failed.
- trace cosine built from `p[0]` -> sin built from `p[0]`: the unrolled traces test failed.
- skip `point.off("drag")`: the two ownership/unmount tests failed.
- skip `board.removeObject`: the ownership test failed.
- axis signs text replaced: the "na osi" test failed.

## Drag measurement
JSDOM PLACEHOLDER, not a performance result. A browser measurement per docs/performance-plan.md (Measurement protocol) is still owed when the graph gets a route (trigonometry task 06). Method: vitest/jsdom, 720 consecutive frames; each frame = `setPosition` to a point 1.3 off-circle at a new angle, then `triggerEventHandlers(['drag'])` inside `act`, timed with `performance.now()`. Not a browser or phone, no rendering. Revision 70b0484c, dirty. Toggles off: median 1.81 ms, p95 2.59 ms. All on (cosine, symmetries, addition): median 1.85 ms, p95 2.22 ms. The temporary test file was deleted.

## Open
- Not smoke-tested in a real browser (no route registered yet; registration is outside this slice).
- `trace.xs as number[]` casts readonly arrays for `board.create("curve")` (not an error silencer, but a cast).

## Review repairs (second round)
1. Curves get copies (`[...trace.xs]`); the `as unknown as` in the test is gone (`instanceof JXG.Curve`). New assertion: board arrays are not the module table. Mutation (casts restored): that test failed.
2. Drag measurement labelled a jsdom placeholder above.
3. Readout tests at 0, 90, 270, 360 degrees (table test). Mutation: axis sign table changed: failed.
4. On-graph "sin θ"/"cos θ" text objects (owned, disposed with the scene); cos label has `visible: showCosine`. Mutation (visible removed): label test failed.
5. `unit_circle_readout_sum_point` and `unit_circle_point_format` keys: sl "; ", en ", ". Mutation (en separator): language test failed.
6. Axis signs now "cos θ = 0, sin θ > 0" etc. (AXIS_SIGNS).
7. Angle readout and status as reduced multiples of pi ("π/3", "7π/4", "π/360"). The first version divided by 720 and the new tests caught it (shown "π/6" for 60°). Mutation (gcd base 720): the 2π/3 case failed.
8. Touch: JSXGraph `CoordsElement.hasPoint` (node_modules/jsxgraph/src/base/coordselement.js:96-118) uses `precision.<device>` as a screen-pixel radius (`r = max(size + strokewidth/2, prec)`), so 26 gives a 52 px diameter, above 44. Keys: `NumberInput` steps only on ArrowUp/ArrowDown (`stepKeyDelta`, `horizontal` false; ArrowLeft/Right do nothing), PageUp/PageDown too. The help text said "Puščici" without saying which, so both languages now say up and down arrows.
Checks after repairs: tsc 0 errors (outside src/random, src/kinematics), `just unit src/graphs/trig src/trig`, `just lint src/graphs/trig`, `just build` passed, no trailing whitespace.
