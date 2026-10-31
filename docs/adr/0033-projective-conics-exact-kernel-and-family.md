# Projective conics: an exact BigInt kernel, pencil-parameter dragging, pencil sampling and a Projective family

Accepted on 2026-10-31 (F0 of the [projective conics spec](../specs/projective-conics-lessons.md), stream `functions`). This ADR records the spec's five *Decisions needing an ADR*.

## 1. Exactness: BigInt homogeneous coordinates

`src/projective/homogeneous.ts` stores a point or a line as `readonly [bigint, bigint, bigint]`, normalized by the gcd with a fixed sign. Every discrete outcome is decided in integers: collinear, concurrent, equal, ideal, on/inside/outside a conic, degenerate, and conic type. Doubles appear only after a decision, for drawing and readouts. A readout that is computed in doubles (for example irrational tangency points in K3) says "numerical" and gives its tolerance.

Alternatives:

- **Doubles with a stated relative tolerance.** The five-point cofactors have degree ten in the coordinates. For a \(\tfrac14\) grid over \(\pm1024\) they reach about \(2^{127}\), far beyond \(2^{53}\). Doubles therefore cannot decide "degenerate" or "exactly collinear", and K2 would present a tolerance as exact.
- **Rational `Fraction` objects.** These are exact, but every operation pays for a gcd and an allocation. Homogeneous integer rows avoid denominators altogether, and the existing rational Bézier kernels already use homogeneous rows (`toHomogeneous`).

Inputs are grid points with integer or quarter-unit coordinates (scaled to integers) or rational points produced by the kernel itself. Non-integer input is rejected with a `RangeError`, as in the grid predicates (ADR 0021).

## 2. Dragging a point along a conic: an exact pencil parameter

A draggable conic point is the second intersection of the conic with the line through a fixed base point \(Q_0\) of the conic, with an integer direction \((p,q)\) taken from a fixed table. For a conic with integer coefficients and a rational \(Q_0\), that second point is rational, so Pascal collinearity (K2) is decided exactly for every table position. The direction tangent at \(Q_0\) returns \(Q_0\) itself. Keyboard users step the table index. Touch and pointer drags pick the nearest table entry to the pointer. Presets store the index.

The table size (the spec suggests 256 directions with \(|p|,|q|\le64\)) is fixed by the drag measurement in the Batch A graph slice, not here.

Alternatives:

- **Snap the pointer to the nearest conic point in doubles.** The point lies on the conic only to rounding, so Pascal could only be a tolerance.
- **A conic-specific rational parameter** (for example \(t\mapsto(\tfrac{1-t^2}{1+t^2},\tfrac{2t}{1+t^2})\)). This needs a separate formula and a degenerate-case tree per conic type, and vertical directions need special handling. The pencil gives one formula for every nondegenerate conic.

## 3. Drawing a general conic: sample the same pencil

The sampler walks the pencil through \(Q_0\) in doubles. It breaks the curve where the direction is parallel to an asymptote (the point at infinity) and never joins two hyperbola branches. The single rational quadratic arc in K4 uses the existing rational Bézier curve, built from the derived control point and weight. The new kernel only derives the control point and weight. It does not replace the evaluator, because `rational-bezier-curve.ts` documents a behaviour change at zero intermediate weights.

The family 2 sampler `src/analysis/conic.ts` (focus–directrix, axis-aligned, polar form) stays separate. The projective sampler may reuse it for axis-aligned cases. Neither module depends on the other.

Alternatives:

- **Canonical form by eigen-decomposition.** This needs floating eigenvalues and a tree of degenerate cases.
- **Split every conic into rational quadratic Bézier arcs.** This needs a split strategy at infinite points, and that is exactly what K4 teaches as a limitation.

The sample density is chosen after the drag measurement in the [performance plan](../performance-plan.md).

## 4. A new Projective family

The five Demonstrations form a new family at `/bezeg-2.0/projective/…`, each with its own Preset collection definition (ADR 0016) in a new family module. The Learn chapter is *Projektivna geometrija stožnic / Projective geometry of conics*. K4 links to the existing `rational` and `farin` Demonstrations and only reads from the rational curve classes.

Alternative: place the Demonstrations under the rational family. Only K4 touches rational curves. K1–K3 and K5 would then sit under a heading whose subject they do not share.

## 5. Relation to the grid predicates (ADR 0021)

`src/compgeo/predicates.ts` has landed. Its `orient` is exact in doubles for grid points with \(|c|\le2^{25}\). `homogeneous.ts` does not change it and does not import it. A cross-test asserts that the sign of `det3` with \(w=1\) equals `orient` on sampled grid points. Both modules follow one policy: ADR 0021's rule that a tolerance is never presented as exact, extended here to BigInt. There is no second policy document.

Alternative: make `orient` a call into `det3`. This would edit the Geometry stream's module and slow a degree-two predicate down to BigInt, for no gain in exactness on its domain.

## Consequences

- New folder `src/projective/`, free of React, JSXGraph and localization.
- Routes, Preset collections and stored Presets are additive. Existing rational Demonstrations, routes and Presets are unchanged.
- BigInt arithmetic runs during drags. The Batch A graph slice measures the drag cost before fixing the table size and sample density.
- Presets store grid points, table indices and a closed example id, validated on import.
