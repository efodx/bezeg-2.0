# Sweep algorithms: grid input to \(2^{10}\), `BigInt` rational events and exact event order

Status: accepted, 2026-10-31 (F0 of the [sweep-line algorithms spec](../specs/sweep-algorithms-lessons.md), geometry stream handler, under the owner's 2026-10-31 approval of the family). Builds on [ADR 0021](0021-exact-grid-predicates.md) (exact grid predicates) and [ADR 0030](0030-triangle-geometry-rationals-gliders-and-placement.md) §1 (the shared `Rational` type). Source: [event-queue and status trace model](../specs/sweep-algorithms-lessons.md#event-queue-and-status-trace-model-batch-s0), [C2](../specs/sweep-algorithms-lessons.md#c2-bentleyottmann-segment-intersections-showpiece), [C5 exactness](../specs/sweep-algorithms-lessons.md#c5-fortunes-algorithm-showpiece).

## Context

Sweep algorithms branch on the order of events and on the left-to-right order of objects along the sweep line. Bentley–Ottmann events include segment intersections, which are rational on grid input; Fortune's circle events lie at heights \(c_y-\sqrt{R^2}\), which are generally irrational. ADR 0021 forbids doubles that are later compared and leaves the rational policy to this family; ADR 0030 has since fixed the rational type, so this record only adds the sweep-specific rules.

## Decision

- **Input.** Sites, segment endpoints and polygon vertices are `GridPoint`s with \(|x|,|y|\le 2^{10}\) (`SWEEP_COORD_LIMIT`, a tighter bound than ADR 0021's \(2^{25}\)). Larger input is refused with an actionable message in the graph and on Preset import, never clamped. With differences at most \(2^{11}\), the denominator of a segment intersection, \(\operatorname{cross}(d_1,d_2)\), is at most \(2^{23}\), and a Fortune circumcentre's denominator \(2\cdot\text{orient}\) at most \(2^{24}\), so the exact fractions a readout shows stay short enough to read beside the decimal.
- **Derived positions** are `RationalPoint`s of the shared module `src/compgeo/rational.ts` (ADR 0030; triangle geometry task 01 writes it). The spec's "numerator pair over a common denominator" is this type. Sweep code may add operations to the module under ADR 0030's rule, but does not define a second rational type.
- **Direction and event order.** The sweep line is horizontal and moves downwards, as in de Berg et al.: events are ordered by decreasing \(y\), ties by increasing \(x\), one convention for the whole family (the spec's proposal, adopted). Equal positions are one event carrying every object involved.
- **Status order.** Objects are compared by their exact \(x\) at the sweep line's current height (a rational), ties broken by the order just below the line (an exact slope comparison; horizontal segments are placed after the others at the same point, as in de Berg et al. §2.1). The status is an ordered array; the lessons name the balanced tree it stands for.
- **Square-root heights.** A Fortune event height is a value \(q-\sqrt{r}\) with rational \(q\), \(r\ge0\). It is never stored as a double: two heights are compared by isolating the root and squaring, with sign tests on rationals, in one documented function under `src/compgeo/sweep/`, tested against high-precision brute force including near-equal heights. The breakpoint test (which arc lies above a new site) uses the same technique; its exact formula is derived and verified in Batch S3, with the spec's combinatorial fallback.
- **Doubles only for drawing.** Beach-line parabolas, breakpoint markers and decimal readouts use `toNumber`; no drawn value feeds back into a decision, and the drawn beach line is labelled approximate.

## Alternatives

- **Floating coordinates with a tolerance** (spec option B). Smallest code, but event order and status order become approximate near simultaneous events, exactly where the lessons look (the two pairs at \(y=\tfrac{29}{10}\) and \(y=\tfrac78\) in C2). Contradicts ADR 0021.
- **Only dyadic-friendly inputs** (option C): restrict examples so every intersection is a dyadic fraction and use doubles. Exact for the shipped examples, but free exploration would silently become inexact, so the editor would mislead.
- **A sweep-owned rational with a common denominator per point.** It matches the spec's wording and saves one gcd per operation, but duplicates ADR 0030's module and its tests; the boards hold at most 12 objects, so the cost does not matter.
- **The full ADR 0021 range \(2^{25}\).** Still exact with `BigInt`, but intersection fractions reach about \(2^{53}\) over \(2^{53}\) and are unreadable in a readout, and the lessons gain nothing from such coordinates.

## Consequences

- Sweep kernel tasks that compute derived positions depend on triangle geometry task 01 (`rational.ts`, maps stream). If that module is not on `master` when they start, the geometry stream asks through the maps stream file rather than writing its own.
- Every sweep Preset stores grid integers within \(2^{10}\); import checks the bound. No existing route or Preset changes.
- `BigInt` comparison per event costs little at 12 objects; measure a drag at the limit before optimizing ([performance plan](../performance-plan.md)).
