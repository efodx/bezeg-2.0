# Analytic geometry of lines: one mode-based graph, integer-grid lines, kernel in compgeo

Accepted on 2026-11-10 (F0 of the [analytic-lines spec](../specs/analytic-lines-lessons.md), stream `families-prep`). It records the spec's three ADR decisions.

## 1. One `LineGeometryGraph` with modes

One graph (`src/graphs/lines/`) has the modes `forms | normal | angle | distance | intersect` and holds one validated state. Scenes switch modes and points in one synchronous tick. Catalog placement is confirmed at F2b. The proposal is `plane-geometry`, because the family is framed as geometry of the line, not as a function graph.

Alternatives:

- One graph per lesson. Handles, kernel calls and the Preset format would be duplicated five times.
- Extend `LinearFunctionGraph`. This would change the `linear-function` route and its stored Presets, and a function graph cannot represent vertical lines, which L1 needs.

## 2. Handles on the integer grid \([-8,8]^2\)

Points are integer grid points. A line through two of them has integer \(a,b,c\). Parallel, perpendicular, same line, point on line and tangency are therefore decided exactly with `Rational` (`src/compgeo/rational.ts`). The circle of L5 is a centre plus a boundary grid point, so \(r^2\) is an integer and tangency is reachable by dragging. The keyboard step is 1.

Alternatives:

- A quarter grid scaled by 4. The arithmetic is the same and dragging is finer, but readouts get denominators that hide the structure L1 teaches (gcd-normalised coefficients). This can be revisited if dragging feels coarse, and that is not measured yet.
- Continuous handles with tolerances. "Parallel" and "tangent" would depend on \(\varepsilon\), which the [shared constraints](../specs/new-lesson-families.md#shared-constraints) forbid.

## 3. Kernel in `src/compgeo/lineForms.ts`

The kernel sits next to `Line` and `circle.ts` in the exact-arithmetic family of [ADR 0021](0021-exact-grid-predicates.md) and reuses its types. `circle.ts` is not extended, because it carries its own header contract.

Alternatives:

- A new `src/lines/` module. This separates the kernel from the `Rational` and `GridPoint` types it depends on.
- Extend `circle.ts`. This mixes two contracts in one file.

## Consequences

- Additive only. The `linear-function` route and its Presets are unchanged.
