
## Batch B (worker)

- Items 1-7 done. Item 1: Bezier splines have knots normalized to [0,1], so only B-splines needed a domain; key adds weights, knots, degree, alpha, computed points. Item 5: Orodja `section` strings are free text (Ids.section is for cards), so Blossom Ids were already consistent; Elevation is now typed via exported BaseCurveIds. PointSet/BaseFunction ids are subclass-defined, no base id type exported.
- Red checks observed: B-spline end [2,2] vs [4,0]; knot memo same object; lease no throw; status idle vs paused.
- Full batch unit: 2 failures (my new tests), fixed; later reran base/runtime/FunctionInverse only: passed.

## Batch D (Taylor stroke)
New `src/graphs/functions/curveViewClip.ts` (+ test) clips the Taylor polynomial functiongraph path on its own line to the view +/- 1 view height (NaN breaks outside); wired in TaylorGraph.tsx. 20 count presses: 8.27 s (build before), master live 8.1 s, after 0.93 s. Board pixels (dash off) at degree 2/6/10: 0 / 792 / 792 px differ, max channel diff 1. Dash phase starts at the clipped point (not compared). Unit src/graphs/functions: all pass except a load-timeout in BisectionGraph.host (unrelated, first run); tsc, lint, build ok. Logs 08d-*.log, measure/count-puck/{before,after,master}.log.
