# Mechanical curves: the fastest descent (Mehanske krivulje: najhitrejši spust)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/mechanical-curves](../tasks/mechanical-curves/README.md). Decisions 1–2: [ADR 0056](../adr/0056-mechanical-curves-descent-graph-quarter-grid-tracks.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #15 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md), engine family); details below are proposals for owner review.
**Source:** the research note's entry 15 and [expansion research E10](../research/lesson-family-candidates-2026-10-31-expansion.md#e10-variacijski-račun-in-mehanske-krivulje--brachistochrone-and-mechanical-curves-u-s-enrichment) (lessons, pitfalls, sample checks). Matura catalogue M-MAT-2026: searched the text extraction for *cikloida*, *brahistohrona*, *parametrični* and found none, so this family has **no matura anchor** (university enrichment: FMF *Analiza 3*, *Matematično modeliranje*, cited from the research note, not opened). Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

Bezeg draws the cycloid as a parametric curve and rolls it (`id: 'cycloid'` in `src/learning/content/curveGeometryGuidedLessons.ts:49`, graph `ParametricCurveGraph`, route `/curve-geometry/parametric` at `src/demonstrations.ts:68`). Nothing uses the curve for what makes it famous: of all tracks between two points, a bead sliding without friction takes the least time on the cycloid, and from any point of the cycloid it reaches the bottom in the same time. A learner cannot drag a track and see the descent time change, and the straight line (the shortest path) is visibly not the fastest. The honest teaching problem: the optimality is a theorem of the calculus of variations; a drag can only illustrate it.

## Solution

Add a Learn chapter **Mehanske krivulje: najhitrejši spust / Mechanical curves: the fastest descent** with three guided activities backed by a Demonstration for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: university and curious upper secondary. Each lesson is 5–7 steps, predicts before it reveals, ends in free exploration. No exercises, grading or progress. Pictures are labelled **argument** or **illustration**. The family is an **engine family**: its value is the descent-time integrator (kernel below); the catenary and Kepler lessons of E10 are out of scope (their own spec if wanted).

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/mechanics/` (below) with oracle tests; ADRs 1–2 accepted | Kernel tests pass; no learner-visible route needed |
| A | MC1 The race; MC2 Drag the track | Batch 0 done; graph passes the batch gate; **F2a gated** (below) |
| B | MC3 Equal times: the tautochrone | Batch A released |

Publish batches separately. Do not expose unimplemented Demonstrations.

### Reuse and new modules

Verified by search in `src/`:

- `cycloidSource(radius)` in `src/bezeg/impl/curve/parametric-sources.ts:30` (\((R(t-\sin t),R(1-\cos t))\) with derivatives, `DerivativeSource` contract in `curvature.ts`) and the catalogue `CYCLOID_RADIUS_MIN/MAX/DEFAULT` (0.25, 3, 1) in `src/graphs/curves/parametric/parametricCatalogue.ts:18`. The kernel reuses the cycloid formula; the \(y\)-axis there points up, so the kernel works in **depth** \(y_d=-y\) (flipped once, in the adapter).
- `src/analysis/arcLength.ts`: `adaptiveSimpson` (line 83) and `polylineLength` (52) are the quadrature precedent; they cannot integrate the singular descent integrand (see below) and are not reused for it. Bézier evaluation: the curve API `src/bezeg/api/curve/point-controlled-curve.ts` (the kernel evaluates Bernstein sums itself on plain arrays, free of the curve classes).
- Not present (searched `brachistochrone`, `descent`, `tautochrone` in `src/`): all new.

New modules (names suggested): `src/mechanics/descentTime.ts` (integrator), `src/mechanics/tracks.ts` (line, circle arc, cycloid, Bézier track as one `Track` interface), `src/mechanics/brachistochrone.ts` (the cycloid through two points), `src/mechanics/trackModel.ts` (state parse/validation); graph `src/graphs/mechanics/DescentGraph.tsx`. Pure maths stays free of React, JSXGraph and localization.

### Decisions needing an ADR

1. **Graph shape and placement.** (a) A new `DescentGraph` with modes `race`, `track`, `tautochrone`; (b) extend `ParametricCurveGraph` with a bead; (c) a graph per lesson. (b) changes an existing route and its Presets; (c) duplicates the integrator wiring. Proposal: (a), placed in the `curve-geometry` family. Before Batch A.
2. **Track input and exactness.** (a) End points and Bézier control points on a \(1/4\) grid; the discrete decisions (track admissible, finite time) are exact tests on snapped control points; (b) continuous points with a tolerance. Proposal: (a). The cycloid's end point is computed (not on the grid) and shown as such.
3. **Playback of the bead** (animated race): waits on Controls step 5 (play/step controls); until then lessons use a time slider that sets the elapsed time. No ADR of this family.

## Mechanics kernel (owned by this spec)

Work in depth \(y\) (downwards, \(y=0\) at the start), \(g=9.81\) (a constant of the model, not editable). A bead starts at rest at the start point and slides without friction along the track; speed at depth \(y\) is \(\sqrt{2gy}\) (energy), so \(T=\int ds/\sqrt{2gy}\).

1. **Track.** `Track = {point(t), velocity(t), y(t), t0, t1}`; `velocity` is the exact derivative where known (line, arc, cycloid, Bernstein).
2. **Descent time with a substitution.** `descentTime(track, g)` integrates \(\int_{t_0}^{t_1}|\gamma'(t)|/\sqrt{2g\,y(t)}\,dt\) with \(t=t_0+(t_1-t_0)s^2\), so the integrand \(2s\,|\gamma'|/\sqrt{2gy}\) is smooth when \(y\sim c\,t\) (finite slope at the start; the \(1/\sqrt t\) singularity cancels). Composite 5-point Gauss–Legendre on \(s\in[0,1]\) with 200 panels. The substitution \(s^2\) (not \(s^3\): that leaves an \(s^{1/2}\) term, checked below) is part of the contract. Start at a cusp (cycloid, \(y\sim t^2\) and \(|\gamma'|\sim t\)) needs no substitution; the same routine is used.
3. **Start at an interior point of a track** (MC3): `descentTimeFrom(track, tStart)` uses the drop \(h(t)=y(t)-y(t_{start})\) and the substitution at \(t_{start}\); the singularity is the same \(1/\sqrt{\cdot}\) type.
4. **Admissibility (a conservative rule, exact on snapped points).** A Bézier track with control depths \(y_0=0,y_1,\dots,y_n\) is admissible if all \(y_i\ge0\), \(y_1>0\) and \(y_n>0\). Then \(y(t)>0\) on \((0,1]\) (a Bernstein sum of non-negative terms with \(y_1,y_n>0\)) and \(y(t)\approx n\,y_1t\) near \(0\): finite time. The rule is sufficient, not necessary: a track with some \(y_i<0\) can still stay below the start, but it is reported `{kind:'above-start'}` and not timed. This is a stated simplification. If \(y_1=0\) with \(P_1\ne P_0\) (horizontal start tangent), then \(y\sim t^2\) while \(|\gamma'|\) stays bounded away from \(0\), so \(\int dt/t\) diverges and the bead never leaves; the result is `{kind:'never-starts'}`, never a large number. The exception is \(P_1=P_0\) (a cusp start, \(|\gamma'|\sim t\)): the integrand is bounded and the time is finite, as for the cycloid in item 2. Such a track is admissible when its first control point different from \(P_0\) is strictly below the start.
5. **Brachistochrone.** `brachistochrone(B)` for an end point \(B=(x_B,y_B)\), \(x_B,y_B>0\): the cycloid \(x=r(\theta-\sin\theta)\), \(y=r(1-\cos\theta)\) through \(B\) with \(\theta_B\) from \((\theta-\sin\theta)/(1-\cos\theta)=x_B/y_B\) (the left side is strictly increasing on \((0,2\pi)\); bisection, 200 iterations) and \(r=y_B/(1-\cos\theta_B)\). Its time is \(T=\theta_B\sqrt{r/g}\) (closed form: \(\dot\theta=\sqrt{g/r}\)).
6. **Oracles.** Cycloid and straight line by closed form (below), Bézier by a second substitution \(t=s^4\) (smooth integrand) agreeing to \(10^{-12}\), plain midpoint rule as the *negative* control (the method that fails).

## Concept contracts and acceptance criteria

Every number was computed with `node`; scripts and outputs are in `docs/reviews/feature-streams/families-prep/notes/spec-mechanical-amendments.md`. Examples are defaults; equivalents may replace them if goal, edge cases and independent checks are kept.

### MC1. The race

- Learning goal: the shortest path is not the quickest; a bead on a steeper start gains speed early. Three tracks from \(A=(0,0)\) to \(B=(\pi r,2r)\) with \(r=1\) (the end point of one cycloid arch, \(B=(3{,}14159;\,2)\), computed, not on the grid): straight line, circular arc, cycloid.
- Default numbers (*checked*, \(g=9{,}81\)): cycloid \(T=\pi\sqrt{r/g}=1{,}00303\) s (closed form; quadrature agrees to \(10^{-12}\)); line \(T=\sqrt{\pi^2+4}/\sqrt g=1{,}18904\) s (length \(3{,}72419\); closed form: constant acceleration \(g\sin\alpha=2g/L\), \(T=L/\sqrt g\)); the line is \(18{,}54\,\%\) slower. Circular arc with centre \((c,0)\), \(c=(\pi^2+4)/(2\pi)=2{,}20742\) (vertical start tangent, like the cycloid), swept to \(\varphi=115{,}04^\circ\) (it dips to depth \(c=2{,}207>2\) before rising to \(B\)): \(T=1{,}02848\) s by quadrature with \(\varphi=u^2\) (no closed form; the oracle is a second quadrature in \(\varphi\) with 2000 panels). The plain midpoint rule with 1000 nodes gives \(1{,}17767\) for the line (error \(0{,}0114\) s, \(0{,}96\,\%\)) and does not converge fast: that is why the substitution is needed.
- Steps: (1) the three tracks and a bead at \(A\); predict the winner; (2) release the beads (time slider; playback after Controls step 5); (3) the readouts; the cycloid wins; (4) why the line loses (the bead reaches speed sooner on a steep start); (5) the arc: steeper start, still slower; (6) free exploration with \(r\in[0{,}25;3]\) (the catalogue range): \(T\) scales as \(\sqrt r\); the order is unchanged.
- Graph needs: the three tracks, beads at the elapsed time, three time readouts, the winner marked (text, not only colour), a time slider, \(r\) control.
- Acceptance:
  1. The listed times agree with the closed forms (cycloid, line: \(10^{-12}\) relative) and with the second quadrature (arc: \(10^{-9}\)).
  2. For \(r=0{,}25\) and \(r=3\) the times scale as \(\sqrt r\) to \(10^{-12}\) relative (cycloid and line, same \(r\)).
  3. At every elapsed time \(t\) the bead depth satisfies energy conservation \(v^2=2gy\) (the bead's position is solved from the arc-length integral by bisection, not tabulated).
  4. Argument or illustration: the race is an **illustration** (three tracks); the prose says the cycloid is the fastest of *all* tracks as a theorem (calculus of variations, cited), and shows the cycloid beating two others as a check, not a proof.
  5. Reset, Preset, restore, both languages pass.

### MC2. Drag the track

- Learning goal: a flexible track (cubic Bézier, four control points on the \(1/4\) grid, \(P_0=(0,0)\), end point \(B\)) can be reshaped by dragging; the descent time is the integral of the speed law; the cycloid through \(A\) and \(B\) is a lower bound the learner cannot beat.
- Default numbers (*checked*): \(B=(3{,}25;\,2)\); cycloid through \(A,B\): \(\theta_B=3{,}194665\), \(r=1{,}000704\), \(T=1{,}02034\) s (closed form \(\theta_B\sqrt{r/g}\); quadrature agrees to \(3\cdot10^{-14}\) when the cycloid track takes \(x(\theta)\) and the derivatives from `cycloidSource` and the depth as \(2r\sin^2(\theta/2)\) through the depth adapter, because \(r(1-\cos\theta)\) loses accuracy near the cusp, about \(5\cdot10^{-10}\); noted at F1, 2026-11-10); line \(T=\sqrt{3{,}25^2+4}/\sqrt g=1{,}21838\) s; track \(P=(0,0),(0{,}5;\,2),(2;\,2{,}5),(3{,}25;\,2)\): \(T=1{,}036620\) s (substitution \(s^2\): \(1{,}0366196194\), substitution \(s^4\): \(1{,}0366196194\), agree to \(5\cdot10^{-15}\)), \(1{,}6\,\%\) slower than the cycloid; the start slope of the depth is \(n\,y_1=6\), so the depth is positive after the start (admissibility rule above). Plain midpoint, 1000 nodes: \(1{,}02572\) (error \(0{,}0109\)).
- Steps: (1) the default track and its time; predict whether bending it can beat the line; (2) drag \(P_1\), \(P_2\): the time readout changes; (3) the line is never best; (4) the cycloid overlay and its time; (5) try to beat it: the readout never goes below; (6) horizontal start (\(y_1=0\)): "the bead never starts" status; (7) free exploration with \(B\) draggable.
- Graph needs: \(B\) and \(P_1,P_2\) draggable on the grid, track, cycloid overlay (toggle), live time and difference to the cycloid, status line for inadmissible tracks, keyboard stepping of handles, handles at least 44 px.
- Acceptance:
  1. Listed numbers agree (closed form for the cycloid; \(s^2\) vs \(s^4\) to \(10^{-12}\) for the track).
  2. For 10 000 random admissible tracks (seeded, fixed seed in the test) \(T\ge T_{cyc}-10^{-9}\), as an illustration check of the theorem, never claimed as proof in the UI.
  3. Admissibility is the exact test of kernel item 4 on snapped points; `never-starts` and `above-start` show a text status and no number; no \(\infty\) or NaN reaches the board.
  4. Argument or illustration: **illustration** of a theorem; the prose says "no track beats the cycloid" is the Euler–Lagrange result, cited, and that the drag cannot establish it.
  5. Drag interactivity is measured per the [performance plan](../performance-plan.md) (the integral is recomputed on every drag step: 200 panels × 5 nodes).
  6. Reset, Preset round trip (control points validated), both languages pass.

### MC3. Equal times: the tautochrone

- Learning goal: on the cycloid (\(r=1\)) a bead released at rest from parameter \(\theta_0\) reaches the lowest point \(\theta=\pi\) in the same time \(\pi\sqrt{r/g}\) for every \(\theta_0\in(0,\pi)\), whereas on a circular arc the time depends on the start.
- Default numbers (*checked*, \(g=9{,}81\), substitution \(\theta=\theta_0+(\pi-\theta_0)s^2\)): \(\theta_0=0{,}3;\,1;\,2\) give \(1{,}0030333404;\ 1{,}0030333404;\ 1{,}0030333404\) s against \(\pi/\sqrt g=1{,}0030333404\) (differences below \(2\cdot10^{-12}\)). The plain midpoint rule with 1000 nodes gives \(0{,}99903;\ 0{,}99643;\ 0{,}99489\): the "small deficit" of the research note is the endpoint singularity at the start, now removed.
- Steps: (1) three beads on a cycloid at different heights; predict who arrives first; (2) release (time slider); (3) the readouts coincide; (4) the same for a circular arc: they differ (the arc comparison is computed by the kernel, number fixed at implementation); (5) change the start with a handle; (6) free exploration.
- Graph needs: a draggable start handle on the cycloid (parameter snapped to \(0{,}05\)), three beads, time readouts, a toggle to a circular arc through the same lowest point.
- Acceptance:
  1. The listed times agree to \(10^{-9}\); the constancy over a grid of 60 start parameters is within \(10^{-9}\) (unit test).
  2. Start parameter \(\theta_0=0\) (the cusp) is timed like any other start and gives \(\pi\sqrt{r/g}\), the same as MC1. \(\theta_0=\pi\) (already at the bottom, \(T=0\)) has a text status. No division by zero.
  3. Argument or illustration: the coincidence of three times is an **illustration**; the prose gives the tautochrone as a theorem with the one-line reason \(T=\theta\)-independent after the integration (cited, not derived in the app).
  4. Reset, Preset, restore, both languages pass.

## User Stories

1. As a student, I race three beads and see that the shortest path loses.
2. As a student, I bend a track by dragging and watch the time, and try to beat the cycloid.
3. As an educator, I show on a projector that three beads released from different heights arrive together.
4. As a learner on a phone, I read the times and the winner as text.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Searched `src/localization/sl.ts`: it has *Cikloid* (line 2120) and *spust* only as a word; no *brahistohrona*, *tavtohrona*, *čas spusta*.

| English | Slovenian proposal | Where | Reason |
| --- | --- | --- | --- |
| cycloid | cikloida | all | app already uses "Cikloid" (heading form); reuse |
| brachistochrone | brahistohrona (krivulja najhitrejšega spusta) | MC2 | standard Greek-derived term, explained in a sentence; to research |
| tautochrone | tavtohrona (krivulja enakih časov) | MC3 | same; descriptive alternative is the lesson title |
| descent time | čas spusta | readouts | transparent |
| bead | kroglica | all | transparent |
| track | tir / pot | all | to research ("pot" is too general; "tir" suggests rails) |
| friction | trenje | prose | standard physics |

## Implementation Decisions

- F2a decisions (handler, 2026-11-11):
  - The mode label is "Poskus", because "Prikaz" collides with a shell label.
  - Typed input is refused off the grid, and dragging snaps to it. The bead parameter \(\theta=\pi\) (the lowest point) is the one stored value off the 0,05 grid. It is reached by dragging, or with the arrow key from 3,1, and the help text says so.
  - The track-admissibility status names the conservative rule (a control point above the start), not a claim that the curve rises.
  - With no bead to run (an inadmissible track without the cycloid), Play shows the `no-run` reason.
- **Gating** ([boundary with the Controls stream](../tasks/feature-streams/families-prep.md)): ungated now: this spec, F0 (ADRs, terms, tasks), F1 kernel (new pure files under `src/mechanics/` with oracle tests). Gated: F2a (graph, scene, lessons) waits on Controls step 5 for the bead playback; until then no graph code is planned. No edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/` or existing graph panels; the graph is new. Dependency on the Controls stream: play/step controls (step 5).
- Pure kernel in `src/mechanics/`; typed results (`ok`, `never-starts`, `above-start`) instead of infinities.
- Handler decision, reversible: \(g=9{,}81\) is fixed (a tuning slider adds nothing: \(T\propto1/\sqrt g\)); depth axis flipped once in the adapter. Reason: simplest kernel contract.
- Handler decision, reversible: lessons use three tracks (not Kepler or catenary); reason: one idea (the singular integrator) per family.
- New routes and Presets only; no breaking change. Preset fields (end point, control points, \(r\), start parameter) validated with actionable messages.

## Testing Decisions

- Kernel: every number above; cycloid and line against closed forms; track against the \(s^4\) substitution; negative control (midpoint) shows the stated error; admissibility cases (\(y_1=0\), negative control depth); `brachistochrone` round trip (the cycloid passes through \(B\) to \(10^{-12}\)).
- Scene tests: multi-action scenes in one synchronous tick (set \(B\), set control points, toggle overlay); out-of-grid values rejected.
- Content tests: step counts, both languages in lockstep, `lessonMathNotation.test.ts` unchanged.
- Browser: smoke row per lesson once F2a exists.
- Performance: measure the drag of MC2 (recomputation per step) before fixing panel counts.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its guided activity and preview.
2. The concept contracts are met with the checked numbers.
3. Both languages, accessible inputs, restore on exit, Presets and figure export pass.
4. Existing parametric/cycloid lesson and route unchanged.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- The time integral has a \(1/\sqrt t\) singularity at a slanted start; plain Simpson or midpoint rules converge slowly (errors above); the substitution \(t=s^2\) is the stated fix. Verified by a second, independent substitution.
- "Fastest" is a theorem; a finite sample of tracks cannot prove it. The UI never says "proved".
- A horizontal start tangent means infinite time (no initial force along the track), reported as a status.
- A bead on a wire stays on the track (no free fall); the circular arc may dip below \(B\) and rise again, which is allowed.

## Out of Scope

- Catenary versus parabola, Kepler orbits (E10 lessons 2 and 4), friction, a track with a variable \(g\), the Euler–Lagrange derivation, Lagrangian mechanics beyond one cited sentence.
- Backend, accounts, assessment, grading, progress tracking.

## Further Notes

Review should include a mathematics review of the substitution and the closed forms. Research gaps: no matura anchor; Slovenian terms are proposals; the circular-arc time is checked only by a second quadrature.
