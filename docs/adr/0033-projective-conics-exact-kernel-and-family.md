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

## Measurement addendum (2026-10-31, slice 05d)

Sections 2 and 3 left the direction table size and the sample density to a drag measurement. Both are now fixed. Numbers come from `just projective-conic-bench` ([scripts/projective-conic-benchmark](../../scripts/projective-conic-benchmark/README.md)), run with Node 24.21 on a Ryzen 5 3600 under Windows 11. They cover the K2 and K3 views (24 by 21 units).

**Scope: math path only.** There is no route until slice 06, so this is a Node measurement of the work a drag or conic switch triggers. It does not cover browser frames, JSXGraph/SVG updates or touch. The graphs cache each conic's polyline, so sampling runs on mount and on a conic switch, never during a drag. Slice 06 must measure browser frames on the route (K2 handle drag on each conic, K3 P drag, conic switch) and record them here.

| Interaction (density 360, bound 14) | Median / p95 |
| --- | --- |
| K2 handle drag move (`dragHandle` + `evaluatePascal`) | 0.015–0.019 / ≤ 0.04 ms |
| K3 P drag move (`moveP` + `evaluatePolePolar`) | 0.010–0.014 / ≤ 0.04 ms |
| Conic switch, sampling included (K2, K3) | ≤ 0.45 / ≤ 0.9 ms |
| K2 conic switch with cold reachable lists (six handles) | 2.2–3.9 / ≤ 8 ms |

**Sample density: 360 (was 720).** The largest deviation of a polyline segment midpoint from the conic is 0.025 px at 1920 px for every K2/K3 conic (0.10 px at density 180, 0.006 px at 720). Sampling costs at most 0.5 ms at any density from 180 to 1440. The deciding cost is therefore the vertex count, which JSXGraph redraws on every board update during a drag: 361 instead of 721 for an ellipse, 346 instead of 592 for the hyperbola. A board that zooms in, or an export rendered above about 4000 px, would need resampling for its view. Neither exists yet.

**Direction bound: 14 (unchanged; 256 directions, the spec's suggested size).**

| Bound | Table | Median handle step at 1000 px (ellipse / parabola / hyperbola) | Largest adjacent step | Reachable per handle | Cold six-handle lists |
| --- | --- | --- | --- | --- | --- |
| 10 | 128 | 5.9 / 7.4 / 13.8 px | 112 px | 89–128 | ≈ 2 ms |
| 14 | 256 | 2.9 / 3.8 / 6.5 px | 82 px | 177–256 | 3–4 ms |
| 20 | 512 | 1.5 / 1.8 / 3.1 px | 73 px | 353–512 | 5–7 ms |
| 32 | 1296 | 0.6 / 0.7 / 1.2 px | 43 px | 891–1296 | 14–18 ms |

At 14 a drag already moves a handle in steps of a few pixels. A larger bound reduces the largest step only slowly (82 px at 14, 73 px at 20), while it doubles or more the keyboard steps across a conic and the switch cost. Steps of 500–1200 px between the last and first reachable entry are jumps across directions whose point leaves the view; they do not depend on the bound. Handle coordinates stay below 16 bits.

**Preset impact: none.** Keeping the bound keeps every table index. The K2 example indices derive from directions through `directionIndex`, and they need a bound of at least 10. The `projective-pascal` Preset key has no route or `PresetImport` registration yet, so no stored Presets exist. A later bound change would renumber indices; it would need an index migration or an accepted break recorded here.

**Sampler notes from task 03, closed.**

- `refine` now skips an interval only when the arc's hull misses the view. The hull is the triangle of the two samples and their tangents' meeting point, valid because the arc is convex and turns less than π. For tangents parallel to within 1e-9 rad and pointing the same way, the arc lies within L·10⁻⁹ of its chord, so a chord test against a view widened by that margin decides. An unknown hull is subdivided.
- Past the first 8 levels, recursion continues to at most 40 levels, and only along intervals whose known hull meets the view. This finds a visible arc far narrower than one angle step in a distant view.
- Without the parallel-tangent margin, the far pieces near an asymptote were subdivided blindly. Hyperbola sampling at density 720 then took 11 ms instead of 0.36 ms, with identical output.
- Regression tests: an arc bulging into a view its chord misses, tiny distant arcs of a circle and a hyperbola, and a far near-straight piece of \(xy=1\). All four fail against the pre-change sampler, and the last also fails when the margin branch always skips.
