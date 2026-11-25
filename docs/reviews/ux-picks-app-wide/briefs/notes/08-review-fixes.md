
## Batch B (worker)

- Items 1-7 done. Item 1: Bezier splines have knots normalized to [0,1], so only B-splines needed a domain; key adds weights, knots, degree, alpha, computed points. Item 5: Orodja `section` strings are free text (Ids.section is for cards), so Blossom Ids were already consistent; Elevation is now typed via exported BaseCurveIds. PointSet/BaseFunction ids are subclass-defined, no base id type exported.
- Red checks observed: B-spline end [2,2] vs [4,0]; knot memo same object; lease no throw; status idle vs paused.
- Full batch unit: 2 failures (my new tests), fixed; later reran base/runtime/FunctionInverse only: passed.
