# Task 22 (Fortune kernel) handoff

State: `src/compgeo/sweep/fortune.ts` implemented; `fortune.test.ts` has 23 passing tests and 1 skipped (`just unit src/compgeo/sweep/fortune.test`).

Files: `fortune.ts`, `fortune.test.ts`, the cherry-picked task docs (7335add4).

Done: refusals; trace (schedule of all sites up front, pop, status-insert/remove, schedule/cancel for circles, report, done); `fortuneStateAt`, `fortuneQueueOrder`, `compareToBreakpoint`; default and second example; random general-position (300 sets, equal to the Delaunay dual, cancel strictly inside, executed empty, vertex count 2n-2-h, brute-force arc-above); degenerate (equal y, one height, collinear, 4 and 6 cocircular, exact hit, 500 small-grid sets).

Root selection (module comment): the breakpoint of left i, right j is the root of D(x)=u_j(x-i_x)^2-u_i(x-j_x)^2+u_iu_j(u_i-u_j) where D goes from negative to positive: the larger root if j_y>i_y, the smaller if j_y<i_y; decided by sign D(s_x) and s_x against the vertex x*. Combinatorial fallback not needed.
Tie rule: equal height and x (site on the circle) gives circle first; otherwise increasing x.

Remaining:
1. Surd-vs-double search: test `it.skip('is not what doubles give')` found no double mismatch in 4000 runs of range 7 (same-run circle pairs). Widen the search (ranges 4..1000, ties with equal exact height but different (q,r), i.e. rational heights) or report none exists; then un-skip or delete.
2. Mutations, not run: drop cancel on split; schedule diverging triples (orient>=0); doubles for heights in `compareKeys`; wrong root in `compareToBreakpoint`. Observe failure, revert, record counts in `22-mutations.log`.
3. `just lint src/compgeo/sweep`; random-run counts in `22-random.log` (test comment references it).
4. Test cleanup: the hit-case test has a clumsy trace-kind assertion (`slice(0,3).concat`); simplify to `['pop','status-insert','report']`.
Open math: hits occur in general position (no 4 cocircular), so "general position" random sets include exact hits; the (i,s,j) triple is skipped by construction after a hit (argued, not proven; fuzz passes).
