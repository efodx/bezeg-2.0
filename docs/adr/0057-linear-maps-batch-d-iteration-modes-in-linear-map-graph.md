# Linear maps Batch D: `iterate` and `tracedet` modes in `LinearMapGraph`

Accepted on 2026-11-10 (F0 of the [linear-maps Batch D amendment](../specs/linear-maps-lessons.md#batch-d-gating-kernel-gaps-f1-terms-and-tests-families-prep-amendment-2026-11-10), stream `families-prep`).

## Decision

L6 (the power method) and L7 (trace and determinant: stability of iteration) add the modes `iterate` and `tracedet` to `LinearMapGraph`. They share its validated matrix state and Preset format, as [ADR 0025](0025-linear-map-graph-and-snapped-matrices.md) option (a) chose for L1–L5. The start vector and step are added to the state, and old Presets stay valid because the new fields have defaults.

The new kernel files `src/linear/iterate2.ts` and `stability2.ts` decide every class from \(\tau\), \(\delta\) and \(\Delta\) on snapped entries, so the decisions are exact. The continuous-time type names stay in the phase-portraits kernel ([ADR 0054](0054-phase-portraits-separate-graphs-rk4-integer-classification.md)) and are not duplicated.

Revisit if the state grows enough that a separate graph is simpler.

## Alternatives

- A separate `IterationGraph` reusing `src/linear`. This duplicates the matrix handles and the Preset format.
- L7's inset inside the phase-portraits graph. This couples Batch D to another family's release order.

## Consequences

- This changes an existing graph. F2a waits on Controls step 5, and it must keep the `linear-map` route and every stored Preset loading unchanged, which is tested.
- Batch D is released after Batch B. Batch C is not required.
