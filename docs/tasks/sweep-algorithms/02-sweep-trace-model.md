# 02 — Sweep trace model and exact event order

Status: planned; starts when `src/compgeo/rational.ts` (triangle geometry task 01, maps stream) is on `master`. Source: [spec S0 trace model](../../specs/sweep-algorithms-lessons.md#event-queue-and-status-trace-model-batch-s0), [ADR 0035](../../adr/0035-sweep-coordinates-and-exact-event-order.md), core trace contract `src/compgeo/trace.ts`. Kind: F1, mathematical review.

Pure TypeScript in `src/compgeo/sweep/` (no React, JSXGraph, localization or graph state).

1. `limits.ts`: `SWEEP_COORD_LIMIT = 2 ** 10`, the object limits of the spec (12 segments, 10 intervals, 20 polygon vertices, 12 sites) and an input check that refuses out-of-range or non-grid points with a reason value (no clamping).
2. `sweepTrace.ts`: the sweep event kinds as a union widening `SharedTraceKind`; a generic `SweepState<O>` (sweep position as `RationalPoint`, queue contents in order, status as object ids left to right, output so far, counters for predicate calls and neighbour tests) and a pure fold over the events that does not mutate its input; `sweepStateAt` via the core `stateAt`.
3. `eventOrder.ts`: `compareEventPositions(p, q)` on `RationalPoint`s, decreasing \(y\) then increasing \(x\), exact; and `compareSurdHeights(q1, r1, q2, r2)` for heights \(q-\sqrt r\) with rational \(q\), \(r\ge0\) (isolate the root and square, sign tests only; throws on \(r<0\)).
4. Tests:
   - Event order of C2's 13 event positions (spec C2, the "New" list) sorted from a shuffled input equals the spec's order, including the ties at \(y=\tfrac{29}{10}\) and \(y=\tfrac78\).
   - `compareSurdHeights`: C5's two true events \(1-\sqrt{65/4}\) compare equal; against \(-3\) (site \(D\)) the event is lower; random rational pairs agree with a high-precision reference (e.g. scaled `BigInt` square roots with enough digits) and near-equal cases (heights differing by less than \(10^{-12}\)) are decided correctly.
   - Fold purity (input state unchanged), `sweepStateAt` at a stale index clamps, unknown kinds are ignored by the fold.
   - Limits: \(2^{10}\) accepted, \(2^{10}+1\) refused with the reason.
   - Observed failures under two deliberate mutations (e.g. increasing-\(y\) order; squaring without checking signs first).

Checks: `just unit src/compgeo/sweep --maxWorkers=2`, `just lint src/compgeo/sweep`, `npx tsc --noEmit --pretty false`.
