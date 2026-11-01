# Build Bezier splines from a scheme, not a class hierarchy

Accepted on 2026-10-14. `BezierSpline` is a concrete class that takes a `SplineScheme`; `C1QuadraticBezierSpline`, `C2CubicBezierSpline`, `G1QuadraticBezierSpline`, `G1SymmetricQuadraticBezierSpline` and `GenericBezierSpline` are that class with one scheme each. Evaluation, per-version knot caching, point add/remove, bounding box and the editable parameters `alpha` and `b` live once in the base. A scheme says only what is specific to a spline kind: how the Bezier spans and computed control points follow from the free points, which span ends define the knots, whether `getPoints()` includes the computed points, and the initial values of the editable per-join parameters. See `src/bezeg/impl/curve/spline-scheme.ts`.

Before this change each spline kind subclassed an abstract `BezierSpline` and overrode `generateBezierCurves()` and `getU()`. The five subclasses repeated the same wiring and knot code, and a computed point was written as two near-identical X and Y closures.

The alternatives were these:

- Keep the subclass hierarchy and share code through helper functions. This was the first step (`chordKnots`, `blendPoints`, `PointImpl.derived`), and it removed most duplication, but each kind still had to reimplement span wiring and override two template methods.
- Express every spline as a generic degree-n, continuity-c spline (`GenericBezierSpline`). C1 quadratic and C2 cubic are special cases, but their free points are different control points (de Boor-style rather than Bezier points) and the user-visible polygons, lessons and presets depend on that, so a single generic scheme would change the interface the app teaches.
- Describe splines as data (knot rules plus weight tables) with no code per kind. The join weights depend on the live knot vector and on editable parameters, so this needs an expression language for little gain over a function per scheme.

Consequences:

- A new spline kind is one scheme plus a three-line class; the contract is exercised by `spline-scheme.test.ts` with a custom scheme.
- Public classes, constructors, getters and the JSXGraph adapters are unchanged. `protected getU()` stays on the base, now derived from `scheme.knotSpans`. Stored presets and routes are unchanged.
- `eval` selects the span by binary search over the knot vector instead of a linear scan; results are identical.
- The previous implementation and this one were compared numerically over random configurations, alphas, parameters and moves (knots, computed points, bounding box, samples including parameters outside [0, 1]) before the old code was removed.
- `GenericBezierSpline` has no separate `degree` and `continuity` setters any more (amended 2026-11-01). `change({degree, continuity})` validates the completed target (`0 <= continuity < degree`, whole numbers, and a degree no higher than the number of free points minus one, where the spline is a single Bezier piece of that degree) and regenerates the spans and computed points once, so an intermediate pair that is invalid on its own never exists. `restore(degree, continuity)` is the unlimited path for stored Presets and files, which may hold a degree above that limit. The JSXGraph adapter redraws the computed points and labels once per completed change.
