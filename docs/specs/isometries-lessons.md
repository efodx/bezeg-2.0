# Isometries, similarity and symmetry (Izometrije, podobnost in simetrija)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/isometries](../tasks/isometries/README.md). Decisions 1–3: [ADR 0047](../adr/0047-isometry-graph-rational-maps-and-frieze-closure.md).
**Agreed:** owner scheduled preparation 2026-11-10.
**Source:** [top-15 research note, family 5](../research/lesson-family-candidates-2026-11-09.md) (opening lesson, lessons, kernel, risks: wallpaper groups are U-level). Read for this spec: the matura catalogue M-MAT-2026 §4.6 (page 13: *togi premiki in skladnost*; *vzporedni premik, zrcaljenje, vrtež, orientacija trikotnika*; *središčni razteg, podobnost*). The extraction contains no occurrence of *friz*, *rozet* or *drsn* (searched), so rosette groups, frieze groups and glide reflections are not matura content; they are enrichment, and the level of the §4.6 items is not verified. Part of the [new lesson families](new-lesson-families.md); the index entry is added by the handler.

## Problem Statement

The app applies translate, scale, rotate and reflect buttons to a Bézier curve (`AffineTransformBezierCurveGraph`, `src/graphs/curves/bezier/AffineTransformsBezierCurveGraph.tsx:30`, route `/bezier/affine`) and has a linear-map graph (`src/graphs/linear/LinearMapGraph.tsx`, registered as `linear-map`, `src/graphs/graphFactories.ts:214`). Neither explains what a rigid motion is: that two reflections make a rotation or a translation, that every isometry of the plane is a translation, rotation, reflection or glide reflection, how orientation distinguishes them, or how a central dilation differs from an isometry. The matura catalogue names these and the kernel is small and exact when mirrors are drawn through grid points.

## Solution

Add a Learn chapter **Izometrije, podobnost in simetrija / Isometries, similarity and symmetry** with five chapter-owned guided activities, each backed by a Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary (L1–L3) to enrichment (L4–L5). Each lesson has 5–7 steps, predicts before it reveals, ends in free exploration, and has no exercises, grading or progress. Every "always" statement (two mirrors give a rotation by twice the angle; seven frieze types) is stated as a theorem with the drag labelled an illustration, except where the construction is the argument (noted per lesson).

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Isometry kernel below with oracle tests; ADRs 1–3 accepted | Kernel tests pass; no learner-visible route required |
| A | L1 Two mirrors; L2 Classifying a motion | Batch 0 done; the graph passes the batch gate |
| B | L3 Central dilation and similarity | Batch A released |
| C | L4 Rosettes; L5 Frieze patterns | Batch B released; frieze drawing measured (Testing) |

**Wallpaper groups (17) decision (Handler decision, reversible):** out of scope for this spec and not a Batch D. They are university level (FMF-style crystallographic classification), need a lattice kernel that this family does not own, and the frieze lesson already carries the closure-of-symmetries idea. A later spec may add them; this one reserves no module for them.

### Reuse and new modules

Verified by search in this worktree:

- `src/compgeo/rational.ts` (`Rational`, `RationalPoint` with `add/sub/scale/dot/cross`) and `src/compgeo/grid.ts` (`GridPoint`): the exact base. Mirrors are drawn through grid points, so every reflection matrix has rational entries (for example the mirror through the origin with direction \((2,1)\) has \(\tfrac15\begin{pmatrix}3&4\\4&-3\end{pmatrix}\)). `src/compgeo/circle.ts:106` `lineThrough` builds a mirror line; `intersectLineCircle` is not used.
- `src/linear/matrix2.ts` (`Mat2`, `apply`, `multiply`, `det`, `trace`, `orientationSign`, lines 11–93) and `src/linear/eigen2.ts` (`classifyEigen`, line 66): **reuse for display and as an independent oracle only.** `Mat2` is a double matrix whose graph entries are snapped to \(1/4\) (`MATRIX_ENTRY_STEP`, line 15), so it cannot hold \(\tfrac35\); the isometry kernel therefore has its own `Rational` matrix type and converts to `Mat2` only for drawing. `classifyEigen` of the double image (eigenvalues \(\pm1\) for a reflection, complex for a rotation) is an oracle for the exact classification.
- `AffineTransformBezierCurveGraph` and the curve API `transform(A, b, center)` stay unchanged; the isometry graph does not call `rotate`, `scale` or `flip` of the curve API (pivot caveats recorded in [linear-maps-lessons.md](linear-maps-lessons.md#reuse-and-new-modules)).
- No frieze, rosette or isometry module exists (search of `src/` for *frieze*, *rosette*, *isometr* found only unrelated surface and localization hits).

New modules (names suggested): `src/isometry/isometry2.ts` (rational affine maps, composition, reflection through two points, classification), `src/isometry/frieze.ts`, `src/isometry/rosette.ts`, `src/isometry/isometryModel.ts` (state validation), `src/graphs/isometry/IsometryGraph.tsx` with tests. Pure maths stays free of React, JSXGraph and localization.

### Decisions needing an ADR

1. **Graph shape.** (a) One `IsometryGraph` with a mode (mirrors / classify / similarity / rosette / frieze); (b) a graph per lesson; (c) extend `LinearMapGraph`. (c) would put rational, non-snapped matrices into a graph whose Preset format snaps entries to \(1/4\) and whose panels the Controls stream is changing. Proposal: (a).
2. **Number type.** (a) `Rational` for all motion data (exact classification), doubles only for drawing and for angles; (b) doubles with tolerance; (c) snapped matrices as in the linear-map graph. (c) cannot represent a reflection in a grid mirror; (b) would present a tolerance as exact. Proposal: (a).
3. **Frieze generators.** (a) The learner toggles the symmetries present (vertical mirror, horizontal mirror, half-turn, glide) and the kernel closes the set; (b) the learner picks one of seven named types; (c) the learner draws a pattern and the kernel detects the type. (c) needs image comparison and is not exact; (b) hides why there are seven. Proposal: (a), with the closure the argument for "exactly seven" (L5).

## Isometry kernel (owned by this spec)

1. **Type.** `AffineMap2 = {a,b,c,d,tx,ty}` of `Rational` (not named after isometries, because `dilation` returns one too), mapping \((x,y)\mapsto(ax+by+t_x,\;cx+dy+t_y)\). `compose(B, A)` is first \(A\), then \(B\). `apply`, `inverse` (valid when \(ad-bc\ne0\)).
2. **Constructors.** `reflection(p, q)` through two different grid points: with \(w=q-p\), linear part \(\frac1{w\cdot w}\begin{pmatrix}w_x^2-w_y^2&2w_xw_y\\2w_xw_y&w_y^2-w_x^2\end{pmatrix}\) and the translation fixing \(p\). `translation`, `rotationAbout(centre, cosθ, sinθ)` for a rational unit pair, `dilation(centre, k)` with \(k\ne0\) rational.
3. **Classification of an isometry.** Valid when \(A^TA=I\) (exact test: \(a^2+c^2=1\), \(b^2+d^2=1\), \(ab+cd=0\)). With \(\delta=ad-bc=\pm1\): \(\delta=+1\) and \(A=I\): `identity` (\(t=0\)) or `translation`; \(\delta=+1\), \(A\ne I\): `rotation` about the unique centre solving \((I-A)z=t\) (determinant \(2-\operatorname{tr}A\ne0\), exact), angle by `atan2(c, a)` (a double, labelled computed); \(\delta=-1\): take the axis direction \(w=(1+a,\;c)\), or \(w=(b,\;1-a)\) when that is zero (the case \(a=-1\), \(c=0\), a vertical axis); `reflection` when \(t\) is perpendicular to \(w\) (\(t\cdot w=0\), exact), else `glide` with glide vector \(\frac{t\cdot w}{w\cdot w}w\). The axis of a reflection or glide is exact.
4. **Similarity.** \(M\) is a similarity iff \(a^2+c^2=b^2+d^2\) and \(ab+cd=0\) (exact). Ratio \(\lambda^2=a^2+c^2\) exact; \(\lambda\) is rational for every motion built from rational dilations and grid mirrors. Orientation is the sign of \(ad-bc\). A fixed point exists and is unique iff \(\det(I-A)\ne0\), computed exactly; for \(A=kR\) with rotation angle \(\theta\) it equals \(1-2k\cos\theta+k^2\).
5. **Rosettes.** `rosette(n, mirrors)` returns the \(n\) (cyclic \(C_n\)) or \(2n\) (dihedral \(D_n\)) images of a motif about the origin. The images use \(\cos(2\pi j/n),\sin(2\pi j/n)\) in doubles: for \(n\notin\{1,2,4\}\) no rational pair exists (a rotation of finite order with rational entries has \(\cos\theta\in\{0,\pm1\}\); standard fact, not in the repository), so rosette outputs are computed values, but the group order \(n\) or \(2n\) is the integer chosen by the learner and is exact.
6. **Frieze.** The seven frieze types by period \(L\) (rational): `p1`, `p11g`, `p1m1`, `p11m`, `p2`, `p2mg`, `p2mm` (IUC notation). `friezeClosure(generators, L)` takes elements of \(\{V:(−x,y),\;V':(-x+L/2,y),\;H:(x,-y),\;R:(-x,-y),\;G:(x+L/2,-y)\}\), closes under composition modulo translation by \(L\) (the quotient of the symmetry group by its period translations), and returns the elements, or `reducesPeriod` when a pure translation other than \(0\) mod \(L\) appears. `friezeType(elements)` reads the feature signature (vertical mirror, horizontal mirror, half-turn, glide). `friezeCopies(type, motif, L, range)` returns the motif images (1, 2 or 4 per period; see L5).
7. **Discrete outcomes** (parallel mirrors, class of an isometry, similarity, orientation, frieze type) are exact on `Rational` data built from grid mirrors and snapped ratios. Doubles appear only in angles, rosettes and drawing.

## Concept contracts and acceptance criteria

All numbers below were computed with `node` and are listed with their inputs in the [note file](../reviews/feature-streams/families-prep/notes/spec-lines-isometries.md). Examples are defaults; equivalents may replace them if the goal and checks hold. Motif: the triangle \((3,1),(5,1),(3,4)\) (counterclockwise, so reversing orientation is visible).

### L1. Two mirrors

- Goal: reflecting twice gives a rotation by twice the angle between the mirrors, about their meeting point; parallel mirrors give a translation by twice their distance.
- Prerequisites: reflection (PIK §4.6, page 13). Not a prerequisite of L3.
- Scene: two mirrors each through two draggable grid points; the motif, its image in mirror 1 and its image in mirror 2; the composite as a readout (class, centre or vector, angle). Argument: the images are constructed by reflection, and the angle statement is a theorem shown on the instance, so the picture illustrates it.
- Steps: (1) predict the first image; (2) the second image; (3) predict where it goes if mirror 2 turns; (4) drag mirror 2 to parallel: translation; (5) free.
- Checked numbers: mirror 1 through \((0,0),(1,0)\) and mirror 2 through \((0,0),(2,1)\): composite \(\tfrac15\begin{pmatrix}3&-4\\4&3\end{pmatrix}\) (cosine \(\tfrac35\), sine \(\tfrac45\), angle \(53.13^\circ\), twice \(26.57^\circ\)); \((3,1)\mapsto(3,-1)\mapsto(1,3)\); the motif goes to \((1,3),(\tfrac{11}5,\tfrac{23}5),(-\tfrac75,\tfrac{24}5)\). Parallel mirrors \(x=0\) and \(x=3\): translation by \((6,0)\).
- Acceptance: the composite equals the matrix above; "parallel" decided by exact cross product of directions; \(\cos2\varphi=(d^2-c^2)/(d^2+c^2)\) with \(d=u\cdot v\), \(c=u\times v\) matches the matrix entry exactly (independent formula); orientation of the image equals that of the motif.

### L2. Classifying a motion

- Goal: four kinds of plane motion; orientation and fixed points tell them apart.
- Scene: a motion given by composing up to three mirrors, or by a short list of presets; the kernel classifies and draws centre or axis, glide vector and a fixed-point count. Illustration.
- Steps: (1) predict whether a single reflection keeps counterclockwise order; (2) two mirrors; (3) three mirrors give a glide; (4) read the fixed points: none (translation, glide), one (rotation), a line (reflection); (5) free.
- Checked numbers: rotation by \(90^\circ\) with \(t=(3,1)\) has centre \((1,2)\); \((x,y)\mapsto(y+2,x+2)\) is a glide along \((1,1)\) with vector \((2,2)\); \((x,y)\mapsto(y+1,x-1)\) is the pure reflection in \(y=x-1\) (glide vector \((0,0)\), fixes \((2,1)\)).
- Acceptance: the three classifications match the numbers; `classifyEigen` on the linear part (it accepts only quarter-grid entries and throws `RangeError` otherwise, corrected at F1; maps with entries such as \(3/5\) are compared through the computed discriminant \(\operatorname{tr}^2-4\det\) instead) gives complex for rotations other than the half-turn, repeated scalar \(-1\) for the half-turn (special-cased in the test), distinct real \(\pm1\) for reflections and glides, repeated scalar \(+1\) for translations; every composition of \(\le3\) mirrors from a grid test set is one of the four classes.

### L3. Central dilation and similarity

- Goal: a dilation keeps shape and angles, scales lengths by \(|k|\) and areas by \(k^2\); negative \(k\) adds a half-turn; a similarity is a dilation composed with an isometry.
- Prerequisites: PIK §4.6 *središčni razteg, podobnost*.
- Scene: centre and ratio \(k\) (snapped to \(1/4\), \(0<|k|\le4\)); motif and image; readouts of side ratio, area ratio, orientation, fixed point.
- Steps: (1) predict the image of a vertex; (2) drag \(k\); (3) negative \(k\); (4) compose with a rotation; (5) free.
- Checked numbers: triangle \((0,0),(4,0),(0,3)\), centre \((1,1)\), \(k=\tfrac32\): images \((-\tfrac12,-\tfrac12),(\tfrac{11}2,-\tfrac12),(-\tfrac12,4)\); area \(6\mapsto\tfrac{27}2\) (ratio \(\tfrac94\)); sides \(5\mapsto7.5\). With \(k=-\tfrac12\): images \((\tfrac32,\tfrac32),(-\tfrac12,\tfrac32),(\tfrac32,0)\), orientation kept. Similarity \(\tfrac32\) times the rotation \(\tfrac15\begin{pmatrix}3&-4\\4&3\end{pmatrix}\): matrix \(\begin{pmatrix}9/10&-6/5\\6/5&9/10\end{pmatrix}\), \(\lambda^2=\tfrac94\), \(\det(I-A)=\tfrac{29}{20}\); with \(t=(1,2)\) the fixed point is \((-\tfrac{46}{29},\tfrac{28}{29})\).
- Acceptance: area ratio equals \(\det\) by shoelace (independent oracle); dilation's fixed point is the centre; for \(k=1\) the class is identity, for \(k=-1\) a half-turn.
- Prose: say a dilation is not an isometry unless \(|k|=1\).

### L4. Rosettes

- Goal: the symmetries of a regular figure form \(C_n\) (\(n\) rotations) or \(D_n\) (\(2n\) motions with mirrors); counting them counts the images of a motif.
- Scene: the learner chooses \(n\in\{1,\dots,12\}\) and whether mirrors are present; the motif and its orbit about a centre. Illustration; the order \(n\) or \(2n\) is exact.
- Steps: (1) predict the number of images for \(n=5\) without mirrors; (2) add mirrors; (3) compare the orbit of a point on a mirror (fewer distinct images) with a generic point; (4) free.
- Checked numbers: orders are \(n\) and \(2n\) (e.g. 5 and 10); images by an independent loop of rotations (Testing).
- Acceptance: the orbit of a generic point has exactly the stated size and no coincident images; with mirrors, orientation alternates between consecutive images.

### L5. Frieze patterns

- Goal: patterns that repeat along a strip have exactly seven symmetry types, each a closed set of symmetries.
- Scene: a motif (letter-F-like, asymmetric), the period \(L\), checkboxes for vertical mirror, horizontal mirror, half-turn, glide; the kernel closes the set and draws the pattern over a window; the type name is shown. "Exactly seven" here is a bounded check: the closure is enumerated over this model's five generators and mirror positions (\(0\) or \(L/4\)), which is not a proof of the classification theorem; the prose names the theorem and says the app checks it for these generators. The picture illustrates a single pattern. Handler decision, reversible.
- Steps: (1) predict how many images per period with only a half-turn; (2) add a vertical mirror to a glide and see half-turns appear midway between the mirrors (`p2mg`); (3) combine vertical and horizontal mirror: the half-turn appears; (4) try a combination that halves the period (status); (5) the seven types listed; (6) free.
- Checked numbers: with \(L=4\) and generators from \(\{V,V',H,R,G\}\), of the 32 subsets 16 halve the period and 16 are valid; modulo shifting the origin the valid ones are exactly 7 classes (10 distinct closed sets) with distinct feature signatures (vertical mirror, horizontal mirror, half-turn, glide present in the closure): `p1` none; `p1m1` vertical mirror; `p11m` horizontal mirror; `p2` half-turn; `p11g` glide; `p2mm` all four; `p2mg` vertical mirror, half-turn and glide, no horizontal mirror. Generator sets reaching `p2mg`: \(\{V,G\}\), \(\{V',R\}\), \(\{V',G\}\), \(\{R,G\}\), \(\{V',R,G\}\) (the closure of \(\{V,G\}\) contains the half-turn at \(L/4\)); \(\{V,R\}\) gives `p2mm` because \(V\circ R=H\), and \(\{V,R,G\}\) halves the period. With the four checkboxes (\(V,H,R,G\)) `p2mg` is reached as \(V+G\) or \(R+G\). Images per period for `p1`, `p11g`, `p1m1`, `p11m`, `p2`, `p2mg`, `p2mm`: 1, 2, 2, 2, 2, 4, 4 (the size of the closed set).
- Acceptance: the count of valid classes is 7 in a unit test whose closure oracle is a separate brute-force composition loop, not `friezeClosure`; vertical mirror plus glide yields half-turns (type `p2mg`); vertical mirror plus half-turn at the origin yields `p2mm`; vertical plus horizontal mirror yields a half-turn (`p2mm`); copies for each type contain no duplicates in one period and tile the window.

## User Stories

1. As a student, I drag two mirrors and see the rotation or translation they make.
2. As a student, I tell the four motions apart by orientation and fixed points.
3. As a student, I see a dilation scale lengths and areas.
4. As an educator, I build a frieze pattern from chosen symmetries and show there are seven kinds.
5. As a reader on a phone or keyboard, I enter mirror points numerically and step through the lesson with large controls.

## Terms

Search of `src/localization/sl.ts` found *Zrcaljenje* (`affine_reflection`, line 519), *Rotiraj* (buttons), *središčn-* (angles only), *simetri-* (5 uses) and no *podobnost*, *izometrija*, *drsno zrcaljenje*, *friz*. PIK §4.6 supplies *togi premik*, *skladnost*, *vzporedni premik*, *zrcaljenje*, *vrtež*, *orientacija*, *središčni razteg*, *podobnost*. Decided by [choosing new terms](../localization.md#choosing-new-terms): reuse, then the PIK; no web or UL search was done, so the starred terms are unverified.

| English | Slovenian | Where | Basis |
| --- | --- | --- | --- |
| isometry; rigid motion | izometrija; togi premik | all | PIK *togi premiki*; *izometrija* standard |
| translation | vzporedni premik | L1, L2 | PIK |
| reflection; mirror | zrcaljenje; zrcalo (os zrcaljenja) | L1, L2 | PIK; `sl.ts` |
| rotation | vrtež | L1, L2 | PIK (the app's buttons say *Rotiraj*) |
| glide reflection | zrcalni zdrs | L2, L5 | F0: UL FMF *Analitična in projektivna geometrija* uses *zrcalni zdrs*; replaces the proposal *drsno zrcaljenje* |
| orientation | orientacija | L2 | PIK |
| central dilation | središčni razteg | L3 | PIK |
| similarity | podobnost | L3 | PIK |
| rosette; cyclic and dihedral group | rozeta; ciklična in diedrska grupa | L4 | F0: *ciklična grupa* from UL algebra notes; *rozeta* glossed by its group |
| frieze pattern; frieze group | friz; frizna grupa | L5 | F0: RUL thesis *Frizne grupe* (2021) |
| period | perioda | L5 | proposal |

## Implementation Decisions

- **Gating** ([Boundary with the Controls stream](../tasks/feature-streams/families-prep.md)). Ungated now: this spec, the F0 plan, the ADRs, the F1 kernel (`src/isometry/*` as new pure files with oracle tests) and F2a (`IsometryGraph` as a new class using the shared controls of `src/inputs/` as they are, with no route). Waiting on Controls step 7: F2b registration, F3 lessons, F4 chapter, F5 media. This spec plans no edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/` or existing graph panels or to `LinearMapGraph`. A shared control (for example a symmetry checkbox group) is a dependency on the Controls stream if it does not exist.
- State: mirror grid points, mode, dilation centre and ratio, rosette \(n\) and mirror flag, frieze feature set and period; derived values are recomputed from validated state.
- Typed scene actions (`set-mirrors`, `set-dilation`, `set-frieze`, `set-mode`); multi-action scenes run in one synchronous tick and are tested that way. No playback.
- Routes and Presets additive; `/bezier/affine` and `linear-map` unchanged.
- Lesson text is one-shot ([rule](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)).

## Testing Decisions

- Kernel oracles: composition checked against double `Mat2` multiplication (`src/linear/matrix2.ts`) within \(10^{-12}\); classification checked against `classifyEigen` of the double image; area ratio against shoelace; \(\cos2\varphi\) against the \((d^2-c^2)/(d^2+c^2)\) formula; frieze closure against a brute-force enumeration of all subsets; rosette orbits against an independent rotation loop; property tests over random grid mirrors (compositions of 1–3 mirrors always classify to one of four classes, and \(A^TA=I\) holds exactly).
- Scene, Preset and lesson-content tests as in [linear-maps-lessons.md](linear-maps-lessons.md#testing-decisions). Frieze drawing (up to ~20 periods of 4 copies) is measured against the [performance plan](../performance-plan.md) before a drawing approach is chosen.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its guided activity and a static preview.
2. The concept contracts are met with checked examples; every discrete outcome is exact; angles and rosette points are labelled computed.
3. Both languages, accessible numeric inputs for every handle, restore on exit, Presets and figure export pass; legible in Presentation mode.
4. Existing routes, Presets and `linear-map` behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- A rotation about a non-origin centre has the translation part \((I-A)c\); `rotationAbout` and the classifier must agree (round trip test).
- Rational rotations are those with a rational unit pair \((\cos\theta,\sin\theta)\), such as the Pythagorean \((\tfrac35,\tfrac45)\), but those have infinite order; a rotation of finite order with rational entries has \(\cos\theta\in\{0,\pm1\}\) (orders 1, 2, 4). The \(60^\circ\) rotation of a hexagon is not rational, hence rosette images are doubles while the group order stays an exact integer.
- Frieze motifs must be asymmetric, or a symmetric motif hides generators; the closure is on the group, not on the picture.
- `reducesPeriod` guards the case where the chosen symmetries imply a smaller period.

## Out of Scope

- Wallpaper (plane) groups, lattice classification, Penrose and other aperiodic tilings.
- 3D isometries, quaternions, matrix groups in general, general affine maps (linear-maps and the existing affine lesson).
- Detecting the symmetry of a drawn pattern, image processing.
- Free-text matrix input, symbolic computation.
- Changing `AffineTransformBezierCurveGraph`, `LinearMapGraph`, their Presets or routes.
- Backend, accounts, assessment, progress.

## Further Notes

Not verified: VR level markers; the Slovenian terms marked with a star against UL sources; the drag feel of the grid mirrors; frieze drawing performance. Not run: browser checks, because no code exists. The sibling specs of this stream were not read.
