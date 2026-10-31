# Projective geometry of conics

**Status:** proposed, 2026-10-31. Specification only; implementation not scheduled.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates, expansion, E7](../research/lesson-family-candidates-2026-10-31-expansion.md) (lines 141–154). It cites the FMF 1Mate/2Mate 2025 syllabi *Afina in projektivna geometrija* (page c110: cross-ratio, harmonic quadruple, projective frame, pole and polar, cross-ratio on a conic, Pascal's theorem, classification of conics), *Algebraične krivulje* (c114: projective closure, tangents, polars, rational curves, conics) and *Računalniško podprto geometrijsko oblikovanje* (d1718: rational Bézier curves, weights, rational de Casteljau). All three pages were opened and their content lists read for this spec. The matura catalogue M-MAT-2026 §4.11 *Stožnice* (opened as `pik26.txt`) lists *Tangente stožnic* as a VR item (one leading space in the text extraction; not confirmed visually) with the goal "analitično in grafično obravnava tangento stožnice". Textbook chapters were cited, not opened. Part of the [new lesson families](new-lesson-families.md) index (the index row is added by the handler).

## Problem Statement

Bezeg shows that a circular arc is a rational quadratic Bézier curve and, in a proposed lesson, that the focus–directrix conics are too. It never shows why the same weight formula gives an ellipse, a parabola or a hyperbola, why a conic has "points at infinity", or what the classical theorems of projective geometry (cross-ratio, pole and polar, Pascal) say about the curves a student already draws. The FMF projective-geometry and algebraic-curves courses treat these as one theory, and the matura asks for tangents of conics. A student can accept each fact separately but cannot see that the three conic types are one curve seen against different lines at infinity, or that five points fix a conic and the rational Bézier form is a way to draw it.

## Solution

Add a Learn chapter **Projektivna geometrija stožnic / Projective geometry of conics** with five chapter-owned guided activities, each backed by a catalog Demonstration that also stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). The chapter is audience University; the tangent and polar lesson (K3) is readable at upper-secondary level (matura §4.11). Prose states theorems with their source and hypotheses; a drag shows instances and is labelled an illustration (exception: where a construction establishes the claim, say so). Each lesson is 5–7 steps, predicts before it reveals, and ends in free exploration. No exercises, grading or progress.

### Dependency on the school function graphs family, stated precisely

[school-function-graphs-lessons.md](school-function-graphs-lessons.md) lesson S6 owns: focus, directrix and eccentricity for axis-aligned conics, the defaults \(a=5,b=3\), \(y^2=4x\), \(x^2/9-y^2/16=1\), the quarter-ellipse rational Bézier with control points \((5,0),(5,3),(0,3)\) and weights \(1,\tfrac{\sqrt2}2,1\), and the weight rule "middle weight \(<1\) ellipse, \(=1\) parabola, \(>1\) hyperbola". Its Out of Scope leaves to a later extension: general conic recognition from \(Ax^2+Bxy+\dots=0\), rotated conics and tangent-line theory. This family is that extension and nothing else.

- **E7 does not duplicate S6.** It builds no focus–directrix view, no eccentricity slider, and no second weight-classification slider. Where it needs the weight rule it cites S6 and, once S6 is released, links to its Demonstration; K4 only explains *why* the rule holds (the denominator has real zeros exactly when the arc continues through infinity) and shows how to obtain the weight from a conic given by five points.
- **E7 reuses S6's numbers only as cross-checks.** The quarter ellipse appears in K4 as one default example because the bridge from five points must reproduce S6's weight \(\tfrac{\sqrt2}2\) (checked below). That equality is an acceptance test, which makes the two specs consistent by construction.
- **Order is recommended, not required.** Batch A (K1–K3) does not need S6. Batch B (K4–K5) assumes the S6 bridge for its prerequisite story; if S6 is not released, K4 stands on the existing Farin-point and circle lessons (`farin`, `circle` in `rationalConstructionGuidedLessons.ts`) and K5 omits the link step. S6 never depends on E7.
- **Shared code, one direction.** S6 needs only parametric sampling of axis-aligned conics. E7 needs the general (matrix) conic. If S6's sampler exists when E7 starts, E7 may reuse it for the axis-aligned cases; otherwise E7's conic sampler (below) is the only one and S6 may later adopt it. Neither spec waits for the other.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| A | Homogeneous-coordinate kernel; K1 Cross-ratio; K2 Pascal's theorem and Pappus; K3 Pole, polar and tangents | Kernel tests and the ADR on exactness pass; existing routes and Presets unchanged |
| B | Conic-through-five-points solver; K4 Conic through five points as a rational quadratic Bézier; K5 One conic, three views | Batch A released; the K4 equality with the existing rational chapter is checked; S6 recommended first |

### Reuse and new modules

Verified to exist in this worktree:

- `src/bezeg/impl/kernels/bezier-kernels.ts`: `toHomogeneous` (`[w·x, …, w]` rows), `fromHomogeneous`, `subdivideRational`, `extrapolateRational`, `elevateRational`. Rational Bézier operations already run as polynomial recurrences on homogeneous rows; the new kernel generalizes the same idea to points and lines of the projective plane. E7 reuses these for the arc in K4 and does not change them.
- `src/bezeg/impl/curve/rational-bezier-curve.ts` (`RationalBezierCurve`, weights, reactive weights, `setWeights`) and the demonstrations in `src/demonstrations.ts` lines 38–44: `rational` (`/bezeg-2.0/rational/base`), `rational-extrapolation`, `farin` (`/bezeg-2.0/rational/farin-points`), `circle` (`/bezeg-2.0/rational/circlen`). `FarinPointsCurveGraph.tsx` and `JXGRationalBezierCurve.ts` show Farin points; the guided lesson `farinLesson` (`rationalConstructionGuidedLessons.ts:410`) states they divide each edge in the ratio of the neighbouring weights.
- `RationalBezierCurveCircleGraphN.tsx:59` already records that two semicircle pieces are degenerate "(middle points at infinity), hence `MIN_CIRCLE_PIECES = 3`". That is the practical face of a point at infinity in the app, and K4 explains it.
- `rational-bezier-curve.ts:121–123` notes that evaluation uses the projected recurrence, and a homogeneous evaluator would change behaviour at zero intermediate weights. K4 therefore draws its arc from stored positive weights through the existing curve and uses the new homogeneous kernel only for the *derivation* of control point and weight, never to replace the evaluator.
- The proposed `src/compgeo/` predicate module ([convexity-hulls-lessons.md](convexity-hulls-lessons.md), shared core §1) owns the orientation predicate on grid points. Collinearity of three finite points is the same determinant as the homogeneous `det3` with \(w=1\).

New modules (names are suggestions; they sit in a new folder `src/projective/`, free of React, JSXGraph and localization):

- `homogeneous.ts`: **owned here, the homogeneous-coordinate kernel.** Type `Hom = readonly [bigint, bigint, bigint]` (a point or a line, up to nonzero scale), `join(p, q)` and `meet(l, m)` (both the cross product), `det3`, `isIdeal(p)` (\(w=0\), a point at infinity), `toAffine(p)` returning a discriminated result (finite point or direction), `lineAtInfinity`, `crossRatio(a, b, c, d)` as an exact fraction for four collinear points, `isHarmonic`, `project(centre, from, to, p)` (central projection between two lines). Collinear, concurrent and equal tests return exact booleans. Normalization divides by the gcd and fixes the sign; no floating point.
- `conic.ts`: **owned here, the conic-through-five-points solver.** `conicFromFivePoints(points)` returns the six integer cofactors \((A,B,C,D,E,F)\) of \(Ax^2+Bxy+Cy^2+Dxw+Eyw+Fw^2\) and a classification `unique | line-pair | pencil | invalid`; `classify(conic)` returns `ellipse | parabola | hyperbola | circle | line-pair | empty | ...` from the exact determinants; `polar(conic, p)`, `pole(conic, l)`, `tangentPoints(conic, p)`, `onConic(conic, p)`, `intersectLine(conic, l)`, `pointsAtInfinity(conic)`.
- `rationalArc.ts`: control polygon and weight of the rational quadratic arc between two conic points: \(P_1\) is the pole of the chord, \(w\) from a third point (K4).
- `pascal.ts`: the three Pascal points of a hexagon and the Pappus configuration, as thin functions over `join`/`meet`.
- A conic sampler (adaptive, handles the two branches of a hyperbola and the parabola) and a Demonstration graph class under `src/graphs/projective/` (name proposed).

### Decisions needing an ADR

1. **Exactness policy of the kernel.** The shared predicate policy forbids presenting a tolerance as exact. Alternatives: (a) `BigInt` homogeneous coordinates, all discrete outcomes exact, display values converted to doubles last; (b) doubles with a stated relative tolerance; (c) rational `Fraction` objects. The five-point solver's cofactors are degree ten in the input coordinates: for coordinates up to \(2^{12}\) (a \(\tfrac14\) grid over \(\pm1024\)) the bound is \(5!\,(2^{24})^5<2^{127}\) (NEW, computed), far beyond \(2^{53}\), so doubles cannot decide "degenerate" exactly. Recommendation: (a). Decide before Batch A.
2. **How a dragged point stays on the conic.** Alternatives: (a) parameter, not snapping: each draggable conic point carries a parameter of the *pencil of lines through a fixed base point \(Q_0\) of the conic*; the point is the second intersection of the line through \(Q_0\) with integer direction \((p,q)\), picked from a fixed table of directions (e.g. 256 directions with \(|p|,|q|\le64\)). The point is then exactly rational, so Pascal collinearity is decided exactly; (b) project the pointer onto the nearest conic point in doubles (a snap; the point is on the conic only to rounding and Pascal could only be a tolerance); (c) a rational parameter \(t\) specific to each conic type. Recommendation: (a), because one formula covers every nondegenerate conic and a vertical direction needs no special case (the direction tangent to the conic at \(Q_0\) returns \(Q_0\) itself). For example, on \(9x^2+25y^2=225\) with \(Q_0=(5,0)\) and direction \((1,m)\) the second point is at \(s=-90/(9+25m^2)\) along it, rational for rational \(m\) (checked algebraically). Keyboard users step through the table index; touch users drag and the point follows the nearest table entry. Decide before Batch A.
3. **Drawing a general conic.** Alternatives: (a) sample the same pencil parametrization (exact for every type; hyperbola branches break where the pencil direction is parallel to an asymptote, which is the point at infinity); (b) canonical form by eigen-decomposition (needs floating eigenvalues and a degenerate-case tree); (c) split into rational quadratic Bézier arcs. Recommendation: (a) for drawing, (c) only for the single arc of K4. Measure sampling counts for drag per the [performance plan](../performance-plan.md) before fixing the sample density.
4. **Where the Demonstrations live.** Alternatives: (a) a new Demonstration family `/bezeg-2.0/projective` with its own Preset collection (ADR 0016 pattern); (b) add under the rational family. Recommendation: (a), since only K4 touches rational curves; K4 links to `rational` and `farin`.
5. **Relation to the compgeo predicate module.** If the convexity core has landed, `orient` should be the `w=1` special case of `det3` (one source of truth) or an independent exact predicate with a cross-test; if not, `homogeneous.ts` ships alone and the convexity spec adopts it later. Either way no second policy document.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. All numbers were checked in Python with exact `Fraction` arithmetic or `float` where stated (scripts `check.py`, `check2.py`, 2026-10-31); "NEW" marks values first computed for this spec. Coordinates are stated in board units.

### K1. Cross-ratio

- Learning goal: four collinear points have a number, \((A,B;C,D)=\frac{(C-A)(D-B)}{(C-B)(D-A)}\), that a central projection from a point onto another line does not change, although lengths and ratios do; a harmonic quadruple is the case \(-1\). A point sent to infinity is handled by the same formula.
- Prerequisites: none beyond coordinates on a line; the lesson names a point at infinity as the limit of a point running away.
- Default example (NEW, checked, exact): points \(0,1,3,4\) on the line \(y=0\) give \((A,B;C,D)=\tfrac98\). Project from \(O=(0,5)\) onto the line \(y=1+\tfrac x2\): the images are \((0,1)\), \((\tfrac8{11},\tfrac{15}{11})\), \((\tfrac{24}{13},\tfrac{25}{13})\), \((\tfrac{16}7,\tfrac{15}7)\), and the cross-ratio of their \(x\)-coordinates is again \(\tfrac98\) exactly. Harmonic example: \(0,6,2,-6\) give \(-1\).
- Point at infinity (checked, exact): \(D=-10\) projects from the same centre to the direction \((-40,-20,0)\), a point at infinity of the image line. With \(C=3\) the cross-ratio \((0,1;3,-10)=\tfrac{33}{20}\), and for the image the limiting formula \((A,B;C,\infty)=\frac{C-A}{C-B}\) also gives \(\tfrac{33}{20}\).
- Steps: (1) four points on a line, predict what stays fixed under projection; (2) read lengths and ratios change; (3) the cross-ratio does not, with the formula; (4) drag the centre or the second line; (5) a harmonic quadruple and the \(-1\) readout; (6) a point goes to infinity and the readout continues; (7) free exploration.
- Graph needs: two lines, a centre, four points on the first line (draggable on a grid), projecting rays, image points, exact fraction readout next to a decimal, a clear marker and a text status when an image is at infinity or the centre lies on a line (projection undefined).
- Acceptance:
  1. The default values above match in a unit test using `crossRatio` and `project` on exact integers.
  2. Cross-ratio of the images equals the original exactly for every grid placement tested (property test over a sampled set).
  3. Two coinciding points or a centre on the first line yields a stated status, no division by zero.
  4. A point at infinity is shown by direction and marked; the readout switches to the limit formula and says so.
  5. The prose states the invariance as a theorem (cited to the FMF syllabus topic and a standard text, cited not opened) and labels the drag an illustration.
  6. Slovenian and English complete; values are read as text as well as drawn.

### K2. Pascal's theorem, and Pappus as the degenerate case

- Learning goal: for six points on a conic, the three intersections of opposite sides of the hexagon are collinear (Pascal); the theorem keeps holding when the conic is a pair of lines, which is Pappus's theorem; intersections may be points at infinity.
- Prerequisites: K1 helpful (points at infinity, `join`/`meet`); none required.
- Default example (NEW, checked, exact): the ellipse \(x^2/25+y^2/9=1\) at parameter points \(t=0,\tfrac12,1,2,-1,-\tfrac13\) of \((5\tfrac{1-t^2}{1+t^2},\,6\tfrac t{1+t^2})\): \((5,0)\), \((3,\tfrac{12}5)\), \((0,3)\), \((-3,\tfrac{12}5)\), \((0,-3)\), \((4,-\tfrac95)\), all on the ellipse exactly. In this order the Pascal points are \((-15,24)\), \((12,\tfrac35)\), \((\tfrac{15}2,\tfrac92)\), and their \(3\times3\) determinant is exactly \(0\).
- Pappus (checked, exact): \(A_1,A_2,A_3=(0,0),(2,0),(5,0)\) on one line, \(B_1,B_2,B_3=(1,3),(4,3),(6,3)\) on another, hexagon \(A_1B_2A_3B_1A_2B_3\): Pascal points \((\tfrac85,\tfrac65)\), \((\tfrac{22}5,\tfrac95)\), \((3,\tfrac32)\), exactly collinear (determinant \(0\)).
- Point at infinity (checked): \(A=(0,0),(1,0),(6,0)\), \(B=(4,3),(3,3),(8,3)\) with the same hexagon order: sides \(A_1B_2\) and \(B_1A_2\) are parallel, their intersection is the direction \((-9,-9,0)\), and the other two Pascal points \((\tfrac92,\tfrac32)\), \((\tfrac{24}5,\tfrac95)\) lie on a line of slope \(1\), the same direction; determinant \(0\).
- Steps: (1) six points on an ellipse, draw the hexagon and predict; (2) the three intersection points and the line through them; (3) drag points along the conic (by parameter) and read the exact collinearity status; (4) reorder the hexagon, including a self-crossing order, and note the line changes; (5) switch the conic to two lines and recognize Pappus; (6) a parallel pair of sides, the intersection at infinity and how the line is drawn; (7) free exploration.
- Graph needs: a conic selector (ellipse, parabola, hyperbola, line pair), six parameter handles (see ADR 2), hexagon sides, three intersection markers, the Pascal line, a determinant readout (exact value zero shown as "exactly collinear"), a text list of the intersections with infinity marked, and keyboard parameter stepping.
- Acceptance:
  1. For the default and Pappus examples the exact determinant is \(0\) and the status says "exactly collinear, exact arithmetic on exact points".
  2. Dragging changes the parameter only (ADR 2); the point is rational by construction, so the result is exact for every table position, tested by property test over random parameter sets and all four conic types.
  3. Intersections at infinity are classified, drawn as a direction marker or by an edge arrow, never with a huge finite coordinate; the Pascal line may be the line at infinity (no finite Pascal point drawn) and is then stated in text.
  4. If a conic point coincides with a neighbour, the hexagon side is undefined: the status says so; no NaN.
  5. The prose gives Pascal's theorem as a theorem with source and labels the drag an illustration; it does not claim proof by dragging.
  6. Slovenian and English complete; no dependence on colour alone for the three Pascal points.

### K3. Pole, polar and tangents

- Learning goal: the polar of a point \(P\) with respect to a conic is a line; for \(P\) outside, the polar passes through the two points of tangency of the tangents from \(P\); for \(P\) on the conic the polar is the tangent there; for \(P\) inside the polar misses the conic; the polar of the centre is the line at infinity.
- Prerequisites: coordinates and tangent lines of a circle or ellipse (matura §4.11); K2 optional.
- Default example (NEW, checked, exact): the ellipse \(9x^2+25y^2=225\). Take the points \(T_1=(4,\tfrac95)\), \(T_2=(-3,\tfrac{12}5)\), both on it. The tangents there, \(\tfrac{4x}{25}+\tfrac{y}{5}=1\) and \(-\tfrac{3x}{25}+\tfrac{4y}{15}=1\) (from \(\tfrac{x x_0}{25}+\tfrac{y y_0}{9}=1\)), meet at \(P=(1,\tfrac{21}5)\); its polar \(\tfrac x{25}+\tfrac{7y}{15}=1\) passes through \(T_1\) and \(T_2\) (both residuals exactly \(0\)). \(P\) is outside because \(\tfrac1{25}+\tfrac{441}{225}=2>1\).
- Steps: (1) the ellipse and a point \(P\); predict where the tangents touch; (2) draw the two tangents from \(P\) and their touching points; (3) the line through the touching points is the polar; (4) move \(P\) onto the conic (the polar becomes the tangent) and inside (no tangents, the polar misses); (5) the point at infinity in a direction and its polar, a diameter through the centre; (6) pole of a line, the same map in reverse; (7) free exploration.
- Graph needs: a draggable \(P\) on a grid and also placeable by coordinates, the conic selector (circle, ellipse, parabola, hyperbola), tangents drawn as lines or long segments, tangency markers, the polar line, a status text for the three regions, a readout of the equation of the polar and of each tangent.
- Acceptance:
  1. The default values match exactly in a unit test using `polar`, `pole`, `tangentPoints`.
  2. For \(P\) outside, both tangency points lie on the polar and each tangent passes through \(P\) (exact residuals \(0\) on grid points with exactly rational tangency points; where the tangency points are irrational the readout says "numerical" with a stated tolerance and the exact decision "outside/on/inside" remains exact).
  3. Inside, on, outside are decided exactly from the sign of the conic form at \(P\); no tolerance.
  4. A point at infinity gives a polar through the centre; the pole of the line at infinity is the centre (checked: for \(9x^2+25y^2-225\), the polar of \((1,0,0)\) is \(x=0\)).
  5. A parabola's centre is at infinity (its pole of the line at infinity is the point at infinity of its axis): the lesson states this and draws no finite centre.
  6. Tangents are labelled with the matura meaning (§4.11, VR item as read in the extraction) only after the VR label is confirmed visually; until then the lesson claims no matura level.
  7. Slovenian and English complete.

### K4. A conic through five points as a rational quadratic Bézier

- Learning goal: five points, no three collinear, determine exactly one conic; its arc between two of them is a rational quadratic Bézier curve with end weights \(1\), whose middle control point is the pole of the chord and whose weight comes from a third point; the Farin points and the shoulder point (curve point at \(t=\tfrac12\)) are the constructions of the existing lesson; weights above \(1\) correspond to the arc continuing to infinity.
- Prerequisites: the existing `farin` and `circle` lessons; S6's bridge recommended.
- Default example (NEW, checked): five points on \(9x^2+25y^2=225\): \((5,0)\), \((0,3)\), \((-5,0)\), \((4,\tfrac95)\), \((-3,\tfrac{12}5)\). The exact cofactors normalize to \(x^2+\tfrac{25}9y^2-25=0\) (i.e. \(9x^2+25y^2=225\)). The arc from \((5,0)\) to \((0,3)\): tangents \(x=5\) and \(y=3\) meet at \(P_1=(5,3)\); the midpoint of the chord is \((2.5,1.5)\); the conic point on the line from it to \(P_1\) is \((3.5355,2.1213)\) at ratio \(\lambda=\sqrt2-1\) along the segment, so \(w=\lambda/(1-\lambda)=\tfrac{\sqrt2}2\), the S6 weight. The Farin points are \((5,1.2426)\) and \((2.0711,3)\), whose midpoint is the shoulder \((3.5355,2.1213)\).
- Two further types (NEW, checked): hyperbola \(16x^2-9y^2=144\), arc from \((3,0)\) to \((5,\tfrac{16}3)\): \(P_1=(3,2)\) and \(w=\tfrac2{\sqrt3}=1.1547>1\); the denominator of the parametrization has real zeros at \(t=-1.366\) and \(t=2.366\) (discriminant \(4(w^2-1)=\tfrac43\)), outside \([0,1]\): extrapolation by the existing `rational-extrapolation` reaches infinity there, and points computed at \(t=0.2,-0.3,1.4\) lie on the conic to \(3\cdot10^{-15}\). Parabola \(y^2=4x\), arc from \((0,0)\) to \((4,4)\): \(P_1=(0,2)\), midpoint \((2,2)\), shoulder \((1,2)\), \(w=1\) exactly.
- Degenerate inputs (NEW, checked, exact): five points \((0,0),(1,1),(2,2),(3,0),(0,4)\), three collinear, give the unique conic \(96x^2-24xy-72y^2-288x+288y=0\) up to scale, with vanishing \(3\times3\) determinant: a line pair (the line \(y=x\) and the line through the two other points), not a smooth conic; four collinear points and coincident points give all-zero cofactors (a pencil of conics, no unique one).
- Steps: (1) five points; predict the curve; (2) the solver draws the unique conic; (3) choose two points as arc ends, tangents and the pole \(P_1\); (4) a third point gives the weight; Farin points and shoulder; (5) the arc as a rational Bézier equals the conic; (6) the hyperbola: the weight above \(1\) and the arc running to infinity, with extrapolation; (7) make three points collinear and see the line pair, then four, and read the status.
- Graph needs: five draggable points on a grid, conic drawn from the exact coefficients, selectable arc ends, tangents, \(P_1\), control polygon and weight readout, Farin points, the overlay of the existing rational curve with maximum deviation reported (as S6 does), a status line for `unique | line-pair | pencil | invalid`.
- Acceptance:
  1. The default cofactors, \(P_1\), \(w=\tfrac{\sqrt2}2\) (to \(10^{-12}\)) and Farin points match; the weight equals S6's bridge weight, tested against the value in [school-function-graphs-lessons.md](school-function-graphs-lessons.md) (S6, "Bridge").
  2. Classification is decided from the exact integer determinants. Collinear triples, four collinear points and duplicate points are detected exactly and shown with an actionable message; the solver never returns a numeric "nearest conic".
  3. The overlay reports the maximum distance between the Bézier arc and the exact conic over a sampled set (default 200 samples) below \(10^{-9}\); the figure says it is a sampled check.
  4. When the tangents at the chosen ends are parallel (\(P_1\) at infinity, the weight is \(0\) in homogeneous terms, as in two semicircle pieces), the status says the arc cannot be one finite quadratic piece and suggests a point between; no arithmetic with an infinite point is attempted, and the lesson links the existing note on `MIN_CIRCLE_PIECES`.
  5. An arc is one side only (inside the triangle \(P_0P_1P_2\) for \(w>0\)); the status says the complementary arc is the extrapolation, and does not claim the Bézier covers the whole conic.
  6. The five points are snapped to the grid (ADR 1) and the conic is recomputed live during a drag; a drag that passes through a degenerate position shows the status and keeps the last unique conic drawn, marked as stale.
  7. Existing rational Demonstrations, routes and Presets are unchanged; this lesson only reads from the rational curve classes.
  8. Slovenian and English complete.

### K5. One conic, three views

- Learning goal: ellipse, parabola and hyperbola are one projective conic seen against different lines at infinity. Fix the unit circle and a line \(L\): \(y=c\). If \(L\) misses the circle the image is an ellipse, if \(L\) touches it a parabola, if \(L\) cuts it a hyperbola, and the two points at infinity of the hyperbola are the images of the two points where \(L\) cuts the circle.
- Prerequisites: K1 (points at infinity), K4 (weights above \(1\)), S6's classification recommended.
- Default example (NEW, checked): the projective map \((x,y)\mapsto(X,Y)=\bigl(\tfrac x{y-c},\tfrac1{y-c}\bigr)\) sends \(L\) to infinity and the circle \(x^2+y^2=1\) to \(X^2+(c^2-1)Y^2+2cY+1=0\). For \(c=2\): \(B^2-4AC=-12<0\), an ellipse; \(c=1\): \(0\), the parabola \(Y=-\tfrac{X^2+1}2\); \(c=0\): \(4>0\), the hyperbola \(Y^2-X^2=1\). The \(3\times3\) determinant is \(-1\) in all three cases (the conic stays nondegenerate). Numerical check: 200 random points of the circle map to the stated equation to relative residual \(<10^{-15}\) for \(c=2,1,0,\tfrac12\).
- Steps: (1) the circle and a line \(L\) in the original plane; (2) predict the image type for \(L\) outside; (3) the image under the map and the sign of \(B^2-4AC\); (4) slide \(L\) to touch the circle, the parabola; (5) slide through the circle, the hyperbola, mark the two points at infinity and the asymptote directions; (6) the line through the images of the two points at infinity is the line at infinity itself; link to K4 and S6; (7) free exploration.
- Graph needs: two panels (source plane with the circle and \(L\); image plane), a slider for \(c\) on a decimal grid with an exact integer-tenths state, the type readout from the exact discriminant, markers for the two points at infinity as directions, an optional point on the circle (by parameter) and its image.
- Acceptance:
  1. For \(c\) on the slider grid the type is decided from exact integer arithmetic on \(c\) in tenths, so \(c=1\) is exactly the parabola and not "near".
  2. The images of dragged points satisfy the image equation to \(10^{-12}\) relative (a stated numeric check on drawn doubles).
  3. When \(L\) touches the circle (\(c=\pm1\)), the point of tangency is the image's only point at infinity, where the parabola meets the line at infinity; the status says so, and \(c\) values with \(|c|>1\) say that \(L\) misses the circle.
  4. The prose states that all nondegenerate conics are projectively equivalent as a theorem (cited to the FMF syllabus topic *klasifikacija stožnic*, cited not opened) and that the drawn family is an illustration, not a classification proof.
  5. The sampler for the hyperbola breaks at the two images of points at infinity, stated, and never joins the two branches.
  6. Slovenian and English complete.

## User Stories

1. As a student, I project four points through a centre and see that the cross-ratio does not move although the lengths do.
2. As a student, I drag six points along an ellipse and see the three Pascal points stay on one line, then see the same for two straight lines.
3. As a student of analytic geometry, I move a point, see its two tangents to an ellipse, and read the line through the touching points as its polar.
4. As a learner of CAGD, I place five points, see the unique conic through them and the rational quadratic Bézier arc with its weight, and see why a weight above \(1\) runs off to infinity.
5. As an educator, I slide a line against a circle on a projected screen and show an ellipse become a parabola and then a hyperbola.
6. As a student, I place three of five points on a line and read why the conic degenerates.
7. As any user, I move conic points with arrow keys or by coordinates instead of dragging, and switch language live.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

| English | Slovenian proposal | Basis to check |
| --- | --- | --- |
| cross-ratio | dvorazmerje | FMF c110 topic list uses "dvorazmerje" |
| harmonic quadruple | harmonična četverka | c110 "harmonična četverka" |
| homogeneous coordinates | homogene koordinate | standard; check `sl.ts` and the existing rational-curve wording ("homogene koordinate") |
| point at infinity | neskončno oddaljena točka | proposal; c110 speaks of embedding affine into projective geometry; compare "točka v neskončnosti" |
| line at infinity | neskončno oddaljena premica | follows the same choice |
| pole and polar | pol in polara | c110 "pol in polara" |
| Pascal's theorem | Pascalov izrek | c110 "Pascalov izrek" |
| Pappus's theorem | Pappusov izrek | proposal; to research (the FMF page does not name it) |
| conic | stožnica | c114 and c110 "stožnice"; matura §4.11 "Stožnice" |
| degenerate conic (line pair) | izrojena stožnica (par premic) | proposal; to research ("razpadla" is the alternative) |
| tangent to a conic | tangenta stožnice | matura §4.11 "Tangente stožnic" |
| projection from a centre | središčna projekcija | proposal; c110 "perspektivnost" is the related term |
| pencil of lines | šop premic | proposal; to research |
| weight | utež | existing `sl.ts` rational-curve term |

Final wording, sources and the table entry are recorded in the implementing change.

## Implementation Decisions

- All discrete decisions (collinear, concurrent, on/inside/outside a conic, degenerate, type of conic, point at infinity) use exact integer arithmetic (ADR 1); decimals are only for drawing and readouts, and a readout never presents a tolerance as exact. Drawn positions are converted last.
- Dragged points move by parameter on the conic (ADR 2), never by snapping to a nearest point; free points (five-point lesson, centre of projection, \(P\)) snap to a stated grid (shared predicate policy).
- The kernel and solver are pure modules with typed results (`finite | ideal`, `unique | line-pair | pencil | invalid`); callers never receive NaN or Infinity.
- Boards, listeners and handles have explicit owners and disposal as in the other graphs. Lesson scenes use typed scene actions applied in one synchronous tick; a graph reads the state written by earlier actions and keeps no mirror of state ([AGENTS.md](../../AGENTS.md)).
- New Demonstrations register routes, Preset collections and chapter content as the Analysis and rational families do (`familyChapters.ts`, ADR 0011, ADR 0016). Presets store the closed example id, grid points and parameter indices, validated on import; an unsupported file shows an actionable error.
- Existing routes, Demonstrations and stored Presets keep working; this family adds routes and Presets only. The existing `rational` Demonstrations are read, not modified.
- Hosting and app-shell code stay separate from the mathematics.

## Testing Decisions

- Kernel tests: cross products, cross-ratio invariance on exact integers, harmonic detection, projection to infinity, `isIdeal`, normalization; the default numbers above; exactness bounds with large coordinates (the \(2^{127}\) case).
- Solver tests: the five-point cofactors for the default set, rank classification for 3-collinear, 4-collinear and duplicate sets, `classify` for the three conic types and for the K5 family, polar/pole round-trip, the K3 numbers, tangent points, agreement with an independent Python or `node -e` recomputation recorded in the test header.
- Pascal/Pappus tests: exact zero determinants over a table of parameter positions and all four conic types; reordered hexagons; parallel sides.
- Rational bridge tests: weight \(\tfrac{\sqrt2}2\) equals S6's; Farin points against `farin` lesson formula; hyperbola extrapolation reaches the zeros of the denominator; the overlay deviation is below \(10^{-9}\).
- Scene tests: apply multi-action scenes in one synchronous tick; reject unsupported values; invalid or out-of-range Preset data.
- Lesson/content tests: step counts, both languages in lockstep, `lessonMathNotation.test.ts` unchanged and passing (undelimited formula fields, `{,}` for Slovenian decimals), `npx tsc --noEmit --pretty false` after localization changes.
- Browser: a smoke row per lesson (default scene, controls, reveal, restore, catalog link, refresh, narrow viewport, keyboard parameter stepping, touch drag). Full checklist only if shared catalogue or lesson runtime changes.
- Performance: dragging a conic point and the five points redraws a sampled conic; measure per the [performance plan](../performance-plan.md) before fixing the sample density and the pencil-table size. Do not replace JSXGraph on this evidence alone.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contracts above are met with checked examples and honest guarantees (exact where stated, tolerance only where stated).
3. Both languages, accessible inputs and keyboard parameter stepping, projection readability, restore on exit, Presets and figure export pass.
4. Existing routes, Presets and the rational Demonstrations behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass; commit and push follow the repository workflow.

## Correctness Notes

- Pascal, Pappus, pole–polar and cross-ratio invariance are theorems; a drag shows instances only. Only the construction in K3 (the tangency points lie on the polar) and the algebra of K4 establish what they state, and the prose says which.
- The conic through five points is unique only when no four are collinear and they are distinct; with exactly three collinear it is the degenerate line pair (checked). The solver reports this rather than a nearby smooth conic.
- A rational quadratic arc with \(w>0\) is one side of the chord only; \(w=1\) is the parabola, \(w>1\) the hyperbola, \(0<w<1\) the ellipse, with the infinite points where the denominator vanishes (discriminant \(4(w^2-1)\)). \(P_1\) at infinity (parallel end tangents) is the homogeneous weight \(0\) case and needs a split.
- A parabola has its centre at infinity and its two "points at infinity" coincide; a circle's two points at infinity are complex and are not drawn.
- Doubles are used only after exact decisions are made.

## Out of Scope

- Backend, accounts, assessment, grading, progress tracking, free-text conic equations, a formula parser, symbolic algebra.
- Focus–directrix, eccentricity and the weight-classification slider (owned by S6); rotated-conic recognition as a standalone lesson beyond what K3–K5 show; duality as a topic of its own; Steiner's and Chasles's theorems; Brianchon's theorem; Desargues; the cross-ratio on a conic as a separate lesson (a later extension; only named in the c110 syllabus).
- Cubics, Bézout's theorem and the Plücker formulas (c114) and anything beyond conics.
- Complex points, complex conics, the classification of pencils of conics.
- Rational Bézier surfaces and NURBS conics (see [b-splines-nurbs-lessons.md](b-splines-nurbs-lessons.md)); this family does not change the rational curve classes.
- Triangle geometry (see [triangle-geometry-lessons.md](triangle-geometry-lessons.md)) and circle inversion (owned by [complex-maps-lessons.md](complex-maps-lessons.md)); linear and projective maps beyond the one in K5 (the 2×2 linear-map kernel is owned by [linear-maps-lessons.md](linear-maps-lessons.md); this family's kernel is the \(3\times3\) homogeneous one and does not overlap it); Möbius maps of the complex plane (E2).
- Probability, Fourier and advanced Bézier topics ([probability-statistics-lessons.md](probability-statistics-lessons.md), [fourier-series-lessons.md](fourier-series-lessons.md), [advanced-bezier-lessons.md](advanced-bezier-lessons.md)).
- Renderer replacement and build-tool changes.

## Further Notes

A relation worth keeping in mind: complex Möbius maps are projective maps of the complex line, so the cross-ratio of K1 is the invariant that E2 uses; E7 does not depend on E2 and does not duplicate its kernel. Not verified: the VR label of §4.11 (read from extraction indentation only); textbook chapter numbers (cited, not opened); the current FMF syllabi (2025 pages); the Slovenian terms (all proposals); the real-device cost of sampling and dragging a conic; whether a 256-entry direction table gives acceptably smooth dragging.
