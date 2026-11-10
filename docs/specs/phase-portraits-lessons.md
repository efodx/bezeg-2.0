# Phase portraits and dynamics (Fazni portreti in dinamični sistemi)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/phase-portraits](../tasks/phase-portraits/README.md). Decisions 1–4: [ADR 0054](../adr/0054-phase-portraits-separate-graphs-rk4-integer-classification.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #13 of the [top-15 note](../research/lesson-family-candidates-2026-11-09.md); engine family).
**Source:** [expansion candidates, E5](../research/lesson-family-candidates-2026-10-31-expansion.md#e5-fazni-portreti-in-dinamični-sistemi--phase-portraits-and-dynamics-u) (anchors FMF Analiza 3, Mehanika 1, Dinamični sistemi 2Mate, five lessons, pitfalls; cited, not opened) and the top-15 entry 13 (opening lesson, engine). Builds on #11 (eigen-directions, [linear maps](linear-maps-lessons.md) Batches B–C) and #9 ([recursion and growth](recursion-growth-lessons.md), lesson RG4, which stops at \(r\le2{,}9\) and leaves chaos to this family). PIK M-MAT-2026: no section covers differential equations, phase planes or chaos (searched the extraction for *dinami*, *logist*, *rekurz*). The only contact is §4.12 *Zaporedja in vrste*, p. 20, "zapiše člene zaporedja pri danih začetnih členih in rekurzivni formuli" (writing out terms from a recursive formula, the idea behind iterating a map); level marker not verified. This family is university content except that idea.

## Problem Statement

Bezeg shows direction fields and Euler's method ([numerical methods N5](numerical-methods-lessons.md#n5-direction-field-and-eulers-method), `src/analysis/odeEuler.ts`, `src/analysis/eulerField.ts`, ADR [0037](../adr/0037-direction-field-drawing.md)) and the fixed-point cobweb (`src/graphs/functions/FixedPointGraph.tsx`). It cannot show where solutions of a system go: the family of curves of \(x'=Ax\) and how it changes with \(A\), the pendulum's energy levels and separatrix, what happens near an equilibrium of a nonlinear system, or what the logistic map does once \(r\) passes 3. These are the first dynamics a university student meets, and they follow directly from the eigen-direction lessons.

## Solution

Add a Learn chapter **Fazni portreti in dinamični sistemi / Phase portraits and dynamics** with five chapter-owned guided activities, each backed by a catalog Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: first-year university; PP4 is readable earlier. Each lesson is 5–7 steps, predicts before it reveals, ends in free exploration. No exercises, grading or progress. Chapter order PP1–PP5.

### Release batches

| Batch | Content | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernels below: RK4, system catalogue, trace–determinant classification, logistic and bifurcation sampling; ADRs 1–3 accepted | Kernel tests pass; no route required |
| A | PP1 Linear system, PP2 Pendulum | Batch 0 done; linear-maps Batch B released (eigen-directions, `LinearMapGraph`); portrait drawing measured (ADR 2) |
| B | PP3 Linearization | Batch A released |
| C | PP4 Logistic map, PP5 Bifurcation diagram | Batch 0 done; recursion-growth RG4 released or ADR 3 option (b) chosen |

Publish batches separately; do not advertise unreleased lessons.

### Reuse and new modules

Verified by search in this worktree:

- `src/linear/matrix2.ts` (`Mat2`, snapped entries \(1/4\) on \([-4,4]\), `det`, `trace`, `discriminant`) and `src/linear/eigen2.ts` (`discriminantSign`, `classifyEigen` with `distinct-real` / `repeated` scalar or defective / `complex`, eigenvectors) are the classification inputs; `src/graphs/linear/LinearMapGraph.tsx` is the matrix-handle graph the linear-maps spec extends.
- `src/analysis/odeEuler.ts` (closed `EULER_EXAMPLES`, `eulerPath`, `directionField`) and `src/analysis/eulerField.ts` (NaN-separated polyline of marks, pixel-length marks) are the precedent for field and trajectory drawing; the Euler path is the contrast method in PP1. They are 1D (\(y'=F(x,y)\)); autonomous 2D systems need new code.
- `src/graphs/functions/FixedPointGraph.tsx` (`FixedPointGraph`, step interval constant) draws a cobweb for a fixed catalogue; the logistic map is not in it. `src/recursion/` does not exist yet (planned by the recursion spec).
- `src/compgeo/rational.ts` is not needed: all exact decisions are integer arithmetic on the snapped grid (as in `eigen2.ts`, `gridInteger`).
- No RK4, phase-portrait, bifurcation or pendulum code exists (searched `rk4`, `Runge`, `bifurc`, `pendul`, `phase` in `src/`).

New modules (suggested): `src/dynamics/rk4.ts`, `systems2.ts` (closed catalogue with vector field and analytic Jacobian), `classify2.ts` (trace–determinant type from `src/linear`), `logistic.ts` (map, exact cycle formulas, period detection), `bifurcation.ts` (raster counts), `phaseModel.ts` (state parse); graphs `PhasePortraitGraph.tsx` (PP1–PP3) and `LogisticMapGraph.tsx` (PP4–PP5). Pure maths stays free of React, JSXGraph and localization.

### Decisions needing an ADR

1. **Graph shape.** (a) `PhasePortraitGraph` as a mode of `LinearMapGraph`; (b) a separate graph reusing the `src/linear` kernel; (c) one graph for all five lessons. Proposal: (b) for PP1–PP3 (the linear-maps graph is being extended by #11), (b) separate `LogisticMapGraph` for PP4–PP5. Before Batch A.
2. **Trajectory drawing.** (a) one NaN-separated polyline-array curve for all trajectories (ADR 0037 style); (b) a JSXGraph curve per trajectory; (c) overlay canvas. Measure per the [performance plan](../performance-plan.md): 12, 24 and 48 trajectories of 500 steps, dragging a matrix handle (full recompute) and the seed (one trajectory). Record frame times and the threshold used.
3. **Logistic cobweb.** (a) Extend the recursion cobweb graph from #9 to \(r\le4\); (b) own `LogisticMapGraph` that shares only pure iteration code with #9; (c) extend `FixedPointGraph`. Proposal: (b), which edits no sibling graph; if #9's `src/recursion/logistic.ts` is released first, the kernel here imports its map and restricts nothing there.
4. **Exactness grid.** Matrix entries snapped to \(1/4\) (as ADR [0025](../adr/0025-linear-map-graph-and-snapped-matrices.md)); logistic \(r=R/100\), integer \(R\in[250,400]\). Handler decision, reversible: the \(1/100\) grid makes the period-2 and fixed-point tests integer comparisons.

## Kernels

1. **RK4** (`rk4.ts`): \(s_{k+1}=s_k+\tfrac h6(k_1+2k_2+2k_3+k_4)\), fixed step \(h=0.02\), no adaptive step. For snapped entries \(\lvert\lambda\rvert\le\lVert A\rVert_\infty\le8\), so \(h\lvert\lambda\rvert\le0{,}16\), inside the RK4 stability interval on the negative real axis (about \(2{,}785\)) with margin (arithmetic only). Stops: non-finite, \(\lVert s\rVert>10^6\), or leaving the view; each stop is reported, never silently clipped.
2. **Classification** (`classify2.ts`) of \(x'=Ax\) from \(\tau=\operatorname{tr}A\), \(\delta=\det A\), \(\Delta=\tau^2-4\delta\), exact on snapped entries (doubles are exact for multiples of \(1/16\), see linear-maps Correctness Notes; `discriminantSign` is the existing integer test): \(\delta<0\) saddle; \(\delta>0,\Delta>0\): node, stable if \(\tau<0\), unstable if \(\tau>0\); \(\delta>0,\Delta=0\): star node (scalar) or degenerate node (defective, via `classifyEigen`); \(\delta>0,\Delta<0\): spiral (stable \(\tau<0\), unstable \(\tau>0\)) or centre (\(\tau=0\)); \(\delta=0\): non-isolated equilibria (line of equilibria if \(\tau\ne0\), shear flow if \(\tau=0,A\ne0\), everything fixed if \(A=0\)). No tolerance anywhere. A star node is reachable only through the matrix entries (\(A\) scalar): the companion matrix is always defective at \(\Delta=0\). A trace–determinant point can be set by the companion matrix \(\begin{pmatrix}0&1\\-\delta&\tau\end{pmatrix}\) (trace \(\tau\), determinant \(\delta\); entries stay in range for \(\lvert\tau\rvert,\lvert\delta\rvert\le4\)).
3. **System catalogue** (`systems2.ts`), closed ids with analytic Jacobians: `linear` (matrix state), `pendulum` \(\theta'=\omega,\ \omega'=-\sin\theta\), `weak-spiral` \(x'=-y-x(x^2+y^2),\ y'=x-y(x^2+y^2)\). Hyperbolic equilibrium (no eigenvalue with real part \(0\)) is decided by \(\delta\ne0\) and not (\(\delta>0\) and \(\tau=0\)), exact because the catalogue Jacobians are integer matrices at the catalogue's equilibria (for example \(\cos\pi=-1\) exactly in doubles). Elsewhere the Jacobian is not an integer matrix, so the hyperbolicity test is applied only at the listed equilibria.
4. **Logistic** (`logistic.ts`): \(f(x)=rx(1-x)\), \(r=R/100\). Fixed point \(1-1/r\) is attracting iff \(\lvert2-r\rvert<1\), i.e. \(100<R<300\). The 2-cycle \(x_\pm=\bigl((r+1)\pm\sqrt{(r+1)(r-3)}\bigr)/(2r)\) exists for \(r>3\) with multiplier \(4+2r-r^2\); it attracts iff \(3<r<1+\sqrt6\), i.e. \(300<R\) and \((R-100)^2<60000\), i.e. \(R\le344\) (exact integer tests). Higher periods are **computed**: iterate 200000 steps from \(x_0=0{,}2\) (not \(0{,}5\): at \(r=4\) the orbit \(0{,}5\to1\to0\) lands on the fixed point \(0\) and a period-1 answer would be a false artefact, checked), then find the smallest \(p\le64\) with \(\lvert f^p(x)-x\rvert<10^{-9}\); the result is labelled "computed (tolerance \(10^{-9}\))" and "no period \(\le64\) found" otherwise.
5. **Bifurcation raster** (`bifurcation.ts`): \(W\) columns of \(r\) on \([2{,}5;4]\), per column 1000 transient and 300 recorded iterates from \(x_0=0{,}2\), counts in 400 bins of \(x\in[0,1]\). Deterministic, no random seed; computed once on load and memoised on \((W,\text{bins})\).

## Concept contracts and acceptance criteria

Examples are implementation defaults. Every number was computed with `node -e` (expressions in `docs/reviews/feature-streams/families-prep/notes/spec-levelsets-phase.md`).

### PP1. The linear system \(x'=Ax\)

- Learning goal: the portrait is fixed by \(\tau\) and \(\delta\); eigen-directions are the straight trajectories; the type changes only across \(\delta=0\), \(\tau=0\) and the parabola \(\tau^2=4\delta\).
- Scene: matrix handles or numeric entries (snapped), seed points (drag), trajectories forward and backward, eigen-direction lines when real, and a \((\tau,\delta)\) inset with the parabola. Prerequisites: linear-maps L3.
- Steps: (1) a stable node, predict where a seed goes; (2) trajectories bend towards the slow eigen-direction; (3) a saddle: only two straight trajectories approach; (4) drag across the parabola: node to spiral; (5) \(\tau=0\): centre, closed curves; (6) compare Euler with RK4 on the centre; (7) free exploration.
- Checked numbers: \(A=\begin{pmatrix}-4&-1\\-2&-3\end{pmatrix}\): \(\tau=-7,\delta=10,\Delta=9\), eigenvalues \(-5,-2\), stable node; \(x_0=(1,0)\): \(x(1)=(0{,}0496037;\,-0{,}0857316)\) from \(\tfrac23e^{-5}(1,1)+\tfrac13e^{-2}(1,-2)\); RK4 \(h=0.05\) error \(1{,}2\cdot10^{-6}\). Spiral \(\begin{pmatrix}-1/4&-1\\1&-1/4\end{pmatrix}\): \(\tau=-0{,}5,\delta=1{,}0625,\Delta=-4\); \(x_0=(1,0)\): \(x(10)=e^{-2{,}5}(\cos10,\sin10)=(-0{,}068875;-0{,}044656)\), RK4 \(h=0.1\) error \(8{,}1\cdot10^{-7}\). Centre \(\begin{pmatrix}0&-1\\1&0\end{pmatrix}\), \(x_0=(1,0)\), \(T=10\): RK4 error \(1{,}3\cdot10^{-4}\ (h=0.2),\ 8{,}3\cdot10^{-6}\ (0.1),\ 5{,}2\cdot10^{-7}\ (0.05)\), each \(16\times\) smaller per halving (fourth order); Euler \(h=0.1\) radius after \(63\) steps \(1{,}3681=(1+h^2)^{31{,}5}\), RK4 radius at \(T=10\) \(0{,}9999993\) for \(h=0{,}1\) (\(0{,}99999998\) for \(h=0{,}05\)). Saddle \(\mathrm{diag}(1,-1)\): \(\tau=0,\delta=-1\). \(E=\begin{pmatrix}4&1\\2&3\end{pmatrix}\) (linear-maps L3): \(\tau=7,\delta=10,\Delta=9\), unstable node.
- Acceptance: (1) classification matches the table for every snapped matrix in a property test against an independent eigenvalue computation (roots of \(\lambda^2-\tau\lambda+\delta\) by the quadratic formula in `Rational`-scaled integers); (2) RK4 against the closed solution (\(e^{tA}x_0\) by a Taylor series of the matrix exponential as independent oracle, and the rotation closed form), error scaling by 16 per halving; (3) the type never uses a tolerance; the picture is an **illustration** of one \(A\), the classification is a theorem (eigenvalues, source: FMF Analiza 3 as cited); (4) integral curves cannot cross (uniqueness) is stated, not drawn as proof; (5) common acceptance below.

### PP2. The pendulum in the phase plane

- Learning goal: energy \(H=\omega^2/2-\cos\theta\) is constant along solutions, so orbits are level curves of \(H\); \(H<1\) swings (closed orbits), \(H>1\) rotates, \(H=1\) is the separatrix through the saddle \((\pm\pi,0)\).
- Scene: `pendulum`, start point drag, orbit, \(H\) readout, the separatrix, the angle \(\theta\) drawn on the cylinder wrap (\(\theta\) mod \(2\pi\)). The pendulum itself drawn beside the plane (optional).
- Steps: (1) small start: ellipse-like orbit; (2) larger: orbit leaves the circle shape; (3) cross \(H=1\); (4) the separatrix and the time it takes (never reached in finite time); (5) free exploration.
- Checked numbers: start \((1,0)\): \(H_0=-0{,}540302\); RK4 \(h=0.05\), \(T=100\): \(\max\lvert H-H_0\rvert=1{,}5\cdot10^{-7}\); period \(6{,}699976\) (via \(2\pi/\mathrm{AGM}(1,\cos\tfrac12)\)) against the small-oscillation \(2\pi=6{,}283185\); RK4 half-period \(3{,}349988\) (\(h=0.001\)). \(H(0,2)=1\) (separatrix), \(H(0;2{,}25)=1{,}53125\) (rotation), \(H(0;1{,}9)=0{,}805\) (swing). (Corrected at F1, 2026-11-10: the earlier \(H(0,2)=2\) contradicted \(H=\omega^2/2-\cos\theta\).) On the \(\omega\)-axis \(H=1\) iff \(\omega=\pm2\), exact on the grid.
- Acceptance: (1) energy drift and period match; (2) swing/rotate/separatrix status compares \(H\) with \(1\) and says "on the separatrix (within \(10^{-9}\))" otherwise; it is exact only at \(\theta=0\) (\(\omega=\pm2\)) because \(\cos\) is computed; (3) \(H\) conservation is an argument (\(H'=\omega\theta''+\sin\theta\,\omega=0\)) in the prose; the orbit drawing is an **illustration** (numerical, drift stated); (4) the wrap at \(\pm\pi\) is shown, not hidden; (5) common acceptance.

### PP3. Linearization

- Learning goal: near a hyperbolic equilibrium the nonlinear portrait looks like the linear one; the linearization does not decide a centre.
- Scene: a system chooser (`pendulum` at \((0,0)\) and \((\pi,0)\), `weak-spiral` at the origin), a zoom slider around the equilibrium, nonlinear orbits drawn with the linearization's orbits; Jacobian and its type in a readout.
- Steps: (1) `pendulum` at \((\pi,0)\), Jacobian \(\begin{pmatrix}0&1\\1&0\end{pmatrix}\): saddle, eigenvalues \(\pm1\); (2) zoom in: the curves approach the straight eigen-directions; (3) at \((0,0)\): Jacobian \(\begin{pmatrix}0&1\\-1&0\end{pmatrix}\), centre, and the pendulum is truly a centre; (4) `weak-spiral`: the same centre linearization, yet orbits spiral in; (5) the status says "not hyperbolic: the linearization does not decide"; (6) free exploration.
- Checked numbers: `weak-spiral` in polar form \(r'=-r^3,\theta'=1\), \(r(t)=r_0/\sqrt{1+2r_0^2t}\): \(r_0=1,t=1\): \(0{,}5773503\) (RK4 \(h=0.05\): \(0{,}5773502\)); \(r_0=0{,}1,t=10\): \(0{,}0912871\) (RK4 agrees to about 8 digits, difference \(1{,}1\cdot10^{-9}\)); \(r_0=1,t=10\): \(0{,}2182179\). Jacobians: \(\tau=0,\delta=1\) at \((0,0)\) of both; \(\tau=0,\delta=-1\) at \((\pi,0)\) of the pendulum.
- Acceptance: (1) analytic Jacobian against a central-difference Jacobian within \(10^{-8}\); (2) "hyperbolic" is the exact integer test; the Hartman–Grobman theorem is stated with a source (FMF Analiza 3, as cited) and the zoom is an **illustration**; (3) for non-hyperbolic points the prose does not claim the portrait matches; (4) `weak-spiral` closed form agrees with RK4 to \(10^{-7}\); (5) common acceptance.

### PP4. The logistic map beyond \(r=3\)

- Learning goal: as \(r\) grows the attracting fixed point loses stability at \(r=3\), a 2-cycle appears, then 4, 8, …, then irregular behaviour; the cobweb shows each.
- Scene: cobweb of \(f\) with \(r\) slider (\(R\in[250,400]\)), \(x_0\) handle, step and play controls (Controls step 5), the attractor list, a period readout (computed). Prerequisites: RG4.
- Steps: (1) \(r=2{,}9\): settles; (2) \(r=3\): slope \(-1\), neutral; (3) \(r=3{,}1\): a 2-cycle; (4) \(r=3{,}46\) and \(3{,}5\): a 4-cycle; (5) \(r=3{,}55\): period 8; (6) \(r=4\): two close starts separate; (7) free exploration.
- Checked numbers: computed periods (200000 transient, \(10^{-9}\)): \(r=2{,}9{:}1;\ 3{,}1{:}2;\ 3{,}44{:}2;\ 3{,}46{:}4;\ 3{,}54{:}4;\ 3{,}55{:}8;\ 3{,}565{:}16;\ 3{,}569{:}32\), agreeing with the expansion note's table. 2-cycle at \(r=3{,}1\): \(0{,}558014\) and \(0{,}764567\), multiplier \(0{,}59\). \(1+\sqrt6=3{,}449490\): multiplier \(-0{,}9976\) at \(r=3{,}449\), \(-1{,}0025\) at \(3{,}45\) (so \(R=344\) attracts, \(R=345\) does not: \(59536<60000<60025\)). 4-cycle at \(r=3{,}5\): \(0{,}500884;\ 0{,}874997;\ 0{,}382820;\ 0{,}826941\). \(r=4,x_0=0{,}2\): two starts \(10^{-10}\) apart reach distance \(0{,}1\) at step \(30\) (\(\log_2(10^9)=29{,}9\)); the double-precision orbit leaves the exact orbit (400-bit arithmetic) by more than \(0{,}1\) at step \(52\); closed form \(x_n=\sin^2(2^n\theta)\), \(\sin^2\theta=0{,}2\).
- Acceptance: (1) numbers match; (2) fixed-point and 2-cycle stability are the integer tests of Kernel 4; (3) higher periods are shown as "computed (tolerance \(10^{-9}\))", never as exact; (4) for \(r\ge r_\infty\) no period claim is made and the prose says long orbits are finite-precision artefacts after about 50 steps at \(r=4\); (5) the algebra of the 2-cycle is an **argument**, the cobweb an **illustration**; (6) playback holds no stored state; common acceptance.

### PP5. The bifurcation diagram

- Learning goal: the whole route to chaos in one picture: the long-run values of \(x\) against \(r\); the cursor ties it to PP4.
- Scene: the precomputed raster, a vertical cursor at \(r\) linked to PP4's slider, marks at \(r=3\) and \(1+\sqrt6\), and the cobweb inset.
- Steps: (1) the single branch; (2) the first split at \(3\) (predict the next); (3) the splits at \(1+\sqrt6\) and beyond come faster; (4) the chaotic band with periodic windows; (5) free exploration.
- Checked numbers: raster \(800\times400\) with \(1000+300\) iterates per column (1.04 million evaluations): 6 ms in Node on this machine (to be re-measured in the browser, ADR 2). Marks: \(r=3\) (multiplier \(-1\), exact), \(1+\sqrt6=3{,}449490\) (exact tests above), onset of chaos near \(3{,}56995\) (cited from the expansion note, not recomputed). Period-3 window (computed, \(x_0=0{,}5\), same detector): periods \(3\) at \(r=3{,}83;\ 3{,}835;\ 3{,}84\), none found at \(3{,}82\) and \(3{,}9\); the opening \(1+\sqrt8=3{,}828427\) is a known result cited from memory, not verified here.
- Acceptance: (1) the raster is deterministic and identical across runs; (2) the cursor snaps to the nearest column and reports the column's \(r\) (not \(R/100\)); (3) the marks use the exact values of Kernel 4, the chaotic region is labelled "computed, double precision"; (4) the diagram is an **illustration**; (5) common acceptance.

**Common acceptance:** Reset, Preset, restore and both languages pass; seed points and matrix entries have numeric inputs and text statuses; trajectories that leave the view or blow up are named, not clipped silently.

## User Stories

1. As a student, I drag matrix entries and watch the portrait change from node to spiral to saddle.
2. As a student, I see why the pendulum's orbits are energy levels and where the separatrix is.
3. As an educator, I show that linearization works at a saddle and fails at a centre, on a projector.
4. As a student, I move \(r\) and watch the cobweb double its period, with the diagram beside it.
5. As a keyboard or phone user, I enter numbers and read a text description of the portrait type.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Search of `src/localization/sl.ts` found *Fazni zamik* (trigonometry, a different sense), *iteracija*, *stacionarna točka*, *sedlo*, *vozel* (**Bézier knot**, so it is not reused for "node"), *fiksne točke*. No online research was possible in this session; the FMF names are from the research note.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| phase portrait; phase plane | fazni portret; fazna ravnina | FMF Mehanika 1 "fazna ravnina" (research note) |
| equilibrium | ravnovesna točka | proposal; *stacionarna točka* kept for extrema |
| stable / unstable | stabilen / nestabilen | standard |
| node (stable, unstable) | vozlišče | avoids *vozel* (knot); proposal to research |
| saddle | sedlo | existing app term |
| spiral (focus) | spirala (žarišče) | proposal to research |
| centre | središče | proposal; *center* is the textbook form to check |
| trace–determinant plane | ravnina sled–determinanta | with *sled* from linear maps |
| separatrix | separatrisa | standard loan; proposal |
| linearization | linearizacija | standard |
| trajectory / orbit | trajektorija / tir | proposal to research |
| logistic map | logistična preslikava | research note ("logistična enačba" in FMF) |
| period doubling | podvajanje period | FMF Dinamični sistemi (research note) |
| bifurcation diagram | bifurkacijski diagram | research note |
| cobweb | pajčevina | check against the existing `FixedPointGraph` wording |

## Implementation Decisions

- **Gating.** Ungated now: this spec, F0 plan, F1 kernels as new pure TypeScript files with oracle tests (Batch 0). Waits on Controls step 5: F2a for #13 (playback, steppers, step counters: PP4 play, trajectory animation) and the portrait-drawing measurement; waits on step 7: F2b, F3 lessons, F4 chapters, F5 media. Dependencies on other streams, not planned here: the `LinearMapGraph` extensions of #11 (eigen-direction mode), the recursion cobweb kernel of #9 (optional), playback controls from Controls.
- Graph state: matrix entries (snapped), seeds, system id, \(R\), \(x_0\), zoom; derived values (type, trajectories, raster) recomputed from validated state, never from a Preset.
- Scene actions (`set-matrix`, `set-system`, `set-seed`, `set-r`, `set-zoom`) in one tick; unit-tested as a synchronous sequence. Routes and Presets additive; notation, `t()` and locale lockstep as in the other family specs.

## Testing Decisions

- RK4 against closed solutions and fourth-order scaling; classification property test over all \(33^4\) snapped matrices against the quadratic formula in integer arithmetic (about 1.2 million, fast); catalogue Jacobians against central differences; logistic exact tests (\(R\le344\)) against the multiplier formula; cycle values against \(f^p(x)=x\); period detection against the checked table; 400-bit orbit as independent oracle for the finite-precision remark; raster determinism.
- Scene, Preset (malformed, out-of-range), content tests, `tsc --noEmit`; smoke row per lesson (default scene, drag, numeric entry, extremes of \(R\), restore, narrow viewport, keyboard, touch).
- Performance (ADR 2): see above; record in the ADR.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh with its guided activity and static preview.
2. Contracts met with checked examples; type and stability decisions exact on snapped inputs; every numerical period, orbit or drift labelled computed; no tolerance shown as exact.
3. Both languages, accessible numeric inputs, restore, Presets pass; Presentation mode checked.
4. Existing routes, Presets, the direction-field and fixed-point lessons behave as before.
5. TypeScript, tests, build, smoke and mathematics review pass.

## Correctness Notes

- Numerical trajectories drift: Euler spirals outward on a centre (radius \(1{,}368\) after one revolution at \(h=0.1\)); RK4 is used and said so. RK4 also drifts, so the lesson never claims a closed numerical orbit is exactly closed.
- Linearization decides hyperbolic equilibria only; `weak-spiral` is the counter-example.
- Separatrix orbits take unbounded time to reach the saddle; the integrator stops at a time cap and says so.
- Chaos plots are finite-precision artefacts beyond short horizons (step 52 for \(r=4\)); the diagram is statistical (long-run distribution), not a claim about any single orbit.
- Period detection uses a tolerance and a transient; near \(r_\infty\) convergence is slow, so "no period found" is a legitimate answer. At the period-doubling points themselves (\(r=3\), \(r=1+\sqrt6\), …) convergence is algebraic, so "no period found" is also the expected answer there (noted at F1, 2026-11-10).
- Degenerate matrices (\(\delta=0\)) have non-isolated equilibria; the portrait shows the line and the status names it.

## Out of Scope

Backend, accounts, grading, progress; three-dimensional systems, strange attractors beyond the logistic map; Hopf and other bifurcation theory beyond the logistic cascade; limit cycles (van der Pol); Lyapunov function proofs; Julia and Mandelbrot sets (same rendering cost, excluded by the numerical spec); adaptive step sizes; free-text system input; renderer replacement or build-tool changes; edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/` and existing graph panels.

## Further Notes

Not verified: PIK level marker of §4.12; FMF 2026 syllabi and textbooks (cited, not opened); Slovenian terms (no online research); onset of chaos \(3{,}56995\) (cited); browser performance of portraits and the raster; the \(R/100\) grid feeling. The sibling recursion spec was read only for RG4 and its parameter-grid decision (\(R/10\), \(R\le29\)); this family uses a different grid because it needs period doubling.
