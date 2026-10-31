# Geometry of curves lessons (Geometrija krivulj)

**Status:** scheduled 2026-10-31 by the [Curves feature stream](../tasks/feature-streams/curves.md); tasks in [docs/tasks/curve-geometry](../tasks/curve-geometry/README.md).
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates](../research/lesson-family-candidates-2026-10-31.md) (CAGD rows 5 and 9, section 4, family 2, sample sequences 4, 5, 14, 15, correctness notes on curvature and offsets); index: [new lesson families](new-lesson-families.md). Primary sources as cited there and only as far as that note read them: Sederberg, *Computer Aided Geometric Design* (offset curves ch. 8, curvature combs sec. 2.11, mirror page numbers); Prautzsch–Boehm–Paluszny sec. 7.1 and 7.6 (contents only); Hladnik's *Analiza 2* outline (curvature, osculating circle); FMF *Analiza 2* (parametric and polar curves) and *Uvod v diferencialno geometrijo* (Frenet formulas) syllabi. Evolutes and envelopes have no curriculum source; their numbers are checked numerically. Related spec: [b-splines-nurbs-lessons.md](b-splines-nurbs-lessons.md) (not yet written) reuses the curvature kernel defined here.

## Problem Statement

Bezeg teaches how Bézier, rational, spline and PH curves are built, but never shows how a curve bends. There is no curvature, osculating circle, comb or evolute anywhere (search for `curvature` finds nothing in `src`), so the difference between C1/G1 and C2/G2 joins in the Splines chapter is stated, not seen. The PH chapter shows an exact offset but not why a general offset fails or where it forms cusps. Students of *Analiza 2* meet parametric and polar curves, curvature and the osculating circle with no picture-first tool in the app.

## Solution

One bilingual chapter, **Geometrija krivulj / Geometry of curves**, in Learn: readable prose interleaved with chapter-owned guided graph activities ([chapter-owned guided learning](chapter-owned-guided-learning.md)), each backed by a catalog Demonstration that stays available for free exploration. The six lessons share one new **curvature kernel** (contract below) and are released in three batches.

| Batch | Lessons | Condition to start | Condition to ship |
| --- | --- | --- | --- |
| 1 | L1 Parametric and polar curves; L2 Curvature and the osculating circle | Kernel unit tests pass | Acceptance gate below; L2 included only with its dragging measurement |
| 2 | L3 Curvature comb and spline joins; L4 Evolute | Batch 1 shipped; comb drawing approach chosen by measurement (ADR below) | Comb measurement meets the performance-plan report template; reused spline graphs unchanged for existing users |
| 3 | L5 Offset curves; L6 Envelope of de Casteljau lines (optional) | Batch 2 shipped | L6 may be dropped without affecting the rest |

### Reuse and new modules (verified by search in this worktree)

- **Reuse:** `src/bezeg/impl/curve/polynomial-bezier-curve.ts`, `rational-bezier-curve.ts` and the Bézier graphs (`src/graphs/curves/bezier/BezierCurveGraph.tsx`, `DecasteljauGraph.tsx`); spline graphs `src/graphs/curves/spline/C1SplineGraph.tsx`, `C2SplineGraph.tsx`, `G1SplineGraph.tsx` and spline model `src/bezeg/impl/curve/GenericBezierSpline.ts`; the PH offset `phOffsetRational` in `src/bezeg/impl/curve/ph-math.ts` with `JXGPHBezierCurve.ts`; the lesson action vocabulary `curve-evaluation` and `curve-visibility` in `src/learning/model.ts`.
- **Not reusable as found:** `grep derivative|hodograph` over `src/bezeg` finds derivative code only in `ph-math.ts` (PH hodograph) and the patch classes (`TensorProductBezierPatch.derivative`); there is **no** derivative of a general polynomial or rational Bézier curve. The hodograph helper is therefore new and is part of the kernel. `src/graphs/functions/ArcLengthGraph.tsx` is the arc length of a function graph (`src/analysis/arcLength.ts`), not of parametric curves; it is a visual precedent only. Offset code exists only for PH curves (`grep -ril offset src/bezeg src/graphs/curves/ph`).
- **New:** `curvature.ts` kernel (pure numbers, like `ph-math.ts`), a parametric/polar curve graph, a curvature overlay for Bézier and spline graphs, an evolute/offset overlay, and one chapter definition in `src/learning/content/familyChapters.ts`.
- **3D:** curve kernels and Bézier curves evaluate in 3D (`bezier-3d.test.ts`; [future plan](../future-plan.md)), but the only 3D view is the patch surface view ([ADR 0019](../adr/0019-jsxgraph-surface-view.md), `BaseSurfaceGraph.tsx`); no curve graph has a 3D view. The \(T,N,B\) frame with torsion is therefore **out of scope**; lesson L2 teaches the planar frame only.

## Curvature kernel (this spec owns it)

A pure module (proposed `src/bezeg/impl/curve/curvature.ts`) on plain numbers: no React, JSXGraph, `Point` objects or graph caches, and no mutable state.

- **Conventions.** Plane curve \(r(t)\) with \(r'(t)\ne0\). Unit tangent \(T=r'/|r'|\); **left** unit normal \(N=(-T_y,T_x)\); signed curvature \(\kappa=\dfrac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}}\), positive for a left (counter-clockwise) turn; \(\kappa=d\varphi/ds\) for tangent angle \(\varphi\). The centre of curvature is \(r+N/\kappa\). The app's PH offset uses the **right** normal (`phOffsetRational` builds edge normals \((\Delta y,-\Delta x)\)); the offset \(r_d=r+d\,N_R\) with \(N_R=-N\) has \(r_d'=|r'|(1+d\kappa)\,T\), so the offset is regular exactly where \(1+d\kappa\ne0\), matching the research note. The kernel exports this convention in one named constant and one function, so UI and tests cannot disagree.
- **Inputs.** A `DerivativeSource` giving \(r'\) and \(r''\) at \(t\) (plain `[x, y]` tuples). Helpers produce it from a polynomial Bézier (hodograph: \(r'=n\sum\Delta b_i B_i^{n-1}\), \(r''=n(n-1)\sum\Delta^2 b_i B_i^{n-2}\)), from a rational Bézier (quotient rule on the homogeneous form, \(C'=(A'-w'C)/w\), \(C''=(A''-2w'C'-w''C)/w\)), and from a spline span via its local parameter. Planar only; nonzero height is rejected as in other planar-only constructions.
- **`curvatureAt(d1, d2)`** returns `{kind:'regular', kappa, speed, tangent, normal}` or `{kind:'singular', speed}` when \(|r'|\le\varepsilon_s\cdot\text{scale}\) (relative tolerance, scale from the control-polygon size). It never returns `NaN` or `Infinity`.
- **`osculatingCircle(r, d1, d2)`** returns `{kind:'circle', centre, radius, kappa}`, or `{kind:'line'}` when \(|\kappa|\le\varepsilon_\kappa\) (inflection or straight segment; radius is infinite and nothing is drawn), or `{kind:'singular'}`.
- **`sampleComb(source, t0, t1, count, gain)`** returns teeth `{t, base, tip, kappa}` with `tip = base - gain*kappa*N` (the tooth points away from the centre of curvature, the usual outward comb; the direction is a named constant). Singular samples are omitted, not zeroed, so a gap is visible. `count` is bounded (proposed 8..256).
- **Spline joins.** `combAtJoin(left, right)` evaluates \(\kappa\) one-sided from each span and returns `{kappaLeft, kappaRight, jump}`; the comb of a spline is the concatenation of per-span combs, never a sample taken across a knot.
- **Offsets and evolute helpers.** `offsetPoint(r, N, d)`, `offsetSpeedFactor(kappa, d) = 1 + d*kappa`, `cuspParameters(samples, d)` (sign changes of \(1+d\kappa\) along the samples, refined by bisection), `evolutePoint(r, N, kappa)` (undefined, not infinite, where \(\kappa=0\)).
- **Behaviour at \(r'=0\).** Singular, as above; the UI says "curvature undefined here" instead of drawing. Near a cusp of the curve the comb grows without bound; the gain is clamped to a visible maximum and the tooth is drawn clipped with a marker, not extended off screen.
- **Verification of the contract.** Unit tests cover: line (\(\kappa=0\)); circle through three Bézier-friendly points (constant \(|\kappa|=1/R\)); sign flip of \(\kappa\) under reversal of orientation; endpoint formula \(\kappa(0)=\frac{n-1}{n}\frac{h}{a^2}\) against the hodograph result; rational quadratic circle arc; central-difference check of \(\kappa=d\varphi/ds\); and the singular cases.

## Lesson contracts and acceptance criteria

Common to all lessons: prerequisites link existing chapters (basics, splines, PH curves, parametrization, and *Analiza* for derivatives); each guide ends in free exploration; every guided step asks the student to predict before the reveal; Slovenian and English text are in lockstep.

### L1. Parametric and polar curves (Parametrične in polarne krivulje)

- **Goal.** A curve is a trace plus a rule of motion; polar curves are the case \(r=f(\theta)\) with a radius ray; curve geometry quantities depend on the trace and the speed together.
- **Prerequisites.** Parametrization chapter (trace versus parameter); *Analiza* chapter on derivatives.
- **Defaults.** Cycloid \(r=1\): \((t-\sin t,\,1-\cos t)\), one arch \(t\in[0,2\pi]\), length \(8\), area \(3\pi\) (research sample 15). Cardioid \(\rho=1+\cos\theta\): \(\rho(0)=2\) and \(\kappa(0)=\tfrac34\) (new, below).
- **Steps.** (1) Predict the path of a marked point on a rolling circle, then roll it. (2) Slider for \(t\) shows the point and the velocity vector. (3) Arch length and area readouts. (4) Switch to polar: radius ray and angle slider \(\theta\). (5) Predict the cardioid from \(\rho(\theta)\) values, then trace it. (6) Cusp of the cycloid at \(t=0,2\pi\) where \(r'=0\). (7) Free exploration: radius of the rolling circle and a choice of polar curve (cardioid, rose, spiral of Archimedes).
- **Graph.** New fixed-catalogue parametric/polar graph (no expression parser); animation reuses the iterative/animation pattern of `LESSON_ANIMATION_IDS` (`src/learning/model.ts`), so the id list gets one new entry per animation.
- **Acceptance.** (1) Arch length \(8\) and area \(3\pi\) match numerical integration to 1e-6 for \(r=1\) and scale as \(r\) and \(r^2\). (2) Cardioid \(\kappa(0)=0.75\) from the kernel. (3) At the cycloid cusps the app reports the velocity as zero and draws no tangent. (4) Roll animation resets to \(t=0\) on step change and on leaving the lesson. (5) Both languages checked, including the live switch.

### L2. Curvature and the osculating circle (Ukrivljenost in krivinska krožnica)

- **Goal.** Curvature measures turning per unit arc length; the osculating circle has radius \(1/|\kappa|\) and is the best-fitting circle; the planar Frenet frame \(T,N\).
- **Prerequisites.** L1; PH chapter hodograph (speed \(|r'|\)); derivatives.
- **Defaults.** Parabola \(y=x^2\): \(\kappa(0)=2\), radius \(\tfrac12\), centre \((0,\tfrac12)\); at \(x=1\): \(\kappa\approx0.17889\), radius \(\approx5.5902\), centre \((-4,3.5)\) (research sample 5). Cubic Bézier \((0,0),(1,0),(2,1),(3,3)\): \(\kappa(0)=\tfrac23\), \(\kappa(\tfrac12)=0.23570\), \(\kappa(1)=0.05963\) (new).
- **Steps.** (1) Predict which end of the cubic bends more, then slide \(t\). (2) Show \(T\) and \(N\) frame and tangent-angle readout. (3) Show the circle and read radius. (4) Parabola at \(x=0\) and \(x=1\): verify the numbers above. (5) Endpoint formula versus the kernel on the cubic. (6) Find an inflection (circle becomes a line) by dragging control points of a cubic. (7) Free exploration with draggable control points.
- **Graph.** New curvature overlay on a Bézier graph (circle, frame, readouts); a parabola preset.
- **Acceptance.** (1) Parabola and cubic values match the numbers above to 4 digits. (2) Endpoint formula and the hodograph result agree to 1e-9 on random cubics with \(b_1\ne b_0\). (3) At an inflection the display shows a line and "radius infinite", never a huge circle. (4) Dragging a point keeps the circle tangent to the curve at the parameter (checked by a tangency residual). (5) Reset restores \(t\) and the control points. (6) Both languages.

### L3. Curvature comb and spline joins (Glavnik ukrivljenosti in stiki zlepkov)

- **Goal.** A comb shows curvature along the whole curve; at a spline join, C1/G1 leaves a visible jump in the comb, while a join with equal curvature (G2) does not.
- **Prerequisites.** L2; Splines chapter (C1, C2, G1 graphs).
- **Defaults.** The cubic from L2 with a comb of 64 teeth; the spline graphs `C1SplineGraph`, `C2SplineGraph`, `G1SplineGraph` with their existing default points. The jump values are read from the kernel (`combAtJoin`), not hand-authored; the authored text states only the qualitative result and whatever the default points give once measured.
- **Steps.** (1) Predict where the cubic is flattest, then switch the comb on. (2) Scale the comb with the gain slider. (3) C1 quadratic spline: predict whether the comb is continuous at the join, then check. (4) C2 cubic spline: comb continuity at joins. (5) G1 spline: move the free parameter and watch the jump. (6) Free exploration.
- **Acceptance.** (1) Comb teeth are normal to the curve within 1e-9 and have length \(\text{gain}\cdot|\kappa|\). (2) Teeth never straddle a knot; join jumps equal the kernel's one-sided values. (3) For C2 splines \(\kappa\) is continuous at joins when the join is regular, as a unit test over random control points; for C1 quadratics a jump is shown. (4) A statement "C2 implies G2" is labelled for regular curves only. (5) Switching graph or leaving the lesson disposes comb objects (no leaked JSXGraph elements, tested by element count). (6) Dragging measurement per the acceptance gate. (7) Both languages.

### L4. Evolute (Evoluta)

- **Goal.** The evolute is the locus of the centres of curvature; normals are tangent to it; its cusps correspond to vertices of the curve (extrema of \(\kappa\)).
- **Prerequisites.** L2, L3.
- **Defaults.** Parabola: evolute \((-4x^3,\,3x^2+\tfrac12)\), matching the centre at \(x=1\), \((-4,3.5)\) (sample 5). The cycloid's evolute being a congruent cycloid is a standard fact not checked in the research note; it may be included only after a numerical check is added to the tests.
- **Steps.** (1) Predict the track of the circle's centre as the point moves. (2) Trace the evolute as \(t\) runs. (3) Show that normals touch the evolute. (4) Parabola: the cusp-free evolute and its point at \(x=0\). (5) Move a cubic's control points to produce vertices and cusps. (6) Free exploration.
- **Acceptance.** (1) Evolute points equal the closed form on the parabola to 1e-9. (2) Normal line at \(t\) passes through the evolute point at \(t\). (3) Where \(\kappa=0\) the evolute point is omitted (it goes to infinity) and the trace breaks cleanly. (4) Overlay disposal and reset as in L3. (5) Both languages.

### L5. Offset curves (Vzporedne krivulje)

- **Goal.** The offset at distance \(d\) is not a Bézier curve in general (this is why PH curves exist); it is regular only while \(1+d\kappa\ne0\); cusps form where \(d=-1/\kappa\) and lie on the evolute.
- **Prerequisites.** L2, L4; PH chapter (exact offset).
- **Defaults.** Parabola \(y=x^2\) with the right-normal convention: at \(d=-\tfrac12\) the offset has its first cusp at \(x=0\), the point \((0,\tfrac12)\) (the centre of curvature); at \(d=-1\), \(1+d\kappa=0\) at \(x=\pm0.38321\), offset points \((\mp0.2251,0.9406)\), which lie on the evolute (new, computed below).
- **Steps.** (1) Predict what the offset of a straight segment and of a circle arc look like. (2) Sample offset of a cubic for small \(d\). (3) Increase \(|d|\) toward the cusp threshold. (4) Compare with the PH offset (exact rational) for a PH curve. (5) Show cusps and the \(1+d\kappa\) graph. (6) Free exploration with a sample-count control.
- **Graph.** Offset overlay on a Bézier graph, drawn as a sampled curve from the kernel; for PH curves the existing exact offset stays and is shown beside it.
- **Acceptance.** (1) Offset distance to the base curve equals \(|d|\) to 1e-9 at every regular sample. (2) Cusp parameters equal solutions of \(1+d\kappa=0\) to 1e-6. (3) A sampled offset is labelled approximate; the PH offset is labelled exact. (4) Global self-intersections of the offset are not claimed solved; the text says the picture shows local cusps only. (5) Offset sign convention is stated in prose and equals `phOffsetRational`'s for a PH curve (cross-check test). (6) Both languages.

### L6. Envelope of de Casteljau lines (Ovojnica; optional)

- **Goal.** A quadratic Bézier curve is the envelope of the lines joining corresponding de Casteljau points; an envelope is touched by every line of the family.
- **Prerequisites.** De Casteljau lesson in the basics chapter.
- **Defaults.** Control points \((1,0),(0,0),(0,1)\): lines \(\frac{x}{1-t}+\frac{y}{t}=1\) envelope \(\sqrt x+\sqrt y=1\) (sample 14).
- **Steps.** (1) Predict what a swarm of lines forms. (2) Draw lines for increasing sample counts. (3) Slide \(t\) and see the touching point on the curve. (4) Drag the middle control point; the envelope stays the Bézier curve. (5) Free exploration.
- **Acceptance.** (1) For each \(t\) the touching point equals the de Casteljau point at \(t\) to 1e-9. (2) Lines are drawn at most 200 at a time; a measurement note is attached. (3) Degenerate case (collinear controls) shows the segment, not an envelope. (4) Both languages.

## User Stories

- As a student I move along a curve and read its curvature and osculating circle, so that "bending" gets a number and a picture.
- As an educator I show a comb at a spline join, so that C1 versus C2 is visible to the class.
- As a student I see an offset form cusps exactly where my prediction says, so that \(1+d\kappa=0\) is not just a formula.
- As an educator in a classroom I use the same Demonstration freely after the guide.

## Implementation Decisions

- The curvature kernel is the only place where \(\kappa\), \(N\) and sign conventions are computed; graphs and tests import it. No React, JSXGraph or graph-cache access in it.
- **ADR needed: comb and overlay drawing.** Real alternatives: one JXG curve with gaps for all teeth; one JXG element per tooth; segments inside a single custom SVG layer; sampling count tied to view width versus fixed. Choose after the dragging measurement below, not before.
- **ADR needed (small): where curvature lives in graph classes.** Alternatives: an overlay mixin on the existing Bézier and spline graphs (affects shared classes), or separate Demonstration graphs that subclass them. Prefer the latter if the shared graphs' dragging cost changes.
- Parametric/polar curves use a fixed catalogue with named parameters; free expression input is deferred (it needs a parser and sandbox decision).
- Chapter id, route and Demonstration ids are set in the task phase; existing routes and stored Presets do not change. New Presets use the existing preset format.
- Terms (proposals; settle with [choosing new terms](../localization.md#choosing-new-terms) before authoring):

| English | Slovenian (proposal) | Note |
| --- | --- | --- |
| curvature | ukrivljenost | used in the *Analiza 2* outline |
| osculating circle | krivinska krožnica | same source |
| radius of curvature | krivinski polmer | proposal |
| curvature comb | glavnik ukrivljenosti | proposal; define on first use |
| evolute | evoluta | loanword; proposal |
| offset curve | vzporedna krivulja | proposal; alternative "ekvidistanta" |
| envelope | ovojnica | proposal |
| polar curve | polarna krivulja | in the *Analiza 2* syllabus |
| cusp | ost | proposal; to check against local usage |
| Frenet frame | Frenetov okvir | the syllabus says *spremljajoči trieder* (3D) |
| inflection | prevoj | standard |

## Testing Decisions

- **Kernel unit tests** as listed in the contract; mathematical checks use independent closed forms (parabola, circle, cycloid) not the code under test.
- **Scene tests:** lesson scenes for each guided step run in one synchronous sequence (per AGENTS.md); reset and disposal tests per lesson; preset round trip for new Demonstrations.
- **`lessonMathNotation.test.ts`** must pass unchanged; every symbol in prose is wrapped in `\(...\)`, decimal commas as `{,}`, `latex` fields undelimited.
- **Localization:** `sl.ts` and `en.ts` in lockstep; after changes run `npx tsc --noEmit --pretty false` and the production build.
- **Performance gate.** Curvature combs add many objects. Per [docs/performance-plan.md](../performance-plan.md) (baseline scenes, measurement protocol, report template), measure dragging a control point on the cubic with the comb off and on at 32, 64, 128 and 256 teeth, and a spline comb while dragging a join point; report frame time against the baseline and write the report under `docs/reviews/`. The default tooth count is the largest value that keeps dragging at baseline within the plan's tolerance; an overlay that fails is not shipped.
- **Smoke scope:** the new chapter, each new Demonstration route, a Splines chapter regression (graphs reused), and one live language switch; the full checklist only if the shared lesson runtime changes.
- **Batch-wide acceptance gate:** unit and scene tests green; type check and production build; both languages browser-checked; dragging measurement recorded; independent mathematical review of kernel and lesson numbers; reviews for UI and accessibility (comb and circle must not rely on colour alone, keyboard-operable sliders, readouts with text).

## Out of Scope

- Torsion and the \(T,N,B\) frame on 3D curves (no curve 3D view exists; revisit after a 3D curve view is specified).
- Space-curve and surface curvature, geodesics; curvature of implicit curves; free expression parsing.
- Global offset handling (loop trimming, self-intersections), exact offset for non-PH curves, offset of splines across joins.
- Cycloid evolute and involutes unless a numerical check is added; envelope families beyond de Casteljau lines.
- Assessment, grading, accounts, progress tracking; new backend; changes to existing routes and presets.

## Further Notes

- **Correctness.** Signed curvature depends on orientation; reversing the curve flips \(\kappa\). \(\kappa\) is undefined where \(r'=0\); a G1 curve may still have a reparametrization with \(r'=0\). C2 implies G2 only for regular curves; the comb shows curvature continuity of the trace, not of the parametrization. The endpoint formula needs \(b_1\ne b_0\). A comb is an illustration of \(\kappa\) at the sampled points: spikes between samples can be missed, so the sample count is stated and a hint appears when adjacent teeth differ strongly. A picture of an osculating circle illustrates, and does not prove, second-order contact; the proof is \(\kappa\) from the derivative formula. Offsets: cusps and, separately, global overlaps; only the former are shown. Numerical robustness: tolerances are relative to the control-polygon size; near-singular \(|r'|\) yields large \(\kappa\), which is clamped for display and not hidden in the readout.
- **New numbers (computed with `node -e`, double precision).** Cubic \((0,0),(1,0),(2,1),(3,3)\): \(\kappa(0)=0.666667\), \(\kappa(\tfrac12)=0.235702\), \(\kappa(1)=0.059628\) (the last agrees with the endpoint formula \(\frac23\cdot\frac{1/\sqrt5}{5}\)). Cycloid \(r=1\): signed \(\kappa\) is negative along the arch; \(|\kappa|=\tfrac1{4\sin(t/2)}\), so the radius is \(2\sqrt2\approx2.828\) at \(t=\tfrac\pi2\) and \(4\) at \(t=\pi\). Cardioid \(\rho=1+\cos\theta\): \(\kappa(0)=0.75\), \(\kappa(\tfrac\pi2)=1.06066\). Parabola offset with \(d=-1\): \(1+d\kappa=0\) at \(x=0.383210\); offset point \((-0.2251,0.9406)\), equal to the evolute point \((-4x^3,3x^2+\tfrac12)\).
- Hodograph code for polynomial curves can later be shared with `ph-math.ts`, but that refactor is not part of this family.
