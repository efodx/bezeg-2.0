# New lesson-family candidates: expansion

**Status:** research report, 2026-10-31. The catalogue, curriculum anchors and independent numerical checks ([sample sequences](#sample-sequences-numbers-checked-independently-in-python)) are complete; textbook section references are **unfinished** (see [Gaps](#gaps)).
**Scope:** Ten candidate chapter families that are *not* covered by the eight proposed families in [new-lesson-families.md](../specs/new-lesson-families.md) or by released content ([capabilities](../capabilities.md)). Each is anchored in a first-party curriculum source, with reuse, effort, dependencies and correctness pitfalls. Not an implementation spec or a feature decision. Companion to the [lesson-family candidates](lesson-family-candidates-2026-10-31.md) and [computational geometry candidates](computational-geometry-candidates-2026-10-31.md).

## Sources and how they were read

All accessed 2026-10-31.

**Read (text extracted from the live pages or PDFs):**

- **Matura catalogue, current edition.** RIC, [*Predmetni izpitni katalog za splošno maturo – Matematika* (M-MAT-2026)](https://www.ric.si/mma/M-MAT-2026.pdf/2024082313042788/?m=1724411067), linked from the [RIC maths subject page](https://www.ric.si/splosna-matura/predmeti/matematika/). This is **newer than the 2021 catalogue** used by the earlier report. The [MIK SM 2026](https://www.sc-nm.si/sestg/si/file/download/1601_4d0a77ca354/M-MIK%202026.pdf) (p. 32–33) names "PIK SM Matematika" as the exam basis, adopted at the 237th council session on 23. 5. 2024 and used from the spring 2026 term. Text extracted with `pdftotext -layout`. **The VR (higher-level) marker:** page 22 was rendered as an image and the marker is a ⇨ arrow before the item. In the text extraction it appears as a single leading space, while OR items have four spaces. VR labels below were read this way. Only page 22 was checked visually; the other labels need the same check. Sections used (printed page numbers):
  - §4.3.4 *Kompleksna števila* (p. 10–11): the complex plane, conjugate and modulus "analitično in geometrijsko", division, reciprocal, complex solutions of equations.
  - §4.6 *Geometrija v ravnini in prostoru* (p. 13): *znamenite točke trikotnika*, rigid motions (translation, reflection, rotation, orientation of a triangle), central dilation and similarity, inscribed and central angles. The goals list "nariše geometrijske like … s programi za dinamično geometrijo" and "preiskuje geometrijske probleme z uporabo IKT".
  - §4.7 (p. 14): radii of the triangle's incircle and circumcircle.
  - §4.8 *Vektorji* (p. 14–15): linear combination, basis, projection, dot product; *linearna neodvisnost* is VR.
  - §4.11 *Stožnice* (p. 19–20): analytic and geometric definitions. VR items: shifted hyperbola and parabola, *tangente stožnic*, "konstruira stožnice".
  - §4.12 *Zaporedja in vrste* (p. 20).
  - §4.13 *Diferencialni račun* (p. 21): tangent and normal, the angle between curves, extremal problems.
  - §4.16 *Verjetnostni račun* (p. 22): *normalna porazdelitev* is **OR**; conditional probability, independence and *zaporedje neodvisnih poskusov* are VR (checked visually).
  - §4.17 *Statistika* (p. 23): scatter plot, box plot, mean, median, standard deviation, interquartile range, "ocenjuje preproste povezave med statističnimi spremenljivkami".
- **FMF course pages, 2025 programme version** (Vsebina and readings sections only). Each URL has the form `https://www.fmf.uni-lj.si/sl/studij-matematike/programi/<program>/2025/predmeti/<id>/`.
  - 1Mate (first-cycle Mathematics) courses:
    - [Algebra 1 (111)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/111/): linear maps and matrices, *determinante, lastne vrednosti*, diagonalization, quadratic forms, *krivulje in ploskve drugega reda*.
    - [Analiza 2a (116)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/116/): functions of several variables, Jacobian, implicit function theorem, *prosti in vezani ekstremi*.
    - [Analiza 2b (117)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/117/): gradient, rotor, divergence; holomorphic functions; *konformne preslikave, elementarni primeri*; *holomorfni avtomorfizmi kroga*; *Fourierove vrste*.
    - [Analiza 3 (118)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/118/): phase space, vector fields, linear systems, *singularne točke linearnega sistema*, stability; *variacijski račun*, Euler–Lagrange.
    - [Analiza 4 (119)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/119/): Fourier and Laplace transforms, heat and wave equations.
    - [Afina in projektivna geometrija (110)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/110/): affine transformations, *dvorazmerje, harmonična četverka*, *pol in polara, Pascalov izrek*, classification of conics, plane isometries, frieze and wallpaper groups.
    - [Elementarna geometrija (123)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/123/): *potenca točke, inverzija*, Poincaré models, *Apolonijeva krožnica*, *Simsonova premica*, Ceva, *Eulerjeva premica, krožnica devetih točk*, Menelaus, Pappus, Desargues, Morley.
    - [Algebraične krivulje (114)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/114/): intersection multiplicity, Bézout, polars, the dual curve, rational curves, cubics.
    - [Verjetnost (153)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/153/): distributions, generating functions, random walks, the normal distribution, the law of large numbers, the Poisson approximation.
    - [Statistika (146)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/146/): *centralni limitni izrek*, confidence intervals, maximum likelihood, linear regression, Gauss–Markov.
    - [Mehanika 1 (131)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/131/): *fazna ravnina*, the harmonic oscillator, Kepler's laws, the Binet formula.
    - [Optimizacija 1 (134)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/134/): LP, *metoda simpleksov … geometrijski opis*, duality.
    - [Matematično modeliranje (130)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/1mate/2025/predmeti/130/): the *brahistohrona* and *verižnica*.
  - 2Mate (second-cycle) courses:
    - [Dinamični sistemi (322)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/2mate/2025/predmeti/322/): phase portraits, classification of critical points, Hartman–Grobman, Hopf bifurcation, *logistična enačba, podvajanje period in kaos*, Julia and Mandelbrot sets.
    - [Optimizacija 2 (360)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/2mate/2025/predmeti/360/): convex programming, Lagrange duality, KKT.
    - [Računalniško podprto geometrijsko oblikovanje (1718)](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/2mate/2025/predmeti/1718/) (2025): it now lists *višanje/nižanje stopnje*, *razcvet*, *zlepki nad triangulacijami: Argyrisov element*, *uvod v subdivizijske sheme* and *uvod v konstrukcijo gibanj togih teles*.
  - The FMF pages were fetched with Windows `curl.exe` and normal certificate checking (system store). The fetch tool's own TLS check failed.

**Only cited (not opened):** textbooks named in those syllabi, for example Košir–Magajna *Transformacije v geometriji*, Coxeter *Introduction to Geometry*, Perko *Differential equations and dynamical systems*, Arrowsmith–Place, Boyd–Vandenberghe *Convex optimization*, Ahlfors *Complex analysis*, Farin (5th ed.). No section numbers are given for them; they must be added when a family is specified.

**Not reached:** the gimnazija *Učni načrt Matematika* (2008). The PIK points to `portal.mss.edus.si/msswww/programi2012/…`, which was not tried before the stop. No 1PeMa (pedagogical) programme page exists at the guessed URL (it returned 404). The Finančna matematika programme was not checked.

**Repository reuse checked by search in this worktree:**
- [ComplexMultiplicationGraph](../../src/graphs/complex/ComplexMultiplicationGraph.tsx) with the [complex model](../../src/analysis/complex.ts): multiply, modulus, argument, polar snap.
- `AffineTransformBezierCurveGraph` (`/bezier/affine`) and the curve API in [point-controlled-curve.ts](../../src/bezeg/api/curve/point-controlled-curve.ts): `scale`, `rotate`, `moveFor`.
- [FixedPointGraph](../../src/graphs/functions/FixedPointGraph.tsx), which draws a cobweb.
- [UniformConvergenceGraph](../../src/graphs/functions/UniformConvergenceGraph.tsx).
- [riemann.ts](../../src/analysis/riemann.ts) and the integral graphs.
- [TrigonometricFunctionsGraph](../../src/graphs/functions/TrigonometricFunctionsGraph.tsx).
- The surface view [surfaceScene.ts](../../src/graphs/patches/surface-view/surfaceScene.ts): `SceneMesh` is a generic triangle mesh (positions plus faces), so a graph surface \(z=f(x,y)\) can be fed to it without patch code.
- The `LESSON_ANIMATION_IDS` closed set in [model.ts](../../src/learning/model.ts).

No code exists for matrices or eigenvectors, Möbius maps, Fourier sums, contours or level sets, probability densities, triangle centres or inversion (searches for `fourier`, `eigen`, `determinant`, `mobius`, `gradient`, `contour`, `logistic`, `cycloid`, `inversion`, `regression`, `gauss` found nothing relevant).

## Candidate catalogue

Effort: **low** = new lessons on an existing graph and kernel; **med** = new graph on an existing base plus a small tested kernel; **high** = new kernel family, new renderer or state model. Audience: S = gimnazija/matura, U = university.

### E1. Linearne preslikave ravnine / Linear maps of the plane (S/U)

- **Anchor:** FMF Algebra 1 (determinants, eigenvalues, diagonalization, quadratic forms, second-order curves); PIK 2026 §4.8 (linear combination and basis, OR; linear independence, VR) and §4.6 (rigid motions, orientation of a triangle).
- **Lessons and the "aha" of each drag:**
  1. *Matrika kot slika baze*: drag the images of \(e_1,e_2\); the whole grid and a Bézier curve follow, because a linear map is fixed by the basis images.
  2. *Determinanta kot predznačena ploščina*: the unit square's image area equals \(|\det A|\). The orientation flips (the label order reverses) exactly when the columns cross collinearity.
  3. *Lastni vektorji*: rotate a test vector \(v\); \(Av\) is drawn too, and the two become parallel at the eigen-directions. A rotation shows none.
  4. *Simetrične matrike in elipse*: the image of the unit circle is an ellipse whose axes are the singular directions; the quadratic form \(x^TAx=1\) as a conic (Algebra 1 "krivulje drugega reda").
  5. *Kompozitum in afine preslikave*: rotation ∘ reflection; affine invariance of Bézier curves (a bridge to `/bezier/affine`).
- **Reuse:** affine curve operations; Bézier curves as the object being transformed. **New:** a 2×2 matrix model, basis-handle graph, grid drawing.
- **Effort:** low–med. **Value:** high (first-year core and the matura vectors). **Dependencies:** none; E5 (phase portraits) reuses its trace/determinant view.
- **Pitfalls:** \(\det A=0\) collapses to a line (draw it, don't divide). Complex eigenvalues have no real eigen-direction: say so instead of drawing nothing. Floating-point "parallel" needs a stated tolerance. Lesson 4 needs symmetric \(A\) for orthogonal axes; for general \(A\) the axes come from the SVD, not the eigenvectors.

### E2. Kompleksne preslikave / Complex maps (S/U)

- **Anchor:** PIK 2026 §4.3.4 (conjugate, modulus, division, reciprocal, complex solutions; OR); FMF Analiza 2b (*konformne preslikave*, *avtomorfizmi kroga*).
- **Lessons:**
  1. *Konjugacija, obratna vrednost, deljenje*: \(1/z=\bar z/|z|^2\) is a reflection plus inversion in the unit circle; drag \(z\) across the circle.
  2. *Koreni enote in rešitve \(z^n=w\)*: a regular \(n\)-gon rotates as \(w\) moves. This is fair game: the [school function graphs](../specs/school-function-graphs-lessons.md) Out of Scope excludes complex roots.
  3. *Slika mreže pri \(z\mapsto z^2\)*: grid lines map to parabolas, crossing at right angles (conformality), except at \(0\), where angles double.
  4. *Möbiusove preslikave*: three draggable points fix the map; lines and circles map to circles or lines; the cross-ratio stays fixed.
  5. *Avtomorfizmi kroga* \(e^{i\theta}\frac{z-a}{1-\bar a z}\): drag \(a\) inside the disc; the disc maps onto itself.
- **Reuse:** `ComplexMultiplicationGraph`, `complex.ts` (multiply, polar). **New:** complex division and Möbius model, image-of-grid sampling.
- **Effort:** med. **Value:** high (matura plus Analiza 2b; it extends the released complex lesson). **Dependencies:** E3 shares inversion.
- **Pitfalls:** the point at \(\infty\) (a pole of the Möbius map: lines through it, clipping). Sampled images of lines near a pole need adaptive sampling. Conformality fails where \(f'=0\). Root ordering and \(\arg\) branch cuts must be stated.

### E3. Geometrija trikotnika in inverzija / Triangle geometry and inversion (S/U)

- **Anchor:** PIK 2026 §4.6 (*znamenite točke trikotnika*, explicitly with dynamic-geometry software), §4.7 (incircle and circumcircle radii); FMF Elementarna geometrija (Euler line, nine-point circle, Simson line, Ceva, power of a point, inversion, Apollonius circle).
- **Lessons:**
  1. *Znamenite točke*: centroid, circumcentre, incentre, orthocentre while dragging vertices; the circumcentre leaves the triangle exactly for obtuse triangles.
  2. *Eulerjeva premica in krožnica devetih točk*: \(H,G,O\) stay collinear with \(HG=2GO\); nine points on one circle of radius \(R/2\).
  3. *Inscribed angle and Thales*: drag a point on the arc; the angle stays constant.
  4. *Simsonova premica*: the feet of the perpendiculars are collinear iff \(P\) is on the circumcircle.
  5. *Potenca točke in inverzija*: circles through the centre map to lines; inversion preserves angles (it links E2 lesson 1).
- **Reuse:** the orientation predicate and point-set graph from the [convexity core](../specs/convexity-hulls-lessons.md); circumcircle code from the [triangulation kernel](../specs/triangulation-voronoi-lessons.md). **New:** triangle-centre model, circle–circle drawing.
- **Effort:** med. **Value:** high for school (explicit matura dynamic-geometry goal) and FMF Elementarna geometrija. **Dependencies:** convexity core (soft).
- **Pitfalls:** a drag shows instances, not proofs; collinearity and concurrency claims need a cited proof or an algebraic check, and the prose must say "the picture illustrates". Degenerate (collinear) triangles have no circumcircle. The Simson "collinear iff" needs a tolerance band labelled as such.

### E4. Verjetnost in statistika na grafu / Distributions, CLT and correlation (S/U)

- **Anchor:** PIK 2026 §4.16 (normal distribution OR; sequence of independent trials VR), §4.17 (scatter plot, box plot, standard deviation, "preproste povezave"); FMF Verjetnost (normal distribution, Poisson approximation), Statistika (*centralni limitni izrek*, linear regression).
- **Lessons:**
  1. *Gostota in verjetnost kot ploščina*: drag interval ends under the normal density, with a \(\mu,\sigma\) slider.
  2. *Binomska → normalna*: bars of \(B(n,p)\) over the normal curve as \(n\) grows; the Poisson regime for small \(p\).
  3. *Centralni limitni izrek brez naključja*: repeated convolution of a draggable density (uniform, skewed); the standardized sum approaches the normal curve. It is deterministic, so there is no random-seed issue.
  4. *Srednja vrednost, mediana, standardni odklon*: drag data points; an outlier moves the mean, not the median; a box plot.
  5. *Korelacija*: a scatter plot with \(r\); a nonlinear pattern with \(r\approx0\).
- **Reuse:** the Riemann/integral area drawing, `BaseFunctionGraph`. Regression must reuse the least-squares kernel of [interpolation I4](../specs/interpolation-approximation-lessons.md); do not duplicate it.
- **Effort:** med. **Value:** high (OR matura content and two FMF courses; no statistics in Bezeg yet). **Dependencies:** interpolation I4 for any regression line.
- **Pitfalls:** convergence in CLT is in distribution; a visual match at one \(n\) is not a rate. Discrete-to-continuous needs the continuity correction or must say it is ignored. \(r\) measures linear association only.

### E5. Fazni portreti in dinamični sistemi / Phase portraits and dynamics (U)

- **Anchor:** FMF Analiza 3 (phase space, linear systems, singular points, stability), Mehanika 1 (*fazna ravnina*, harmonic oscillator), Dinamični sistemi 2Mate (classification, Hopf, *logistična enačba, podvajanje period*).
- **Lessons:**
  1. *Linearni sistem \(x'=Ax\)*: drag entries or eigen-directions; the portrait changes type across the trace–determinant plane (node, saddle, spiral, centre).
  2. *Nihalo v fazni ravnini*: energy levels; a separatrix between swinging and rotating.
  3. *Linearizacija*: zoom into an equilibrium of a nonlinear system; the portrait approaches the linear one (Hartman–Grobman; fails for centres).
  4. *Logistična preslikava*: cobweb as \(r\) grows; period 2, then 4.
  5. *Bifurkacijski diagram*: precomputed on load, a vertical cursor tied to lesson 4.
- **Reuse:** the direction field and Euler renderer of [numerical methods N5](../specs/numerical-methods-lessons.md), the `FixedPointGraph` cobweb, E1 matrices. **New:** integral-curve tracing (RK4), a bifurcation raster.
- **Effort:** med–high. **Value:** high for U. **Dependencies:** N5 and E1.
- **Pitfalls:** numerical trajectories drift (Euler spirals outward on a centre; use RK4 and say so). Linearization does not decide centres. Chaos plots are finite-precision artefacts beyond short horizons. Julia/Mandelbrot excluded (the numerical spec already excludes Newton fractals; same rendering cost).

### E6. Fourierove vrste / Fourier series (U, S enrichment)

- **Anchor:** FMF Analiza 2b (*Fourierove vrste*), Analiza 4 (transforms).
- **Lessons:**
  1. Partial sums of a square or sawtooth wave with an \(N\) slider.
  2. Coefficients as projections: drag a function's shape (piecewise-linear handles); the bar spectrum updates.
  3. The Gibbs phenomenon: the overshoot does not shrink with \(N\) (uniform vs pointwise, a link to `UniformConvergenceGraph`).
  4. Smoothness vs coefficient decay.
  5. Epicycles drawing a closed Bézier spline (a complex Fourier series of a curve) as the bridge to the curve chapters.
- **Reuse:** trig graph, uniform-convergence band, curve sampling. **New:** a numerical coefficient kernel (quadrature) and an epicycle drawer.
- **Effort:** med. **Value:** med–high. **Dependencies:** none.
- **Pitfalls:** the Gibbs overshoot is ≈8.95 % of the jump (checked below; it does not shrink with \(N\)). Coefficient quadrature on discontinuous functions needs breakpoint-aware integration. At a jump the series converges to the midpoint.

### E7. Projektivna geometrija stožnic / Projective geometry of conics (U)

- **Anchor:** FMF Afina in projektivna geometrija (cross-ratio, harmonic quadruple, pole and polar, Pascal, classification of conics), Algebraične krivulje (polars, rational curves, conics), CAGD (conics as rational quadratics); PIK 2026 §4.11 *tangente stožnic* (VR).
- **Lessons:**
  1. *Dvorazmerje*: four points on a line under a central projection; the cross-ratio readout stays fixed.
  2. *Pascalov izrek*: drag six points on a conic; the three intersection points stay collinear.
  3. *Pol in polara, tangente*: the polar of an outside point passes through both tangency points.
  4. *Stožnica skozi pet točk* as a rational quadratic Bézier (the bridge to `/rational/*`).
  5. *Ena stožnica, trije pogledi*: ellipse, parabola and hyperbola as projective images of one conic, as the line at infinity moves.
- This family covers the tangent-line theory and rotated/general conics that the [school function graphs](../specs/school-function-graphs-lessons.md) Out of Scope leaves aside.
- **Reuse:** rational Bézier conics, Farin points. **New:** a homogeneous-coordinate kernel and a conic-from-5-points solver.
- **Effort:** med. **Value:** med. **Dependencies:** school S6 (focus–directrix) recommended first.
- **Pitfalls:** Pascal for a degenerate conic (Pappus) and points at infinity need homogeneous handling. The 5-point conic is degenerate when 3 points are collinear. Constrain dragged points to the conic exactly, by parameter, not by snapping.

### E8. Napredne Bézierjeve teme / Advanced Bézier topics (U)

- **Anchor:** FMF CAGD 2025 (*nižanje stopnje*, *razcvet*, *konstrukcija gibanj togih teles*).
- **Leftovers flagged:** this family collects ranked-but-unassigned items from the earlier reports. Those are Bézier clipping/intersection (CAGD rank 10 and computational-geometry rank 10, excluded by [convexity A6](../specs/convexity-hulls-lessons.md)), arc-length reparametrization (CAGD "—" row) and Coons patches (CAGD rank 11).
- **Lessons:**
  1. *Nižanje stopnje*: least-squares or endpoint-preserving degree reduction; an error readout against elevation (`/bezier/elevation`).
  2. *Presečišča krivulj z Bézierjevim rezanjem*: fat lines and clipped parameter ranges converge.
  3. *Naravna parametrizacija*: arc-length reparametrization of a Bézier curve vs the PH exact length.
  4. *Coonsova ploskev* on the patch surface view.
  5. Optional: rotation-minimizing frames for rigid-body motion. This needs a 3D curve view, which the [curve geometry](../specs/curve-geometry-lessons.md) spec excludes.
- **Reuse:** subdivision, elevation, PH length, surface view. **New:** reduction solver, fat-line clipping, Coons sampler.
- **Effort:** med–high. **Value:** med (deepens the core CAGD audience). **Dependencies:** convexity core for hull tests; curve geometry for frames.
- **Pitfalls:** degree reduction is not unique (state the norm and constraints). Clipping needs a termination tolerance, tangential intersections converge slowly, and hull overlap is not intersection.

### E9. Nivojnice, gradient in optimizacija / Level sets, gradient and optimization (U)

- **Anchor:** FMF Analiza 2a (*prosti in vezani ekstremi*), 2b (gradient), Optimizacija 1 (*metoda simpleksov … geometrijski opis*), Optimizacija 2 (Lagrange duality, KKT).
- **Lessons:**
  1. *Ploskev in nivojnice*: \(z=f(x,y)\) in the surface view next to its 2D contour map; one point is linked between both.
  2. *Gradient je pravokoten na nivojnico*.
  3. *Gradientni spust*: step-size slider, zig-zag in a narrow valley, divergence at large steps.
  4. *Lagrangeovi multiplikatorji*: drag along a constraint curve; the extremum is where the level curve is tangent (gradients parallel).
  5. *Linearno programiranje*: a feasible polygon, an objective line sweeping, and the simplex walk over vertices.
- **Reuse:** `SceneMesh` for generic surfaces; the convexity polygon graph for LP. **New:** marching-squares contours, a function catalogue in two variables.
- **Effort:** high. **Value:** med–high. **Dependencies:** convexity core (LP); a performance measurement for contours.
- **Pitfalls:** contours near saddles and flat regions; gradient descent claims depend on the step size and convexity. Lagrange tangency is necessary, not sufficient. LP degeneracy (cycling) and unbounded regions.

### E10. Variacijski račun in mehanske krivulje / Brachistochrone and mechanical curves (U, S enrichment)

- **Anchor:** FMF Analiza 3 (*variacijski račun*, Euler–Lagrange), Matematično modeliranje (*brahistohrona, verižnica*), Mehanika 1 (Kepler, Binet).
- **Lessons:**
  1. *Brahistohrona*: drag a Bézier track between two points; the descent time readout is compared with the cycloid.
  2. *Verižnica proti paraboli*.
  3. *Tautochrone*: equal descent times on a cycloid from any start.
  4. *Keplerjeve orbite*: initial velocity drag gives an ellipse, parabola or hyperbola, with equal areas.
- **Reuse:** Bézier curves, arc-length quadrature. **New:** a descent-time integrator with an endpoint singularity.
- **Effort:** med–high. **Value:** med. **Dependencies:** curve geometry L1 (parametric cycloid).
- **Pitfalls:** the time integral \(\int ds/\sqrt{2gy}\) is singular at the start (needs a substitution, not plain Simpson). The track must stay below the start height. "Cycloid is optimal" is a theorem the drag can only illustrate.

## Ranking (value/effort)

| Rank | Family | Audience | Effort | Value | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | E1 Linear maps of the plane | S/U | low–med | high | — |
| 2 | E2 Complex maps | S/U | med | high | (E3 shares inversion) |
| 3 | E3 Triangle geometry and inversion | S/U | med | high | convexity core (soft) |
| 4 | E4 Distributions, CLT, correlation | S/U | med | high | interpolation I4 |
| 5 | E6 Fourier series | U | med | med–high | — |
| 6 | E5 Phase portraits and dynamics | U | med–high | high | numerical N5, E1 |
| 7 | E7 Projective conics | U | med | med | school S6 |
| 8 | E8 Advanced Bézier | U | med–high | med | convexity core |
| 9 | E10 Brachistochrone and mechanical curves | U | med–high | med | curve geometry L1 |
| 10 | E9 Level sets and optimization | U | high | med–high | convexity core, perf measurement |

## Recommended next

1. **E1 Linear maps**: cheapest. It reuses the affine curve operations and serves both audiences; E5 builds on it.
2. **E2 Complex maps**: it extends the released complex-multiplication lesson and covers matura §4.3.4 goals that Bezeg does not show yet.
3. **E3 Triangle geometry**: the matura catalogue explicitly asks for dynamic geometry software (§4.6). Schedule it after the convexity core lands.

## Sample sequences (numbers checked independently in Python)

Run on 2026-10-31 with a standalone stdlib-only script (not committed); each value was compared against the closed form or a second method.

| Family | Check | Result |
| --- | --- | --- |
| E6 | Square-wave partial sums \(S_N\) of \(\operatorname{sign}x\): maximum on the first lobe | \(N=11\): 1.18130; \(N=101\): 1.17901; \(N=1001\): 1.17898; limit \(\tfrac{2}{\pi}\operatorname{Si}(\pi)=1.17898\). Overshoot ≈ 8.95 % of the jump 2, independent of \(N\). |
| E3 | Triangle \(A=(0,0)\), \(B=(7,0)\), \(C=(2,5)\) | \(R=3.80789\), nine-point radius 1.90394 \(=R/2\); nine-point centre \(=(O+H)/2\); an altitude foot and the midpoint of \(CH\) lie on it (errors 0 to double precision). |
| E5 | Logistic map \(x\mapsto rx(1-x)\), attractor period after 200 000 iterates | \(r=2.9\): 1; 3.1: 2; 3.44: 2; 3.46: 4; 3.54: 4; 3.55: 8; 3.565: 16; 3.569: 32. Consistent with \(r_2=1+\sqrt6\approx3.44949\) and the onset of chaos near 3.56995. |
| E10 | Cycloid \(r=1\) from \((0,0)\) to \((\pi,-2)\), \(g=9.81\) | Cycloid \(\pi\sqrt{r/g}=1.00303\) s (quadrature agrees); straight line 1.18904 s, 18.5 % slower. Tautochrone: starts at \(\theta_0=0.3, 1.0, 2.0\) give 1.0028, 1.0026, 1.0025 s by a plain midpoint rule; the small deficit is the endpoint singularity, which confirms the pitfall that the integrator needs a substitution. |
| E2 | Möbius map \(a=2+i, b=-1+\tfrac12 i, c=0.3-i, d=1+2i\) | Cross-ratio of four random points unchanged to \(6\times10^{-16}\); four concyclic points keep a real cross-ratio (imaginary part \(<10^{-16}\)). |
| E4 | \(X\sim B(20,\tfrac12)\), \(P(X\le8)\) | Exact 0.25172; normal with continuity correction 0.25117; without it 0.18555. The correction is not optional at classroom \(n\). |

## Correctness notes

- A drag shows instances. Any "always" claim (Euler line, Pascal, Simson, cycloid optimality, CLT) is stated as a theorem with a source; the picture is labelled an illustration.
- Exact decisions on dragged doubles (collinear, parallel, on the circle) follow the [shared predicate policy](../specs/new-lesson-families.md#shared-constraints): snap or use stated tolerances; never present a tolerance as exact.
- Sampled images under maps with poles (E2), trajectories (E5) and contours (E9) need adaptive or stated sampling; measure per the [performance plan](../performance-plan.md).
- Randomness (E4) is avoided by exact convolution; if sampling is added, it needs a fixed seed so lessons are reproducible.

## Gaps

- **Unfinished:** textbook section numbers. The books named above were only cited from the syllabi, not opened.
- The VR labels were read from text-extraction indentation; only PIK 2026 p. 22 was confirmed visually.
- The gimnazija *Učni načrt* (2008) was not reached; the 2026 PIK, which follows it, was used.
- FMF syllabi are the 2025 programme pages; the 2026 versions and the pedagogical and financial-mathematics programmes were not checked.
- Slovenian titles are working names; they are not settled by [choosing new terms](../localization.md#choosing-new-terms).
