# 03 — Exact segment primitives and brute-force intersections

Status: planned. Source: [spec C2](../../specs/sweep-algorithms-lessons.md#c2-bentleyottmann-segment-intersections-showpiece) (examples, acceptance 2–4), [correctness notes](../../specs/sweep-algorithms-lessons.md#correctness-notes), [ADR 0035](../../adr/0035-sweep-coordinates-and-exact-event-order.md). Kind: F1, mathematical review. Depends on 02.

Pure TypeScript in `src/compgeo/sweep/segments.ts`, using `orient`/`onSegment` from `predicates.ts` and `RationalPoint`.

1. `Segment` as two grid endpoints; `upperEndpoint`/`lowerEndpoint` by the event order of task 02 (a horizontal segment's upper endpoint is its left one).
2. `segmentIntersection(s, t)`: `none`, `point` (exact `RationalPoint`) or `overlap` (collinear with a common sub-segment of positive length), decided by `orient` signs; touching at endpoints is a `point`.
3. `compareAtSweep(s, t, y, x0)`: order of two segments containing the sweep height \(y\) by their exact \(x\) there, ties (both pass through \((x_0,y)\)) by the order just below the line; horizontal segments last among those through the point.
4. `bruteForceIntersections(segments)`: all points with the set of segments through each, and the overlap pairs; the oracle for BO.
5. Tests:
   - C2 default example: the five crossings with the exact rationals \((3,2)\), \((\tfrac{21}{16},\tfrac78)\), \((\tfrac{87}{20},\tfrac{29}{10})\), \((\tfrac{33}{20},\tfrac{29}{10})\), \((\tfrac{75}{16},\tfrac78)\).
   - Degenerate example: \(a,b,c\) and the vertical \(d\) through \((2,2)\) give one point with four segments; shared endpoints, endpoint on interior, vertical segments and collinear overlap each classified correctly.
   - At each C2 crossing, `compareAtSweep` orders the two segments through the point as the spec's status after that event does (swapped relative to before). Sorting every active segment just below a crossing is not a valid check: at \(y=\tfrac{29}{10}\) and \(y=\tfrac78\) it would also swap the second crossing to the right, which the tie-by-\(x\) rule processes later. The full status lists are checked by the S1 Bentley–Ottmann task.
   - Random grid segment sets (\(n\le12\), bounded count): every `point` lies on both segments (exact check), and `segmentIntersection` agrees with an independent parametric test in rationals.
   - Observed failures under two deliberate mutations (e.g. open segments so endpoint contacts vanish; tie broken just above instead of below).

Checks: `just unit src/compgeo/sweep --maxWorkers=2`, `just lint src/compgeo/sweep`, `npx tsc --noEmit --pretty false`.
