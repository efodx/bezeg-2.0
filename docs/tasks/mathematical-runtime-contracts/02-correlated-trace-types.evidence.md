# Task 2 evidence: correlated trace event and note types

Base revision a51be3c7 plus the dirty worktree (other workers edit unrelated files).

## Contract
- `src/compgeo/trace.ts`: `TraceEvent<K, P, N>` and `Trace<K, P, N>` now take the producing algorithm's note union `N`
  (no default). New `CorrelatedTraceEvent<M, N>` / `CorrelatedTrace<M, N>` / `CorrelatedTraceEventByKind<M, N>`:
  `M` maps kind to payload; the event is the union of matching pairs. `stateAt` is generic over the event type `E`.
- `src/compgeo/sweep/sweepTrace.ts`: `SweepEvent<O, N>` / `SweepTrace<O, N>` are correlated; `sweepEventBuilder<O, N>()`
  replaces `sweepEvent<O, K>`; `foldSweepEvent` is an exhaustive `switch` (no `isKind`, no payload probes).
- Per-algorithm notes: `MonotonePartitionNote`, `MonotoneTriangulationNote` (+ `PartitionAndTriangulationNote`),
  `BentleyOttmannNote`, `IntervalSweepNote`, `FortuneNote`, `CurvePairNote`; existing hull/ear/Lawson/clip note unions
  now flow through `TraceEvent`'s `N`.

## Inventory
Producers: 11 (monotone partition, monotone triangulation, Bentley-Ottmann, interval sweep, Fortune, slow hull, gift
wrapping, monotone chain, ear clipping, Lawson, curve pair) plus bezier-clipping. Run adapters / consumers edited: 8
(monotonePartitionRun, monotoneTriangulationRun, bentleyOttmannRun, intervalSweepRun, fortuneRun, fortuneGeometry,
hullTraceRun, delaunayRun, earClippingRun). Tests edited: 5 (trace, sweepTrace, bentleyOttmann, intervalSweep).
New: `src/compgeo/sweep/traceContract.fixtures.ts`. Unchanged and compiling: TraceCurvePairGraph, BezierClipping*,
CollisionInspect.

## Fixtures (T1), `src/compgeo/sweep/traceContract.fixtures.ts`
- Old contract (before edits, probe file `SweepEvent<number>` with `{kind:'pop', payload:{item:1}, noteKey:'typo-note'}`
  under `@ts-expect-error`): `just typecheck` failed with `TS2578 Unused '@ts-expect-error'`, i.e. the invalid event
  compiled.
- New contract: valid events (pop, report, done) compile; mismatched payload, typo note, foreign (triangulation) note,
  and constructor payload/note mismatches are each pinned by `@ts-expect-error`. `just typecheck` passes.
- Mutation 1 (`noteKey: string` in trace.ts): fixtures fail with TS2578 at the typo/foreign-note lines.
- Mutation 2 (event union de-correlated): fixtures fail with TS2578 at the mismatched-payload line.
  Both mutations reverted (trace.ts byte-identical to the pre-mutation copy).

## Removed workarounds
- `monotonePartitionRun.ts` eventInfo: `"id" in payload` probes and `payload.item as Diagonal` cast, now a `switch`.
- `monotoneTriangulationRun.ts`, `bentleyOttmannRun.ts`, `intervalSweepRun.ts`: `"x" in payload` probes and
  `const payload = event.payload` copies.
- `fortuneGeometry.ts` `isKind` guard (and its use in `fortuneRun.ts`); `sweepTrace.ts` `isKind`.
- `hullTraceRun.ts` (`MONOTONE_NOTES`, `SLOW_NOTES`, `GIFT_NOTES`, `noteOf`), `delaunayRun.ts` `NOTES`,
  `earClippingRun.ts` `NOTES`: redundant note allowlists.
- `sweepTrace.test.ts`: `'mystery' as SweepKind` replaced by an explicit `as unknown as` (run-time data outside the
  contract; the unknown-kind tolerance test stays).

## Remaining intentional paths
- Internal assertion: `sweepEventBuilder` return (`as CorrelatedTraceEventByKind<..>[K]`). Proof: the object is exactly
  `{kind: K, payload: SweepPayloads<O>[K], predicateCount, noteKey: N}`, the `K` member; TS cannot relate it to the
  deferred indexed access for generic `K`. Callers (including generic `emit` in Bentley-Ottmann/Fortune) need none.
- Unknown-kind tolerance: `foldSweepEvent` `default: return state`, reachable only for run-time kinds outside
  `SweepPayloads`; known kinds are all matched (exhaustive switch, a new kind fails compile until handled).
- Flat `TraceEvent<K,P,N>` kept for hull, ear clipping, Lawson, curve pair and clipping traces: every kind of those
  shares one payload shape (not kind-dependent), so there is nothing to correlate; their notes are typed.

## Unchanged behaviour (T3)
Temporary snapshot test (deleted) dumped JSON of 25 seeds: partition trace and `partitionStateAt` per step, monotone
triangulation trace and `sweepStateAt` per step, `partitionAndTriangulate`, interval sweep, Bentley-Ottmann and Fortune
traces with per-step states (159 ok and 41 refused outcomes, 4.3 MB). Before edits vs after kernel edits and again
after adapter edits: `cmp` byte-identical. Run adapters: existing run/host tests unchanged (see results below).
