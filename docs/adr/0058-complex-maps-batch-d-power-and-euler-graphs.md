# Complex maps Batch D: `ComplexPowerGraph` and `EulerCircleGraph`

Accepted on 2026-11-10 (F0 of the [complex-maps Batch D amendment](../specs/complex-maps-lessons.md#batch-d-gating-kernel-gaps-f1-terms-and-tests-families-prep-amendment-2026-11-10), stream `families-prep`).

## Decision

M6 (de Moivre: powers of a complex number) and M7 (Euler's formula as uniform circular motion) each get a new graph: `ComplexPowerGraph` and `EulerCircleGraph`. This follows the per-lesson-graph choice the complex-maps spec already made. `ComplexMultiplicationGraph` and the other released graphs are not edited.

The new kernels are `src/analysis/complexPower.ts` and `eulerCircle.ts`. Exact decisions use integer grid units: `exactIntegerPower` for \(n\le8\), and `eulerPoint` at integer degrees with exact axis points. `complexIntegerPower` stays in `complexRootsModel.ts` as the test oracle and is not moved.

## Alternatives

- One graph with a mode. This mixes a discrete power sequence with a continuous animation that share no handles.
- Extending `ComplexMultiplicationGraph`. The spec keeps this graph unchanged.

## Consequences

- Additive only. New routes and Presets.
- F2a waits on Controls step 5, which supplies play and step controls. Batch D is released after Batch A.
