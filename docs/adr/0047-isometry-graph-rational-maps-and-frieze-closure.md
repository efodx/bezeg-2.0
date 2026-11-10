# Isometries: one mode-based graph, rational affine maps, frieze types by closure

Accepted on 2026-11-10 (F0 of the [isometries spec](../specs/isometries-lessons.md), stream `families-prep`). It records the spec's three ADR decisions.

## 1. One `IsometryGraph` with modes

One graph (`src/graphs/isometry/`) has the modes `mirrors | classify | similarity | rosette | frieze` and holds one validated state. Scenes switch modes and set mirrors, dilation and frieze generators in one synchronous tick.

Alternatives:

- One graph per lesson. Mirror handles, the motif, kernel calls and the Preset format would be duplicated five times.
- Extend `LinearMapGraph`. Its Preset format snaps matrix entries to \(1/4\), so it cannot hold a reflection in a grid mirror such as \(\tfrac15\begin{pmatrix}3&4\\4&-3\end{pmatrix}\), and the Controls stream is changing its panels.

## 2. `Rational` motion data

All motion data is an `AffineMap2` of `Rational` entries (`src/compgeo/rational.ts`), built from grid mirrors, grid centres and ratios snapped to \(1/4\). Class, orientation, parallel mirrors, similarity, fixed points and frieze type are decided exactly. Doubles appear only in angles, rosette images and drawing, and readouts label them as computed. `Mat2` and `classifyEigen` (`src/linear/`) are used for display and as independent test oracles only.

Alternatives:

- Doubles with a tolerance. A tolerance would be presented as an exact class, which the [shared constraints](../specs/new-lesson-families.md#shared-constraints) forbid.
- Snapped matrices as in the linear-map graph. These cannot represent a reflection in a grid mirror.

## 3. Frieze type from a closed set of chosen symmetries

The learner toggles vertical mirror, horizontal mirror, half-turn and glide. The kernel closes the chosen set modulo the period translation, reports `reducesPeriod` when a shorter translation appears, and names the type from the closure's feature signature. "Exactly seven" is a bounded check over this model's five generators \(\{V,V',H,R,G\}\) (mirror positions \(0\) or \(L/4\)): a unit test enumerates all 32 subsets with a brute-force composition loop that is independent of `friezeClosure` and finds 16 valid subsets in exactly 7 classes. It is not a proof of the classification theorem, and the lesson prose names the theorem and says what the app checks.

Alternatives:

- The learner picks one of seven named types. This hides why there are seven.
- The learner draws a pattern and the kernel detects its type. This needs image comparison and cannot be exact.

## Consequences

- Additive only. `/bezier/affine`, `linear-map`, `AffineTransformBezierCurveGraph`, `LinearMapGraph` and their Presets are unchanged.
- The kernel lives in a new pure module `src/isometry/`, free of React, JSXGraph and localization.
- A symmetry checkbox group that `src/inputs/` lacks is a dependency on the Controls stream, not a local control.
