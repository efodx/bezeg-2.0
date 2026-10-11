# PH arc length readout and degree-elevation overlay

Source: the first two items of [TODO.md](../../TODO.md) ("Mathematical and teaching features").

## Educational goals

1. **PH arc length.** Students should see the defining property of Pythagorean-hodograph curves: the speed σ(t) = |r'(t)| is a polynomial, so the arc length s(1) = ∫₀¹ σ(t) dt is an exact polynomial value. The guided lessons already state this (`src/learning/content/guidedLessons.ts`); the graphs should show the number and let students watch it change as they drag the hodograph points.
2. **Elevated points on the original polygon.** Degree elevation produces `P'_i = (i/(n+1)) P_{i-1} + (1 - i/(n+1)) P_i` for i = 1..n, with `P'_0 = P_0` and `P'_{n+1} = P_n`. Each new point lies on the edge `P_{i-1}P_i`. Before pressing "Dvigni stopnjo", students should see where the new control points will appear on the current control polygon.

## Scope

### 1. PH arc length (`/ph/cubic`, `/ph/quintic` — `BasePhBezierCurveGraph`)

- Use the existing `PhBezierCurve.s(t)`; the total length is `s(1)`. Do not approximate numerically in the app.
- Show a live board text with the arc length (localized `arc_length_value`, 3 decimals, decimal comma in Slovenian / point in English). It updates while dragging the start point, hodograph points `w_i`, and after rotate/scale.
- Add an `OnOffSwitch` (`show_arc_length`) in the PH inspector display group with the description `arc_length_description`. Default: on.
- The text is an auxiliary board object owned by the graph; it is removed with the board/session (no leaks across figure/scene resets).

### 2. Elevation overlay (`/bezier/elevation` — `ElevationGraph`)

- Add an `OnOffSwitch` (`show_elevated_points_on_control_polygon`) in the elevation graph's inspector, description `elevated_points_description`. Default: on.
- When on: show the original control polygon and the n+2 elevated points in a distinct colour, with their (elevated) polygon drawn dashed. Points are live: they follow dragging of the original control points (computed from the current points every update, not a snapshot).
- After "Dvigni stopnjo" the overlay rebuilds for the new degree (the new control points become the original polygon and the next elevation is previewed).
- When off, all overlay objects are removed or hidden.
- Fix `AbstractJXGBezierCurve.showElevatePoints/hideElevatePoints` (live points, clear the array on hide, idempotent show) and reuse it for the overlay, so the existing hover preview in `BezierCurveCommands` benefits too.

## Out of scope

Rational elevation (`RationalElevationGraph`), arc-length parametrisation drawing, any stored-preset format change (no breaking change: routes and presets unchanged; the overlay toggles are runtime state only).

## Acceptance criteria

- Unit test: for the cubic and quintic default PH presets, `s(1)` matches Simpson/Gauss numerical integration of |r'(t)| (from `eval` derivatives or the control-point hodograph) to ≤1e-6, and `s` is monotone with `s(0) = 0`.
- Unit test: every elevated interior point lies on segment `P_{i-1}P_i` (collinearity residual ≤1e-10 and parameter in [0,1]) for a representative cubic, and the elevated curve evaluates equal to the original.
- The arc-length readout and elevation overlay follow dragging in the browser.
- `npx tsc --noEmit --pretty false`, `npm test -- --watchAll=false`, and `npm run build` pass. Browser smoke checks per [smoke-tests.md](../smoke-tests.md) for the two routes.
