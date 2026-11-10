# Phase portraits: separate graphs, measured trajectory drawing, an independent logistic graph, integer grids

Accepted on 2026-11-10 (F0 of the [phase-portraits spec](../specs/phase-portraits-lessons.md), stream `families-prep`). It records the spec's four ADR decisions. §2 is accepted conditionally: the measurement chooses the drawing before F2a.

## 1. Two new graphs

`PhasePortraitGraph` serves PP1–PP3. It reuses the `src/linear` kernel (`Mat2`, `classifyEigen`, `discriminantSign`), but it is not a mode of `LinearMapGraph`, which the #11 amendment is extending. `LogisticMapGraph` serves PP4–PP5.

Alternatives:

- A mode of `LinearMapGraph`. This collides with #11's extension of the same graph and its Presets.
- One graph for all five lessons. This mixes a planar matrix state with a one-parameter map.

## 2. Trajectories drawn as one polyline-array curve, measured

All trajectories are drawn as one NaN-separated polyline curve, as in [ADR 0037](0037-direction-field-drawing.md). Before F2a, measure per the [performance plan](../performance-plan.md) 12, 24 and 48 trajectories of 500 steps in two interactions: dragging a matrix handle, which recomputes everything, and dragging a seed, which recomputes one trajectory. Record the frame times here.

Alternatives:

- A JSXGraph curve per trajectory. This means up to 48 elements, each updated on every drag.
- An overlay canvas. This would be a second renderer, not justified before a measurement.

## 3. Its own `LogisticMapGraph`

`LogisticMapGraph` shares only pure iteration code with #9. If `src/recursion/logistic.ts` exists, this kernel imports its map and leaves it unrestricted. No sibling graph is edited.

Alternatives:

- Extending #9's `RecursionCobwebGraph` to \(r\le4\). This couples two families' release order and Presets.
- Extending `FixedPointGraph`. Its example table is closed, and its route and lessons would change.

## 4. Exactness grids

Matrix entries are snapped to \(1/4\) on \([-4,4]\), as in [ADR 0025](0025-linear-map-graph-and-snapped-matrices.md). The trace–determinant type is then an integer test with no tolerance, checked over all \(33^4\) matrices.

The logistic parameter is \(r=R/100\), with integer \(R\in[250,400]\):

- the fixed point attracts iff \(100<R<300\);
- the 2-cycle attracts iff \(300<R\le344\).

Higher periods are computed with a tolerance of \(10^{-9}\) from \(x_0=0{,}2\) and labelled computed.

Hyperbolicity is decided exactly, and only at the catalogue's listed equilibria, where the Jacobians are integer matrices.

Alternatives:

- Continuous parameters with tolerances. The centre/spiral boundary and the period-2 boundary would then depend on \(\varepsilon\).

## Consequences

- Additive only. `LinearMapGraph`, `FixedPointGraph`, `odeEuler.ts` and their routes and Presets are unchanged.
- The pure kernel lives in `src/dynamics/`, using RK4 with the fixed step \(h=0{,}02\) and reported stops.
- F2a waits on Controls step 5. Batch A also waits on linear-maps Batch B. Batch C waits on recursion RG4, or on this ADR's §3, which already removes that dependency.
