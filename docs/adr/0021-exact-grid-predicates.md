# Exact predicates on integer grid points for computational geometry

Status: accepted, 2026-10-31 (geometry stream handler, under the owner's 2026-10-31 authorization of the family). Source: [convexity and hulls, robustness policy](../specs/convexity-hulls-lessons.md#1-predicate-module-and-robustness-policy).

The computational-geometry core (`src/compgeo/`) decides every discrete outcome (orientation, segment intersection, point on segment, simplicity, later incircle and event order) with exact arithmetic on integer grid coordinates. Dragged points snap to the grid, so a predicate never sees a coordinate it cannot evaluate exactly. The convexity, triangulation, sweep and triangle-geometry families share this policy.

## Context

Hull, triangulation and sweep algorithms branch on the sign of small determinants. With doubles, near-degenerate inputs give wrong signs and the algorithms produce non-convex hulls or crash (Kettner et al. 2008). Bezeg's shared constraint says a discrete outcome must never silently rely on a tolerance, and lessons must not present a tolerance as exact. Pick's theorem (A2) needs lattice points anyway.

## Decision

- **Grid points.** `GridPoint = {x, y}` holds safe integers with \(|x|,|y|\le 2^{25}\) (`GRID_COORD_LIMIT`). A graph maps grid units to the board with a scale that is a power of two (default \(1\)); predicates see grid units only.
- **`orient` in plain doubles.** Coordinate differences are at most \(2^{26}\), each product at most \(2^{52}\), and their difference at most \(2^{53}\), so every intermediate value is an exactly representable integer. `orient` returns the sign; `orientValue` returns the exact determinant for display.
- **Rejection, not approximation.** Every predicate validates its inputs and throws on a non-integer or out-of-range coordinate. Preset import rejects such data with an actionable message before it reaches a predicate.
- **Per-predicate bounds.** Each predicate documents its own exactness bound because the polynomial degree differs. The reserved `incircle` (degree four, triangulation family) is exact in doubles for \(|c|\le 2^{11}\) and switches to `BigInt` above it. Derived points such as segment intersections are `BigInt` rationals, never doubles that are later compared (the sweep family records its rational ADR on top of this one).
- **Inexact mode for teaching only.** Lesson A5 shows the double-precision failure on Kettner's off-grid inputs \(p=(0.5+i\,2^{-53},\,0.5+j\,2^{-53})\). That computation lives in a separate, clearly named function (`orientNaiveDouble`) whose result is labelled inexact wherever it appears. Its reference is exact rational arithmetic on the same dyadic inputs (scaled by \(2^{53}\) to `BigInt`). No other code path uses it, and no graph mode lets free double points feed an algorithm.

## Alternatives

- **Shewchuk-style adaptive predicates on arbitrary doubles.** Exact for every double a drag can produce and no grid constraint. It means porting and verifying several hundred lines of expansion arithmetic per predicate (longer for incircle), and it is hard to explain to learners. The lessons gain nothing from off-grid points except A5's demonstration, which works without it.
- **Floating tolerance (\(|\det|<\varepsilon\) means collinear).** Smallest code, but it still gives wrong answers near the threshold and would present a tolerance as exact, which the shared constraints forbid.
- **`BigInt` everywhere.** Exact without a range bound, but slower on every drag and noisier to write; plain doubles already are exact inside the range the boards use.

## Consequences

- Learners cannot place a point between grid nodes. The grid step is a graph parameter, so a lesson that needs finer placement uses a smaller power-of-two step.
- The \(2^{25}\) bound is far above any board range, so it only matters for imported data, which is validated.
- Tests compare every predicate with a `BigInt` reference over grid sweeps and at the bound.
- A future need for free placement would revisit this ADR with the Shewchuk option, not add a tolerance.
