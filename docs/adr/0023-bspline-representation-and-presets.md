# 0023 B-spline representation, conventions and Preset format

Status: accepted, 2026-10-31. Context: [B-splines and NURBS lessons](../specs/b-splines-nurbs-lessons.md#implementation-decisions), [tasks](../tasks/b-splines-nurbs/README.md).

## Context

The B-spline lessons need a curve whose state is control points plus a user-editable knot vector plus optional weights. `PolynomialBezierCurve` and `GenericBezierSpline` hold points with derived knots and cannot represent a clamped B-spline with arbitrary multiplicities. Lessons quote numbers on the raw knot parameter, and the interpolation family needs the unclamped uniform quadratic case.

## Decision

1. **Representation.** A new `BSplineCurve` class beside `PolynomialBezierCurve`, holding points, knots and optional weights, delegating all mathematics to the pure kernel in `src/bezeg/impl/curve/bspline/`.
2. **Conventions.** Degree \(k\) (not order), matching the Bézier code. Clamped knot vectors (end multiplicity \(k+1\)) by default; unclamped and uniform vectors are allowed. Parameters are raw knot values; a display toggle shows the domain rescaled to \([0,1]\).
3. **Presets.** A new preset collection key with DTO `{degree, knots, points, weights?}`, checked on import by `validateKnotVector` and weight positivity through `PresetCollection.check` ([ADR 0016](0016-preset-collections-owned-by-graph-families.md) pattern). Rejections name the reason (wrong length, decreasing knots, multiplicity too high, empty domain, non-finite value, nonpositive weight) in both languages.

## Alternatives

- **(a2) Extend `RationalBezierCurve` with a knot field.** Reuses weight handling but entangles Bézier and B-spline evaluation in one class used by existing routes.
- **(a3) Only extracted Bézier pieces inside `BezierSpline`.** No new class, but knot editing and basis plots become impossible.
- **(b) Order instead of degree; unclamped default; normalized parameter.** Order disagrees with every existing Bézier API; an unclamped default does not interpolate the end points students expect; a normalized parameter changes the quoted lesson numbers.
- **(c2) Store extracted pieces.** Always valid, but loses the knots the Preset is meant to keep. **(c3) Store normalized knots only.** Cannot express a vector whose raw domain matters to the lesson.

## Consequences

- Existing routes, classes and stored Presets are unchanged; the new collection key is additive.
- The kernel works on plain `number[]` rows of any equal length, so a later 3D view needs no kernel change.
- The interpolation family imports `uniformQuadraticSegment` and `chaikinStep` from this kernel instead of reimplementing them.
