# New lesson-family candidates: top 15 (2026-11-09)

**Status:** research report, 2026-11-09. Not a spec or a scheduling decision. It ranks fifteen candidate chapter families that released content does not cover. The owner settled the criteria in a grilling session on the same day (below). Companion to the [first candidates](lesson-family-candidates-2026-10-31.md), the [expansion research](lesson-family-candidates-2026-10-31-expansion.md) and [new-lesson-families.md](../specs/new-lesson-families.md).

## Ranking rules (owner decisions, 2026-11-09)

- **Audience:** a mix tagged per family, with most families aimed at gimnazija (S). University (U) families are allowed.
- **Order:** teaching value first: topics students find hard, where dragging or animation adds something a textbook figure can't. Build cost breaks ties.
- **No curve-identity filter.** The early rule that a family should be "about curves" no longer applies, given the breadth of content now released.
- **Engine work:** at most half of the fifteen (7) may need new engine capabilities. This list uses 5.
- **Seeded sampling allowed** (unblocks #4): a fixed, visible seed, with the exact distribution drawn next to the simulation so every lesson is reproducible and contrasts simulation with theory. This revises the probability family's convolution-only choice for new families only.
- **3D solids** (unblocks #8): extend the existing 3D surface view (`SceneMesh`, patches) instead of adding a renderer; measure it first per the [performance plan](../performance-plan.md).
- **Vectors:** the earlier "standalone vectors lesson is low value" verdict stays. #2 is accepted because it is framed as the analytic geometry of lines, with the dot product as a tool, which fills the PIK §4.8 gap.
- **Parked candidates:** E5 and E9 enter the list; E10 enters at #15.

### Changes made while writing (handler decisions, reversible)

The owner approved a draft list. Checking `src/learning/content` then showed overlaps, so the list was adjusted as follows:

- The draft's **"Sequences, limits and series"** and **"Exponential growth and logarithms"** largely exist. The analysis chapter covers sequence definition, the ε-band and threshold \(N\), unbounded and oscillating sequences, and partial sums (`sequence-*`, `series-*`). The functions chapter covers growth and decay, doubling, mirroring and the logarithm as inverse (`exponential-*`, `inverse-logarithm`). Their unshipped parts merge into **#9 Recursion and growth models**.
- The freed slot goes to the runner-up named in the session: **#14 Waves, beats and sampling**.
- **#11** and **#12** are narrowed to the unshipped lessons of E1 and E2. Shipped already: `linear-map-basis-image`, `linear-map-determinant-area`, `complex-reciprocal-inversion`, `complex-roots-polygon`.
- **#6** excludes Thales, which `inscribed-angle-thales` already covers.

## Sources

- **PIK 2026 matura catalogue** (M-MAT-2026). Section anchors are reused from the [expansion research](lesson-family-candidates-2026-10-31-expansion.md#sources-and-how-they-were-read), which extracted its text: §4.3.4 complex numbers, §4.6 geometry in the plane and space (rigid motions, similarity), §4.7 incircle and circumcircle radii, §4.8 vectors, §4.10 functions, §4.12 sequences, §4.13 differential calculus, §4.16 probability, §4.17 statistics. **Gap:** this session could not extract PDF text (no `pdftotext` or `pypdf`). Section numbers for trigonometry, combinatorics, analytic geometry of the line, solids and integrals are therefore not cited and must be checked before any spec.
- **FMF 1Mate/2Mate course pages, 2025.** Links are listed in the expansion research: Afina in projektivna geometrija (110: isometries, frieze and wallpaper groups), Elementarna geometrija (123: power of a point, Apollonius circle), Algebra 1 (111: eigenvalues), Analiza 2a/2b/3, Verjetnost (153: random walks, LLN), Statistika (146: CLT, confidence intervals), Mehanika 1 (131: phase plane, Kepler), Matematično modeliranje (130: brachistochrone, catenary), Dinamični sistemi (322).
- **Dynamic-geometry research**, used for how lessons should guide dragging:
  - [Auburn ETD, conjectures in static vs dynamic environments](https://auetd.auburn.edu/handle/10415/854?show=full): DGS students made more relevant and fewer false conjectures but struggled to find counterexamples. This supports guided "predict, then drag" steps.
  - [LAU repository](https://laur.lau.edu.lb:8443/xmlui/handle/10725/2136): continuous variation can mislead without a guiding strategy.
  - [Korean Mathematical Education journal on conics](https://koreascience.kr/article/JAKO200734516326590.pub?lang=en): students treat conics only algebraically, and DGS helps with the geometric definition.
- **Comparable tools surveyed** (listings, not usage data): GeoGebra teacher materials ([example](https://www.geogebra.org/m/y6edyzgx)), [Desmos Classroom activities](https://amser.org/r29116/desmos_classroom_activities), [Mr Barton interactive topics](https://mrbartonmaths.com/topics/pythagoras-and-trigonometry/sine-cosine-rule-and-area-of-a-triangle/interactive.html). These show that unit-circle trigonometry, triangle rules, transformations and probability simulations are the most common interactive school topics, all absent from Bezeg.

## Ranked list

"Draft rank" is the position in the first draft of ten. ➕ marks additions from the extension to fifteen, and "merged" marks a family that absorbed draft entries.

| # | Family | Level | Engine | Effort | Draft rank |
|---|---|---|---|---|---|
| 1 | Trigonometry of the unit circle and triangle | S | — | low–med | 1 |
| 2 | Analytic geometry of lines | S | — | low–med | 3 |
| 3 | Combinatorics and Pascal's triangle | S | — | low–med | 2 |
| 4 | Randomness and simulation | S/U | seeded sampling | med | 7 |
| 5 | Isometries, similarity and symmetry | S (U for wallpaper) | — | med | 5 |
| 6 | Circle geometry and constructions | S | — | low–med | ➕ |
| 7 | Kinematics on curves | S | — | low | ➕ |
| 8 | Solids and volumes | S | 3D solids, cross-sections | med–high | 8 |
| 9 | Recursion and growth models | S | — | low | merged 4+6 |
| 10 | Level sets, gradient and optimization (E9) | S (LP) / U | marching squares | high | 9 |
| 11 | Eigen-directions and iterated maps (rest of E1) | U | — | low | ➕ |
| 12 | Complex maps continued (rest of E2) | S/U | — | med | ➕ |
| 13 | Phase portraits and dynamics (E5) | U | RK4, bifurcation raster | med–high | 10 |
| 14 | Waves, beats and sampling | S/U | — | low–med | ➕ (new) |
| 15 | Mechanical curves (E10) | S/U | singular-endpoint integrator | med–high | ➕ |

Engine families: #4, #8, #10, #13, #15 (5 of 15).

## Families

### 1. Trigonometrija na enotski krožnici in v trikotniku / Trigonometry of the unit circle and triangle (S)

- **Why first:** matura core and the most common interactive school topic elsewhere. Bezeg shows only the graphs (`trig-*`), not where sine and cosine come from.
- **Opening lesson:** drag a point around the unit circle; its \(y\) coordinate traces \(\sin\) on an unrolled axis beside it, so the graph is seen being produced from the circle.
- **Lessons:** radian as arc length; sine and cosine as coordinates, with signs by quadrant; identities from the picture (\(\sin^2+\cos^2=1\), symmetries); the sine rule via the circumcircle; the cosine rule as Pythagoras corrected; addition formulas by rotating a triangle.
- **Prerequisites in Bezeg:** function graphs (`trig-*`), circle kernel, inscribed angle lesson.
- **Kernel:** angle and arc readouts, unit-circle projection, triangle solver (SSS/SAS/SSA). **Engine:** none.
- **Risks:** the SSA ambiguous case needs both solutions drawn; degree/radian labelling; the sine-rule proof is an argument only if the construction uses the circumcircle.

### 2. Analitična geometrija premice / Analytic geometry of lines (S)

- **Opening lesson:** drag two points; the explicit, implicit and segment forms of the line update together, and vertical lines show why the explicit form breaks.
- **Lessons:** forms of a line and when each fails; normal vector and \(ax+by+c=0\); dot product, projection and the angle between lines; distance from a point to a line as a projection; intersections of a line with a line and with a circle (discriminant = 0 means tangent).
- **Prerequisites in Bezeg:** linear functions, vectors implicit in the Bézier foundations, circle kernel.
- **Kernel:** line-form conversion, projection, distance; exact rational arithmetic for parallel and perpendicular tests. **Engine:** none.
- **Risks:** tolerance for "parallel" (use exact predicates on grid points as in computational geometry); keep it from becoming the rejected standalone vectors lesson by anchoring every step on a line.

### 3. Kombinatorika in Pascalov trikotnik / Combinatorics and Pascal's triangle (S)

- **Opening lesson:** count monotone lattice paths to a dragged grid point; the counts fill in Pascal's triangle cell by cell.
- **Lessons:** product rule as a tree; permutations and combinations as path choices; Pascal's identity from the last step of a path; the binomial theorem by expanding \((a+b)^n\) over paths; row sums and alternating sums; a bridge to Bernstein polynomials (`/basics` foundations).
- **Prerequisites in Bezeg:** Bernstein lesson, binomial distribution (`binomial-explore`).
- **Kernel:** exact big-integer binomials, path enumeration for small \(n\). **Engine:** none.
- **Risks:** enumeration blow-up (cap \(n\) and switch to counts); BigInt for large rows.

### 4. Naključje in simulacija / Randomness and simulation (S/U) — engine

- **Opening lesson:** a Galton board drops seeded balls one by one while the exact binomial histogram sits behind them; the empirical bars approach it.
- **Lessons:** Galton board vs binomial; law of large numbers (running relative frequency); Monte Carlo area and \(\pi\); random walk and its \(\sqrt n\) spread; a two-state Markov chain converging to its stationary distribution; confidence intervals that miss about 5 % of the time.
- **Prerequisites in Bezeg:** probability family (density, binomial→normal, CLT).
- **Engine:** seeded PRNG module with a visible seed control and replay; batch drawing for thousands of samples (measure).
- **Risks:** reproducibility across browsers (use a specified integer PRNG, not `Math.random`); students may read one run as proof, so always draw the exact curve as well.

### 5. Izometrije, podobnost in simetrija / Isometries, similarity and symmetry (S, U for wallpaper)

- **Opening lesson:** reflect a shape in two draggable mirrors; the composite is a rotation by twice the angle between them, or a translation when they are parallel.
- **Lessons:** reflection, rotation and translation as mirror compositions; glide reflection; orientation; central dilation and similarity; rosette groups; frieze groups (the seven types).
- **Prerequisites in Bezeg:** linear maps, affine Bézier operations.
- **Kernel:** affine isometry classification, pattern tiling. **Engine:** none (tiling is ordinary SVG; measure the frieze lesson).
- **Risks:** classification must be exact on constructed inputs; wallpaper groups (17) are U-level and could become a later chapter.

### 6. Geometrija krožnice / Circle geometry and constructions (S)

- **Opening lesson:** drag a point outside a circle; draw both tangents and see that their lengths are equal, then that the product \(PA\cdot PB\) is the same for every secant (power of a point).
- **Lessons:** tangents from a point; power of a point and the radical axis; the circle through three points and the incircle (PIK §4.7 radii); the Apollonius circle; common tangents of two circles.
- **Prerequisites in Bezeg:** triangle geometry chapter (incl. `inscribed-angle-thales`, inversion).
- **Kernel:** circle–line and circle–circle intersections already exist in the circle kernel. **Engine:** none.
- **Risks:** tangency is a degenerate intersection, so it needs a stated tolerance; constructions must be true constructions to count as arguments.

### 7. Kinematika na krivuljah / Kinematics on curves (S)

- **Opening lesson:** a point runs along a parametric curve; its velocity arrow is the tangent and its acceleration arrow points into the bend.
- **Lessons:** position, velocity and acceleration vectors; speed vs parametrization (reuses the parametrization family); projectile motion and the parabola; uniform circular motion and centripetal acceleration; tangential and normal components with curvature.
- **Prerequisites in Bezeg:** parametric curves, curvature kernel, derivative lessons.
- **Kernel:** derivative vectors from the existing curve kernel. **Engine:** none.
- **Risks:** a physics framing must keep units and \(g\) consistent; velocity arrows need scale labels.

### 8. Telesa in prostornine / Solids and volumes (S) — engine

- **Opening lesson:** slide a cutting plane through a cube; the cross-section changes from triangle to hexagon.
- **Lessons:** plane sections of prisms and pyramids; Cavalieri's principle with two stacks; volumes of the pyramid and cone; solids of revolution as \(\pi\int f^2\); surface nets.
- **Prerequisites in Bezeg:** 3D patch view, integral lessons.
- **Engine:** closed-solid meshes, a section plane with polygon clipping, and a revolve operation in the 3D view. Measure first.
- **Risks:** 3D interaction on touch; precise section polygons need robust plane-clipping; performance.

### 9. Rekurzija in modeli rasti / Recursion and growth models (S)

- **Opening lesson:** a cobweb diagram for \(x_{n+1}=f(x_n)\) with a draggable start; it spirals into or away from the fixed point depending on \(|f'|\).
- **Lessons:** arithmetic vs geometric sequences as linear vs multiplicative steps; cobweb diagrams; compound interest and \(e\) as a limit; discrete logistic growth (bridge to E5); logarithmic scales and reading exponential data as a line.
- **Prerequisites in Bezeg:** sequence and series lessons, exponential lessons, fixed-point iteration (`fixed-point-cosine-*`).
- **Kernel:** recursion iterator (reuse fixed-point playback). **Engine:** none.
- **Risks:** overlap with existing sequence lessons, so cross-link instead of repeating; logistic chaos stays for E5.

### 10. Nivojnice, gradient in optimizacija / Level sets, gradient and optimization (E9, S for LP, U otherwise) — engine

- Details in the [expansion research E9](lesson-family-candidates-2026-10-31-expansion.md#e9-nivojnice-gradient-in-optimizacija--level-sets-gradient-and-optimization-u).
- **Opening lesson:** a contour map of \(f(x,y)\) with a draggable point; the gradient arrow is always perpendicular to the contour.
- **Engine:** marching squares plus a measured performance budget; the surface can reuse `SceneMesh`.

### 11. Lastne smeri in iterirane preslikave / Eigen-directions and iterated maps (rest of E1, U)

- **Opening lesson:** rotate a test vector \(v\) while \(Av\) is drawn; they become parallel exactly at the eigen-directions, and a rotation shows none.
- **Lessons:** E1 lessons 3–5 (eigenvectors, symmetric matrices and ellipses, composition); iterating \(A^n v\) to the dominant direction (power method); trace–determinant classification (bridge to E5).
- **Prerequisites in Bezeg:** linear maps chapter. **Engine:** none. **Risks:** as in E1 (complex eigenvalues, SVD vs eigen axes).

### 12. Kompleksne preslikave, nadaljevanje / Complex maps continued (rest of E2, S/U)

- **Opening lesson:** drag \(z\) and watch \(z^n\): the modulus is raised to the \(n\)th power and the argument multiplied by \(n\) (de Moivre).
- **Lessons:** polar form and de Moivre; Euler's formula \(e^{i\theta}\) as uniform circular motion; the grid under \(z\mapsto z^2\) (conformality); Möbius maps from three points; disc automorphisms.
- **Prerequisites in Bezeg:** complex multiplication, complex maps chapter. **Engine:** none (adaptive image sampling near poles; measure). **Risks:** as in E2 (∞, branch cuts).

### 13. Fazni portreti in dinamični sistemi / Phase portraits and dynamics (E5, U) — engine

- Details in the [expansion research E5](lesson-family-candidates-2026-10-31-expansion.md#e5-fazni-portreti-in-dinamični-sistemi--phase-portraits-and-dynamics-u).
- **Opening lesson:** drag the matrix entries of \(x'=Ax\); the trajectories switch between node, saddle, spiral and centre as the point crosses the trace–determinant parabola.
- **Engine:** RK4 integrator, bifurcation raster. Builds on #11 and #9.

### 14. Valovanje, utripanje in vzorčenje / Waves, beats and sampling (S/U)

- **Opening lesson:** add two sinusoids with nearby frequencies; the sum beats, and its envelope has the difference frequency.
- **Lessons:** superposition and phase; beats; standing waves as a sum of travelling waves; sampling a sinusoid and aliasing (a wheel spinning backwards); the Nyquist rate.
- **Prerequisites in Bezeg:** trig graph lessons, Fourier series.
- **Kernel:** sum of sinusoids, sampler, reconstruction. **Engine:** none (animated time parameter as in epicycles).
- **Risks:** aliasing pictures depend on the drawing resolution, so sample deliberately and state it.

### 15. Variacijski račun in mehanske krivulje / Mechanical curves (E10, S/U) — engine

- Details in the [expansion research E10](lesson-family-candidates-2026-10-31-expansion.md#e10-variacijski-račun-in-mehanske-krivulje--brachistochrone-and-mechanical-curves-u-s-enrichment).
- **Opening lesson:** race beads down a straight line, a circle arc and a cycloid; the cycloid wins (1.003 s vs 1.189 s for the line, with \(r=1\), \(g=9.81\), from the expansion research's checked samples).
- **Engine:** descent-time integrator with a substitution for the singular start.

## Gaps and next steps

- Check the PIK 2026 section numbers for #1, #2, #3, #8 and the integral part of #8 against the catalogue PDF before writing specs.
- Slovenian family names above are working names; decide them in each family's F0 terms table per [choosing new terms](../localization.md#choosing-new-terms).
- Each family, once chosen, gets a spec in `docs/specs/` and the F0–F6 slice plan in `docs/tasks/feature-streams/README.md`.
