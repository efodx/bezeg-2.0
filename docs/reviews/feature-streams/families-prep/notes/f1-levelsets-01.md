# f1-levelsets-01 (worker note)

Files (new): src/levelsets/functions2.ts, contours.ts, functions2.test.ts, contours.test.ts. No existing file edited.

API: CATALOGUE/CATALOGUE_IDS/isCatalogueId (functions2.ts); marchingSquares(f, window, n, c) -> Segment2[], levelCurve(segments) -> NaN-separated {x,y} (two points + NaN per segment, ADR 0037), contourLength (contours.ts).

Checks (observed): just unit src/levelsets 48 tests pass; just lint src/levelsets pass; tsc: no errors outside src/graphs/trig and src/solids; no trailing whitespace.

Mutations (each failed, then restored, files diffed identical):
- node f=c negative (`>=` to `>` in the case index): 2 failures (degenerate-value tests).
- saddle decider sign flipped (`-g*d >= 0`): 4 failures (xy cell c=0.5, -0.5, mirror, brute-force saddle check).
- gradient wrong sign (bowl y component): 4 failures (spec gradient, central difference, perpendicularity x2).

Spec reproduced: circle lengths/errors/radius errors at N=20,40,80; gradient vs central difference within 1e-9 (1000 points each).
Spec issue / reported value: LS2 acceptance 2 angle at N=40 for the bowl is 0.1799 rad (10.3 degrees) worst case (short cut-corner chords); test bound 0.2.
Decisions: chaining left out (spec says separate step); levelCurve emits one NaN-separated pair per segment. Hills second derivative bound 1, valley 20 for the vertex-within-interpolation-bound test.
Not done: no graph/UI, no performance measurement.
