# Complex maps

**Status:** scheduled, 2026-10-31 (stream `maps`); amended 2026-11-10 by stream families-prep (Batch D, M6–M7, added only; M1–M5 unchanged). Tasks: [docs/tasks/complex-maps](../tasks/complex-maps/README.md). Decisions 2–3 and placement: [ADR 0029](../adr/0029-complex-maps-placement-graphs-and-domain.md).
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates, expansion, E2](../research/lesson-family-candidates-2026-10-31-expansion.md) (candidate E2 and the Möbius sample check), which read the matura catalogue M-MAT-2026 §4.3.4 (conjugate, modulus, division, reciprocal, complex solutions of equations; re-read here in `pik26.txt`, lines 410–436) and the FMF *Analiza 2b* page (117, 2025 version: "Holomorfne funkcije kot preslikave. Konformne preslikave, elementarni primeri. Schwarzeva lema. Holomorfni avtomorfizmi kroga in ravnine"; re-read here in `c117.html`). Textbooks (Ahlfors) are cited from syllabi only, not opened, and carry no section numbers. Part of the [new lesson families](new-lesson-families.md) index.

## Problem Statement

Bezeg teaches complex multiplication as rotation and scaling ([analysis-guided-lessons.md](analysis-guided-lessons.md), C4). It stops there. A student of the matura catalogue is asked to relate the conjugate and the reciprocal to geometry and to find all complex solutions of an equation, and an FMF student of *Analiza 2b* is asked to treat holomorphic functions as maps of the plane: conformality, Möbius maps and the automorphisms of the disc. The app cannot show what a whole grid or circle becomes, why \(1/z\) swaps the inside and outside of the unit circle, or why three points determine a Möbius map. These are best learned by dragging, and the pictures need careful handling at the point at infinity.

## Solution

Add a Learn chapter **Kompleksne preslikave / Complex maps** with five chapter-owned guided activities, each backed by a catalog Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). The audience is upper secondary (M1, M2) to university (M3–M5). Each lesson is 5–7 steps, predicts before it reveals, and ends in free exploration. No exercises, grading or progress. The released **complex multiplication** lesson and Demonstration (route `/complex-multiplication`, Foundations) stay exactly as they are; this family adds new Demonstrations and does not edit `ComplexMultiplicationGraph`.

This spec **owns the complex Möbius kernel**, including circle inversion \(z\mapsto c+r^2/\overline{z-c}\). [triangle-geometry-lessons.md](triangle-geometry-lessons.md) (E3) reuses the inversion and its circle image rather than writing its own. [linear-maps-lessons.md](linear-maps-lessons.md) (E1) owns the real \(2\times2\) kernel; complex multiplication and conjugation are real-linear maps, so E1 may link to M1 but there is no code dependency in either direction. [projective-conics-lessons.md](projective-conics-lessons.md) (E7) owns homogeneous coordinates; the Möbius matrix acts on homogeneous \((z,1)\), but this spec keeps its own small complex kernel.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| A | M1 Conjugate, reciprocal, division and inversion; M2 Roots of \(z^n=w\) | New Demonstrations pass the batch gate; the released complex multiplication lesson, route and Presets are unchanged |
| B | M3 The image of a grid under \(z\mapsto z^2\) | Batch A released; sampled-image kernel and its tests recorded |
| C | M4 Möbius maps; M5 Automorphisms of the disc | Batch B released; the ADR below on image drawing is accepted |
| D (added 2026-11-10) | M6 De Moivre: powers of a complex number; M7 Euler's formula as uniform circular motion | Batch A released; ADR for the graph shape accepted; F2a waits on Controls step 5 |

### Reuse and new modules

Verified by search in this worktree:

- `src/analysis/complex.ts` exports `Complex` (`{re, im}`), `complexMultiply`, `complexModulus`, `complexArgument` (principal argument in \((-\pi,\pi]\), `undefined` for 0), `complexToPolar`, `polarToComplex`, `snapPolarToGrid`, `argumentSum`, `isZero`, the 0.05 grid in \([-2,2]\) (`COMPLEX_COORDINATE_*`, `isComplexCoordinate`, `snapComplexCoordinate`) and the convention that grid products are computed in integer units of \(1/20\), so exact zeros and exact negative reals are exact. This is the precedent for exact decisions on dragged complex numbers and is reused for the new inputs.
- `src/analysis/complexFormat.ts` has `formatComplex`, `formatCoordinate`, `formatArgument`, `piMultiple` (language-aware); `src/analysis/complexModel.ts` and `src/graphs/complex/ComplexMultiplicationGraph.tsx` (`extends BaseFunctionGraph<ComplexModel>`, `BOARD_VIEW` at line 25) are the model/graph pattern. The graph is registered in `src/graphs/graphFactories.ts:65` and `src/demonstrations.ts:29` (family `basics`); Preset fields are validated in `src/graphs/functions/functionPresetCollections.ts` (`complexCoordinateFields`, line 145).
- `src/learning/model.ts` holds the closed sets `FUNCTION_PARAMETER_NAMES` (currently `complex-z-re` … `complex-w-argument`), `FUNCTION_VISIBILITY_TARGETS` (`complex-product`, `complex-arguments`) and `FUNCTION_CHOICE_NAMES` (`complex-example`). New lessons add their own names; the existing ones are not renamed.
- Not present (searched `mobius`, `inversion`, `conformal`): Möbius maps, inversion, images of grids, cross-ratio. These are new.

New modules (names are suggestions; pure mathematics stays free of React, JSXGraph and localization):

- `src/analysis/complexMobius.ts`: `Mobius` (four complex coefficients), `mobiusApply` with an explicit "pole" result, `mobiusCompose`, `mobiusInverse`, `mobiusDeterminant`, `mobiusThroughThree` (the map sending \(z_1,z_2,z_3\) to \(0,1,\infty\)), `crossRatio`, `circleInversion(z, c, r)` returning `{pole}` at \(z=c\), and `GeneralizedCircle` (below) with `mobiusImage`, `inversionImage`.
- `src/analysis/complexRoots.ts`: `nthRoots(w, n)` with the documented ordering.
- `src/analysis/complexImage.ts`: `sampleImage(f, t0, t1, tolerance, view)`, the adaptive sampler for maps that are not Möbius (M3), returning polyline runs split at non-finite values and out-of-view excursions.
- Model files and graphs, one per Demonstration (names `ComplexReciprocalGraph`, `ComplexRootsGraph`, `ComplexSquareGraph`, `ComplexMobiusGraph`, `DiscAutomorphismGraph` are suggestions).

**Generalized circle.** A circle or line is one object: the real form \(A|z|^2+\overline{B}z+B\bar z+C=0\) with \(A,C\in\mathbb R\), \(B\in\mathbb C\) and \(|B|^2>AC\). It is a line iff \(A=0\). Under \(w=Mz\) with \(M=\begin{pmatrix}a&b\\c&d\end{pmatrix}\) and \(N=M^{-1}\propto\begin{pmatrix}d&-b\\-c&a\end{pmatrix}\), the coefficient matrix \(H=\begin{pmatrix}A&B\\\bar B&C\end{pmatrix}\) becomes \(H'=N^{*}HN\). The new leading coefficient \(A'=Q(-d/c)\,|c|^2\) (where \(Q\) is the form), so **the image is a line exactly when the source passes through the pole \(-d/c\)** (and when \(c=0\) the pole is \(\infty\) and circles stay circles). Inversion is the anti-holomorphic case: conjugate first. All three derivations were checked numerically (below). With coefficients and circle data on the 1/20 grid the entries of \(H'\) are integers after scaling by 20 per factor, bounded by about \(2\times10^{7}\), far below \(2^{53}\) (hand-estimated bound, to be confirmed by the kernel's own range test); "passes through the pole" and "image is a line" are therefore decided exactly, never by a tolerance.

### Decisions needing an ADR

1. **Drawing the images of circles and lines.** (a) Analytic: draw the image as a circle or line computed from \(H'\), clipped to the view; (b) sample every image point by point; (c) analytic for Möbius and inversion, sampled only for maps that are not generalized-circle preserving (M3). Option (b) puts a pole inside the sampled parameter range, so the image runs off to infinity and tolerance and clipping decide what the learner sees. Recommendation: **(c)**; it makes the Möbius image exactly a circle or a line with exact status text, while the sampler is tested against the analytic images as ground truth. Decide before Batch C.
2. **One graph with a map choice or one graph per lesson.** (a) One `ComplexMapGraph` with `map ∈ {reciprocal, root, square, mobius, automorphism}` and shared board, grid and image code; (b) one graph per lesson as the Analysis family does. (a) shares the clipping and the grid; (b) keeps stored Presets and models simple. Recommendation: (b) for Batch A (small), revisit before Batch C, since M4 and M5 share the generalized-circle drawing.
3. **Operand domain.** Existing operands are on the 0.05 grid in \([-2,2]\). The new lessons keep that domain for dragged numbers (it makes M4/M5 data exact) while images may lie anywhere. Alternative: a free-double mode for the source with inexact status. Decide whether any lesson needs it; this spec assumes none.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Numbers below were checked in Python (marked checked; scripts `check3.py`, `more.py`, `samp.py` in the job directory, stdlib only). Exact-versus-tolerance is named per criterion: **exact** means integer or rational arithmetic on grid inputs; **tolerance** means a double comparison with the stated bound, shown to the learner as approximate.

### M1. Conjugate, reciprocal, division and inversion

- Learning goal: \(1/z=\bar z/|z|^2\); geometrically, reciprocal is inversion in the unit circle followed by reflection in the real axis. A point inside the circle goes outside. Division \(w/z\) is \(w\cdot\frac1z\).
- Prerequisites: complex multiplication (released); the unit circle.
- Default example (checked): \(z=1+i\) gives \(1/z=0.5-0.5i\); \(z=0.5+0.5i\) gives \(1-i\); \(z=0.6+0.8i\) on the unit circle gives \(0.6-0.8i=\bar z\); \((2+i)/(1-i)=0.5+1.5i\). Inversion in the unit circle: \(z\mapsto z/|z|^2\), so \(1+i\mapsto0.5+0.5i\) and the conjugate of that is \(0.5-0.5i\).
- Steps: (1) drag \(z\) and predict \(\bar z\) (reflection) and \(|z|\); (2) show \(1/z\) and its modulus \(1/|z|\) and argument \(-\arg z\); (3) inside versus outside the unit circle; (4) on the circle \(1/z=\bar z\); (5) division \(w/z\) with a second point; (6) show the circle inversion \(z\mapsto c+r^2/\overline{z-c}\) with a draggable centre and radius as the geometric step, naming the link to the triangle-geometry lesson; (7) free exploration.
- Graph needs: draggable \(z\) (and \(w\)), the unit circle, the images, a readout of modulus and argument of each, a status for \(z=0\) ("not defined; \(1/z\) grows without bound as \(z\to0\)") and a text alternative of every position.
- Acceptance:
  1. Values above match to the displayed decimals (tolerance \(10^{-12}\) in the unit test; grid inputs make \(1/z\) for the listed points exactly representable up to the double rounding of \(0.6\)).
  2. \(z=0\) is reachable on the grid and gives the not-defined status; no \(\infty\) or NaN is displayed as a number.
  3. \(1/z=\overline{\text{inversion}(z)}\) holds in a test over a grid (tolerance \(10^{-12}\)); \(|z|=1\) is decided exactly in grid units, not by tolerance.
  4. `circleInversion(z,c,r)` is an involution (applying it twice returns \(z\), tolerance \(10^{-12}\)), fixes points of the circle exactly when \(|z-c|=r\) is decided exactly in grid units, and returns the pole result at \(z=c\). It reverses orientation: the angle between two directions keeps its size and changes sign (checked: \(-90^\circ\) at \(0.5+0.5i\) for directions \(1\) and \(i\)).
  5. Slovenian and English complete; decimal commas in Slovenian lesson math.

### M2. Roots of \(z^n=w\)

- Learning goal: \(z^n=w\) with \(w\ne0\) has exactly \(n\) solutions at the vertices of a regular \(n\)-gon of radius \(|w|^{1/n}\); rotating \(w\) by an angle rotates the polygon by one \(n\)th of it; the roots sum to \(0\) for \(n\ge2\) and have product \((-1)^{n+1}w\) (Vieta, cited, not derived here).
- Prerequisites: M1 or complex multiplication; polar form.
- Default example (checked): \(n=3\), \(w=2i\): roots \(2^{1/3}e^{i\pi/6}\approx1.0911+0.63i\), \(\approx-1.0911+0.63i\), \(\approx-1.26i\) at \(30^\circ,150^\circ,270^\circ\) (\(-90^\circ\) as a principal argument), radius \(2^{1/3}\approx1.26\), each cubing to \(2i\), sum \(0\), product \(2i\). Changed from \(w=8i\) on 2026-10-31: \(8i\) lies outside the shared complex coordinate range \([-2,2]\) (`src/analysis/complex.ts`), and widening it would shrink every complex graph; the angles are unchanged. Second example \(w=1+i\), \(n=3\): modulus \(2^{1/6}=1.12246\), first root at \(15^\circ\) (\(\pi/12\)); roots at \(15^\circ,135^\circ,-105^\circ\).
- Steps: (1) the cube of a point as rotation by three times the angle; (2) \(w\) fixed, find the points whose cube is \(w\); (3) reveal the triangle; (4) rotate \(w\) and see the polygon turn by a third; (5) change \(n\); (6) the labelling: each root's label jumps when \(w\) crosses the negative real axis though the set does not; (7) free exploration.
- Graph needs: draggable \(w\) on the grid, \(n\) from 2 to 8, the roots with indices, the \(n\)-gon, optional \(z\) that the learner drags and checks \(z^n\) against \(w\); readouts of the roots as \(re+im\,i\) and polar.
- **Ordering and branch cut** (stated in the lesson): root \(k\) is \(|w|^{1/n}e^{i(\operatorname{Arg}w+2\pi k)/n}\), \(k=0,\dots,n-1\), with the principal argument in \((-\pi,\pi]\) as in `complexArgument`. Root \(0\) is the principal root. The labelling is discontinuous across the negative real axis: for \(w=-8\pm10^{-12}i\) and \(n=3\) the arguments of roots \(0,1,2\) are \(60^\circ,180^\circ,-60^\circ\) (just above the axis) and \(-60^\circ,60^\circ,-180^\circ\) (just below), checked; the set of roots is the same to within \(10^{-12}\). A exactly negative real \(w\) has argument exactly \(\pi\) by the existing grid rule.
- Acceptance:
  1. The listed roots match the closed form (tolerance \(10^{-12}\)); each \(z^n\) equals \(w\) (tolerance \(10^{-12}\) times \(|w|\)).
  2. \(w=0\) has the single root \(0\) with multiplicity \(n\), stated; no polygon is drawn.
  3. Ordering follows the stated convention at the cut and at \(\operatorname{Arg}w=\pi\) exactly.
  4. The prose says the picture shows the polygon, and that "exactly \(n\) roots" is the fundamental theorem of algebra applied to \(z^n-w\) (cited), not something the picture proves.
  5. Slovenian and English complete.

### M3. The image of a grid under \(z\mapsto z^2\)

- Learning goal: the images of the vertical lines \(\operatorname{Re}z=a\) and horizontal lines \(\operatorname{Im}z=b\) are parabolas \(u=a^2-v^2/(4a^2)\) and \(u=v^2/(4b^2)-b^2\) that still cross at right angles (conformality, \(f'(z)=2z\ne0\)), except at \(z=0\), where angles are doubled.
- Prerequisites: M1 or complex multiplication; the parabola.
- Default example (checked): the line \(\operatorname{Re}z=1\) maps to \(u=1-v^2/4\), through \(2i\) (\(z=1+i\)), \(0.75+i\) (\(z=1+0.5i\)) and \(-3+4i\) (\(z=1+2i\)). At \(z=1+i\) the tangent directions of the images of the two lines through it are \(2i(1+i)=-2+2i\) and \(2(1+i)\): dot product \(0\). At \(0\) the rays at \(0^\circ\) and \(45^\circ\) map to rays at \(0^\circ\) and \(90^\circ\); the lines \(\operatorname{Re}z=0\) and \(\operatorname{Im}z=0\), which cross at \(90^\circ\), have images that lie on one line (negative and non-negative real half-axes, each traversed twice).
- Steps: (1) the grid and a draggable \(z\); predict where \(z^2\) lies; (2) one vertical line and its image; (3) one horizontal line and its image: another parabola; (4) the crossing angle stays \(90^\circ\); (5) the origin: the angle doubles, the map is not injective; (6) \(z\) and \(-z\) have the same image; (7) free exploration with a grid-density choice.
- Graph needs: a source panel and an image panel (or one board with the grid and its image in two colours), draggable \(z\) with its image, a grid density control (few lines by default), readout of the angle between the image tangents at the dragged crossing, and status at \(z=0\) ("conformal fails here: \(f'(0)=0\)").
- **Sampling** (kernel `sampleImage`): lines are sampled adaptively by parameter bisection on midpoint-to-chord distance with a stated tolerance in board units, a minimum depth (so a symmetric curve cannot be missed), a maximum depth, and a split of the polyline at non-finite values and outside the view. The sampler is a heuristic: it can miss features narrower than the minimum-depth spacing, and the spec says so. The images of \(z^2\) have no poles, so the sampler is not stressed here; it is stress-tested in M4's support tests on \(w=1/z\) (checked): for the line \(\operatorname{Re}z=0.05\), whose image is the circle of centre \(10\) and radius \(10\), a polyline from \(t\in[-100,100]\) with 1000 uniform samples was estimated to deviate from the circle by up to \(8.5\times10^{-3}\) board units within the view \([-4,4]^2\) (not reproduced by the kernel tests, whose measure also counts chords that leave the view); for \(t\in[-2,2]\), 200 uniform samples deviate by about \(1.4\times10^{-3}\). The midpoint-to-chord test bounds the deviation by about the tolerance, not below it: measured by task 05 within the view, tolerance \(0.005\) gives \(5.1\times10^{-3}\) with 100 points on \([-100,100]\) and \(3.4\times10^{-3}\) with 88 points on \([-2,2]\); tolerance \(5\times10^{-4}\) gives \(4.6\times10^{-4}\) with 140 points and \(4.1\times10^{-4}\) with 160 points. A drawing within \(10^{-3}\) therefore needs a tolerance of at most about \(5\times10^{-4}\). (Corrected 2026-10-31; the earlier figures of \(6\times10^{-4}\) at tolerance \(0.005\) were not reproducible.) The honest summary: adaptive sampling matters when the parameter range is much larger than the part in view; it is not always fewer points.
- Acceptance:
  1. The three sample points lie on the parabola and the dot product at \(1+i\) is \(0\) to \(10^{-12}\) in a unit test; the angle readout equals \(90^\circ\) at crossings away from \(0\) (tolerance \(10^{-9}\), shown as approximate).
  2. At the crossing of the lines through \(0\) the readout says the angle is doubled or the map is not conformal there, and the tangent of the image is stated as undefined (\(f'=0\)); no NaN is displayed.
  3. The sampled polyline of every drawn parabola lies within the stated tolerance of the closed form (test over a set of lines).
  4. Image runs are split at non-finite values; no segment is drawn across a gap.
  5. A drag of \(z\) and a grid-density change are interactive per the [performance plan](../performance-plan.md); sampling is measured with 11 and 21 lines per direction before the density options are fixed.
  6. Slovenian and English complete.

### M4. Möbius maps

- Learning goal: \(w=\frac{az+b}{cz+d}\) with \(ad-bc\ne0\) maps circles and lines to circles or lines, preserves angles (\(f'=\frac{ad-bc}{(cz+d)^2}\ne0\)), preserves the cross-ratio, and is determined by the images of three points. The pole \(-d/c\) goes to \(\infty\) and \(\infty\) goes to \(a/c\); a circle through the pole becomes a line, a line becomes a circle through \(a/c\) (including \(\infty\)).
- Prerequisites: M1 (inversion), complex multiplication; the circle.
- Default example (checked): the Cayley map \(w=\frac{z-i}{z+i}\), \((a,b,c,d)=(1,-i,1,i)\), \(ad-bc=2i\), pole \(-i\), \(\infty\mapsto1\). The real line maps to the unit circle (\(0\mapsto-1\), \(1\mapsto-i\), \(-1\mapsto i\)); the unit circle, which passes through the pole \(-i\), maps to a line, the imaginary axis (the images of \(1\) and \(-1\) are \(-i\) and \(i\)). The circle \(|z-1|=\tfrac12\) maps to the circle of centre \(-\tfrac17-\tfrac87i\) and radius \(\tfrac47\) (images of \(1.5,1+0.5i,0.5,1-0.5i\) are all at distance \(0.5714\) of the centre). Cross-ratio of \(0,1,-1,2i\): \(0.5+0.25i\) before and after (difference \(\lt10^{-15}\)); for the four real points \(0,1,-1,2\): \(0.25\) before and after (real).
- Second example, from the research note: \(a=2+i\), \(b=-1+\tfrac12i\), \(c=0.3-i\), \(d=1+2i\) (all on the grid): \(ad-bc=-0.2+3.85i\), pole \(1.5596-1.4679i\) (not on the grid, so it cannot be hit exactly; the status then reports the distance), \(\infty\mapsto-0.3670+2.1101i\); the unit circle (pole outside it, \(|{\rm pole}|=2.1418\)) maps to the circle of centre \(0.1023+0.0512i\) and radius \(0.98598\). Over 1000 random point quadruples in \([-2,2]^2\) (seed 1) the cross-ratio changed by at most \(1.1\times10^{-14}\) relative (the research note's four-point sample gave \(6\times10^{-16}\)); four concyclic points gave a cross-ratio with imaginary part \(9.9\times10^{-17}\). These bound the test tolerance: the unit test uses \(10^{-9}\) relative.
- Three-point form: \(z_1,z_2,z_3\) (distinct, on the grid) map to \(0,1,\infty\) by \(T(z)=\frac{(z-z_1)(z_2-z_3)}{(z-z_3)(z_2-z_1)}\); e.g. \((0,1,-1)\) gives \(T=\frac{2z}{z+1}\). Checked: \(T(0)=0\), \(T(1)=1\).
- Steps: (1) the Cayley map, drag \(z\) along the real axis and watch \(w\) on the unit circle; predict the image of a vertical line; (2) reveal that lines can become circles; (3) the pole: drag the source circle through \(-i\) and the image becomes a line, with status "circle through the pole"; (4) the point at infinity and the image of \(\infty\); (5) four points and the cross-ratio, before and after; (6) three points fix the map: drag \(z_1,z_2,z_3\) and see the map change; (7) free exploration with the second example.
- Graph needs: draggable \(z\) and a source generalized circle (centre and radius, or two points for a line), its image drawn from \(H'\) (ADR 1), the pole and \(a/c\) marked, the coefficient inputs, four draggable points with the cross-ratio readout, an arrow at the view edge toward an image that leaves the view, and text status for every case.
- **Point at infinity, poles and clipping.** The image of a source point at the pole is not drawn; the point \(\infty\) is not a point on the board, so \(a/c\) is shown as a labelled point and \(\infty\) as the words "\(\infty\) (off the board)". An image that is a circle of huge radius is drawn only as the visible arc (the arc is sampled by angle within the intersection of the circle with the view, no huge-radius JSXGraph object). A line is drawn clipped to the view. A source point exactly at the pole (decided in grid units) shows "\(w=\infty\)"; near the pole the image point may be far outside the view and is not drawn, with an off-board arrow, and a readout of \(|w|\) in scientific form when above \(10^6\).
- Acceptance:
  1. Every listed number matches the independent computation (tolerance \(10^{-12}\)); the image circle is verified by checking that images of several source-circle points lie within \(10^{-12}\) of it.
  2. Cross-ratio is preserved within \(10^{-9}\) relative on random quadruples; four concyclic points give a real cross-ratio within \(10^{-9}\); the displayed values say "equal to the shown digits".
  3. "The source passes through the pole" and "the image is a line" are decided exactly by \(A'=0\) in integer grid units; a circle that nearly passes through the pole (distance one grid step) is a visible circle and not a line.
  4. \(ad-bc=0\) is rejected at input with an actionable message (the map would be constant); equal source points in the three-point form are rejected; \(c=0\) gives an affine map with the status "pole at \(\infty\)".
  5. The prose states the circles-to-circles theorem, conformality, the cross-ratio invariance and three-point uniqueness as theorems with a source (the Analiza 2b and *Afina in projektivna geometrija* syllabi name the topics; textbooks cited, not opened), and labels the drag as an illustration.
  6. No NaN, infinity or huge-radius object reaches the board; unit tests drive a source circle through the pole and across the view.
  7. Preset round trip: coefficients, source object, example, and the state of "show image" validate; out-of-grid values are rejected with an actionable message.
  8. Slovenian and English complete.

### M5. Automorphisms of the disc

- Learning goal: \(\varphi_a(z)=e^{i\theta}\frac{z-a}{1-\bar az}\) with \(|a|<1\) maps the open unit disc onto itself and the unit circle onto itself, sending \(a\) to \(0\); the identity \(|1-\bar az|^2-|z-a|^2=(1-|a|^2)(1-|z|^2)\) shows why. \(|a|=1\) is not allowed: the map degenerates to a constant.
- Prerequisites: M4; modulus.
- Default example (checked): \(a=0.5\), \(\theta=0\): \(\varphi(0.5)=0\), \(\varphi(0)=-0.5\), \(\varphi(1)=1\), \(\varphi(-1)=-1\), \(\varphi(i)=-0.8+0.6i\) (modulus 1). The circle \(|z|=0.5\) maps to the circle of centre \(-0.4\) and radius \(0.4\). Second example \(a=0.3+0.4i\) (\(|a|=0.5\), exact in grid units: \(6^2+8^2=100<400\)): \(\varphi(a)=0\); the identity above equals \(0.3525\) on both sides at \(z=0.2+0.7i\).
- Steps: (1) the disc and a point \(a\); predict where \(a\) goes; (2) reveal \(\varphi_a(a)=0\); (3) the unit circle stays the unit circle; (4) the concentric circles of the grid become non-concentric circles inside the disc; (5) rotate with \(\theta\); (6) \(a\) near the boundary squeezes the disc (\(|a|\to1\) is not defined); (7) free exploration.
- Graph needs: draggable \(a\) restricted to the open disc, \(\theta\) control, polar grid (circles and rays) and its image drawn analytically (ADR 1), readouts of \(\varphi(a)\), \(|\varphi(z)|\) for a draggable \(z\).
- Acceptance:
  1. Listed values match (tolerance \(10^{-12}\)); \(|\varphi(z)|=1\) for \(|z|=1\) holds to \(10^{-12}\) in a test over a grid on the circle, and \(|\varphi(z)|<1\) for \(|z|<1\) at all grid points inside the disc.
  2. \(|a|<1\) is decided exactly in integer grid units; \(|a|=1\) and \(|a|>1\) are not selectable and a typed value shows an actionable message. The point \(a=0\) gives the rotation \(e^{i\theta}z\) and is allowed.
  3. The disc-onto-disc claim is stated as a theorem (a standard fact, cited from the Analiza 2b syllabus topic "holomorfni avtomorfizmi kroga", not derived from the picture); the picture is an illustration.
  4. Composition and inverse: the inverse of \(\varphi_a\) with \(\theta=0\) is \((z+a)/(1+\bar az)\) (the parameter \(-a\)); the test composes both within \(10^{-12}\).
  5. Slovenian and English complete.

### M6. De Moivre: powers of a complex number (added by the 2026-11-10 families-prep amendment, Batch D)

- Learning goal: raising to the \(n\)th power takes the modulus to the \(n\)th power and multiplies the argument by \(n\): \((r(\cos\varphi+\mathrm i\sin\varphi))^n=r^n(\cos n\varphi+\mathrm i\sin n\varphi)\). The points \(z,z^2,\dots,z^n\) lie on a spiral (\(r\ne1\)) or a circle (\(r=1\)); the argument printed by the app wraps into \((-\pi,\pi]\) while \(n\varphi\) does not. This is the inverse picture of M2 (roots) and the repeated-multiplication step of C4 (complex multiplication).
- Prerequisites: complex multiplication, M2 (polar form). Matura link: PIK §4.3.4 (page 11 of the extraction; footer "Matematika 11" follows the section) lists multiplication, the rule for powers of \(i\), modulus and the conjugate, and has **no polar form or de Moivre item**, so this lesson is enrichment beyond the catalogue; it is the geometric form of "pravilo za računanje potenc števila \(i\)" (\(\varphi=90^\circ\), \(r=1\)).
- Default examples (*checked*; scripts and outputs in `docs/reviews/feature-streams/families-prep/notes/spec-mechanical-amendments.md`): \(z=1+\mathrm i\), \(n=5\): \(z^5=-4-4\mathrm i\) exactly, modulus \(4\sqrt2=5{,}65685=(\sqrt2)^5\), argument \(5\cdot45^\circ=225^\circ\), printed as the principal value \(-135^\circ\). \(z=0{,}8+0{,}6\mathrm i\) (modulus exactly \(1\): \(16^2+12^2=20^2\) in grid units), argument \(36{,}8699^\circ\), \(n=10\): \(z^{10}=0{,}9884966+0{,}1512432\mathrm i\), modulus \(1\) to \(4\cdot10^{-16}\), argument \(8{,}6990^\circ=368{,}699^\circ-360^\circ\). \(z=0{,}5+0{,}5\mathrm i\): \(z^2=0{,}5\mathrm i\) (modulus \(0{,}5\), \(90^\circ\)), \(z^4=-0{,}25\) (\(180^\circ\)), \(z^8=0{,}0625\) (\(0^\circ\), a full turn), moduli \((\sqrt{0{,}5})^n\). Application, the triple angle: \((\cos20^\circ+\mathrm i\sin20^\circ)^3=0{,}5+0{,}8660254\mathrm i=\cos60^\circ+\mathrm i\sin60^\circ\), so \(\cos3\theta=4\cos^3\theta-3\cos\theta\) (\(0{,}5000000000000004\) against \(0{,}5000000000000001\) at \(\theta=20^\circ\)).
- Steps: (1) \(z\) on the grid and \(z^2\) (read modulus and argument); predict \(z^3\); (2) step \(n\) up: the points \(z^k\) and a polar readout; (3) \(|z|=1\): a circle, \(n\varphi\) laps; (4) \(|z|<1\) spirals in, \(|z|>1\) out; (5) the wrapped argument: \(n\varphi=225^\circ\) is shown as \(-135^\circ\); (6) the triple angle from the real and imaginary parts of \(z^3\); (7) free exploration.
- Graph needs: draggable \(z\) on the \(0{,}05\) grid in \([-2,2]\), \(n\) from \(1\) to \(8\) (numeric field and steppers; play waits on Controls step 5), the points \(z^k\) with indices, polar readouts of \(z^n\) (modulus, \(n\varphi\), principal argument), a text status for \(z=0\) and for out-of-view powers (\(|z|^n\) may exceed the view: an arrow and the modulus as text).
- Acceptance:
  1. Listed values agree with `complexIntegerPower` (`src/analysis/complexRootsModel.ts:65`, repeated multiplication) to \(10^{-12}\) relative, and the polar formula agrees with repeated multiplication on a seeded sample of 1000 grid points and \(n\le8\).
  2. **Exact decisions in integer grid units:** "\(z^n\) is real", "\(z^n\) is on the unit circle", "\(z^n=1\)" are decided by exact integer arithmetic on \((a+b\mathrm i)^n\) with \(a,b\) integers in \([-40,40]\) (the entries stay below \(2^{53}\) for \(n\le9\): \(56{,}57^9=5{,}9\cdot10^{15}\); the range is capped at \(n\le8\), \(1{,}05\cdot10^{14}\)); \((1+\mathrm i)^8=16\) is exactly real. Displayed digits are rounded doubles.
  3. The wrapped argument follows `complexArgument` (principal value in \((-\pi,\pi]\)); \(n\varphi\) is shown separately as an unwrapped angle (computed); \(z=0\) has no argument and the status says so.
  4. Argument or illustration: de Moivre's formula is a **theorem proved by induction from the multiplication rule** (modulus multiplies, arguments add; the induction step is exactly the picture of one more multiplication) and is stated with that proof in the prose; the drag is an **illustration**.
  5. Slovenian and English complete; Reset, Preset, restore pass.

### M7. Euler's formula as uniform circular motion (added by the 2026-11-10 families-prep amendment, Batch D)

- Learning goal: the point \(e^{\mathrm i\theta}=\cos\theta+\mathrm i\sin\theta\) runs around the unit circle; with \(\theta=\omega t\) it moves at constant speed \(\omega\), its velocity \(\mathrm i\omega e^{\mathrm i\omega t}\) is perpendicular to the position, and its acceleration \(-\omega^2e^{\mathrm i\omega t}\) points to the centre. The rule \(e^{\mathrm ia}e^{\mathrm ib}=e^{\mathrm i(a+b)}\) is the addition formula; \(e^{\mathrm i\pi}=-1\). The series \(\sum(\mathrm i\theta)^k/k!\) approaches the same point.
- Prerequisites: M6; trigonometry on the unit circle ([TR1 and TR2](trigonometry-lessons.md), draft, not scheduled for release; this lesson does not depend on them being released). Scope note: this uses \(e^{\mathrm i\theta}\) for **real** \(\theta\) only; the complex exponential and logarithm stay out of scope (below).
- Default examples (*checked*): \(\theta=\pi/6\): \(e^{\mathrm i\theta}=(0{,}8660254;\ 0{,}5)\). With \(\omega=2\) at \(t=\pi/12\) the position is the same point, the velocity is \(\mathrm i\omega z=(-1;\ 1{,}7320508)\) (central difference with \(h=10^{-6}\): \((-0{,}9999999999732;\ 1{,}7320508075291)\)), speed \(2\) to \(5\cdot10^{-11}\), dot product with the position \(3\cdot10^{-12}\) (numerical, so zero only to the difference quotient's accuracy); the period is \(2\pi/\omega=\pi\). Product rule: \(e^{\mathrm i30^\circ}e^{\mathrm i45^\circ}=(0{,}2588190;\ 0{,}9659258)=(\cos75^\circ,\sin75^\circ)\) to \(10^{-15}\). Series at \(\theta=\pi\): partial sums of degree \(1,3,5,9,13,21\) are \(1+3{,}1416\mathrm i;\ -3{,}9348-2{,}03\mathrm i;\ 0{,}1239+0{,}524\mathrm i;\ -0{,}9760+0{,}0069\mathrm i;\ -0{,}99990+2{,}1\cdot10^{-5}\mathrm i;\ -1{,}0000000+1{,}0\cdot10^{-11}\mathrm i\); degree \(30\): \(-1\) with an imaginary part below \(10^{-15}\) (its exact size depends on rounding order).
- Steps: (1) the unit circle and the point \(\cos\theta+\mathrm i\sin\theta\); predict its path as \(\theta\) grows with time; (2) uniform motion: speed \(\omega\), period \(2\pi/\omega\); (3) the velocity arrow is the position turned by \(90^\circ\), i.e. multiplied by \(\mathrm i\), and scaled by \(\omega\); (4) the acceleration points to the centre; (5) multiply two points: the angles add (the addition formulas of TR2); \(e^{\mathrm i\pi}=-1\); (6) the series: more terms land near the point; (7) free exploration.
- Graph needs: \(\theta\) (or \(t\) and \(\omega\)) control, the point with its projections, velocity and acceleration arrows (toggles), two-point product mode, a series degree stepper \(N\in[1,30]\) with the partial sum drawn, readouts of speed and the angle between position and velocity; animation of \(t\) waits on Controls step 5, otherwise a time slider.
- Acceptance:
  1. Listed numbers agree to the stated digits; \(|e^{\mathrm i\theta}|=1\) to \(10^{-15}\) at all integer-degree angles; the product rule agrees to \(4\cdot10^{-15}\) (about 20 ulp: \(\cos\cdot\cos-\sin\cdot\sin\) is a difference of rounded products; the worst case over all \(360^2\) integer-degree pairs is \(2{,}7\cdot10^{-15}\)) on a grid of 360 pairs (corrected at F1, 2026-11-10, from \(10^{-15}\), which doubles cannot guarantee).
  2. Special positions are exact integer tests: \(\theta\in\{0^\circ,90^\circ,180^\circ,270^\circ\}\) give \(1,\mathrm i,-1,-\mathrm i\) as exact points; other angles show doubles marked as computed. Angles are integer degrees (coarser than the half-degree grid of the trigonometry spec). A multiple of \(\pi\) typed in the numeric field is parsed as a rational multiple and converted to degrees before snapping, so the exact axis tests use the integer degree, never a double \(\pi\).
  3. The series stepper uses the exact term recurrence \(t_{k+1}=t_k\cdot\mathrm i\theta/(k+1)\) (independent of `Math.cos`); the distance to \((\cos\theta,\sin\theta)\) at degree \(21\), \(\theta=\pi\) is below \(10^{-10}\); the readout says "partial sum of degree \(N\)", never "equals".
  4. Argument or illustration: with the definition \(e^{\mathrm i\theta}:=\cos\theta+\mathrm i\sin\theta\) the velocity statement is an **argument** (derivatives \(\cos'=-\sin\), \(\sin'=\cos\) give \(z'=\mathrm iz\), cited); the series claim is a **theorem** (Euler's formula, cited from the Analiza course topics, not opened) and the partial sums an **illustration**. The prose says which is the definition and which the theorem.
  5. No claim about \(e^z\) for complex \(z\) is made; Slovenian and English complete; Reset, Preset, restore pass.

### Batch D: gating, kernel gaps (F1), terms and tests (families-prep amendment, 2026-11-10)

- **Gate.** Batch D = M6, M7; release condition: Batch A released (M2 is the prerequisite of M6); Batches B and C are not required. **Ungated now**: this text, F0, the F1 kernel as new pure files with oracle tests. **F2a waits on Controls step 5** (play/step controls for M6 steps and the M7 animation). The new graphs are new files; `ComplexMultiplicationGraph` and the other released graphs are not edited, and no edit to `BaseGraph.tsx`, `GraphSession.ts` or `src/inputs/` is planned.
- **Decisions needing an ADR (Batch D).** (a) Two graphs `ComplexPowerGraph` (M6) and `EulerCircleGraph` (M7); (b) one graph with a mode; (c) extend `ComplexMultiplicationGraph` (rejected: this spec keeps it unchanged). Proposal: (a), consistent with the per-lesson-graph choice of ADR 2 above. Before F2a.
- **Kernel gaps (F1), verified in `src/analysis/`.** *Present, so no gap* (the brief asked for these): the Möbius kernel `complexMobius.ts` (`mobiusApply`, `mobiusCompose`, `mobiusInverse`, `mobiusThroughThree`, `crossRatio`, `discAutomorphism`, `circleInversion`, `mobiusImage`, `inversionImage`, `GeneralizedCircle`), the sampled-image kernel `complexImage.ts` (`sampleImage`, `MIN_DEPTH`, `MAX_DEPTH`) and `nthRoots` in `complexRoots.ts`; only their Demonstrations for M3–M5 are not yet built (`src/graphs/complex/` has the multiplication, reciprocal and roots graphs). *Missing for Batch D:* (1) `complexPower.ts`: `polarPower(z, n)` returning modulus\(^n\), \(n\varphi\) (unwrapped) and the principal argument, and `exactIntegerPower(a, b, n)` on integer grid units with a bound check (\(n\le8\)), as the exact-decision primitive; `complexIntegerPower` currently lives in `complexRootsModel.ts` and is only the test oracle (do not move it in this change); (2) `eulerCircle.ts`: `eulerPoint(θ)` (integer degrees, exact axis points), `circularMotion(ω, t)` returning position, velocity, acceleration, and `expSeriesPartial(θ, N)` by the recurrence above. Independent oracles: repeated multiplication (`complexIntegerPower`) for M6; central difference and `Math.cos/sin` for M7.
- **Terms (proposals).** de Moivre's formula: Moivrova formula (to research; the textbook form may be "Moivreova"); Euler's formula: Eulerjeva formula; uniform circular motion: enakomerno kroženje; velocity / acceleration: hitrost / pospešek (check physics usage); partial sum: delna vsota. Reuse M1–M2 terms (*argument*, *modul*, *glavni argument*).
- **Tests.** Kernel: every number above; polar against repeated multiplication; exactness on the grid including \((1+\mathrm i)^8=16\) and the bound at \(n=8\); series recurrence against `Math.cos/sin`. Scene tests: set \(z\), set \(n\), step in one synchronous tick. The Out of Scope line "the exponential, logarithm, \(\sin z\) and branch surfaces" is narrowed: only \(e^{\mathrm i\theta}\) for real \(\theta\) enters (M7).
- **F2a decisions (handler, 2026-11-11).**
  - `ComplexPowerGraph` stores \(z=(A+B\mathrm i)/20\) and \(n\in[1,8]\). Reset sets \(n\) back to 1. The exact rows (real and imaginary parts, modulus) are exact, while the unwrapped and principal arguments are computed.
  - JSXGraph `arrow` elements own their two end points, which are disposed with the scene.
  - `EulerCircleGraph` stores \(\theta\) in whole degrees and the second angle \(\varphi\) on a \(5^\circ\) grid, so the angle field takes no multiples of \(\pi\). The two-point product mode is part of F2a, as "Graph needs" lists. Board captions use `parse: false`.
  - Review repairs: rounded values never follow "=", and the decimal beside an exact value uses significant digits. The velocity shows 7 decimals. The acceleration arrow stays short of the centre. Preset errors use the language's decimal format. The table terms appear in the graphs.
  - **F2b decisions** (worker, 2026-11-12; evidence `docs/reviews/feature-streams/families-prep/notes/f2b-complex-linear.md`). `complex-power` at `/bezeg-2.0/complex-power` and `complex-euler` at `/bezeg-2.0/complex-euler` in the `maps` family, right after `complex-roots` (the existing complex rows use top-level paths). ADR 0058 named no ids or routes. Rejected: the `analysis` family (Euler's formula links to series, but both rows are maps of the complex plane next to the released complex rows, and a student looks for powers beside roots) and a `/complex/...` path prefix (it would break the pattern of `complex-roots` and `complex-reciprocal`). Feature-local registration in `src/graphs/complex/batchD/`, spread right after the legacy rows so the catalog lists them after `complex-roots`, not after the isometry rows. The Euler Preset key changed `euler-circle` to `complex-euler` (key = id); no route used it, so no stored Preset changes. Rows ship `lesson: false` with pending entries until F3–F5. Titles: *Moivreova formula* / *De Moivre's formula* and *Eulerjeva formula* / *Euler's formula* (F0 terms).

## User Stories

1. As a student, I drag \(z\) across the unit circle and see \(1/z\) follow it, so I stop mixing up reciprocal, conjugate and negative.
2. As a student, I turn \(w\) and see the three cube roots rotate as a triangle.
3. As a student, I draw a grid and see \(z^2\) bend it into parabolas that still cross at right angles, and I see where they do not.
4. As an educator, I drag a circle through the pole of a Möbius map on a projector and the image jumps from a circle to a line.
5. As a university student, I check the cross-ratio of four points before and after a map to digits I can read.
6. As a learner on a phone, I read a text status for every position, including \(\infty\).

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Searched `src/localization/sl.ts` (it has `complex_multiplication`: "Kompleksno množenje"; no terms for inversion, Möbius or cross-ratio). Terms follow the matura wording in `pik26.txt` and the FMF pages.

| English | Slovenian proposal | Basis to check |
| --- | --- | --- |
| conjugate | konjugirano število | PIK §4.3.4 "konjugiranega števila" |
| reciprocal | obratna vrednost | PIK §4.3.4 "obratno vrednost kompleksnega števila" |
| circle inversion | inverzija (v krožnici) | FMF Elementarna geometrija (123) "inverzija"; E3 reuses it |
| conformal map | konformna preslikava | FMF Analiza 2b "konformne preslikave" |
| Möbius map | Möbiusova preslikava | "preslikava" as in Analiza 2b; the Wikipedia variant "transformacija" to check |
| cross-ratio | dvorazmerje | FMF *Afina in projektivna geometrija* "dvorazmerje" |
| automorphism of the disc | avtomorfizem enotskega kroga | Analiza 2b "holomorfni avtomorfizmi kroga" |
| pole (of a map) | pol | to research (the "pol in polara" use in E7 is a different pole; the lesson says "pol preslikave") |
| point at infinity | točka v neskončnosti | transparent wording; to research |
| generalized circle (circle or line) | krožnica ali premica | transparent; avoid the unfamiliar "posplošena krožnica" in lesson prose |
| principal argument | glavni argument | search `sl.ts` and the complex lesson first |
| root of unity / \(n\)th root | koren enote / \(n\)-ti koren | PIK uses "kompleksne rešitve enačbe" |

Final wording and sources are recorded in the implementing change.

## Implementation Decisions

- Pure mathematics in `src/analysis/` modules above, typed results with explicit "pole", "undefined" and "line" outcomes rather than infinities or NaN.
- Dragged complex numbers stay on the existing 0.05 grid in \([-2,2]\) so predicates are exact (the `complex.ts` precedent). The family adds exact predicates: \(|z|=1\), \(|a|<1\), \(cz+d=0\), \(A'=0\), all in integer units of \(1/20\).
- Circle and line images use the generalized-circle form and `mobiusImage`; sampled images are used only for non-Möbius maps (ADR 1).
- Preset fields are additive and validated with actionable messages, following `functionPresetCollections.ts`; existing Presets and routes keep working. New lessons add closed-set names to `src/learning/model.ts` and do not change the existing ones.
- New routes and Presets only. No existing route, Preset or lesson (including complex multiplication) changes; there are no breaking changes.
- Boards, listeners and auxiliary objects follow the existing ownership and disposal pattern (`BaseFunctionGraph`); image objects are created and disposed on each grid-density or model change.
- Hosting and app-shell code stay separate from the mathematics.

## Testing Decisions

- Kernel tests: every checked number above; Möbius apply/compose/inverse (round trip to \(10^{-12}\)); \(H'\) transform against sampled points; exactness of the pole predicate on grid inputs including near-pole (one-step) cases; cross-ratio invariance on random quadruples (tolerance \(10^{-9}\)); inversion involution and orientation reversal; `nthRoots` ordering across the cut; sampler tolerance, gap splitting and the \(1/z\) stress cases.
- Scene tests: apply multi-action scenes in one synchronous tick (several drags then reveal); reject out-of-domain values.
- Preset tests: save, reopen, export/import, malformed and out-of-grid data.
- Lesson/content tests: step counts, both languages in lockstep, `lessonMathNotation.test.ts` unchanged and passing (undelimited formula fields, `{,}` for decimals in Slovenian), `tsc --noEmit` after localization changes.
- Regression: the released complex multiplication tests (`complex.test.ts`, `ComplexMultiplicationGraph.test.ts`, host test, Preset collections) pass unchanged.
- Browser: a smoke row per lesson (default scene, controls, reveal, restore, catalog link, refresh, narrow viewport, keyboard, touch alternatives, both languages and a live language switch). The full checklist only if the shared catalogue or lesson runtime changes.
- Performance: measure the grid image (M3) and circle image (M4/M5) per the [performance plan](../performance-plan.md) before fixing line counts and sampling tolerances.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contract above is met with checked examples and honest guarantees.
3. Both languages, accessible inputs, restore on exit, Presets and figure export pass. Verify the free-exploration graph and teaching controls in Presentation mode.
4. Existing routes, Presets and the complex multiplication lesson behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass; commit and push follow the repository workflow.

## Correctness Notes

- A drag shows instances. "Circles map to circles", conformality, cross-ratio invariance and "the disc maps onto itself" are theorems stated with a source; pictures illustrate.
- Conformality needs \(f'(z)\ne0\): \(z^2\) fails at \(0\); a Möbius map has \(f'\ne0\) wherever it is defined; inversion preserves angles but reverses orientation, so it is anti-conformal.
- The point at infinity belongs to the extended plane; the board shows only the finite part, so every view that can lose a point states it.
- Exact decisions on grid inputs (on the circle, through the pole, inside the disc) are exact in integer units; displayed numerical equalities (cross-ratio, \(|\varphi|=1\)) are tolerance checks and are labelled "to the shown digits".
- The root labelling follows the principal argument convention of `complexArgument` and jumps across the negative real axis; the set of roots does not.
- Adaptive sampling is a heuristic with a documented minimum depth, not a guarantee; analytic images are used wherever the theory provides them.

## Out of Scope

- Backend, accounts, assessment, grading, progress tracking.
- Riemann sphere and stereographic projection views; complex polynomials' roots beyond \(z^n=w\); the exponential, logarithm, \(\sin z\) and branch surfaces; Newton, Julia and Mandelbrot fractals (see the dynamics family in the research note).
- Cauchy–Riemann equations, contour integration, residues, Schwarz lemma, the Riemann mapping theorem; automorphisms of the plane and the upper half-plane (hyperbolic geometry) beyond the unit-disc lesson.
- The general homogeneous-coordinate and projective-conic machinery (see [projective-conics-lessons.md](projective-conics-lessons.md)); the real \(2\times2\) map kernel (see [linear-maps-lessons.md](linear-maps-lessons.md)); triangle-geometry lessons that use inversion (see [triangle-geometry-lessons.md](triangle-geometry-lessons.md)).
- Free-text function input and editing the released complex multiplication lesson.

## Further Notes

Review should include a mathematics review of the generalized-circle transform, the pole predicate and the exactness bound, and an accessibility review for the text alternatives of off-board images. Research gaps: textbook section numbers (Ahlfors, cited, not opened); VR labels were read from text indentation only; the current FMF 2026 versions were not checked.
