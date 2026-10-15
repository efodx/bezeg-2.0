# Analysis guided lessons and complex multiplication

**Status:** Batch A (bisection, mean value theorem, accumulated integral) is implemented on its branch and pending release verification ([task 04](../tasks/analysis-guided-lessons/04-batch-a-release.md)); it is not released. Batches B and C are not started. Batch A adds routes, preset collections and lessons only: no existing route, stored Preset or lesson identity changed, so it is not a breaking change.
**Agreed:** 2026-10-14.
**Source:** the catalogue research and the subsequent owner interview. The owner approved all eleven topics, separate Demonstrations and Guided lessons, three release batches, named examples, visual arguments, optional reveals, and iterative playback.

## Problem Statement

Students and educators can already explore introductory functions, calculus, and curve constructions in Bezeg. They cannot yet explore several central analysis arguments through dedicated, guided interactive constructions. Existing secant, integral, and continuity demonstrations do not provide an independent mean-value tangent, an accumulation graph, true Darboux bounds, or the other constructions needed here.

Expand the catalogue without turning Bezeg into a course platform or requiring students to understand the controls before understanding the mathematics.

## Solution

Add eleven Demonstrations, each with one optional Guided lesson. Add ten to a new **Analiza / Analysis** family; add **Množenje kompleksnih števil / Complex multiplication** to **Foundations**. Retain the existing introductory function Demonstrations and lessons.

Target introductory university analysis, state prerequisites, and make explanations accessible to advanced secondary-school students. Each lesson should take approximately 5–10 minutes, normally in 5–7 bounded Lesson steps. That duration is an editorial target, not a measured learning outcome or navigation limit.

Combine named examples, editable parameters, a worked example, mathematical reasoning, and directed exploration. A picture may carry the argument when its construction establishes the relevant invariant or inequality. Distinguish that from a finite plot which only illustrates a claim. State theorem hypotheses and use counterexamples where they explain why a hypothesis matters. Full textbook proofs are not required.

Learners manipulate or predict before optional explicit **Show** actions reveal helpful results. Prediction is a prompt, not a graded response or a branching assessment. Navigation stays available. Every lesson hands off to free exploration.

### Release batches

| Batch | Demonstrations | Release condition |
| --- | --- | --- |
| A | Intermediate value theorem and bisection; Mean value theorem; Accumulated integral and FTC | Complete mathematical, lesson, interaction, lifecycle, and production verification for all three |
| B | Extrema; Convexity and concavity; Darboux sums; Taylor approximation | Batch A released; complete the same verification for all four |
| C | Sequence convergence; Uniform convergence; Fixed-point iteration; Complex multiplication | Batch B released; complete the same verification for all four |

Publish completed batches separately. Do not expose unimplemented Demonstrations or advertise unreleased lessons. Within a batch, implement the graph capabilities needed by each lesson before encoding its scenes.

### Concept contracts and acceptance criteria

The examples below are implementation defaults chosen to make the agreed scope concrete. Equivalent examples may replace them when the same learning goal, edge case, and independently checked evidence are retained.

#### A1. Intermediate value theorem and bisection

- Prerequisites: continuity, function values, intervals, and signs.
- Start with \(f(x)=x^2-2\) on \([1,2]\). Show endpoints, midpoint, function values, retained interval, step count, and interval width.
- Let the learner predict the retained half before **Next step** reveals it. Preserve the opposite-sign bracket invariant; handle an exact endpoint or midpoint root explicitly.
- Offer Next step, Play/Pause, and Reset. Endpoint/function edits invalidate iteration history and pause playback.
- Include a discontinuous sign-changing example, \(f(x)=-1\) for \(x<0\), \(f(x)=1\) otherwise, which has no zero. Show its discontinuity and explain that the theorem and root guarantee do not apply.
- Acceptance: first midpoints \(1.5,1.25,1.375\) produce values \(0.25,-0.4375,-0.109375\). Each proper step halves the bracket width. State that continuity plus opposite endpoint signs guarantees existence, not uniqueness. Stop at an exact root, a bounded iteration limit, or floating-point stagnation; never claim the floating-point midpoint is an exact irrational root.

#### A2. Mean value theorem

- Prerequisites: continuity, differentiability, secant slope, and tangent.
- Independently control endpoints \(a<b\) and the tangent location \(a<c<b\). Show the endpoint secant, tangent at \(c\), both slopes, and their difference.
- Start with \(x^2\) on \([0,2]\); a **Show matching point** action reveals \(c=1\).
- Include \(x^3\) on \([-1,1]\), with matching points \(c=\pm1/\sqrt3\), and \(|x|\) on \([-1,1]\), where differentiability fails and no differentiable interior point has the required zero slope.
- Acceptance: changing \(c\) does not move either secant endpoint. Multiple matches are supported rather than implying uniqueness. A corner has an undefined derivative, never a fabricated tangent or numeric infinity. A displayed slope tolerance is a numerical comparison, not the theorem's proof.

#### A3. Accumulated integral and FTC

- Prerequisites: signed definite integral and derivative.
- Show \(f\) and \(A(x)=\int_a^x f(t)\,dt\) with distinguishable labels; coordinate graph views so both remain readable. Control \(a\) and \(x\), shade oriented signed area, and display a tangent to \(A\) and its slope.
- Start with \(f(x)=\sin x\), \(a=0\); offer \(x^2\) and \(e^x\) as further named examples. Reveal the accumulation curve after an initial area prediction.
- Acceptance: \(A(0)=0\), \(A(\pi)=2\), \(A(2\pi)=0\) in the default example; \(A'(x)=f(x)\). Moving \(x<a\) preserves the orientation of the integral. Negative integrand values decrease accumulation. Explain continuity of the integrand as sufficient for the displayed derivative relation; the area is not unsigned geometric area.

#### B1. Extrema

- Prerequisites: derivative and intervals.
- Control a closed interval and explore \(x^2\), \(x^3\), \(|x|\), and a bounded example with several extrema such as \(\sin x\).
- Show derivative signs, stationary points, undefined-derivative candidates, endpoint values, and local versus global extrema. Reveal classifications after exploration.
- Acceptance: classify all global candidates, including endpoints and corners; allow ties. \(x^3\) at zero is stationary without being an extremum, and \(|x|\) has a minimum with no derivative at zero. State whether a local classification is relative to the selected interval or to an open neighborhood; do not silently switch conventions.

#### B2. Convexity and concavity

- Prerequisites: secants and derivatives; introduce the second derivative.
- Use \(x^2,-x^2,x^3,x^4\). Move chord endpoints and an independent tangent point; compare the graph against each line on the applicable interval.
- Connect the chord inequality and tangent comparison with the second-derivative sign under the stated differentiability assumptions.
- Acceptance: convex graphs lie below their chords and above their tangent lines; concave graphs reverse the inequalities. Identify the sign change for \(x^3\) and explain why \(x^4\), despite \(f''(0)=0\), has no inflection there. Restrict claims to intervals where the hypothesis holds.

#### B3. Darboux sums

- Prerequisites: partitions and definite integral.
- Use \(x^2\) and \(\sin x\), including subintervals containing interior critical points. Compute actual subinterval infima and suprema from the endpoints and known critical points.
- Display lower and upper rectangles and totals, exact integral, and their gap. Offer nested refinement by bisecting every subinterval, with a finite documented partition limit.
- Acceptance: lower sum \(\le\) integral \(\le\) upper sum; nested refinement makes lower totals nondecreasing and upper totals nonincreasing. For \(x^2\) on \([0,2]\) with four equal subintervals, totals are \(1.75\) and \(3.75\), trapping \(8/3\). Left/right samples must not be called lower/upper bounds on nonmonotone subintervals.

#### B4. Taylor approximation

- Prerequisites: derivatives and polynomials; explain higher derivatives and factorials.
- Overlay \(f\), Taylor polynomial, expansion center, evaluation point, and signed/absolute error. Control center and degree over bounded domains.
- Use \(e^x\), \(\sin x\), and a convergence-domain example such as \(1/(1-x)\) about zero. Show a justified Lagrange remainder bound where its differentiability and derivative-bound hypotheses hold.
- Include the smooth function equal to \(e^{-1/x}\) for \(x>0\) and zero for \(x\le0\), at center zero, as a caution: all Taylor coefficients vanish, but the function is positive to the right. No symbolic differentiation engine is needed.
- Acceptance: for \(e^x\) about zero, \(T_1(1)=2\), \(T_3(1)=8/3\), \(T_6(1)=1957/720\). The displayed bound contains the actual error on its stated domain. Increasing degree does not imply improvement at every point for every example. Keep finite-polynomial approximation distinct from convergence of an infinite Taylor series.

#### C1. Sequence convergence

- Prerequisites: sequence indices, absolute value, and inequalities.
- Use \(1/n\), \((-1)^n/n\), \((-1)^n\), and \(n\), for integer \(n\ge1\). Show indexed terms and an \(\varepsilon\)-band around a named candidate limit.
- For convergent examples, let learners choose \(N\), then reveal a formula-backed bound for every \(n\ge N\). Offer Next step and optional Play/Pause for revealing terms.
- Acceptance: for \(1/n\) and \((-1)^n/n\), \(N=\lfloor1/\varepsilon\rfloor+1\) satisfies the strict error inequality for every \(n\ge N\). Oscillation and divergence must not receive a convergence certificate based on a finite window. Keep \(\varepsilon>0\); cap rendering and report a threshold beyond the visible index range honestly.

#### C2. Uniform convergence

- Prerequisites: sequence convergence and function graphs.
- Contrast \(f_n(x)=x^n\) on fixed \([0,r]\), \(0<r<1\), with \([0,1]\). Include an uncomplicated uniformly convergent comparison such as \(x/n\) on \([0,1]\).
- Show the limit, an error band, a chosen point, and an analytic supremum error over the entire selected domain. Explain one shared \(N\) versus an \(N\) depending on \(x\). A domain change starts a new comparison rather than constituting convergence on the original domain.
- Acceptance: on \([0,r]\), error is \(r^n\); on \([0,1]\), the pointwise limit is zero for \(x<1\) and one at \(x=1\), and supremum error is one for every finite \(n\). Label a supremum correctly when it is not attained. Do not join the limit graph across its jump or infer uniform convergence from sampled error values.

#### C3. Fixed-point iteration

- Prerequisites: function composition and sequence convergence; explain contraction.
- Plot \(y=T(x)\), \(y=x\), cobweb iterates, current value, and a justified error bound. Offer editable starting point, Next step, Play/Pause, and Reset.
- Use \(T(x)=(x+1)/2\) on \([0,2]\), and \(T(x)=\cos x\) on \([0,1]\). State completeness of a closed real interval, the self-map condition, and a uniform contraction factor \(q<1\).
- Contrast \(T(x)=1-x\) on \([0,1]\), whose nonfixed starting points form a two-cycle; failure of the contraction hypothesis alone does not prove all iterations diverge.
- Acceptance: the affine example has fixed point one and \(q=1/2\); cosine has a valid bound \(q=\sin1<1\). Use a justified a priori or a posteriori error bound and identify its prerequisites. Stop playback at the iteration limit, requested error threshold, or numeric stagnation without declaring an exact root from rounded equality.

#### C4. Complex multiplication

- Prerequisites: Cartesian coordinates; introduce complex numbers, modulus, and argument.
- Drag or type two complex operands and display their product on the complex plane. Provide Cartesian inputs and polar controls where defined.
- Compare unit multipliers, positive-real scaling, general rotation plus scaling, and multiplication by zero. Explain arguments modulo \(2\pi\).
- Acceptance: \((1+i)i=-1+i\), multiplication by one preserves a point, multiplication by minus one rotates it by \(\pi\), and product modulus equals the product of operand moduli. Zero collapses the product to the origin; its argument is undefined, not silently reported as zero.

## User Stories

1. As a student, I want to find a named analysis Demonstration, so that I can explore the concept I am studying.
2. As an educator, I want the advanced topics grouped separately from introductory functions, so that I can choose a classroom example quickly.
3. As a learner, I want each Demonstration to have a Guided lesson, so that I can connect controls with mathematical meaning.
4. As a learner, I want prerequisites stated first, so that I know which ideas the explanation assumes.
5. As a learner, I want short Lesson steps, so that I can alternate reading with exploration.
6. As a learner, I want visual constructions to expose an invariant or inequality, so that the picture can explain the argument.
7. As a learner, I want theorem hypotheses distinguished from observed behavior, so that I do not mistake a plot for a general proof.
8. As a learner, I want counterexamples, so that I understand why the hypotheses matter.
9. As a learner, I want worked calculations to match the graph, so that I can check my reasoning.
10. As a learner, I want named examples and editable parameters, so that I can compare cases without entering formulas.
11. As a learner, I want to predict before revealing a result, so that I can reason actively.
12. As a learner, I want to continue without submitting an answer, so that exploration remains self-paced.
13. As a learner, I want to bisect a root bracket one step at a time, so that I understand why it remains a bracket.
14. As a learner, I want an independent tangent point, so that I can find the mean-value slope.
15. As a learner, I want signed accumulated area beside its graph, so that I can connect integration and differentiation.
16. As a learner, I want endpoints and corners included in extrema analysis, so that I do not rely only on zero derivatives.
17. As a learner, I want chord and tangent comparisons, so that I can understand convexity geometrically.
18. As a learner, I want genuine lower and upper sums, so that I can see an integral trapped between bounds.
19. As a learner, I want nested partition refinement, so that I can follow the bounding argument.
20. As a learner, I want Taylor degree and center controls, so that I can explore local approximation.
21. As a learner, I want actual error and a justified bound, so that I can distinguish approximation from a guarantee.
22. As a learner, I want an example of a smooth function that differs from its Taylor series, so that I understand the limitation.
23. As a learner, I want an epsilon band and a formula-backed threshold, so that I can understand the quantifiers in sequence convergence.
24. As a learner, I want oscillating and divergent sequences, so that I can distinguish their behavior from convergence.
25. As a learner, I want whole-domain error beside pointwise error, so that I can distinguish uniform from pointwise convergence.
26. As a learner, I want cobweb steps and a contraction bound, so that I can follow fixed-point convergence.
27. As a learner, I want complex operands and their product together, so that I can see rotation and scaling.
28. As a learner, I want zero and undefined quantities explained, so that exceptional cases do not appear as broken drawings.
29. As an educator, I want optional iterative playback, so that I can reveal longer-term behavior during projection.
30. As a learner, I want playback initially stopped and easy to pause, so that motion stays under my control.
31. As a keyboard or touch user, I want alternatives to graph dragging, so that I can use essential controls.
32. As an educator, I want readable labels and explicit legends, so that students can follow the projected graph.
33. As a Slovenian or English reader, I want equivalent explanations and controls, so that language does not change the mathematics.
34. As a learner, I want Back and exit to restore the appropriate scene, so that temporary lessons do not destroy my configuration.
35. As an educator, I want local Presets and file exchange, so that I can prepare and share examples.
36. As an educator, I want faithful figure export, so that I can use the construction in teaching materials.
37. As a learner, I want a completed lesson to hand off to exploration, so that I can investigate my own questions.
38. As a maintainer, I want verified release batches, so that catalogue growth remains reviewable.

## Implementation Decisions

- Reuse the existing Demonstration workspace, optional Guided lesson flow, typed Graph actions, Lesson scenes, local Presets, and figure export. Preserve one lesson per Demonstration; a multi-lesson selector is unnecessary.
- Add independent Demonstration identities, routes, and Preset collections. Existing routes, stored Presets, and lesson identities remain unchanged. Publish only shipped entries and previews. Use consistent additive routing; exact slugs are implementation details.
- Keep mathematical evaluation independent of React, JSXGraph, localization, and graph-global state. Reuse current evaluators where sufficient; add topic-specific operations for bisection, bounds, extrema, Taylor coefficients, convergence, and complex arithmetic. Avoid a universal symbolic engine or unnecessary expansion of the fixed function list on existing routes.
- Extend the current declared action vocabulary with meaningful typed parameters, choices, visibility controls, and iteration/reveal commands. Every graph validates its domain and rejects unsupported actions. Do not overload unrelated parameter names.
- Maintain a single synchronous scene-store source of truth. A sequence of Graph actions in one tick reads earlier writes immediately; board side effects occur after the host commits. Do not introduce graph-field mirrors of state.
- Reuse the existing graph-owned animation driver and extend capability dispatch for iterative playback. Next step and playback use the same mathematical transition. Graphs own timers, generated objects, and disposal; lessons request declared operations rather than simulating controls.
- Playback is optional and initially stopped. Pause on manual edits, function/domain changes, scene changes, lesson frame transitions, exit, reset, import, capture, and route disposal. Iterations have documented finite limits; completion stops playback. Resume advances from the paused mathematical state without a large elapsed-time jump. Preset loading never starts playback.
- Keep the mathematical iteration index in saved configuration when needed to reproduce a figure; running status and transient animation timing are not Preset data. Derive iteration histories deterministically from validated inputs rather than trusting imported arrays.
- Lesson scenes are temporary. Capture the graph configuration and view on entry; restore them on exit/cancel without resuming motion. Back reapplies the declared earlier scene. Completing a lesson leaves its final scene available. No automatic writes to saved Presets.
- Use bounded named examples, input domains, and counts. State mathematical hypotheses separately from UI limits. Handle equality, undefined derivatives/arguments, invalid brackets, floating-point stagnation, and out-of-domain imports explicitly.
- Preserve the graph as the main teaching surface. Use native labelled controls and numeric alternatives for draggable points; provide textual status and legends rather than colour-only meaning. Keep narrow-screen, keyboard, touch, and projection workflows usable.
- Ship Slovenian first with English counterparts for all controls, lesson content, errors, and mathematical statuses. Type-check localization keys and placeholder names. Delimit symbols and formulas in lesson prose, use decimal commas correctly in Slovenian mathematics, and retain undelimited formula fields.
- Keep host/app-shell changes separate from mathematics. Retain the renderer and build tools; renderer replacement and broad UI redesign are not dependencies.
- Update catalogue metadata, previews, capability documentation, and described ownership/hosting behavior as each batch ships. Record consequential family and playback decisions with their real alternatives during implementation; do not present planned capabilities as already available.
- Main chat owns review, integration, verification, commits, and pushes. Delegate bounded implementation slices under the repository's approved worker workflow. Reserve shared registry/localization/runtime integration for one owner to avoid concurrent edits.

## Testing Decisions

The owner confirmed the existing interfaces as the primary verification boundary: Demonstration controls, typed scene actions, Presets, capture/restore, and playback lifecycle. Pure mathematical checks supplement that boundary; production browser checks verify learner workflows. Reuse these seams instead of creating a separate testing API.

- Good tests assert observable mathematical and learner behavior, not internal object names, JSXGraph call counts without a lifecycle purpose, or calculations copied directly from the implementation.
- Pure mathematics tests check the concept acceptance examples, invariants, inequalities, domain restrictions, exact exceptional cases, and independently justified numeric tolerances. Test error bounds against independent reference values; sampled maxima are insufficient for a whole-domain guarantee.
- Graph adapter tests apply full multi-action scenes synchronously, verify controls/actions yield equivalent configurations, and reject unsupported or invalid operations. Test independent MVT controls and invalidation of iterative history on edits.
- Preset tests cover save/reopen and export/import, mathematical-state reproduction, validation of counts and domains, malformed/unsupported files with actionable errors, and loading in a paused state.
- Lesson/session tests cover default preparation, Back, exit/cancel restore, final-scene handoff, supported reveals, and navigation without an assessment response. Content checks cover source correspondence, worked values, hypotheses, both languages, and the existing mathematical-notation rule.
- Playback tests use the existing injectable scheduler pattern to verify Next step/play equivalence, pause/resume, termination, manual-edit cancellation, scene/frame changes, and unmount. Verify no queued callback mutates a disposed or replaced scene. Check existing De Casteljau behavior when the shared animation contract changes.
- Lifecycle checks exercise repeated scene preparation, route remounts, preset import, and figure capture. Generated boards, objects, listeners, and timers have explicit owners and are disposed; capture/export represents one settled scene and does not accidentally save intermediate playback states.
- Each lesson gets a production guided-lesson smoke row. Use the smoke-tester workflow for new routes, controls, lessons, and rendering. Check default scenes, essential controls, reveals, iterative playback, restore, catalogue links, direct loading/refresh, and production assets. Cover desktop/projection, a narrow viewport, keyboard, and essential touch alternatives.
- Run the full browser checklist when the shared catalogue/workspace or lesson runtime changes; focused route checks suffice only when shared behavior is unaffected. Report failures and incomplete coverage.
- Release each batch only after TypeScript, applicable unit/content tests, production build, required browser checks, and source/mathematical review pass. Localization changes require TypeScript and production build checks. Review substantial features in parallel for mathematics, engineering constraints, UI, and accessibility.
- Existing prior art: the eight function Demonstrations' pure mathematics and graph adapter tests, Guided lesson session/content tests, animation scheduler tests, preset validation tests, and production guided-lesson smoke coverage.

### Batch-wide acceptance gate

1. Every listed Demonstration opens from its intended family, directly and after refresh, with its own available Guided lesson and static preview.
2. Its concept contract above is fulfilled with checked examples, honest guarantees, appropriate exceptions, and controls that visibly update the mathematics.
3. Slovenian and English content, accessible inputs, projection readability, temporary scene restore, stopped-by-default playback, Presets, and figure export pass the applicable checks.
4. Existing routes and Presets retain their behavior; shared runtime changes pass the broader regression coverage.
5. Required reviews and verification evidence are recorded. Commit only the batch's completed changes; fetch and rebase only new commits onto origin/master, recheck, and push as a fast-forward under the repository workflow. Stop and report rebase conflicts.

## Out of Scope

- Backend services, accounts, server storage, external tracking, persistent lesson progress, grading, adaptive lessons, or a course-authoring platform.
- Free-text formulas, symbolic differentiation/integration, arbitrary functions, and general-purpose theorem proving.
- Full textbook proofs for every theorem; visual evidence must nevertheless be mathematically honest.
- General metric-space visualizers, complex roots, complex function theory, and topics beyond the eleven approved Demonstrations.
- Renderer replacement, build-tool migration, broad workspace redesign, or unrelated curve refactoring.
- Automatic playback, hidden pointer simulation, and automatically saving temporary Lesson scenes as Presets.
- Implementation task documents in this specification step; a task breakdown is a separate request.

## Further Notes

Canonical source research: [Analiza I candidate report](../research/analiza-i-guided-lesson-candidates.md), with section/page references and inspection limitations. Primary text: [Globevnik and Brojan, Analiza I](https://users.fmf.uni-lj.si/globevnik/skripta.pdf). Author original lesson prose and constructions, independently verify formulas, and respect the source's reuse notice.

Existing constraints and vocabulary: [guardrails](../guardrails.md), [future direction](../future-plan.md), [glossary](../../GLOSSARY.md), [Guided lessons](guided-lessons.md), [function concepts](function-concepts.md), and [ADR 0007](../adr/0007-function-concepts-family.md).

This spec extends the former function-concepts scope: the new topics have separate identities rather than replacing those eight lessons. The approved placement of complex multiplication in Foundations supersedes the research report's tentative new-family suggestion.

Some older documentation describes function graph-field model mirrors. The current repository instruction requiring synchronous scene-store state and prohibiting those mirrors governs this implementation.

Classroom learning effectiveness and owner language feedback remain human review evidence. Passing automated checks establishes implementation behavior, not an experimentally demonstrated teaching outcome.
