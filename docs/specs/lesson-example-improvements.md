# Lesson example improvements

**Status:** tasks 00–08 implemented and unit-verified 2026-10-25; browser acceptance (task 09) pending. See the [handoff](../reviews/lesson-example-improvements/handoff-2026-10-25.md).

**Source:** owner's request to study demonstration lesson examples, the resulting review, and the request to create repository-local tasks for all recommendations.

**Tasks:** [batch index](../tasks/lesson-example-improvements/README.md).

## Problem and intended result

Some guided lessons inherit attractive demonstration defaults that are too complex for a first explanation. Others introduce several changes together, hide the relevant comparison, or require zooming out to find the construction. Learners should start with a small, legible example whose arithmetic supports the concept, then explore richer cases.

The source review examined the 45 available guided lessons, their scene declarations, graph defaults, and the Bézier chapter activities. It was a source review, not browser or classroom validation. Proposed replacements are candidates to verify; implementation must not present them as visually accepted already.

## Scope and decisions

- Improve existing lesson examples and sequencing; retain effective examples. All 45 lesson IDs have an explicit disposition in the task index.
- Prefer lesson-specific temporary geometry over changing free-exploration defaults. Decide per route whether a demonstration default also benefits; record the effect on Reset, previews, and preset behavior when it does.
- Keep routes and stored user presets unchanged. Any deliberate exception needs its reason and user impact documented before release.
- Keep existing mathematical capabilities, graph ownership, synchronous scene actions, and checkpoint restoration. A minimal typed way to prepare lesson geometry or an appropriate view is in scope if required. A generic scene editor, new renderer, or runtime redesign is not.
- Keep introductory examples small without turning advanced cases into misleading special cases: follow symmetric examples with asymmetry, equal weights with unequal weights, and successful hypotheses with relevant counterexamples.
- Keep Slovenian and English content consistent. Update calculations, labels, point counts, prompts, and expected observations together. Follow existing math-delimiter rules and localization contracts.
- Update Bézier chapter prose and activities only where they share an affected example. Do not expand the chapter curriculum. Do not silently change a shared graph default and leave the chapter describing the old scene.
- Retention means verify the stated educational behavior and keep it; it does not require a cosmetic rewrite, additional UI, or new tests duplicating existing coverage.

## Candidate examples and priorities

### Batch A: make foundational constructions readable

1. **Bézier:** consider the cubic control points \((-3,-2),(-3,2),(3,2),(3,-2)\), for which \(B(1/2)=(0,1)\). Use it for arithmetic and follow with an asymmetric shape; retaining the current default for exploration is acceptable.
2. **De Casteljau:** begin with the quadratic \((-3,-2),(0,4),(3,-2)\). At \(t=1/2\), the first row is \((-3/2,1),(3/2,1)\) and the result is \((0,1)\). Introduce a cubic next and retain the quartic for later exploration. Compare \(t=1/4\) and \(3/4\) to expose interpolation beyond midpoints.
3. **Alternative De Casteljau:** introduce a cubic with two helper quadratics before the current quartic/helper-cubic case. Choose asymmetry and parameter values that keep helper points distinguishable.
4. **Affine transformations:** use an asymmetric curve and a marked point away from the origin; compare translation and a quarter-turn before scaling. Establish the actual transformation pivot from the graph implementation.
5. **Degree elevation:** retain the useful geometry; make original/elevated polygons available together so representation changes can be compared while the curve remains identical. Reuse existing overlays where sufficient.
6. **Cubic PH:** candidate start \(P_0=(-2,-1)\), generators \(w_0=2,w_1=2+i\). Then \(w(t)=2+it\), speed \(4+t^2\), midpoint speed \(17/4\), and length \(13/3\).
7. **Quintic PH:** candidate start \(P_0=(-2,-1)\), generators \(2,2+i,1+i\). The midpoint generator is \(7/4+3i/4\), speed \(29/8\), and length \(17/5\). The quadratic generator has a nonzero second difference, so this is not merely a degree-elevated cubic.

The PH candidates' control points and speeds were checked with the repository's `phControlPoints` and `phSigmas` functions during the review. Visual scale, offsets, and label separation remain to be verified.

### Batch B: rational constructions and splines

- Start the rational-curve lesson with equal weights, then change only the second weight from \(1\) to \(2\) to \(4\), keeping geometry fixed.
- Introduce rational De Casteljau through equal weights before unequal weights; use a quadratic first if it improves the calculation, then the existing cubic.
- Keep rational elevation geometry and emphasize the before/after representation. Keep rational subdivision and its homogeneous-coordinate meaning consistent with the new baseline.
- Keep rational extrapolation's main extension modest, around \(1.1\) or \(1.2\). Move the negative-weight case into a clearly identified advanced comparison with a suitable view. Do not imply that negative Bernstein weights alone prove a pole or that positive weights on the original interval guarantee no pole outside it.
- Keep Farin's unequal ratios, midpoint, and geometric-weight standardization examples. Keep the three-piece circle, whose middle weight is \(1/2\), with four pieces as a later comparison.
- Replace the general spline's crowded opening with two pieces and one visible joint. Prepare compact quadratic \(C^1\) and cubic \(C^2\) examples; retain the current far-reaching propagation case later as an illustration of the construction's limitations.
- Reduce introductory piece counts for the dedicated \(C^1\), \(C^2\), and both \(G^1\) lessons. Focus on one joint before propagation/locality. Retain unequal-ratio comparisons and distinguish matching tangent direction from equal parameter derivatives.

### Batch C: parameterization and example sequences

- Start weighted parameterization with three interior samples and \(\alpha=1/2,1/4,3/4\), then increase density.
- Keep the uniform-parameterization PH example initially. Compare modes with identical geometry and sample count; distinguish equal arc length from equal chord length.
- For spline parameterization, choose an open scene with clearly unequal edge lengths. Begin with ten samples and visible joints; compare uniform, centripetal, and chordal choices without conflating this shape-changing construction with reparameterizing one fixed curve.
- Keep the sine baseline for trigonometric functions. Change amplitude, vertical shift, frequency, and phase individually before the combined example.
- Keep the area-between-curves functions, but begin on \([1,3]\) with the between-region shaded. Introduce irrational intersection bounds next. Use \([0,4]\) before the narrow crossing example at \(b=3.5\).
- Keep Taylor's exponential at center zero, comparing degrees \(1,2,3\) before \(6\). Retain the geometric-series and smooth nonanalytic counterexamples later.
- Start reciprocal-sequence convergence with \(\varepsilon=1/4\) and twelve terms: \(n=4\) is on the boundary and \(n\ge5\) is strictly inside. Then tighten \(\varepsilon\); coordinate the displayed \(N\) with the runtime's precise tail convention.
- Start uniform convergence with \(x/n\) on \([0,1]\), whose supremum error is \(1/n\). Contrast \(x^n\) on \([0,1]\), then restrict to \([0,0.8]\). At the closed interval endpoint, the pointwise limit of \(x^n\) is \(1\), not \(0\); the supremum error is \(1\), not attained there.

### Batch D: retain and verify

Retain linear, exponential, continuity, derivative, definite integral, arc length, bisection, mean value, accumulation, Darboux, extrema, convexity, fixed-point, complex multiplication, ordinary subdivision, repeated subdivision, ordinary extrapolation, and Bernstein examples. Task 08 records their specific teaching claims and checks shared changes have not undermined them. Farin and circle retention is owned by task 03; elevation retention is owned by tasks 01/03.

## Acceptance criteria

1. Every lesson in the task index has an implemented improvement or an evidenced retention decision; no recommendation disappears between batches.
2. Each changed example has exact input geometry/parameters, an intended observation, consistent bilingual prose/calculations, and a recorded mathematical check independent of rounded screen values.
3. The relevant geometry, construction points, and sample gaps are legible at the starting view on desktop/projection and a 390 px viewport. Introductory scenes do not require repeated zooming merely to find the subject. Advanced scenes explicitly prepare or explain a different view.
4. Scene transitions apply synchronously and deterministically. Back/Next, hiding/reopening instructions, exit/re-entry, Reset, language changes, and preset restore have the expected graph/control state. No autoplay or loss of the captured user scene is introduced.
5. Shared chapter activities and prose remain consistent, and existing free-exploration defaults and local presets are preserved unless a default change is explicitly recorded.
6. Required numerical, unit, type, build, and affected-route browser checks pass. Evidence names the revision, scenes, viewports, languages, and remaining coverage gaps; implemented work is not called accepted while a required check remains unverified.

## Verification and delivery

Start with `just --list` and [the command guide](../commands.md). Use focused mathematical/content/session tests, including `src/learning/content/lessonMathNotation.test.ts`. After localization changes run `npx tsc --noEmit --pretty false` and the production build. Use the existing smoke rows for affected IDs and the repository's `$smoke-tester` workflow and [browser checklist](../smoke-tests.md); report unavailable tooling or incomplete coverage explicitly. A shared runtime change requires the full applicable lesson-runtime checklist; content-only slices require affected workflows.

Review multi-file geometry changes with parallel mathematical and engineering reviewers, adding UI/accessibility review where visuals or controls change, as required by `AGENTS.md`. Maintain one owner for shared scene vocabulary, chapter integration, localization catalogs, and smoke integration. Follow [the delegation workflow](../agent-workflow.md) for bounded implementation workers.

Planning completion requires Markdown/link/coverage review only, not an application build. The task-authoring request creates this backlog; task status must not imply application work has been performed. Implement and accept future slices in small commits under the repository's normal Git workflow.
