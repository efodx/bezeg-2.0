# Mechanical curves: a new descent graph and tracks on the quarter grid

Accepted on 2026-11-10 (F0 of the [mechanical-curves spec](../specs/mechanical-curves-lessons.md), stream `families-prep`). It records the spec's two ADR decisions. The spec's third item, playback of the bead, is a gate and not a family decision.

## 1. A new `DescentGraph`

`src/graphs/mechanics/DescentGraph.tsx` has the modes `race | track | tautochrone` and is placed in the `curve-geometry` family. It reuses the cycloid formula of `parametric-sources.ts` through an adapter that flips to depth \(y_d=-y\) once. `ParametricCurveGraph`, its route and its Presets are unchanged. The animated race waits on Controls step 5. Until then a time slider sets the elapsed time.

Alternatives:

- Extending `ParametricCurveGraph` with a bead. This changes an existing route and its Presets.
- A graph per lesson. This duplicates the integrator wiring.

## 2. Track points on the quarter grid

End points and Bézier control points lie on a \(1/4\) grid. Admissibility is an exact test on the snapped control depths: all \(y_i\ge0\), with \(y_1>0\) and \(y_n>0\). The rule is sufficient, not necessary. A track that fails it is reported `above-start` or `never-starts`, with the reason, and is not timed. The brachistochrone's end-point parameter \(\theta_B\) is computed by bisection and shown as computed.

The descent time uses the substitution \(t=t_0+(t_1-t_0)s^2\) with composite 5-point Gauss–Legendre on 200 panels. This substitution is part of the contract, and a midpoint rule is the negative control in the tests.

Alternatives:

- Continuous points with a tolerance. Whether a track is admissible, and whether its time is finite, would then depend on \(\varepsilon\).

## Consequences

- Additive only.
- The pure kernel lives in `src/mechanics/`, with \(g=9{,}81\) as a model constant. This is the same value as the kinematics constant ([ADR 0050](0050-kinematics-graph-si-units-and-arrow-scale.md)), and the kernel imports that constant if it exists.
- F2a waits on Controls step 5, as the stream boundary requires.
