# Conservative hull separation for off-grid Bézier pieces

Status: accepted, 2026-10-31 (geometry stream handler 6, answering the Curves stream's request in [geometry.md](../tasks/feature-streams/geometry.md)). Amends [ADR 0021](0021-exact-grid-predicates.md) (exact grid predicates) for one named function. Affects convexity [A6](../specs/convexity-hulls-lessons.md#a6-back-to-bézier-hulls-of-control-polygons) and the advanced Bézier [AB-1d plan](../tasks/advanced-bezier/README.md#ab-1d-plan-bezier-clippingts-handler-9-2026-10-31).

## Context

A6 discards a pair of Bézier pieces when the convex hulls of their control points are disjoint. The Curves stream's Bézier clipping (D2) uses the same test for its "overlapping" status and its no-intersection pair. The pieces' control points come from de Casteljau subdivision at arbitrary parameters, so they are doubles off the grid. ADR 0021 accepts only grid points in production predicates and says that "no graph mode lets free double points feed an algorithm".

The test also makes a claim about the true curves, not only about the rounded control points it receives. Even an exact test on the rounded points could call two pieces disjoint while the exact pieces touch. Some allowance for rounding is therefore needed whatever arithmetic decides the sign.

## Decision

- One function, `hullsSeparated(a, b)` in `src/compgeo/hullSeparation.ts`, takes two finite double point lists (1 to 8 points each) and returns `{separated: true, axis}` or `{separated: false}`. It is the only exception to ADR 0021's grid-only rule, and it is named and documented as conservative.
- **Axes without a hull build.** The candidate axes are the direction \(q-p\) and its normal for every pair \(p\ne q\) of the union of both lists. This set is complete: two disjoint compact convex polygons are strictly separated by the line perpendicular to the segment between their closest points. That segment's direction is either a difference of two input points (vertex to vertex) or normal to a hull edge, which joins two input points (vertex to edge, or parallel edges). No orientation sign is decided, so no hull of off-grid points is built.
- **Keep-biased margin.** With unit axis \(u\), the pair is separated only when \(\min_B u\cdot b-\max_A u\cdot a>\delta\), or the same with \(A\) and \(B\) swapped, where \(\delta=10^{-12}\cdot s\) and \(s\) is the largest absolute coordinate of both lists (at least \(1\)). This is the AB-1d margin. Touching or nearly touching pieces count as overlapping. Every rounding error therefore keeps a pair rather than discarding it, which is the safe direction for both A6 and clipping.
- **Stated guarantee.** "Separated" is correct for the exact pieces whenever every control point is within Euclidean distance \(\delta/4\) of its exact value (per-coordinate error \(\delta/4\) also suffices: at most \(\sqrt2\,\delta/4\) per point, so the gap shrinks by less than \(\delta\)). Conversely, a pair is reported separated whenever its computed hulls are more than \(2\delta\) apart (projection rounding is about \(10^{-15}s\)); gaps in \((0,2\delta]\) may be kept. Each de Casteljau level adds at most about \(2^{-53}s\), so 40 levels give about \(5\cdot10^{-15}s\), far below \(\delta/4=2.5\cdot10^{-13}s\). "Overlapping" proves nothing, which A6 already teaches.
- Lessons do not call the test exact. A6's text says that disjoint hulls are certified with a safety margin, and the counts stay as specified.

## Alternatives

- **Exact sign on doubles** (every finite double is a dyadic rational, so `BigInt` evaluation is possible). It is exact for the rounded points but not for the true pieces, so a margin is still needed. More code for no stronger claim.
- **Exact dyadic arithmetic for A6 only.** A6's pieces come from halving grid nets, so they are exact dyadics at depth at most 4. This leaves D2, whose parameters are arbitrary, without a test, so two tests would teach one idea.
- **Interval arithmetic.** A rigorous enclosure, but more code and a dependency-free implementation to verify, for the same keep-biased answer at these sizes.
- **No margin, plain doubles.** Smallest code, but a rounding error can discard a pair that meets, the one error A6 must never make (acceptance 2).

## Consequences

- ADR 0021's grid-only rule now has one named exception. Any further off-grid predicate needs its own ADR.
- Handler check (`python -I`, 2026-10-31): on A6's curves, exact rational separation and the margin rule both give \(1,2,8,8,8\) overlapping pairs at depths \(0\)–\(4\). On 3000 random off-grid pairs of degree 1 to 3, the margin rule never reported a separation that the exact test denied.
- Convexity task 11 implements the function. The A6 pair-of-curves graph and the Curves D2 graph import it.
