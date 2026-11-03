# Task 22 (Fortune kernel): acceptance

Accepted 2026-11-03 by geometry handler 44. Source: [task 22](../../tasks/sweep-algorithms/22-fortune-kernel.md). Commits `6d26da6f` (kernel, from worker commits `65463ba1` and `e7c84bca` on `geometry-fortune-kernel-wip`) and `4dcc5c04` (lint).

## Evidence

- Checks at `4dcc5c04`: `just lint src/compgeo/sweep` clean ([22-lint.log](22-lint.log)); `just unit src/compgeo/sweep` 147/147 ([22-unit-h44.log](22-unit-h44.log) is the focused rerun after the lint fix); `npx tsc --noEmit --pretty false` clean ([22-tsc-h44.log](22-tsc-h44.log)).
- Random and degenerate runs: [22-random.log](22-random.log). Every run's output equals `voronoiFromDelaunay`.
- Mutations: [22-mutations.log](22-mutations.log). Each one was observed failing:
  - (a) drop the cancel on a split;
  - (b) schedule diverging triples (the whole suite throws in `assemble`; the milder `> 0` variant fails 5 tests);
  - (c) doubles in the queue key;
  - (d) the wrong root;
  - (e) the circle/site tie flipped.
- **Doubles search** ([22-doubles.log](22-doubles.log), script [22-doubles-search.cjs](22-doubles-search.cjs)): all grid triples in \([-10,10]^2\).
  - Irrational heights: no double inversion was found.
  - Exact rational ties between distinct circles: the doubles land one ulp apart and reverse the tie-by-\(x\) order.
  - Pinned case: \((-6,-8),(0,0),(-6,8),(0,-8),(6,-4)\).
- Cancel rule, asserted on all random and degenerate sets: every cancelled circle has a site strictly inside, or it is empty and an executed circle with the same exact centre exists.

## Mathematical review (`bezeg-reviewer`, of `65463ba1`)

No defects. The reviewer confirmed each point below:

- **Root selection:** with \(u=p_y-\ell\), \(\operatorname{sign} D=\operatorname{sign}(v_i-v_j)\). The breakpoint is the larger root when \(u_j>u_i\) and the smaller root otherwise. Pointed arcs are the limit \(u\to0^+\).
- **Cocircular sets:** events merge through exact centre equality.
- **Exact hits:** the \((i,s,j)\) triple after a hit diverges, since \(\operatorname{orient}(i,s,j)>0\).
- **Scheduling:** an event needs \(\operatorname{orient}<0\). Neighbour and split cancellation are correct.
- **Exactness:** no doubles enter.
- **Exhaustive fuzz:** every subset of a 4×4 grid and of a 3×5 grid equals the dual.

The reviewer had two test findings. Both are resolved in `e7c84bca`:

1. The circle-first tie rule is a convention. Flipping it does not change the diagram. The module comment now says so, and a test pins the convention.
2. There was no direct test of an exact hit with unequal heights. One now exists, and mutation (d) fails it.

The breakpoint derivation needed no fallback. No combinatorial circle test is used.
