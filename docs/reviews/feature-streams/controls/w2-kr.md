# Wave 2 curves review (K1, K2, K4): findings

Sonnet reviewer, read-only, 2026-11-09; recorded by the handler from its return. Checks run: `just typecheck`, `just unit` on bspline, CountSetter, base/controls (passed). No lint, no browser.

1. **Medium.** `RationalBezierCurveControls.tsx:37-45`: the weight − has no `min`, so − at w = 0.25 sets w = 0 and then negative; the curve model does not guard (`JXGRationalBezierCurve.ts:362-366`, `rational-bezier-curve.ts:51`). Only the typed field refuses w ≤ 0. Expected: − is unavailable at w ≤ 0.25 with the positive-weight reason. Pre-existing, but the brief requires the refusal.
2. **Medium.** `BaseCurveGraph.tsx:219-226`: with no selection the typed list shows `jxgCurves[0]` and its title (`point_coordinates_keyboard_editing`) names no curve; on multi-curve boards the user cannot tell which curve is listed. Expected: the curve number in the title, as the structured branch's selection status.
3. **Medium.** `typedPointPaths.test.tsx:23-48`: checks only that p₀.x reaches the model and the drawn point; not spline junction recompute, kept rational weights, refit only outside the view (decision 6), readouts. `act(() => undefined)` at :34 does nothing. Skipping `afterTypedPointEdit` or `boardUpdate` would pass.
4. **Low–medium.** Blossom: the host Reset is untested since the test calls `resetToDefaults()`; add a host-Reset (`defaultPreset`/`importPresetData`) case. The lesson's "Gumb »Ponastavi«" matches the host label.
5. **Low.** `BSplineInsertionGraph.tsx:185`, `bsplineInsertionModel.ts:50-63`: numbers formatted at refusal time; a language switch keeps the old separator until the next accepted edit.
6. **Low.** `BSplineNurbsGraph.tsx:304-310`: the model's weight ≤ 0 refusal shows only as the field hint (deviation from decision 14, consistent with the rational weight). Accept and record.
7. **Low.** `BSplineBasisGraph.tsx:175-176`: `knotProblem` refusal is cleared only by knot edits; probably unreachable because imports reject invalid knots. No test.
8. **Low.** K2's new wiring tests are not mutation-verified (they would fail pre-change, replacing a select and an absent list).

Cleared: `CountSetter` defaults unchanged; spline `typedPointsOf` free points only; `CurvePointControls` listener cleanup; one channel each on Insertion, Nurbs, Basis; degree ranges match; `bsp_degree_needs_points` stated; mode group keeps `aria-pressed`; hint matches code (`AbstractJXGPointControlledCurve.ts:321`); shared "Reset example" quoted by lessons; `uncaughtSteppers` only in docs.
