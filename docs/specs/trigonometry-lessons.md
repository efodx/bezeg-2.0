# Trigonometry of the unit circle and triangle (Trigonometrija na enotski krožnici in v trikotniku)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/trigonometry](../tasks/trigonometry/README.md). Decisions 1–3: [ADR 0044](../adr/0044-trigonometry-graphs-and-snapped-inputs.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #1 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md)); details below are proposals for owner review.
**Source:** the research note's entry 1 (opening lesson, lesson list, risks) and the matura catalogue M-MAT-2026, text extraction read for this spec: §4.6 (page 13; page footers follow the page text in the extraction; *Središčni in obodni koti*, *Kot v polkrogu*, *Kosinusni in sinusni izrek*, objective "uporablja zveze med stranicami in koti v poljubnem trikotniku, pri tem uporablja kosinusni in sinusni izrek"), §4.7 (page 14; *Polmer trikotniku včrtanega in ocrtanega kroga*) and §4.10.9 *Kotne funkcije* (page 19; *Definicije kotnih funkcij na enotski krožnici*, *Adicijski izreki*, "izpelje vrednosti kotnih funkcij za kote 0, 30, 45, 60, 90"). Level markers (VR) were not verified in the extraction. Textbooks and FMF pages are not opened. Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

Bezeg draws \(\sin\), \(\cos\) and \(\tan\) as graphs with amplitude, frequency and phase sliders (demonstration `trigonometric-functions`, route `/functions/trigonometric`, `src/demonstrations.ts:94`; lesson steps `trig-base-sine` to `trig-tangent`, `src/learning/content/functionGuidedLessons.ts:518`). Nothing shows where the wave comes from: a learner cannot see the radian as an arc length, \(\sin\) and \(\cos\) as the coordinates of a point on the unit circle, or why \(\sin^2+\cos^2=1\). Nothing teaches the triangle side of the matura topic either: the sine rule, the cosine rule, and solving a triangle from three data including the ambiguous case. These are matura core (§4.6, §4.10.9) and best learned by dragging.

## Solution

Add a Learn chapter **Trigonometrija na enotski krožnici in v trikotniku / Trigonometry of the unit circle and triangle** with five guided activities, each backed by a Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary. Each lesson is 5–7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress. Each picture is labelled an **argument** (its construction establishes the claim) or an **illustration**.

**Cross-links, not repeats.** The existing function lesson (`trig-*` steps) is the follow-up of TR1 (amplitude, period, shift are not taught again). The inscribed-angle lesson (`inscribed-angle-thales`, `src/learning/content/triangleGeometryChapterLessons.ts:104`, graph `InscribedAngleGraph`, `src/graphs/compgeo/InscribedAngleGraph.tsx`) is the prerequisite of TR3 and is linked, not re-taught.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/trig/` (below) with oracle tests; ADRs 1–3 accepted | Kernel tests pass; no learner-visible route needed |
| A | TR1 Radian, sine and cosine on the unit circle; TR2 Symmetries and addition formulas | Batch 0 done; unit-circle graph passes the batch gate |
| B | TR3 Sine rule via the circumcircle; TR4 Cosine rule | Batch A released; triangle graph in `sides` and `circle` modes passes the gate |
| C | TR5 Solving a triangle (SSS, SAS, ASA/AAS, SSA with both solutions) | Batch B released; ADR 2 accepted |

Publish batches separately. Do not expose unimplemented Demonstrations.

### Reuse and new modules

Verified by search in `src/`:

- Circle kernel `src/compgeo/circle.ts`: `circumcircle` (line 157, exact centre and \(R^2\)), `circlePoint` (168), `angleBetween` (179, unsigned angle in \([0,\pi]\), `undefined` for a zero arm), `thalesDot` (189, exact). `src/compgeo/triangle.ts`: `circumradiusSquared` (210), `circumradius` (294), `classifyTriangle` (149, exact acute/right/obtuse), `Degenerate` (44). `src/compgeo/grid.ts`: `GridPoint`, `GRID_COORD_LIMIT` (line 12). `src/compgeo/inscribedAngleModel.ts`: glider exclusion `GLIDER_EXCLUSION_DEG` (28).
- `InscribedAngleGraph` registered at `src/graphs/graphFactories.ts:218` is the precedent for a circle graph with a glider; it is not modified.
- No existing unit-circle, triangle-solver or law-of-sines/cosines code: searched `solveTriangle`, `lawOfCos`, `sineRule`, `unitCircle` in `src/` (none; `src/analysis/complex.ts:135` `polarToComplex` is unrelated).

New modules (names suggested): `src/trig/angle.ts` (angle state, units, quadrant), `src/trig/unitCircle.ts` (point, arc, special values, addition-by-rotation frame), `src/trig/triangleSolver.ts`, `src/trig/trigModel.ts` (state parse/validation), graphs `src/graphs/trig/UnitCircleGraph.tsx` and `src/graphs/trig/TriangleSolverGraph.tsx`. Pure maths stays free of React, JSXGraph, localization and graph-global state.

### Decisions needing an ADR

1. **Graph shape and placement.** (a) Two new graphs: `UnitCircleGraph` (TR1, TR2) and `TriangleSolverGraph` with modes `sides`, `circle`, `solve` (TR3–TR5); (b) one graph with all five modes; (c) extend the existing trigonometric function graph. (c) would change the existing route and stored Presets; (b) makes the circle and triangle states mutually irrelevant. Proposal: (a); family placement (`functions` for the unit circle beside `/functions/trigonometric`, `plane-geometry` for the triangle graph) decided in the same ADR. Before Batch A.
2. **Triangle input policy and the ambiguous-case decision.** (a) Sides on a \(1/4\) grid in \([1/4,12]\) and angles in integer degrees \(1\ldots179\), discrete outcomes decided on that grid; (b) triangle given as grid points, angles derived; (c) continuous inputs with a tolerance. Matura tasks give angles in degrees, so (a). See Correctness Notes for why the SSA count is exact on the grid. Proposal: (a). Before Batch C.
3. **Angle state on the circle.** (a) Integer half-degrees \(0\ldots719\) (so quadrant, axis and special angles are exact integer tests, 720 positions); (b) continuous radians; (c) integer degrees. Proposal: (a); a numeric field accepts degrees or a multiple of \(\pi\) and snaps to the grid. Before Batch A.

## Trigonometry kernel (owned by this spec)

1. **Angle.** `type Angle = {halfDegrees: number}` (integer, wrapped to \([0,720)\)). `toRadians` is \(\pi\,\mathrm{halfDegrees}/360\) (double). `quadrant` and `onAxis` are integer tests. `specialValue(angle)` returns the exact radical text for multiples of \(30^\circ\) and \(45^\circ\) from a closed table (PIK §4.10.9 list \(0,30,45,60,90\) and their reflections); other angles return `undefined`.
2. **Unit circle.** `pointOnCircle(angle) = (cos, sin)` and `arcLength(angle, r) = r\theta` (doubles, labelled computed). `rotationFrame(a)` returns the images of \(e_1,e_2\) under rotation by \(a\), used by TR2.
3. **Solver.** `solveTriangle(spec)` where `spec` is one of `sss`, `sas`, `asa` (covers AAS by the angle sum), `ssa`. Result: `{kind: 'none', reason}`, `{kind: 'one', triangle}`, `{kind: 'two', triangles: [t1, t2]}` or `{kind: 'degenerate'}`. A `triangle` carries sides, angles (radians) and area, all doubles labelled computed. Discrete outcomes (valid triple, count of SSA solutions) follow Correctness Notes; angles and sides never decide anything after they are computed.
4. **Verification helpers (for tests and the graph readouts).** `triangleFromSolution` builds vertices in the plane so the drawn triangle is reconstructed from the solution, and the readouts are measured on it with `angleBetween` and distance, not echoed from the solver.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number was computed by the author with `node -e`-style scripts (listed with their outputs in the families-prep note `docs/reviews/feature-streams/families-prep/notes/spec-trig-circle.md`); none is guessed.

### TR1. Radian, sine and cosine on the unit circle

- Learning goal: the radian measures the arc of the unit circle; \(\cos\theta\) and \(\sin\theta\) are the coordinates of the point at arc length \(\theta\); the sign pattern follows the quadrants; \(\sin^2\theta+\cos^2\theta=1\) is Pythagoras in the right triangle with hypotenuse \(1\); the wave is this point's height unrolled.
- Prerequisites: right-triangle trigonometry. Follow-up: the existing function lesson (`trig-base-sine`, `trig-amplitude`).
- Default example (*checked*): \(1\) rad \(=57{,}29578^\circ\); \(135^\circ=2{,}35619\) rad \(=3\pi/4\); \(\theta=\pi/6\) gives \((0{,}8660254;\,0{,}5)\); \(\theta=2\) rad (\(114{,}59^\circ\), quadrant II) gives \((\cos,\sin)=(-0{,}4161468;\,0{,}9092974)\); on a circle of radius \(3\) the arc for \(\theta=2\) is \(6\); \(200^\circ\) gives \((-0{,}939693;\,-0{,}34202)\).
- Steps: (1) the unit circle and a point at \(\theta=0\); predict what happens to its height when it moves counter-clockwise; (2) drag the point, the arc length is read off as \(\theta\); (3) the height \(y\) is carried onto an unrolled axis beside the circle and traces \(\sin\); (4) the \(x\) coordinate gives \(\cos\); signs by quadrant; (5) the right triangle with hypotenuse \(1\) and \(\sin^2+\cos^2=1\); (6) the special angles \(0,30,45,60,90\) with exact values; (7) free exploration with a link to the function lesson.
- Graph needs: the unit circle, a draggable point with arc highlight, an angle field in degrees and radians (multiples of \(\pi\)), readouts of \((\cos,\sin)\), the quadrant and the signs, the unrolled \(\sin\) (and optional \(\cos\)) trace, the projection segments, keyboard stepping (\(5^\circ\) and \(0{,}5^\circ\)) and a text status for the point; touch handles at least 44 px.
- Acceptance:
  1. The numbers above agree to the displayed precision; \(\sin^2+\cos^2=1\) to \(10^{-15}\) at all 720 positions in a unit test.
  2. Quadrant and axis status are exact integer tests; the point on an axis says "on the axis", never a sign.
  3. The unrolled height at \(\theta\) is the same double as the circle point's \(y\) (no second computation).
  4. Special angles show exact radical text; the other angles show rounded doubles marked as such.
  5. Argument or illustration: the Pythagoras step (5) is an **argument** (the drawn right triangle has hypotenuse \(1\)); the signs and the unrolled trace are an **illustration** of a definition. The prose says the radian is defined as arc length for the unit circle.
  6. Reset, Preset, restore, both languages pass.

### TR2. Symmetries and addition formulas

- Learning goal: reflections and half-turns of the point give \(\sin(\pi-x)=\sin x\), \(\cos(-x)=\cos x\), \(\sin(x+\pi)=-\sin x\); rotating the frame by \(\alpha\) gives \(\sin(\alpha+\beta)\) and \(\cos(\alpha+\beta)\).
- Prerequisites: TR1. The matrix form of a rotation is the [linear-maps lesson](linear-maps-lessons.md) L1 (optional link).
- Default example (*checked*): \(x=0{,}5\): \(\sin(\pi-0{,}5)=\sin 0{,}5=0{,}4794255\). \(\alpha=60^\circ\), \(\beta=45^\circ\), \(\alpha+\beta=105^\circ\): \(\sin105^\circ=0{,}9659258=(\sqrt6+\sqrt2)/4\), \(\cos105^\circ=-0{,}258819=(\sqrt2-\sqrt6)/4\), and \(\sin\alpha\cos\beta+\cos\alpha\sin\beta\) gives the same value.
- Steps: (1) a point and its three images under reflection in the \(y\)-axis, the \(x\)-axis and the origin; predict which coordinate keeps its sign; (2) the matching identities; (3) the frame \((\cos\alpha,\sin\alpha)\), \((-\sin\alpha,\cos\alpha)\) after rotating by \(\alpha\); (4) the point \((\cos\beta,\sin\beta)\) expressed in the rotated frame lands at angle \(\alpha+\beta\); (5) read off the addition formulas; (6) the numeric example; (7) free exploration.
- Graph needs: as TR1 with a second angle, the rotated frame and a toggle for the three symmetric points.
- Acceptance:
  1. The numbers above match; the addition formula equals the directly computed values to \(10^{-15}\) over all pairs of half-degree angles in a sampled unit test.
  2. Symmetry points are produced from the angle by integer operations (\(720-h\), \(h+360\)), then drawn; no tolerance.
  3. The rotated-frame step is an **argument** (components of the point in the rotated basis are the claimed expressions); the symmetries are **arguments** by reflection. The prose notes that the formulas hold for every pair, and the picture shows one.
  4. Reset, Preset, restore, both languages pass.

### TR3. Sine rule via the circumcircle

- Learning goal: in every triangle \(a/\sin A=b/\sin B=c/\sin C=2R\), where \(R\) is the circumradius.
- Prerequisites: TR1; the inscribed-angle lesson `inscribed-angle-thales`; the circumcircle of the notable-points lesson (`notable-points`, `src/learning/content/triangleGeometryChapter.ts:32`).
- Default example (*checked*): \(A=(0,0)\), \(B=(7,0)\), \(C=(2,4)\): sides \(a=6{,}40312\), \(b=4{,}47214\), \(c=7\); angles \(A=63{,}4349^\circ\), \(B=38{,}6598^\circ\), \(C=77{,}9052^\circ\); \(R^2=205/16=12{,}8125\) (exact, from `circumcircle`), \(2R=7{,}15891\); all three ratios \(a/\sin A,\;b/\sin B,\;c/\sin C\) equal \(7{,}15891\). Circumcentre \(O=(7/2,3/4)\), antipode of \(B\): \(A'=2O-B=(0,3/2)\) (exact), with \((B-C)\cdot(A'-C)=0\) (right angle at \(C\), exact), \(|BA'|=7{,}15891=2R\), and the angle at \(A'\) in the triangle \(BA'C\) is \(63{,}4349^\circ=A\).
- Steps: (1) triangle with ratio readouts, three different-looking side/angle pairs; predict whether the three ratios are related; (2) drag a vertex and watch the ratios stay equal; (3) draw the circumcircle; (4) draw the diameter \(BA'\) and the triangle \(BA'C\); (5) its right angle (Thales) gives \(a=2R\sin A'\), and the inscribed angle at \(A'\) equals \(A\); (6) the obtuse case, where \(A'\) lies on the other arc and the angle is the supplement with the same sine; (7) free exploration.
- Graph needs: the triangle with three draggable grid vertices, side and angle readouts, the ratio readout, the circumcircle, the diameter and the auxiliary triangle, a mode toggle, text statuses.
- Acceptance:
  1. Values above match; ratios agree to \(10^{-12}\) over a dense grid of non-degenerate triangles; \(R^2\) matches `circumradiusSquared` exactly.
  2. \(A'=2O-B\) is rational; the Thales test `thalesDot` is exactly \(0\) for every grid triangle; the angle at \(A'\) from `angleBetween` equals \(A\) (or \(\pi-A\)) to \(10^{-12}\) in tests. When \(A=90^\circ\) (exact, `thalesDot` at \(A\) is \(0\)) the antipode is \(C\) itself and the auxiliary triangle is degenerate: the scene shows a text status that \(a\) is the diameter, \(a=2R\), and draws no auxiliary triangle.
  3. The construction in steps (3)–(5) is an **argument** for the acute case; the obtuse case is a second argument (supplementary inscribed angles, linked to `inscribed-angle-thales`). The first steps are an **illustration**.
  4. Degenerate vertices (collinear or coincident) show a text status, no ratios and no circle, never `NaN`.
  5. Both languages, Reset, Preset, restore pass.

### TR4. Cosine rule

- Learning goal: \(c^2=a^2+b^2-2ab\cos C\) is Pythagoras plus a correction that vanishes exactly at \(C=90^\circ\); the sign of the correction tells acute from obtuse.
- Prerequisites: TR1, TR3 (side readouts); the dot-product form is the vector identity \(|CA-CB|^2=|CA|^2+|CB|^2-2\,CA\cdot CB\) (PIK §4.8, page 15: *Povezava med skalarnim produktom in kosinusnim izrekom*).
- Default example (*checked*): the TR3 triangle. \(c^2=49\), \(a^2+b^2=61\), \(CA\cdot CB=6\) so \(2ab\cos C=12\) and \(49=61-12\); \(\cos C=0{,}2095\). Right triangle \((0,0),(4,0),(0,3)\): \(c^2=25=16+9\), correction \(0\).
- Steps: (1) squares on the sides; predict the sign of \(c^2-a^2-b^2\) when \(C\) is acute; (2) drag \(C\) through \(90^\circ\); the correction changes sign; (3) the correction as \(2ab\cos C\) (a projection of \(b\) on \(a\)); (4) the exact integer dot-product identity on grid triangles; (5) reveal the formula; (6) numeric example; (7) free exploration.
- Graph needs: squares or length bars on the three sides, the correction term, the dot product readout, the classification status from `classifyTriangle`.
- Acceptance:
  1. Numbers above match; \(c^2=a^2+b^2-2\,CA\cdot CB\) holds as an exact integer equality for every grid triangle in the tests.
  2. The status "acute / right / obtuse at \(C\)" is the sign of the integer dot product, not of a computed angle; the text never says "exactly \(90^\circ\)" from a double.
  3. The vector derivation is an **argument**; the dragged picture is an **illustration**.
  4. Both languages, Reset, Preset, restore pass.

### TR5. Solving a triangle: SSS, SAS, ASA/AAS and SSA

- Learning goal: three data, in the right combination, fix a triangle; SSA may give no, one or two triangles; the cases are decided by comparing \(a\) with \(h=b\sin A\) and with \(b\).
- Prerequisites: TR3, TR4.
- Default examples (*checked*): SSS \(5,6,7\): angles \(44{,}4153^\circ\), \(57{,}1217^\circ\), \(78{,}4630^\circ\), area \(\sqrt{216}=14{,}69694\). SAS \(b=5\), \(c=7\), \(A=60^\circ\): \(a^2=39\), \(a=6{,}245\), \(B=43{,}8979^\circ\), \(C=76{,}1021^\circ\). ASA \(A=40^\circ\), \(B=60^\circ\), \(c=8\): \(C=80^\circ\), \(a=5{,}22163\), \(b=7{,}03508\). SSA \(A=30^\circ\), \(b=8\), \(h=4\): for \(a=5\) the third side is \(c=6{,}9282\pm3\), that is \(9{,}9282\) with \(B=53{,}1301^\circ\), \(C=96{,}8699^\circ\) and \(3{,}9282\) with \(B=126{,}8699^\circ\), \(C=23{,}1301^\circ\) (the two angles at \(B\) sum to \(180^\circ\)); \(a=4\): tangent case, \(B=90^\circ\), \(c=4\sqrt3=6{,}9282\), one solution; \(a=3{,}5\): no triangle; \(a=8\): one triangle, \(B=30^\circ\), \(C=120^\circ\), \(c=13{,}85641\); \(a=9\): one triangle (the other root is negative).
- Steps: (1) choose the data type; predict whether a triangle exists; (2) SSS and the triangle inequality as a status; (3) SAS via the cosine rule; (4) ASA via the angle sum and the sine rule; (5) SSA: swing side \(a\) about \(C\); the circle of radius \(a\) around \(C\) meets the ray \(AB\) in \(0\), \(1\) or \(2\) points, both triangles drawn; (6) the tangent case \(a=h\) and the case \(a\ge b\); (7) free exploration.
- Graph needs: a data-type chooser, numeric inputs on the grid (the only input for sides and angles) plus handles, the solved triangle or both triangles in two colours, the circle of radius \(a\) and the ray in SSA mode, a case status ("no triangle", "one triangle", "two triangles", "right angle at \(B\)"), side and angle readouts measured on the drawn triangle.
- Acceptance:
  1. All numbers above match; each solved triangle is re-measured from its vertices to \(10^{-12}\) (sides by distance, angles by `angleBetween`, area by the shoelace formula and by Heron).
  2. The count of SSA solutions follows the exact rule in Correctness Notes; the unit test enumerates the whole finite input grid and compares with an independent root-finding oracle (below).
  3. In the two-solution case both triangles are drawn together with the circle; the drawing is a true construction (circle around \(C\) with radius \(a\)), so the SSA picture is an **argument** for "at most two"; the other cases are **illustrations** of the formulas.
  4. Impossible data (SSS with \(a+b\le c\), ASA with \(A+B\ge180^\circ\), SSA with \(a<h\)) give a text status and an empty result, never `NaN` or a flat triangle drawn as proper.
  5. Both languages, Reset, Preset, restore pass.

## User Stories

1. As a student, I drag a point around the circle and see the sine wave being produced.
2. As a student, I see the cosine rule as Pythagoras with a correction that vanishes at a right angle.
3. As a student, I swing a side and see why SSA can give two triangles.
4. As an educator, I project the circumcircle construction of the sine rule and the two SSA triangles.
5. As a reader on a phone or keyboard, I enter angles and sides numerically and step through the lesson with text statuses.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Searched `src/localization/sl.ts` and [the glossary](../localization.md): the app already has *enotska krožnica*, *obodni kot*, *očrtana krožnica*, *tangenta*, *tetiva*; no *radian*, *sinusni izrek* or *kosinusni izrek* in the table. The PIK text supplies *kotne funkcije*, *krožne funkcije*, *enotska krožnica*, *adicijski izreki*, *kosinusni in sinusni izrek*, *polmer očrtanega kroga*.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| unit circle | enotska krožnica | existing table; PIK §4.10.9 |
| radian | radian | standard; PIK §4.10.9 uses *kotne funkcije* without the word in the extract |
| sine, cosine, tangent function | sinus, kosinus, tangens | standard; existing graph titles |
| trigonometric functions | kotne funkcije | PIK §4.10.9 title |
| addition formulas | adicijski izreki | PIK §4.10.9 |
| sine rule; cosine rule | sinusni izrek; kosinusni izrek | PIK §4.6 |
| circumradius | polmer očrtane krožnice | existing *očrtana krožnica*; PIK §4.7 says *očrtan krog* |
| arc | lok | standard; PIK §4.6 uses *lok* in "nad istim lokom" |
| quadrant | kvadrant | standard |
| ambiguous case (SSA) | dvoumni primer (SSK) | proposal; the congruence abbreviations SSS, SKS, KSK, SSK are school usage, not verified in this repository |

## Implementation Decisions

- The kernel is new pure TypeScript (`src/trig/`); graphs adapt it. No graph-global cache state.
- Graph state: angle (integer half-degrees), mode, data type and numeric inputs (snapped), triangle vertices on the grid; derived values are recomputed from validated state and never trusted from a Preset.
- Lesson scenes use typed actions (`set-angle`, `set-mode`, `set-data`, `set-vertices`) registered through the lesson-action registry as in the [linear-maps spec](linear-maps-lessons.md#reuse-and-new-modules); multi-action scenes run synchronously in one tick and are unit tested that way. No playback is needed.
- The unrolled sine of TR1 is drawn from the same angle state; the existing trigonometric function graph is not changed.
- Routes and Presets are additive. The existing `/functions/trigonometric` route and stored Presets keep working. No breaking change.
- **Gating** (boundary in [families-prep](../tasks/feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)). Ungated now: this spec, F0 plan and ADR drafts, F1 kernel (`src/trig/` pure files and oracle tests), F2a `UnitCircleGraph` and `TriangleSolverGraph` as new graph classes using `src/inputs/` as they are, with no route (neither has playback, stepper or step counter). Waits on Controls step 7: F2b registration and routes, F3 lessons, F4 chapter, F5 media. The spec plans no edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime or existing panels; if a shared control is needed it is a dependency on the Controls stream.
- Lesson text is one-shot ([rule](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)); prose follows `lessonMathNotation.test.ts`.

## Testing Decisions

- Kernel oracles: unit-circle values against `Math.sin`/`Math.cos` and the closed special-value table; addition formulas against direct evaluation; solver against reconstruction from vertices (distance, `angleBetween`, shoelace, Heron); SSA against an independent oracle: roots of \(x^2-2b\cos A\,x+b^2-a^2=0\) found by bisection on a fine scan of the circle-ray intersection (scan step below the closest two-root separation on the grid, about \(0{,}09\)), compared only where the case gap exceeds the oracle's resolution; the tie cases (\(A=30^\circ\) with \(b=2a\), and the \(A=90^\circ\), \(150^\circ\) boundaries) are checked against the integer rule instead, and, for the geometric cases with rational direction (e.g. \(C=(4,3)\), ray along the \(x\)-axis, \(a\in\{2{,}5;3;4;5;6\}\) with counts \(0,1,2,1,1\)), `intersectLineCircle` from `src/compgeo/circle.ts`; sine rule against `circumradiusSquared`.
- Exact-decision tests: quadrant and axis on all 720 states; triangle-inequality and angle-sum validity; the whole SSA input grid (\(48\times48\times179=412\,416\) combinations, including \(A\in\{30,90,150\}\)) for the exact count rule; \(c^2=a^2+b^2-2\,CA\cdot CB\) over a dense grid of integer triangles.
- Scene, Preset (save/reopen, export/import, malformed or out-of-range input), lesson/content (step counts, lockstep languages, `lessonMathNotation.test.ts`, `tsc --noEmit`) tests as in the other families.
- Browser: smoke row per lesson (default scene, drag, numeric entry, degenerate and impossible cases, restore, catalog link, narrow viewport, keyboard); the existing trigonometric function route is smoke checked once in Batch A.
- Performance: a drag redraws one circle point and an unrolled trace (about 720 points at most); measure per [the performance plan](../performance-plan.md) before choosing a drawing approach.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contracts are met with checked examples and honest guarantees (exact integer decisions, computed doubles labelled as such).
3. Both languages, accessible numeric inputs for every handle, restore on exit, Presets and figure export pass; check legibility in Presentation mode.
4. Existing routes, Presets and the existing trigonometric function lesson behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- **SSA count, exact on the grid.** With data \(a,b\) (multiples of \(1/4\)), \(A\) in integer degrees, let \(h=b\sin A\). Acute \(A\): \(a<h\) none, \(a=h\) one (right angle at \(B\)), \(h<a<b\) two, \(a\ge b\) one. Obtuse or right \(A\): \(a>b\) one, otherwise none. Because \(\sin A\) is rational only for \(A\in\{30,90,150\}\) (Niven), \(a=h\) can happen on the grid only for \(A=30\) with \(2a=b\) (decided by that integer test); for \(A=150\) and \(A=90\) the rule above never needs \(a=h\). For every other \(A\) the equality \(a=h\) is impossible and \(a\) versus \(h\) is decided by a double comparison whose smallest relative gap over the acute angles \(A\neq30^\circ\) (the only ones where \(a\) is compared with \(h\)) is \(1{,}1\cdot10^{-5}\) (checked, at \(a=9{,}5\), \(b=9{,}75\), \(A=77^\circ\)), far above double error. This is a bound proved by enumeration of the finite grid, not a tolerance; it holds only for the stated input grid and the code rejects other inputs.
- Roots with a vertex at \(A\) itself (\(a=b\)) are excluded exactly by the product \(b^2-a^2=0\).
- SSS validity (\(a+b>c\) and permutations) and ASA validity (\(A+B<180^\circ\)) are exact on the input grid; degenerate (flat) triples are reported as degenerate, not as a \(180^\circ\) angle.
- Computed angles use `atan2` of cross and dot, not `acos`, near \(0\) and \(\pi\).
- Sine and cosine of an angle are doubles; "special" values are exact only through the closed table.
- Pictures illustrate instances; every "always" statement is a theorem or an explicit argument.

## Out of Scope

- Trigonometric equations, inverse functions, hyperbolic functions, Fourier and waves (waves and sampling, family #14, is separate), complex numbers and de Moivre (complex maps).
- Spherical trigonometry, bearings, surveying problems.
- Exercises, grading, progress, free-text input, a formula parser.
- Changing the existing trigonometric function graph, lesson or Presets; changing `inscribed-angle`.
- Renderer replacement or build-tool changes.

## Further Notes

Not verified: VR level markers of the PIK items; the Slovenian terms (no FMF or textbook source opened); the SSK congruence usage; whether the half-degree grid feels smooth and the numeric field is convenient; the drawing performance of the unrolled trace. The circle-geometry spec ([circle-geometry-lessons.md](circle-geometry-lessons.md)) was written in parallel and was not read.
