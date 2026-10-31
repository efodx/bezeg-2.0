# Numerical methods on the graph

**Status:** scheduled, 2026-10-31 (feature stream `functions`). Tasks: [docs/tasks/numerical-methods](../tasks/numerical-methods/README.md); decisions 1–2 and the Simpson and family choices: [ADR 0022](../adr/0022-numerical-methods-demonstrations.md); Slovenian terms settled in the task README.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates, §2 Numerical methods on graphs](../research/lesson-family-candidates-2026-10-31.md) (candidates 1, 2, 3, 6; sample sequences 1–3; correctness notes), which cites the FMF syllabi *Numerične metode* (1ISRM 2016/17) and *Numerične metode 2* (1PrMa 2017/18), *Analiza 2* (first-order ODEs) and the matura catalogue p. 16 (root finding to a stated accuracy with technology). Syllabi are 2016/17–2017/18 copies; current versions were not checked. Part of the [new lesson families](new-lesson-families.md) index.

## Problem Statement

Bezeg teaches bisection and fixed-point iteration on a graph, and secants, tangents and trapezoid sums as separate calculus objects. It does not show the natural continuation: how the tangent and the secant turn into root-finding iterations that converge far faster than bisection, how such an iteration fails, how a quadrature rule's error shrinks when the step is halved, and how a first-order differential equation is read from a slope field and integrated step by step. These are the core of two FMF numerical courses and the root-finding objective of the matura, and a student needs to see the geometry to trust the formulas.

## Solution

Add a Learn chapter **Numerične metode na grafu / Numerical methods on the graph** with five chapter-owned guided activities, each backed by a catalog Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). The chapter is audience University, with Newton and bisection readable at upper-secondary level. Prose states hypotheses and error orders; pictures show one run and are labelled illustrations of a rate, never proofs of it. Each lesson is 5–7 steps, predicts before it reveals, and ends in free exploration. No exercises, grading or progress.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| A | N1 Newton's method; N2 When Newton fails; N3 Secant method | New root-finding Demonstration(s) pass the batch gate; the existing bisection lesson and routes are unchanged |
| B | N4 Trapezoid and Simpson rules | Batch A released; Simpson added to `riemann.ts` with its tests; existing integral Presets unchanged |
| C | N5 Direction field and Euler's method | Batch B released; the rendering measurement and the resulting ADR below are recorded before any drawing code is merged |

### Reuse and new modules

Verified to exist in this worktree:

- `src/graphs/functions/IterativeFunctionGraph.tsx` supplies Next step, Play/Pause, Reset and the `IterationController` wiring; `BisectionGraph.tsx` with `src/analysis/bisection.ts` and `bisectionModel.ts` is the model: a closed example list (`BISECTION_EXAMPLES`), a stored `step` index, history recomputed from validated fields, and a `run-bisection-command` scene action (ADR 0012, ADR 0013).
- `src/analysis/derivative.ts` has `tangentLine`, `secantLine` and `lineValue` for the construction; `src/analysis/fixedPoint.ts` is a second precedent for step history with termination reasons.
- `src/analysis/riemann.ts` has `riemannSum`, `subintervals`, trapezoid area and `exactIntegral` over the catalog in `src/analysis/functions.ts` (`square`, `sin`, `exp`, each with an exact antiderivative). `DefiniteIntegralGraph.tsx` is the Demonstration to extend or imitate.
- `LESSON_ANIMATION_IDS` in `src/learning/model.ts` (currently `decasteljau`, `bisection`, `sequence`, `fixed-point`, `patch-u-sweep`, `patch-v-sweep`) must gain ids for new iterations.

New modules (names are suggestions): `src/analysis/rootFinding.ts` (Newton and secant histories, examples, termination), a model/parse file, `src/graphs/functions/RootFindingGraph.tsx`, a Simpson extension of `riemann.ts`, `src/analysis/odeEuler.ts`, and a direction-field graph. Pure mathematics stays free of React, JSXGraph and localization.

### Decisions needing an ADR

1. **Root finding: one Demonstration with a method choice, or two.** (a) One `RootFindingGraph` with `newton | secant` and a shared example list; (b) separate Newton and secant graphs; (c) extend `BisectionGraph` with a method choice. (a) lets N1–N3 share examples and the comparison readout; (b) keeps each model simple; (c) risks changing stored bisection Presets and the released bisection lesson. Decide before Batch A.
2. **Function source for root finding.** (a) A closed example list as bisection does (here: \(x^2-2\), \(x^3-2x+2\), one more), independent of the catalogue; (b) use the extended catalogue owned by [school-function-graphs-lessons.md](school-function-graphs-lessons.md), whose separate school catalogue includes named entries (x^2-2), (x^3-2x+2) and (x^3-x), so learners get more functions with exact derivatives. This spec works with (a); (b) is an optional later extension and must not block Batch A. The current catalogue is `square`, `sin`, `exp` only, and has no \(x^2-2\).
3. **Direction-field drawing approach** (Batch C): see N5; decided only after measurement.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. All numbers below were checked in Python (research note) or with `node -e` (marked NEW).

### N1. Newton's method

- Learning goal: the next iterate is where the tangent meets the \(x\)-axis, \(x_{k+1}=x_k-f(x_k)/f'(x_k)\), and near a simple root the number of correct digits roughly doubles each step.
- Prerequisites: [derivative and tangent](../specs/function-concepts.md) lessons (tangent line), the bisection lesson, [fixed-point iteration](analysis-guided-lessons.md#c3-fixed-point-iteration) (Newton is a fixed-point iteration of \(g=x-f/f'\)).
- Default example: \(f(x)=x^2-2\), \(x_0=1\). Iterates \(1.5\), \(1.41\overline{6}\), \(1.4142157\), \(1.4142136\); errors against \(\sqrt2\) NEW \(8.6\cdot10^{-2}\), \(2.5\cdot10^{-3}\), \(2.1\cdot10^{-6}\), \(1.6\cdot10^{-12}\).
- Steps: (1) the curve, \(x_0\) and the root; predict where the next guess lies; (2) draw the tangent at \(x_0\); (3) its \(x\)-intercept is \(x_1\), with the formula; (4) repeat to \(x_3\) and read the errors; (5) compare with bisection: from \([1,2]\) the width \(2^{-n}\) first drops below \(10^{-10}\) at \(n=34\) (NEW, \(2^{-34}\approx5.8\cdot10^{-11}\)), Newton's error is \(1.6\cdot10^{-12}\) after 4 steps; (6) drag \(x_0\) and a second example; (7) free exploration.
- Graph needs: draggable or numeric \(x_0\); tangent segment from \((x_k,f(x_k))\) to \((x_{k+1},0)\); iterate table with \(f(x_k)\), error to a reference root, step count; Next step, Play/Pause, Reset as in bisection; textual status.
- Acceptance:
  1. The three iterates above match to 7 decimals; the readout shows the error sequence.
  2. Each tangent's \(x\)-intercept equals the next iterate to \(10^{-12}\) in a unit test using `tangentLine`.
  3. An exact root (\(f(x_k)=0\)) stops with a "root found" status; \(f'(x_k)=0\) stops with a "tangent horizontal, no next iterate" status (for \(x^2-2\), \(x_0=0\)); a non-finite value stops with a status. No division by zero is attempted.
  4. The prose says doubling of digits holds near a simple root and is not claimed for the whole run, and says the error column illustrates rather than proves the rate.
  5. Editing \(x_0\) or the example invalidates history and pauses playback; Reset returns to step 0; a reopened Preset is paused with the stored step; the iteration is capped (suggested 60 steps, as bisection).
  6. All labels, statuses, lesson text and errors exist in Slovenian and English.

### N2. When Newton fails

- Learning goal: Newton can cycle, wander or hit a flat tangent; convergence needs a simple root, \(f'\ne0\) nearby and a close enough start; bisection keeps working because it only needs a sign change.
- Prerequisites: N1; the bisection lesson.
- Default example: \(f(x)=x^3-2x+2\), \(x_0=0\): \(x_1=1\), \(x_2=0\), a 2-cycle (the only real root is near \(-1.7693\), NEW, Newton from \(x_0=-2\)). Contrasting start \(x_0=-2\) converges to that root. Bisection on the same \(f\) with a sign-change bracket such as \([-2,-1]\) (\(f(-2)=-2\), \(f(-1)=3\)) finds the root.
- Steps: (1) run Newton from \(x_0=0\); predict \(x_2\); (2) reveal \(x_1=1\) and \(x_2=0\), the loop; (3) say why: tangents at \(0\) and \(1\) point at each other; (4) move \(x_0\) to \(-2\) and see convergence; (5) a start near a critical point of \(f\) (flat tangent) sends the iterate far away; (6) the bisection bracket on the same curve; (7) free exploration with the start slider.
- Graph needs: same graph as N1 with cycle detection, a reached-iteration-limit status, bracket mode or a link to the bisection Demonstration with the same function (`BISECTION_EXAMPLES` has `cubic` = \(x^3-x\) only, so \(x^3-2x+2\) is a new example in whichever list is used).
- Acceptance:
  1. Iterates \(1,0,1,0\) are exact in rational arithmetic (unit test with the integer recurrence); the status says "the iterates repeat, no convergence".
  2. A repeated iterate (period 2) stops playback with that status instead of running to the cap; the cap status is distinct.
  3. From \(x_0=-2\) the iterates converge and the final value is within \(10^{-10}\) of the root found independently (e.g. by bisection in the test).
  4. The prose names the failures shown here (cycle, flat tangent) without claiming they are the only ones, and does not infer "Newton fails for cubics".
  5. Iteration history is invalidated by edits; playback does not run in background after leaving the lesson (lifecycle test with the injectable scheduler).
  6. Slovenian and English complete.

### N3. Secant method

- Learning goal: replace the tangent by the secant through the last two iterates, avoiding \(f'\); order about \(1.618\), between bisection and Newton per step.
- Prerequisites: N1; the derivative lesson (secant); N2 optional.
- Default example: \(f(x)=x^2-2\), \(x_0=1\), \(x_1=2\). Iterates \(1.3333\), \(1.4\), \(1.4146\), \(1.414211\); errors NEW \(8.1\cdot10^{-2}\), \(1.4\cdot10^{-2}\), \(4.2\cdot10^{-4}\), \(2.1\cdot10^{-6}\).
- Steps: (1) two starting points and the secant; predict its \(x\)-intercept; (2) reveal \(x_2\), drop the oldest point; (3) continue to \(x_5\); (4) compare errors with Newton (after 4 steps Newton \(1.6\cdot10^{-12}\), secant \(2.1\cdot10^{-6}\) from this start) while noting that secant needs one new evaluation per step and Newton needs \(f\) and \(f'\); (5) a flat secant (\(f(x_k)=f(x_{k-1})\)) stops; (6) different starts; (7) free exploration.
- Acceptance:
  1. The four iterates above match to 6 decimals in a unit test.
  2. Each secant's \(x\)-intercept equals the next iterate to \(10^{-12}\) (using `secantLine` with \(h=x_k-x_{k-1}\)).
  3. \(f(x_k)=f(x_{k-1})\) stops with a "secant horizontal" status; equal starting points are rejected at input.
  4. The 1.618 order is stated as a theorem under stated hypotheses (simple root, close start) and is not derived from the picture.
  5. Method switch keeps the example and start, resets history, pauses playback.
  6. Slovenian and English complete.

### N4. Trapezoid and Simpson rules

- Learning goal: halving \(h\) divides the trapezoid error by about 4 and the Simpson error by about 16; Simpson replaces chords by parabolas and is exact for cubics.
- Prerequisites: the definite-integral and Riemann-sum lesson (`DefiniteIntegralGraph`); the Taylor lesson helps the error orders.
- Default example: \(\int_0^\pi\sin x\,dx=2\). Trapezoid errors for \(n=2,4,8\): \(0.4292\), \(0.1039\), \(0.0258\) (ratios NEW 4.13, 4.03); Simpson absolute errors \(0.0944\), \(0.00456\), \(0.000269\) (NEW ratios 20.7, 16.9; for \(n=16\): trapezoid \(0.00643\), Simpson \(1.66\cdot10^{-5}\), ratio 16.2). Second example \(x^2\) on \([0,3]\): Simpson error \(0\) up to rounding (exact for cubics).
- Steps: (1) the area and the trapezoid sum at \(n=2\); predict the error at \(n=4\); (2) show the error and the ratio; (3) switch to Simpson: parabolas through three points; (4) halve again and read the Simpson ratio; (5) \(x^2\) is integrated exactly; (6) why an even \(n\) is needed; (7) free exploration.
- Graph needs: Simpson as a fifth `SumMethod` or a separate quadrature mode (ADR-sized choice; changing `SUM_METHODS` affects stored integral Presets, so adding a method must keep existing Presets valid); parabola overlays per subinterval pair; readouts: approximation, exact value, absolute error, ratio to the previous error; \(n\) steps restricted to even values for Simpson within the existing \(1\ldots150\) bound.
- Acceptance:
  1. Errors above match to 4 significant digits; the ratio readout equals the quotient of the two displayed errors.
  2. Simpson's rule is exact for cubics: with `square` (and a cubic if one is available) the error is below \(10^{-12}\), tested against the exact antiderivative.
  3. Odd \(n\) is not offered for Simpson (control step 2 or a clear message); no silent rounding of \(n\).
  4. Error orders \(h^2\) and \(h^4\) are stated as theorem-level facts with smoothness hypotheses; the lesson notes that the ratios are observed on smooth examples and that the first ratio for Simpson (20.7) is not 16.
  5. Existing integral Presets reopen unchanged; new Preset fields validate counts and method.
  6. Slovenian and English complete; decimal commas follow the notation rule.

### N5. Direction field and Euler's method

- Learning goal: \(y'=F(x,y)\) assigns a slope at each point; Euler's polyline follows those slopes with step \(h\); its error shrinks about in proportion to \(h\) (first order).
- Prerequisites: derivative and tangent; N1 optional.
- Default examples (closed list): \(y'=y\), \(y(0)=1\), exact \(e^x\) shown as a dashed reference; \(y'=x-y\), \(y(0)=1\), exact \(y=x-1+2e^{-x}\). For \(y'=y\) to \(x=1\): \(h=0.5,0.25,0.125\) give \(2.25\), \(2.4414\), \(2.5658\), errors \(0.468\), \(0.277\), \(0.152\). For \(y'=x-y\) to \(x=1\) (NEW, exact value \(2/e\approx0.7358\)): \(0.5\), \(0.6328\), \(0.6872\), errors \(0.2358\), \(0.1029\), \(0.0485\).
- Steps: (1) the field; predict the curve through \((0,1)\); (2) one Euler step of size \(h\): a tangent segment; (3) the polyline for \(h=0.5\); (4) halve \(h\), compare with the reference solution; (5) read the end-value errors and their roughly halving; (6) drag the initial point; (7) free exploration.
- Graph needs: field segments over the visible window, an Euler polyline from a draggable or numeric initial point, a step control with discrete values (\(1, 0.5, 0.25, 0.125, 0.0625\)), end-value readout, optional exact curve for the listed examples, and an optional Next step reveal of Euler steps (via an `IterativeFunctionGraph`-style playback).
- Acceptance:
  1. The end values and errors above match to the shown digits; the error ratio between successive \(h\) is shown and approaches 2 (for \(y'=y\): 1.69, 1.82).
  2. The field slope at a sample point equals \(F(x,y)\) in a unit test; the Euler step equals \(y_k+hF(x_k,y_k)\) exactly in rational arithmetic for \(h=0.5\).
  3. The window and the initial point are constrained so that no non-finite values appear; a divergent run (an optional \(y'=y^2\) example from \(y(0)=1\) blows up at \(x=1\)) stops with a visible status instead of drawing off-screen segments. The blow-up example is optional.
  4. The prose says the field is a picture of one equation, that existence and uniqueness need hypotheses not checked here, and that a polyline is not a solution.
  5. Dragging the initial point or changing \(h\) stays interactive on the target device, per the measured thresholds recorded for this lesson (see Testing Decisions); the chosen approach is recorded in an ADR.
  6. Reset, Preset round trip, scene capture/restore and disposal of all generated field objects pass the lifecycle tests.
  7. Slovenian and English complete.

## User Stories

1. As a student, I move the starting guess and see where the tangent crosses the axis.
2. As a student, I see the same equation fail from a different start, so I do not trust a method blindly.
3. As a student, I compare the digits gained per step of bisection, secant and Newton on one function.
4. As an educator, I halve the step on a projected graph and read the error ratio.
5. As an educator, I show a slope field and drag the initial point so the class sees how the solution follows it.
6. As a reader on a phone, I step through iterations with large buttons and read a text status.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

| English | Slovenian proposal | Basis to check |
| --- | --- | --- |
| Newton's (tangent) method | tangentna (Newtonova) metoda | FMF syllabus wording "tangentna metoda" |
| secant method | sekantna metoda | FMF syllabus wording |
| iterate | približek (iterat) | search `sl.ts` for existing sequence terms first |
| trapezoid rule / Simpson's rule | trapezno pravilo / Simpsonovo pravilo | `integral_method_trapezoid` in `sl.ts`; syllabus "trapezna, sredinska in Simpsonova formula" |
| direction (slope) field | polje smeri | to research |
| Euler's method | Eulerjeva metoda | syllabus "Eulerjeva formula" |
| convergence order | red konvergence | to research |

Final wording, sources and the table entry are recorded in the implementing change.

## Implementation Decisions

- Mathematics lives in pure modules with typed histories and termination reasons (root found, flat tangent/secant, repeated iterate, non-finite value, step cap), following `bisection.ts` and `fixedPoint.ts`. Histories are derived from validated fields, not trusted arrays.
- Iterative lessons reuse `IterativeFunctionGraph` and one typed scene action per animation id; add ids to `LESSON_ANIMATION_IDS` and the action map in `lessonCatalog.ts` (ADR 0013 pattern). Playback is stopped by default and pauses on edits, scene or frame changes, exit, import, capture and unmount.
- Closed example lists; no formula parser or symbolic differentiation (ADR 0007). Derivatives are written by hand for each example and tested against a difference quotient.
- Convergence readouts use a reference root computed independently from the iteration (high-iteration bisection or stored value); say so in the code docs.
- Reuse catalogue, chapter and Preset registration as for the Analysis family (`familyChapters.ts`, ADR 0011, ADR 0016); routes and existing Presets are additive. Whether this family joins the Analysis Demonstration family or becomes its own is part of the first implementation ADR (alternatives: extend Analysis; new "Numerical methods" family).
- Hosting and app-shell code stay separate from the mathematics.

## Testing Decisions

- Kernel tests: iterate sequences and error tables above; intercept identities against `tangentLine`/`secantLine`; termination cases (exact root, flat tangent, 2-cycle, cap); Simpson exactness on cubics and error ratios; Euler step values; derivative tests by finite difference.
- Scene tests: apply multi-action scenes in one synchronous tick (several `next-step` actions) and check the history; reject unsupported values; editing clears history.
- Preset tests: save/reopen, export/import, malformed or out-of-domain data, loading paused.
- Lesson/content tests: step counts, both languages in lockstep, `lessonMathNotation.test.ts` unchanged and passing (undelimited formula fields, `{,}` for decimals in Slovenian), `tsc --noEmit` after localization changes.
- Playback tests with the injectable scheduler: Next step equals a playback tick, pause on edit, no callback after disposal.
- Browser: a smoke row per lesson (default scene, controls, reveal, restore, catalog link, refresh, narrow viewport, keyboard, touch alternatives). Run the full checklist only if shared catalogue or lesson runtime changes.
- Performance (N5): before choosing an approach, measure on the target classroom device with [the performance plan](../performance-plan.md): drag the initial point and the step slider with e.g. \(21\times15\) and \(41\times29\) field grids, comparing per-segment JSXGraph objects against one polyline-array curve, an overlay canvas or SVG, and a cheaper coarse grid; record frame times and the threshold used. The ADR cites the measurement. Do not replace JSXGraph on this evidence alone.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contract above is met with checked examples and honest guarantees.
3. Both languages, accessible inputs, projection readability, restore on exit, stopped-by-default playback, Presets and figure export pass.
4. Existing routes, Presets and the bisection lesson behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass; commit and push follow the repository workflow.

## Out of Scope

- Backend, accounts, assessment, grading, progress tracking, adaptive paths.
- Free-text functions, symbolic differentiation, a formula parser, systems of equations (Newton for systems), higher-order ODE methods (Runge–Kutta, trapezoid for ODEs), adaptive step size.
- Runge's phenomenon and least-squares fitting: they belong to the interpolation family, see [interpolation-approximation-lessons.md](interpolation-approximation-lessons.md) (index entry; the spec may not yet exist).
- Convergence proofs, error-bound theorems beyond the stated orders, floating-point error analysis beyond stated stopping rules.
- Complex-plane Newton fractals.
- Renderer replacement or build-tool changes.

## Further Notes

Correctness notes: Newton and secant have the stated orders only for a simple root with a close enough start; a converging picture proves nothing in general. Simpson needs an even number of subintervals; the \(h^2\), \(h^4\) and \(h\) orders assume enough smoothness. Euler's error is first order for these smooth examples only; blow-up (\(y'=y^2\)) and stiffness are outside the lesson. Not verified: current FMF syllabi, whether the cap of 60 steps suffices for all chosen starts, and the Slovenian terms.
