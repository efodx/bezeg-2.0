# Note: level-sets and phase-portraits specs (families-prep #10, #13)

Specs: `docs/specs/level-sets-optimization-lessons.md`, `docs/specs/phase-portraits-lessons.md`. Numbers were computed with Node scripts (kept in a temp directory outside the repository; the expressions are summarised below with their outputs).

## Reuse searches (src/)

- Found: `SceneMesh` surfaceScene.ts:40, `SceneMeshOwner.kind` closed union :54, `JsxSurfaceView` jsxSurfaceView.ts:159; `Rational` rational.ts:38, `RationalPoint` :128; `GridPoint` grid.ts; `doubledSignedArea` polygonMeasures.ts:41; `src/linear/{matrix2,eigen2,gridImage,singular2,linearMapModel}.ts` (the linear-maps kernel already exists); `src/graphs/linear/LinearMapGraph.tsx`; `src/analysis/{odeEuler,eulerField}.ts`; `FixedPointGraph.tsx`; ADR 0037, 0025.
- Not found (searched): contour, marching, gradient, simplex, halfplane, rk4, Runge, bifurc, pendul, phase; `src/recursion/` does not exist.
- sl.ts: *vozel* is the Bezier knot (so "node" gets *vozlišče*); *omejitev* means "limit" (step cap); *sedlo*, *stacionarna točka*, *oglišče*, *ploskev* exist; *nivojnica*, *gradient* absent.

## PIK M-MAT-2026 (python extraction, page = form-feed index)

- §4.10.1 Linearna funkcija, p. 16: "Linearna neenačba", "Sistem linearnih neenačb", "Modeliranje preprostih primerov ... z linearno funkcijo".
- §4.13 Diferencialni račun, p. 21: "Ekstremi, naraščanje in padanje funkcije", "Ekstremalni problemi".
- §4.12 Zaporedja in vrste, p. 20: "zapiše člene zaporedja pri danih začetnih členih in rekurzivni formuli".
- Searches for differential equations, phase plane, gradient: nothing. Two-column layout interleaves goals and content; level markers not verified.

## Checked numbers (level sets)

- Marching squares (script `ms`), f=x^2+y^2, c=1, window [-2,2]^2 positive = f>=c: N=20: 36 segments, length 6.2580994, err -0.0250859, max radius err 0.0049505; N=40: 76 seg, 6.2762855, -0.0068998, 0.0012473; N=80: 156 seg, 6.2813415, -0.0018438, 0.00031184; zero-length segments 0. `-2+4*30/40` => 1.
- Ambiguous cell f=xy on [-1,1]^2, N=1 (asymptotic decider): c=0.5 => segments [(-1,-0.5),(-0.5,-1)], [(1,0.5),(0.5,1)]; c=-0.5 => [(0.5,-1),(1,-0.5)], [(-0.5,1),(-1,0.5)]; c=0 => [(0,-1),(1,0)], [(0,1),(-1,0)]; f_s=(1*1-(-1)(-1))/4 => 0.
- Central difference of d/dx sin x sin y at (1,1), analytic 0.4546487134128409: h=1e-2: 7.58e-6; 1e-3: 7.58e-8; 1e-4: 7.58e-10; 1e-5: 7.89e-12; 6e-6: 4.19e-12; 1e-6: 4.21e-11; 1e-8: 2.91e-10; 1e-10: 1.72e-7.
- Gradient descent f=x^2+10y^2 from (2,1), h=H/100, stop f<1e-6: H=3: 123 steps; H=5: 73 (first iterates (2,1),(1.8,0),(1.62,0)); H=9: 40 ((1.64,-0.8),(1.3448,0.64),(1.10274,-0.512)); H=10: 10000 steps, f ends 10; H=11: 152 steps, f=1.18e25. Factors 1-H/5 = 0,-0.8,-1,-1.2; 1-H/50 = 0.9,0.82,0.8,0.78.
- Lagrange: foot (1,2), f=5, grad (2,4)=2(1,2); 4x-2y=0 with y=(5-x)/2 gives x=1 (by hand); f(theta)=sin 2theta max 1 at 45 degrees; det(grad f, grad g)=2(y^2-x^2)=0 at (1,1).
- LP vertex enumeration (integer Cramer, exact feasibility): {x+2y<=8, 3x+y<=9, x,y>=0}: (0,0),(0,4),(3,0),(2,3); objective 3x+2y: 0,8,9,12; objective x+2y: 0,8,3,8; degenerate {x+y<=4, x+3y<=6, x<=3}: (0,0),(0,2),(3,0),(3,1), objective 3x+2y: 0,4,9,11.
- Bowl at (0.6,0.8): grad (1.2,1.6), tangent (-0.8,0.6), dot product: see the end of this note (a floating-point check was running).

## Checked numbers (phase portraits)

- RK4 on centre [[0,-1],[1,0]], x0=(1,0), T=10, error vs (cos T, sin T): h=0.2: 1.33279e-4; 0.1: 8.3325e-6; 0.05: 5.2082e-7. Euler h=0.1, 63 steps radius 1.368117 = (1+h^2)^31.5 = 1.3681171. RK4 radius T=10 (h=0.1): 0.99999931.
- Spiral [[-0.25,-1],[1,-0.25]], T=10, h=0.1: exact (-0.0688752,-0.0446560), RK4 error 8.127e-7.
- Node [[-4,-1],[-2,-3]]: tau -7, det 10, disc 9; x0=(1,0): exact via eigen (2/3 e^-5 (1,1) + 1/3 e^-2 (1,-2)) = (0.0496037,-0.0857316); RK4 h=0.05 (20 steps): (0.0496047,-0.0857308), error 1.2288e-6; Taylor-series expm of (1,1) agrees with e^-5 to 3e-13.
- tau/det/disc: E=[[4,1],[2,3]] 7,10,9; diag(1,-1) 0,-1,4; spiral -0.5,1.0625,-4; centre 0,1,-4.
- Pendulum x0=(1,0): H0=-0.5403023; max |H-H0| over T=100, h=0.05: 1.4888e-7; period 2pi/AGM(1,cos 0.5)=6.6999757; small-oscillation 2pi=6.2831853; RK4 half-period (h=0.001) 3.3499878; H(0,2)=2, H(0,1.9)=0.805.
- weak-spiral r(t)=r0/sqrt(1+2 r0^2 t): r0=1,t=1: exact 0.5773503, RK4 0.5773502353; r0=0.1,t=10: exact 0.0912871, RK4 0.0912870941; r0=1,t=10: 0.2182179.
- Logistic periods (x0=0.2, 200000 transient, tol 1e-9, p<=64): 2.9:1; 3.1:2; 3.44:2; 3.46:4; 3.54:4; 3.55:8; 3.565:16; 3.569:32; 3.5:4. With x0=0.5: r=4 reports period 1 (orbit 0.5,1,0 hits the fixed point 0), the reason the spec uses x0=0.2. Period 3 (x0=0.5): 3.83, 3.835, 3.84: 3; 3.82: none; 3.9: none. 1+sqrt8=3.8284271.
- 2-cycle r=3.1: 0.5580141, 0.7645665; multiplier 4+2r-r^2: 3.1 => 0.59; 3.449 => -0.997601; 3.45 => -1.0025; 1+sqrt6=3.4494897; (R-100)^2: R=344 => 59536 (<60000), R=345 => 60025. 4-cycle r=3.5: 0.500884, 0.874997, 0.382820, 0.826941.
- r=4, x0=0.2: 400-bit BigInt orbit vs double differ >0.1 first at step index 52; separation 1e-10 reaches 0.1 at step 30; log2(0.1/1e-10)=29.897; Lyapunov estimate 0.6931455 vs ln2 0.6931472 (1e6 iterates); sin^2(32 theta)=0.5854205387 vs iterate 0.5854205387.
- Bifurcation raster 800 columns x (1000+300) iterates (1.04M evaluations, 240000 recorded): 6 ms in Node (x0=0.5 in the timing script; cost does not depend on x0).

## Not verified

PIK level markers; FMF syllabi and textbooks; Slovenian terms (no web access); onset of chaos 3.56995 (cited); asymptotic decider reference (memory); 1+sqrt8 (memory); browser performance; the dot product at (0.6,0.8) in floating point (see below).

## Late check

node -e "1.2*-0.8+1.6*0.6" => 0 (exact zero in doubles); 1.2*0.6+1.6*0.8 => 2 (= 2 * (0.6^2+0.8^2)... position dot gradient). Spec line counts: level-sets 160, phase-portraits 164 (dense lines).
