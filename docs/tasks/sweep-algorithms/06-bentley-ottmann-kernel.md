# 06 — Bentley–Ottmann kernel (C2)

Status: planned 2026-11-01 (geometry handler 11). Source: [spec C2](../../specs/sweep-algorithms-lessons.md#c2-bentleyottmann-segment-intersections-showpiece) (default and degenerate examples, acceptance 1–6), [correctness notes](../../specs/sweep-algorithms-lessons.md#correctness-notes), [ADR 0035](../../adr/0035-sweep-coordinates-and-exact-event-order.md). Kind: F1, mathematical review (difficult mathematics: route the worker at Sonnet `high`). Depends on 02 and 03 (`segments.ts`: `upperEndpoint`, `lowerEndpoint`, `segmentIntersection`, `compareAtSweep`, `bruteForceIntersections`).

Pure TypeScript in `src/compgeo/sweep/bentleyOttmann.ts`, following dBCKO §2.1 with the array status the spec decides.

## Scope

1. `bentleyOttmannTrace(segments)` returns a `SweepTrace<number>` (object ids are segment indices). Each event point is popped once with its sets \(U(p)\), \(L(p)\), \(C(p)\); segments in \(L\cup C\) are removed and \(U\cup C\) inserted in their order just below \(p\) (`compareAtSweep`), so the segments through a crossing reverse as one contiguous block (`status-swap` for two, remove/insert for more; document which). After each change only the new neighbour pairs are tested (`neighbour-test` with the discrete outcome); a crossing below the sweep line, or on it to the right of \(p\), is `schedule`d once. Intersection points are `report`ed with every segment through them.
2. Refusals before any trace: more than `SWEEP_MAX_SEGMENTS` (12), off-grid or out-of-range endpoints, and collinear overlap (reported as `overlap` with the pair, not drawn, as acceptance 3 says). Zero-length segments are points: decide and document whether they are refused or treated as degenerate segments, and test the choice.
3. Counters in the folded state: neighbour tests and predicate calls, for the "tests versus \(\binom n2\) pairs" readout.
4. Tests:
   - Default example \(s_0\ldots s_3\): exactly the spec's 13 events in order with the status after each, and the five crossings with the exact rationals (acceptance 1). Write the expected statuses from the spec, not from the kernel.
   - Degenerate example: \(a,b,c\) through \((2,2)\) give one report with three segments and the reversed block; adding the vertical \(d\) gives four.
   - Random grid sets (\(n\le12\), bounded count, generators that force shared endpoints, endpoint-on-interior, verticals, horizontals and multi-segment points): reported points and segment sets equal `bruteForceIntersections` (set equality); every point is reported once and no event is scheduled twice (acceptance 2, 5).
   - After every event the status is sorted by `compareAtSweep` just below the event point (acceptance 4).
   - The neighbour-test counter equals the number of `neighbour-test` events (acceptance 6).
   - Overlap refusal names the pair.
   - Observed failures under deliberate mutations: testing only the left neighbour after a removal; scheduling crossings above the line; inserting \(U(p)\) by order at \(p\) instead of just below.

Not in scope: the graph, side lists and lesson (later S1 slices).

Checks: `just unit src/compgeo/sweep --maxWorkers=2`, `just lint src/compgeo/sweep`, `npx tsc --noEmit --pretty false`.
