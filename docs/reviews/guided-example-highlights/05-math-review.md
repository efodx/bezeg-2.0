# 05 math review (H4), working notes

Independent recomputation (node, /tmp/rv scripts, not from the expectation file):
- affine quarter turn about (3,1): (4,-1),(1,0),(2,2),(5,3); B(1/2) = (9/4, 1). OK.
- rational (1,2,1,1) at 1/2: (-9/11, 21/11). OK. rational quadratic (1,2,1): rows (-4/3,1),(4/3,1), end (0,1). OK.
- polynomial extrapolation t=1.2: (3.056, -3.872) = caption (3,06; -3,87). Rational: weights 1; 2.2; 0.52; 1.144, end (3.049, -3) OK; third control (13.54, 2.54).
- rational elevation: weights 1, 7/4, 3/2, 1, 1; P1' = (-22/7, 15/7) vs unweighted (-13/4, 3/2). OK. Rational subdivision weights OK.
- uniform PH fixture: L = 16.7167, L/11 = 1.5197 OK. Weighted warp phi(k/4), alpha 1/4: 1/2, 3/4, 9/10 OK.
- chordal spline alpha=1: J3 = (-3.325, 0.385); alpha=0: (-2.133, 0) via independent clamped B-spline. OK. C2 spline joints (-2.5,-1),(2.5,0), mid (0,-5/4), inner points OK.
- G1: (2,-2) OK; symmetric beta 1/4: J=(-1,3/2), derivatives (4,-2),(12,-6) OK. Cn q1=(2,-4), derivative (8,-4) OK. C1 joint (0,2), derivative (8,0) OK.
- PH cubic: r'(1)=(3,4), length 13/3, radius of curvature (4+t^2)^2/4 >= 4 OK. Quintic d=-2.5 self-intersection (-2.089,1.491), t 0.128/0.718; self-crossing for d in about [-2.65,-2.4] (none at -2.7, -2.35, -3, 3, 0.5, 1) OK. Quintic min radius 1 at t=1.
- arc length sin n=10: chords 3.81528, arc 3.82020 OK. Area 14/3, 16/3, 2/3 OK. Taylor T6(1)=1957/720, error 2.263e-4, bound e/5040=5.39e-4 OK. Darboux 1.75/3.75 OK. Convexity chord y=0.5x+1.5 OK.
- patches: control-net z(1/4,1/2)=9/40=0.225 vs 1.2 OK; triangular z(centroid)=1, boundaries z=0 OK; hull 16u(1-u)v(1-v) OK.

Evidence checks: verifyEvidence matches expected points against ANY visible point (1e-7) and curves against ANY sampled curve (1e-6); array-built curves sample as degenerate [0,0]x3 so they cannot carry checks.
