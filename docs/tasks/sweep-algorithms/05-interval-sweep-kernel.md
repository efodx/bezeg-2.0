# 05 — Interval sweep kernel (C1)

Status: accepted 2026-11-01 (geometry handler 11; Sonnet `medium` worker, Sonnet mathematical review with no findings; 15 tests, lint and tsc clean). Mutation evidence: leave-before-enter at a tie failed 4 tests; report on leaving failed 2 once a report-follows-insert test was added (the pair set alone does not detect it). Choices: the trace is `SweepTrace<IntervalPair>` (a pair of indices, not `number`), refusals are `{ok: false, reason, index?}`, readouts by `intervalReadouts`. Source: [spec C1](../../specs/sweep-algorithms-lessons.md#c1-sweep-as-an-idea) (example, acceptance 1–4), [trace model](../../specs/sweep-algorithms-lessons.md#event-queue-and-status-trace-model-batch-s0), [ADR 0035](../../adr/0035-sweep-coordinates-and-exact-event-order.md). Kind: F1, mathematical review. Depends on 02 (`sweepTrace.ts`, `eventOrder.ts`) and `limits.ts`.

Pure TypeScript in `src/compgeo/sweep/intervalSweep.ts`, free of React and JSXGraph.

## Decision (handler, 2026-11-01)

The intervals lie on the \(x\)-axis, so C1 sweeps a vertical line from left to right. This is the family's downward order restricted to \(y=0\) (decreasing \(y\), ties by increasing \(x\)), so event positions are `RationalPoint`s \((x,0)\) and the shared order needs no exception; the lesson text names the rotation (spec step 6). Ties at one \(x\) use a `QueueComparator`: entering before leaving (closed intervals, acceptance 3), then by interval index.

## Scope

1. `Interval` as `{lo, hi}` integers with `lo <= hi`; `intervalSweepTrace(intervals)` returns a `SweepTrace<number>` (object ids are interval indices) using `pop`, `status-insert`, `status-remove`, `report` (one per overlapping pair, reported when an interval enters while the other is open) and `done`. The status is the set of open intervals, kept in index order.
2. Refusals before any trace: more than `SWEEP_MAX_INTERVALS` (10), non-integer or out-of-range endpoints (`checkSweepCoordinate`), `lo > hi`. Return a typed refusal, never clip.
3. Derived readouts from `sweepStateAt`: open count after each event, the maximum and where it is first reached, reported pairs.
4. `bruteForceIntervalOverlaps(intervals)`: pairs with \(\max(lo)\le\min(hi)\) and the maximum depth, as the test oracle.
5. Tests:
   - The spec's example \(a=[0,4]\), \(b=[2,7]\), \(c=[3,5]\), \(d=[6,9]\), \(e=[8,10]\): events \(0^+,2^+,3^+,4^-,5^-,6^+,7^-,8^+,9^-,10^-\) in order, open counts \(1,2,3,2,1,2,1,2,1,0\), maximum \(3\) on \([3,4]\), pairs \(ab,ac,bc,bd,de\).
   - Random sets (\(n\le10\), shared endpoints and zero-length intervals included, bounded count): reported pairs equal the brute-force pairs (set equality, each pair once) and the maximum equals the brute-force maximum.
   - Ties: \([0,2]\) and \([2,3]\) touch and are reported; a zero-length \([4,4]\) inside \([3,5]\) is reported.
   - Each refusal; the trace ends in `done` and its length equals the formula documented in the module comment (one `pop` and one insert or remove per endpoint, one `report` per pair, one `done`: \(4n+\text{pairs}+1\)).
   - Observed failures under two deliberate mutations (leaving before entering at a tie; pair reported on leaving instead of entering, which double-counts or misses pairs).

Checks: `just unit src/compgeo/sweep --maxWorkers=2`, `just lint src/compgeo/sweep`, `npx tsc --noEmit --pretty false`.
