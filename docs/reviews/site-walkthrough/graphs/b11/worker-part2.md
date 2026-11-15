# B11 part 2 worker note (partial, budget handoff)

Reviewed (images read, after; before only for combinatorics binomial, level-sets, numerical root-finding, advanced-bezier coons):
probability 5, interpolation 5, projective-conics 5, advanced-bezier 4, analytic-lines 4, b-splines 6, circle-geometry 3, combinatorics 4,
curve-geometry 6/6, complex-maps 2, convexity-hulls 4, fourier-series 3, isometries 2, kinematics 2, level-sets 1, linear-maps 4,
mechanical-curves 2, numerical-methods 3, school-function-graphs 6, sweep-algorithms 5, triangle-geometry 5, triangulations-voronoi 2,
trigonometry 2, waves 2.

Not reviewed: patches (11, patchGuidedPreviewCopy.ts), phase-portraits, randomness, recursion, solids; trigonometry addition/cosine, waves standing,
triangulations voronoi-degenerate, kinematics 2 others, isometries dilation.

Not done: b11/index.html and before/after copies; just unit and tsc runs. Scratch: .command-logs/b11-before/ (all 123 before images, named <chapter>--<file>), .command-logs/b11-review-files.txt.

Looks wrong: projective-cross-ratio (content clumped small, centre), projective-three-views (tiny ellipse), advanced-bezier patch-coons (tiny, unchanged from before),
combinatorics lattice-paths x2 (tiny grid, huge text; unchanged layout), mechanical-curves drag-the-track and tautochrone (labels overlap curve/handles),
sweep segment-intersections (s1/s2 labels overlap, alt already says so).

## Continuation (second worker)

Reviewed: patches (subdivision, joins, control-net, decasteljau, derivatives, triangular; before for subdivision, joins), phase-portraits (pendulum, bifurcation; before for both), randomness (both; galton before missed), recursion (both), solids (both; no cube before read).
Verdicts: all fine except patches tensor-decasteljau (tiny figure), tensor-derivatives (S_u, S_v, S(u,w) labels overlap), subdivision S_L touches the edge. Joins shows S_{A,u} only apart from S(u,v); S_{B,u} is not visible.
Alt text changed: patchGuidedPreviewCopy.ts:16 (tensor-subdivision, SL/EN: pieces S_L, S_R, no net); phasePortraitsPreviewCopy.ts pendulum (overlapping texts -> crossed by axes and frame). Caption of tensor-subdivision still speaks of degree elevation (caption, not changed).
Page: b11/index.html, 2 pairs per chapter in before/ and after/ (pairs picked by alt change, then file-size change); all referenced images exist.
Checks: just unit (3 files) and tsc, see .command-logs/b11-review-checks.log.
