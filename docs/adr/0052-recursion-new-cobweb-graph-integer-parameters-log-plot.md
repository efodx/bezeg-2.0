# Recursion and growth: a new cobweb graph, integer parameter grids, log plotted on an ordinary axis

Accepted on 2026-11-10 (F0 of the [recursion spec](../specs/recursion-growth-lessons.md), stream `families-prep`). It records the spec's three ADR decisions.

## 1. A new `RecursionCobwebGraph`

A new graph, `src/graphs/recursion/RecursionCobwebGraph.tsx`, serves RG2 and RG4 with its own kernel `src/recursion/`. It reuses `IterationController` and the `FixedPointStep` shape (index, from, to) in spirit, without importing the fixed-point kernel. `FixedPointGraph`, `fixedPoint.ts`, the `fixed-point-*` lessons and their Presets are unchanged. RG1, RG3 and RG5 use a second new graph, `GrowthGraph`.

Alternatives:

- Extending `FixedPointGraph` with more maps. Its example table is closed, and the change would touch an existing route, its Presets and lessons.
- Generalising `fixedPointHistory` to any map. This changes a shared kernel that existing lessons rely on.

## 2. Integer parameter grids

The parameters lie on integer grids:

- the slope is \(m=M/20\), with integer \(M\in[-60,60]\);
- the intercept is \(c=C/10\), with integer \(C\);
- the start \(x_0\) is on the \(1/100\) grid;
- the logistic parameter is \(r=R/10\), with integer \(R\in[5,29]\).

Every classification is an integer test: attracting, repelling, 2-cycle, all fixed, no fixed point, staircase, spiral, degenerate, and the logistic cases. The fixed point \(2C/(20-M)\) is an exact rational. Iterates are doubles labelled computed, and labels never come from iterate values.

Alternatives:

- Continuous parameters with a tolerance. The boundary case \(|m|=1\) would depend on \(\varepsilon\).
- Rational arithmetic throughout. This adds nothing, because only the labels need exactness.

## 3. Logarithm plotted on an ordinary axis

RG5 plots \(\ln y\) (or \(\log_{10}y\)) against \(n\) on an ordinary axis, with the straight line, and labels the axis as the logarithm. A true logarithmic axis with ticks \(1,10,100,\ldots\) is a new rendering feature, and it needs its own decision and measurement.

Alternatives:

- A true log axis now. This is new board rendering, which has not been measured.
- Both views. This doubles the work before either is measured.

## Consequences

- Additive only. No route, Preset or existing graph changes.
- `eApprox(n)` caps \(n\le10^6\). Far above the cap, doubles fail: \((1+10^{-15})^{10^{15}}\) gives \(3{,}035\).
- The stream boundary is binding. Both graphs (F2a) wait on Controls step 5, although the spec calls `GrowthGraph` ungated, because the boundary lists this family's F2a under step 5.
