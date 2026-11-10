# Kinematics: a new graph, SI units with one \(g\), a labelled arrow-scale ladder

Accepted on 2026-11-10 (F0 of the [kinematics spec](../specs/kinematics-lessons.md), stream `families-prep`). It records the spec's three ADR decisions.

## 1. A new `KinematicsGraph`

`src/graphs/curves/kinematics/KinematicsGraph.tsx` reuses `DerivativeSource`, `curvatureAt`, the parametric sources and `PARAMETRIC_CATALOGUE`, and adds projectile and circular motion. `ParametricCurveGraph`, its route and its Presets stay as they are. Time and the playing flag are host state and never enter a Preset, as in `EpicycleGraph`. Catalog placement is confirmed at F2b. The proposal is `curve-geometry`.

Alternatives:

- Extending `ParametricCurveGraph` with acceleration and modes. This changes an existing route and its stored Presets.
- One graph per lesson. This duplicates the board, playback and arrow code.

## 2. SI units and \(g=9{,}81\ \mathrm{m/s^2}\)

Lengths are in metres and time in seconds. \(g=9{,}81\ \mathrm{m/s^2}\) is exported once from the kernel and shown with every projectile readout. The model ignores air resistance and the Earth's rotation, and the prose says so.

Alternatives:

- Dimensionless units with \(g=1\). The physics framing that motivates the family would be lost.
- \(g=10\). The readouts would disagree with the value learners use in school physics.

## 3. A labelled arrow-scale ladder

`arrowScale(maxMagnitude)` picks a step from the ladder \(1,2,5\times10^k\) using the maximum of \(|v|\), and separately of \(|a|\), over the scene's domain. It labels the result, for example "arrow of length 1 = \(s\) m/s" and "= \(s'\) m/s²". Velocity and acceleration have separate scales, each labelled. The scale is recomputed only when the scene changes, never while the point moves.

Alternatives:

- Free zoom. Arrow lengths would carry no stated meaning.
- Arrows of fixed length. These hide magnitude, which KN2 and KN4 are about.

## Consequences

- Additive only. `curve-parametric`, `curve-curvature` and their Presets are unchanged.
- The pure kernel lives in `src/kinematics/`. The \(a_T\) status is exact by construction for projectile and circular motion. For other sources it uses the threshold \(10^{-9}|r''|\) and is labelled approximate.
- F2a needs playback and a time stepper, so it waits on Controls step 5.
