# New lesson and lesson-family candidates

**Status:** research report, 2026-10-31
**Scope:** Ranked proposals for new guided lessons and new chapter families beyond the current Bézier, rational, spline, PH, parametrization, patch, complex-number, function and *Analiza I* coverage. Includes source grounding, reuse of current graphs, effort, sample sequences with independently checked numbers, and correctness notes. Not an implementation spec or feature decision. Computational geometry is covered separately in the [computational geometry candidates](computational-geometry-candidates-2026-10-31.md).

## Sources and how they were read

Primary sources actually opened (text extracted with `pdftotext`; page numbers are the printed numbers from each table of contents unless stated otherwise):

- **Matura catalogue.** RIC, [*Matematika — Predmetni izpitni katalog za splošno maturo*](https://www.ric.si/mma/M-MAT-2021/2019082714564660/) (Ljubljana 2019, valid from spring 2021 until replaced; the yearly MIK names the valid catalogue). PDF page = printed page. Relevant: §4.8 Vektorji (p. 14), §4.10 Funkcije incl. inverse functions and graph transformations (p. 15), "iskanje ničel z uporabo tehnologije" and "poišče ničlo … na predvideno natančnost" (p. 16), §4.10.6 logaritemska, §4.10.7 polinomska (incl. *metoda bisekcije*), §4.10.8 racionalna funkcija: ničle, poli, asimptote (p. 18), §4.10.9 kotne funkcije and their graph transformations (p. 19), §4.11 Stožnice (pp. 19–20), §4.12 Zaporedja in vrste (p. 20), §4.13 Diferencialni račun (p. 21). The catalogue marks higher-level-only (VR) items with a glyph that the text extraction lost; items such as *Hiperbola in parabola v premaknjeni legi*, *Tangente stožnic*, *Metoda bisekcije*, *Racionalne neenačbe* appear to carry it — confirm in the PDF before labelling a lesson OR/VR. Polar and parametric curves do not appear in the catalogue.
- **Gimnazija curriculum.** *Učni načrt Matematika, gimnazija (560 ur)*, ZRSŠ/MŠŠ 2008. **Not reached**: no working gov.si/ZRSŠ PDF was found; the dLib record that searches return is Marjan Jerman's 2008 *Obzornik* article about the curriculum, not the curriculum itself. The matura catalogue above is derived from it and is used instead.
- **FMF syllabi** (stm.fmf.uni-lj.si; 2016/17–2017/18 versions, current versions not checked):
  - [*Računalniško podprto (geometrijsko) oblikovanje*, 2ISRM 2016/17](https://stm.fmf.uni-lj.si/2ISRM/un1617/2ISRM_12L_Racunalnisko_podprto_(geometrijsko)_oblikovanje.pdf): de Casteljau, Bernstein, Bézier splines, rational Bézier, geometric continuity, tensor/triangular patches, conics as rational quadratics, and **"Krivulje B-zlepkov: lastnosti, algoritmi za delo z B-zlepki"**. Readings: Farin (4th ed.), de Boor, Bartels–Beatty–Barsky, Lai–Schumaker. B-splines are the only syllabus block Bezeg does not cover.
  - [*Numerične metode*, 1ISRM 2016/17](https://stm.fmf.uni-lj.si/1ISRM/un1617/1ISRM_3L_Numericne_metode.pdf): bisection, general iteration, *tangentna in sekantna metoda*, Newton for systems, linear least squares.
  - [*Numerične metode 2*, 1PrMa 2017/18](https://stm.fmf.uni-lj.si/1PrMa/un1718/1PrMa_3L_Numericne_metode_2.pdf): Bernstein polynomials/Weierstrass, C1/C2 and G1/G2 splines, local Hermite polynomial, trapezoid/midpoint/Simpson, Euler, trapezoid and Runge–Kutta for ODEs.
  - [*Analiza 2*, 1ISRM 2017/18](https://stm.fmf.uni-lj.si/1ISRM/un1718/1ISRM_1L_Analiza_2.pdf): curves given explicitly, implicitly, parametrically and **polarly**, tangent, curve sketching, arc length; first-order and linear second-order ODEs. Hladnik's [Analiza 2 lecture outline](https://users.fmf.uni-lj.si/hladnik/Analiza/Vsebina_predavanj.doc) (year header inconsistent: 2000/01 vs 2010/11) adds "ukrivljenost in krivinska krožnica". Evolutes and envelopes were not found in either.
  - [*Uvod v diferencialno geometrijo*, 1Mate 2017/18](https://stm.fmf.uni-lj.si/1Mate/un1718/1Mate_3L_Uvod_v_diferencialno_geometrijo.pdf): *spremljajoči trieder, Frenetove formule*, then surfaces.
- **CAGD texts.**
  - T. W. Sederberg, *Computer Aided Geometric Design* course notes ([BYU ScholarsArchive record](https://scholarsarchive.byu.edu/facpub/1), free use permitted by the author; read from a [2017-07-25 mirror](https://flurry.dg.fmph.uniba.sk/webog/SuboryOG/bohdal/ComputerAidedGeometricDesign.pdf), so the ScholarsArchive copy may number differently). Used: §1.6 Conic sections p. 14; §2.11 Curvature combs p. 33; §5.3 Overhauser (= Catmull–Rom) curves p. 54; ch. 6 B-spline curves pp. 57–82 (§6.1 polar form p. 58, §6.2 knot vectors p. 60, §6.4 multiple knots p. 62, §6.7 knot insertion p. 63, §6.8 de Boor p. 64, §6.13.2 interval halving ≈ generalized Chaikin, §6.14 basis functions p. 77); ch. 7 curve intersection incl. §7.7 Bézier clipping p. 90; ch. 8 Offset curves p. 99; ch. 10 interpolation (§10.2 Lagrange p. 111, §10.6 error bounds p. 115, §10.6.1 Chebyshev p. 118); §11.3 least-squares B-spline fit p. 122; §15.6 NURBS surface.
  - Prautzsch–Boehm–Paluszny, *Bézier and B-Spline Techniques* (Springer 2002); only the [authors' KIT preview](https://geom.ivd.kit.edu/downloads/pubs/pub-boehm-prautzsch_2002_preview.pdf) (front matter and contents) was read: §3.1–3.2 symmetric polynomials/main theorem p. 25–27; §3.7 intersections p. 32; §4.2–4.5 Lagrange, Newton, Hermite, piecewise cubic Hermite pp. 44–49; §4.7 least squares p. 53; §5.3 recursive B-splines p. 61; §5.4 de Boor p. 63; §6.1 knot insertion p. 77; §7.2 arc-length parametrization p. 93; §7.6 Frenet frame p. 97; §8.2 uniform subdivision p. 110; §8.9 four-point scheme p. 119. Body text not read.
  - M. S. Floater, [*An introduction to spline theory*](https://uio.no/studier/emner/matnat/math/MAT4170/v23/undervisningsmateriale/spline_notes.pdf) (UiO "Spline methods" draft, 2023-05-22): §2.4 cubic Hermite p. 23; §2.5–2.7 C2 interpolation, natural ends pp. 24–27; ch. 3 B-splines p. 31 (§3.4 recursion p. 37, §3.9 evaluation p. 44); ch. 5 knot insertion p. 57 (§5.3 variation diminishing p. 60); §6.3 least squares p. 72; ch. 8 blossoming p. 97.
  - Farin, *Curves and Surfaces for CAGD*: **not available**; cited only as the FMF syllabus reading. Floater's UiO notes on [Chaikin/B-spline subdivision](https://uio.no/studier/emner/matnat/math/MAT-INF4160/h13/undervisningsmateriale/bspline-sub.pdf) and the [four-point scheme](https://uio.no/studier/emner/matnat/math/MAT-INF4160/h13/undervisningsmateriale/fourpt.pdf) returned HTML, not PDFs. No source for Coons patches was opened.

Repository context: function lessons build on `BaseFunctionGraph` (fixed catalogue `square`, `sin`, `exp` in [src/analysis/functions.ts](../../src/analysis/functions.ts)); step-by-step lessons (bisection, sequences, fixed point) share [`IterativeFunctionGraph`](../../src/graphs/functions/IterativeFunctionGraph.tsx). Curves have polynomial/rational Bézier, splines in Bézier form (`GenericBezierSpline`, `chordKnots`), PH curves with an offset construction, and 3D support. There is **no** B-spline basis, knot vector or de Boor kernel, no curvature/osculating-circle display, and no Lagrange/Hermite/Catmull–Rom code (search for `knot`, `curvature`, `hermite`, `catmull`, `lagrange`, `newton`).

## Candidate catalogue

Effort: **low** = new lesson/scene on an existing graph and kernel; **med** = new graph on an existing base plus a small tested kernel; **high** = new kernel family, new state model or preset format. Audience: S = gimnazija/matura, U = university.

### 1. CAGD gaps

| Rank | Candidate and interaction | Source | Reuse / effort / audience |
| --- | --- | --- | --- |
| 1 | **B-spline basis (Cox–de Boor).** Slider for \(t\), editable knot vector, plot \(N_{i,k}(t)\) for degrees 0–3; show partition of unity, local support \([u_i,u_{i+k+1})\), and how a double knot drops continuity. | Sederberg §6.14 p. 77; PBP §5.3 p. 61; Floater §3.4 p. 37 | `BernsteinGraph` is the visual template. New kernel. **med–high**, U |
| 2 | **B-spline curve and de Boor algorithm.** Drag control points; animate the de Boor triangle at \(t\), reusing the de Casteljau animation styling; highlight the \(k+1\) active points. | Sederberg §6.8 p. 64; PBP §5.4 p. 63; Floater §3.9 p. 44 | `DecasteljauGraph` animation pattern; new curve object. **high**, U |
| 3 | **Knot insertion (Boehm) and multiplicity.** Insert a knot, watch one control point split into two on the old polygon edges with the curve unchanged; insert to full multiplicity to extract Bézier pieces, linking to the existing spline chapter. | Sederberg §6.3, §6.4, §6.7 pp. 61–63; PBP §6.1 p. 77; Floater ch. 5 p. 57 | Same kernel as 1–2. **med** after 1–2, U |
| 4 | **NURBS.** Add weights to B-spline control points; build the full circle from nine control points; compare with existing rational Bézier arcs. | Sederberg §15.6 (surface); FMF CAGD syllabus "racionalne"; curve-level NURBS chapter not in the sources read | Rational weights UI exists. **med** after 1–2, U |
| 5 | **Curvature, osculating circle, curvature comb on a Bézier curve.** Move \(t\); draw the osculating circle and a comb of normals scaled by \(\kappa\); show the endpoint formula; compare C2 vs G1 joins by comb continuity. | Sederberg §2.11 p. 33; Hladnik *Analiza 2* outline; PBP §7.1 p. 91 | Derivatives exist in Bézier kernel. **med**, U (and strong S enrichment) |
| 6 | **Hermite and Catmull–Rom interpolation.** Points with draggable tangent handles; convert cubic Hermite data to Bézier control points \(b_1=p_0+m_0/3\), \(b_2=p_1-m_1/3\); Catmull–Rom sets \(m_i=(p_{i+1}-p_{i-1})/2\). | PBP §4.4–4.5 pp. 48–49; Floater §2.4 p. 23; Sederberg §5.3 p. 54; NM2 "lokalni Hermiteov polinom" | Bézier spline objects. **med**, U |
| 7 | **Blossoming / polar form.** Three sliders \(t_1,t_2,t_3\) for a cubic blossom; equal arguments give the curve point, \(0/1\) arguments give control points; subdivision as blossom values. | Sederberg §6.1 p. 58; PBP §3.1–3.2 pp. 25–27; Floater ch. 8 p. 97 | De Casteljau kernel with distinct parameters per level. **med**, U |
| 8 | **Subdivision curves: Chaikin and four-point.** Repeat corner cutting \(\tfrac34,\tfrac14\) (limit: uniform quadratic B-spline) vs the interpolating four-point rule; count steps. | PBP §8.2 p. 110, §8.9 p. 119; Sederberg §6.13.2 | Polygon display only; no new evaluator. **low–med**, U/S |
| 9 | **Offset curves.** Generalize the PH offset to any Bézier curve: show that the offset is not a Bézier curve and develops cusps where \(1+d\kappa=0\). | Sederberg ch. 8 p. 99 | PH offset code exists. **low–med** after 5, U |
| 10 | **Bézier intersection by subdivision/clipping.** Two curves, recursive bounding-box subdivision until boxes are small. | Sederberg §7.4–7.7 pp. 88–90; PBP §3.7 p. 32 | Subdivision kernel exists; new display. **med–high**, U |
| 11 | **Coons patch.** Four boundary curves; the bilinearly blended surface; show it reproduces bilinear surfaces. | No source opened (Farin unavailable) | Surface view and patch scene. **med**, U; lowest confidence |
| — | Arc-length reparametrization | PBP §7.2 p. 93 | Extension of the existing parametrization family, not a new family |

### 2. Numerical methods on graphs

| Rank | Candidate and interaction | Source | Reuse / effort / audience |
| --- | --- | --- | --- |
| 1 | **Newton's (tangent) method.** Step tangent → \(x\)-intercept; compare speed with bisection; show a 2-cycle failure. | 1ISRM *Numerične metode* ("tangentna metoda"); PIK p. 16 ("ničla na predvideno natančnost z uporabo tehnologije") | `IterativeFunctionGraph` + derivative tangent. **low**, S/U |
| 2 | **Secant method.** Same scene, a secant through the last two iterates. | 1ISRM ("sekantna metoda") | Same base and secant from derivative lesson. **low**, U |
| 3 | **Trapezoid vs Simpson rule and their errors.** Halve \(h\); readout error ratio ≈4 vs ≈16; Simpson's parabola overlays. | NM2 1PrMa ("trapezna, sredinska in Simpsonova formula") | `riemann.ts` already has trapezoid. **low–med**, U |
| 4 | **Polynomial interpolation and the Runge phenomenon.** Lagrange polynomial through equispaced vs Chebyshev nodes for \(1/(1+25x^2)\). | Sederberg §10.2, §10.6.1 pp. 111–118; PBP §4.2 p. 44 | Function graph with new evaluator. **med**, U |
| 5 | **Least-squares line/curve fit.** Drag data points; show vertical residual squares; total minimized error. | 1ISRM ("linearni problem najmanjših kvadratov"); PBP §4.7 p. 53; Floater §6.3 p. 72 | Function graph. **med**, S/U |
| 6 | **Direction field and Euler's method.** Slope field for \(y'=F(x,y)\); Euler polyline from a draggable initial point; shrink \(h\). | NM2 ("Eulerjeva formula"); *Analiza 2* first-order ODEs | New field rendering (many segments; measure first). **med**, U |

### 3. Gimnazija/matura topics with strong graph value

| Rank | Candidate and interaction | Source | Reuse / effort / audience |
| --- | --- | --- | --- |
| 1 | **Graph transformations** \(y=a\,f(b(x-c))+d\). Four sliders on catalogue functions; ghost of the original; separate shifts, stretches, reflections. | PIK §4.10 p. 15; §4.10.9 p. 19 | `BaseFunctionGraph` + catalogue. **low**, S |
| 2 | **Inverse functions and the logarithm.** Reflect a graph in \(y=x\); a point and its mirror; reciprocal tangent slopes; \(\ln\) as inverse of \(e^x\). | PIK §4.10 p. 15, §4.10.3 p. 17, §4.10.6 p. 18 | Exponential lesson graph. **low–med**, S |
| 3 | **Rational functions: zeros, poles, asymptotes.** Drag zeros/poles of \(p/q\); show vertical and oblique asymptotes and the remainder term shrinking. | PIK §4.10.8 p. 18; limits/asymptotes p. 16 | New function family in the graph base. **med**, S |
| 4 | **Conics: focus–directrix and eccentricity.** Move a point on the conic; show \(|PF|=e\,|Pd|\); slide \(e\) through ellipse, parabola, hyperbola; then the conic as rational quadratic Bézier (bridge to the existing chapter). | PIK §4.11 pp. 19–20 ("analitična in geometrijska definicija"; tangents); Sederberg §1.6 p. 14; CAGD syllabus (conics) | Rational/Farin graphs for the bridge; new implicit/focal view. **med**, S/U |
| 5 | **Polynomial zeros and multiplicity.** Drag zeros and their multiplicities; crossing vs touching. | PIK §4.10.7 p. 18 | Function graph. **low–med**, S |
| 6 | **Geometric series partial sums.** Bars of partial sums approaching \(a/(1-q)\), and divergence for \(|q|\ge1\). | PIK §4.12 p. 20 | `SequenceGraph`. **low**, S |
| 7 | **Parametric and polar curves.** Rolling-circle cycloid/epicycloid trace, Lissajous figures, polar roses and cardioid with the radius ray. | *Analiza 2* (parametric, polar); not in the matura catalogue | Curve and arc-length graphs. **med**, U (S enrichment) |
| — | Vectors and linear combinations (PIK §4.8 p. 14) | Already implicit in the Bézier foundations (affine combinations); low added value as its own lesson |

### 4. Differential geometry of plane curves

| Candidate | Source | Reuse / effort |
| --- | --- | --- |
| Curvature and osculating circle (shared with CAGD 5) | Hladnik *Analiza 2*; PBP §7.1 | med |
| Evolute as the locus of curvature centres; offset cusps lie on it | Not in the FMF outlines read; standard material | low after the osculating circle |
| Envelope of a family of lines; the quadratic Bézier as the envelope of de Casteljau lines | No source opened; checked numerically below | low–med |
| Frenet frame \(T,N\) (2D), and \(T,N,B\) with torsion on a 3D Bézier curve | 1Mate *Uvod v dif. geometrijo*; PBP §7.6 p. 97 | med (3D needs the surface view) |

## Proposed families, ranked by value/effort

1. **Numerične metode na grafu / Numerical methods on the graph** (U, partly S). Newton → secant → trapezoid vs Simpson → Euler and direction fields; Runge and least squares optional. Value: two FMF courses plus a matura objective; directly continues bisection/fixed point. Effort: **low** for the first three lessons (reuse `IterativeFunctionGraph`, derivative tangent/secant, `riemann.ts`); Euler needs a field renderer.
2. **Geometrija krivulj / Geometry of curves** (U, S enrichment). Curvature and osculating circle → curvature comb on Bézier and spline joins → evolute → offsets (generalizing PH) → Frenet frame (2D, then 3D). Value: links *Analiza 2*, CAGD and the existing spline/PH chapters; strong projection visuals. Effort: **medium** (one curvature kernel reused by every lesson).
3. **B-zlepki in NURBS / B-splines and NURBS** (U). Basis and knot vectors → de Boor → knot insertion and multiplicity → Bézier extraction → NURBS circle; optional blossoming as the bridge from de Casteljau. Value: the only uncovered block of the FMF CAGD syllabus and the standard representation in CAD. Effort: **high** (new kernel, curve object, knot-vector state and preset format; needs its own spec and an ADR on the representation).
4. **Grafi funkcij za maturo / School function graphs** (S). Transformations → inverse and logarithm → polynomial multiplicities → rational functions and asymptotes → geometric series → conics (focus–directrix, then the rational Bézier bridge). Value: high reach for school audience; each lesson is small. Effort: **low–medium** per lesson; the function catalogue must grow beyond `square`/`sin`/`exp`.
5. **Interpolacija in aproksimacija / Interpolation and approximation** (U). Lagrange vs Bézier → Runge vs Chebyshev → Hermite and Catmull–Rom → least squares → Chaikin and four-point subdivision. Value: completes the "interpolate vs approximate" story the Bézier chapter starts. Effort: **medium**; subdivision curves benefit from B-spline work in family 3.

Parametric/polar curves fit as an opening chapter of family 2 or as a school-enrichment add-on to family 4.

## Recommended first batch

1. **Newton's method** (family 1) on `IterativeFunctionGraph`, reusing the derivative tangent.
2. **Trapezoid vs Simpson error** (family 1), extending the Riemann/integral graph with a Simpson sample and an error-ratio readout.
3. **Osculating circle and curvature comb on a cubic Bézier** (family 2), which introduces the curvature kernel later reused by evolutes, offsets and B-spline comb checks.
4. **Graph transformations** (family 4), the cheapest school-facing lesson.

Then write a bounded spec for family 3 (B-splines) as the next large investment; do not start it inside the first batch.

## Sample sequences (numbers checked independently in Python)

1. **Newton, \(f(x)=x^2-2\), \(x_0=1\).** Iterates \(1.5\), \(1.41\overline{6}\), \(1.4142157\) (\(\sqrt2\approx1.4142136\)): correct digits roughly double each step. Secant from \(1,2\): \(1.3333\), \(1.4\), \(1.4146\). Failure case: \(f(x)=x^3-2x+2\), \(x_0=0\) gives \(x_1=1\), \(x_2=0\), a 2-cycle.
2. **Quadrature, \(\int_0^\pi\sin x\,dx=2\).** Trapezoid errors for \(n=2,4,8\): \(0.4292\), \(0.1039\), \(0.0258\) (ratio ≈4). Simpson errors for \(n=2,4,8\): \(0.0944\), \(0.00456\), \(0.000269\) (ratio ≈16–21 and tending to 16).
3. **Euler, \(y'=y\), \(y(0)=1\), to \(x=1\).** \(h=0.5,0.25,0.125\) give \(2.25\), \(2.4414\), \(2.5658\); errors \(0.468\), \(0.277\), \(0.152\), approaching halving (first order).
4. **Curvature of a cubic Bézier at \(t=0\).** For \(b_0=(0,0)\), \(b_1=(1,0)\), \(b_2=(2,1)\), \(b_3=(3,3)\), the derivative formula and the endpoint formula \(\kappa(0)=\frac{n-1}{n}\frac{h}{a^2}\) (\(a=|b_1-b_0|=1\), \(h=\) distance of \(b_2\) from line \(b_0b_1\) \(=1\)) both give \(\kappa(0)=\tfrac23\).
5. **Parabola \(y=x^2\): curvature and evolute.** \(\kappa(0)=2\), radius \(\tfrac12\), centre \((0,\tfrac12)\); at \(x=1\): \(\kappa\approx0.17889\), radius \(\approx5.5902\), centre \((-4,3.5)\), matching the evolute \((-4x^3,\,3x^2+\tfrac12)\). An inward offset at distance \(d>\tfrac12\) therefore develops cusps.
6. **Quadratic B-spline, knots \((0,0,0,1,2,2,2)\), control points \((0,0),(1,2),(3,2),(4,0)\).** At \(t=0.5\) the basis values are \(0.25,0.625,0.125,0\) and the point is \((1,1.5)\); at \(t=1\) the values are \(0,0.5,0.5,0\) and the point is \((2,2)\). Inserting \(u=1\) gives control points \((0,0),(1,2),(2,2),(3,2),(4,0)\): two quadratic Bézier pieces joined at \((2,2)\); the first piece at its midpoint reproduces \((1,1.5)\). Uniform cubic basis at a knot: \(\tfrac16,\tfrac46,\tfrac16\).
7. **NURBS circle.** Quadratic, nine control points on the square \((\pm1,\pm1)\) with corners weighted \(\tfrac{\sqrt2}{2}\), knots \((0,0,0,\tfrac14,\tfrac14,\tfrac12,\tfrac12,\tfrac34,\tfrac34,1,1,1)\): maximum radial deviation over 1001 samples \(2.2\cdot10^{-16}\). The parametrization is not uniform in angle.
8. **Catmull–Rom, subdivision.** Points \((0,0),(1,2),(3,3),(4,0)\): Catmull–Rom tangent at \((1,2)\) is \((1.5,1.5)\). Four-point rule \(\frac{-p_0+9p_1+9p_2-p_3}{16}\) inserts \((2,2.8125)\); Chaikin replaces edge \(p_1p_2\) by \((1.5,2.25)\) and \((2.5,2.75)\).
9. **Runge, \(f(x)=1/(1+25x^2)\) on \([-1,1]\), degree 10.** Max error: equispaced \(1.9157\), Chebyshev \(0.1092\); degree 15: \(2.1076\) vs \(0.0831\). At degree 5 Chebyshev is *worse* in max norm (\(0.556\) vs \(0.433\)), so do not use degree 5 to make the point.
10. **Least squares.** Data \((0,1),(1,2),(2,2),(3,4)\): best line \(y=0.9x+0.9\), sum of squared residuals \(0.7\).
11. **Conic, ellipse \(a=5,b=3\).** \(c=4\), \(e=0.8\), directrix \(x=6.25\). At \((0,3)\): distance to focus \((4,0)\) is \(5\), to the directrix \(6.25\), ratio \(0.8\); focal distances sum to \(10\).
12. **Rational function \((x^2-1)/(x-2)\).** Zeros \(\pm1\), pole \(2\), oblique asymptote \(y=x+2\) with remainder \(3/(x-2)\) (\(0.375\) at \(x=10\)).
13. **Inverse slopes.** \(x^2\) at \((2,4)\) has slope \(4\); \(\sqrt x\) at \((4,2)\) has slope \(\tfrac14\).
14. **Envelope.** Lines \(\frac{x}{1-t}+\frac{y}{t}=1\) through the de Casteljau points \((1-t,0)\), \((0,t)\) envelope the quadratic Bézier with control points \((1,0),(0,0),(0,1)\), i.e. \(\sqrt x+\sqrt y=1\) (checked at \(t=0.25,0.5\)).
15. **Cycloid, \(r=1\).** One arch has length \(8\) (numerical \(8.0000000001\)) and area \(3\pi\).
16. **Coons patch.** Boundaries of \(z=uv\) on the unit square: the bilinearly blended patch returns \(z=0.25\) at \((0.5,0.5)\) and \(0.21\) at \((0.3,0.7)\), i.e. it reproduces the bilinear surface.

## Correctness notes and limits

- **B-splines.** State the knot convention (half-open intervals, special case at the right end of a clamped vector). Degree \(k\) vs order \(k+1\) differs between texts (Floater, Sederberg, PBP); pick one and say it. A knot of multiplicity \(m\) gives \(C^{k-m}\) continuity of the *parametrization*; the curve can still look smooth or have a cusp. Knot insertion leaves the curve unchanged; de Boor is not a subdivision.
- **NURBS.** Weights must stay positive for the convex-hull argument; the circle above is exact but not arc-length or angle-uniform.
- **Curvature.** Use signed curvature for combs and offsets; \(\kappa\) is undefined where \(r'(t)=0\). A curvature-continuous join needs G2, not just C1/G1; C2 implies G2 only for regular curves. The endpoint formula holds at \(t=0\) with \(b_1\ne b_0\).
- **Offsets.** The offset of a polynomial curve is generally neither polynomial nor rational (the reason for PH curves); it is regular only while \(1+d\kappa>0\) with the app's sign convention, and cusps of offsets lie on the evolute.
- **Newton/secant.** Quadratic convergence needs a simple root, \(f'\ne0\) nearby and a close enough start; secant order is \(\approx1.618\). Show failure cases explicitly; a converging-looking picture proves nothing in general.
- **Quadrature/Euler.** Error orders \(h^2\) (trapezoid), \(h^4\) (Simpson), \(h\) (Euler) assume enough smoothness; Simpson needs an even number of subintervals and is exact for cubics.
- **Runge.** Equispaced interpolation of this \(f\) diverges as the degree grows; Chebyshev nodes minimize the node polynomial's max, not the error for every degree (see sample 9).
- **Conics.** \(e<1\) ellipse, \(e=1\) parabola, \(e>1\) hyperbola; a circle has no directrix (limit \(e\to0\)). Matura level marks (OR/VR) must be checked against the PDF.
- **Rational functions.** A common factor of numerator and denominator gives a hole, not a pole; asymptotes need the degree comparison.
- **Sources.** The gimnazija curriculum itself, Farin, Coons-patch sources, Chaikin's paper, and Floater's subdivision notes were not read. Syllabi are 2016/17–2017/18 copies. PBP was read only from its contents. Sederberg page numbers come from a 2017 mirror. No source prose or figures should be reproduced; Sederberg permits free use, the others do not state it.
- **Performance.** Measure before choosing a drawing approach (see below).

## Gaps (unverified or unfinished)

- **Not reached:** the gimnazija *Učni načrt* PDF; Farin; Coons-patch sources; Chaikin's 1974 paper; Floater's UiO subdivision and four-point notes (HTML returned); a curve-level NURBS source (the circle construction is verified numerically only).
- **Partly read:** Prautzsch–Boehm–Paluszny (contents only, body unchecked); FMF syllabi are 2016/17–2017/18 copies; Sederberg pages are from a 2017 mirror.
- **Unchecked claims:** OR/VR level of matura items (marker glyph lost); evolute and envelope have no curriculum source; candidate CAGD 11 (Coons) rests on no opened source.
- **Out of scope here:** Bézier curve intersection/clipping (CAGD candidate 10) and other computational-geometry topics are left to the separate computational-geometry report; their ranking here is provisional.
- **Not done:** no check of current 2026/27 syllabi, no inspection of English school curricula, no measurement of rendering cost for combs, basis plots or direction fields.

## Performance note

- Direction fields, curvature combs and many-sample basis plots add many JSXGraph objects; measure dragging per [docs/performance-plan.md](../performance-plan.md) before choosing a drawing approach.
