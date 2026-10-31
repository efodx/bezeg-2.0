# School function graphs for the matura

**Status:** scheduled, 2026-10-31 (feature stream `functions`). Tasks: [docs/tasks/school-function-graphs](../tasks/school-function-graphs/README.md); ADR decisions and the ε notation: [ADR 0026](../adr/0026-school-function-catalogue.md); Slovenian terms settled in the task README.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates](../research/lesson-family-candidates-2026-10-31.md) (§3 Gimnazija/matura topics, candidates 1–6; family 4; sample sequences 11–13; correctness notes on conics and rational functions), which cites the matura mathematics catalogue (PIK §§4.10–4.12, pp. 15–20) and the CAGD syllabus for conics. The gimnazija curriculum itself was not read. Part of the [new lesson families](new-lesson-families.md) index; it owns the **function catalogue extension**.

## Problem Statement

The functions family teaches linear, exponential and trigonometric functions and the calculus concepts ([function concepts](function-concepts.md), [analysis lessons](analysis-guided-lessons.md)). A gimnazija student preparing for the matura also needs the standard toolkit of function graphs: transformations, inverses and logarithms, polynomial zeros, rational functions and asymptotes, geometric series and conics. None has an interactive lesson, and `src/analysis/functions.ts` offers only `square`, `sin` and `exp`, so most of these cannot even be drawn.

## Solution

Add six small Demonstrations and one chapter, **Grafi funkcij za maturo / Function graphs for the matura**, each lesson 5–10 minutes in 5–7 steps, with prediction before reveal and a hand-off to free exploration, following [chapter-owned guided learning](chapter-owned-guided-learning.md). Extend the function catalogue with a separate, domain-aware school catalogue (see its section). Level markers (OR/VR) are not part of this spec: before any lesson, step or chapter is labelled with a matura level, the implementer must check that item in the matura catalogue PDF itself (the marker glyph was lost in the text extraction behind the research note). Until checked, no level label is shown.

### Release batches

| Batch | Contents | Release condition |
| --- | --- | --- |
| A | Function catalogue extension (kernel only); S1 Graph transformations; S2 Inverse functions and the logarithm | Catalogue ADR accepted; kernel, scene, lifecycle, both-language and smoke checks pass; existing function routes and Presets verified unchanged |
| B | S3 Polynomial zeros; S4 Rational functions | Batch A released; plotting across poles verified |
| C | S5 Geometric series; S6 Conics, including the Bézier bridge | Batch B released; S6 bridge verified against the existing rational chapter |

Publish batches separately; do not advertise unreleased lessons.

### Reuse and new modules (paths verified to exist)

- Reused: `src/graphs/functions/BaseFunctionGraph.tsx` (synchronous model, `DomainError`, `lessonFunctionActions()` with parameter, choice and visibility actions); `ExponentialFunctionGraph.tsx` (base slider, marked points, mirror graph `(1/a)^x`, the starting point of S2); `TrigonometricFunctionsGraph.tsx` (amplitude, frequency, phase and midline sliders with a reference graph: the existing transformation idea restricted to sine, cosine, tangent); `IterativeFunctionGraph.tsx` and `src/analysis/sequenceModel.ts` for stepwise term reveal; `src/graphs/curves/rational/RationalBezierCurveCircleGraphN.tsx` and `FarinPointsCurveGraph.tsx` for the conic bridge.
- `SequenceGraph.tsx` models convergence of a sequence (examples `reciprocal`, `alternating-reciprocal`, `alternating-sign`, `natural`; epsilon, limit, threshold). It does not model series or partial sums. S5 therefore reuses its iteration machinery (term-by-term reveal, Next step/Play/Reset through `IterativeFunctionGraph`) but needs a new model of a series. Alternative for the ADR: add series examples to `SequenceGraph` versus a sibling `SeriesGraph`; the sibling avoids widening the epsilon-N model.
- New: `src/analysis/schoolFunctions.ts` (catalogue), `transformation.ts`, `inverse.ts`, `polynomial.ts`, `rational.ts`, `geometricSeries.ts`, `conic.ts` (pure mathematics, no React, JSXGraph, localization or graph state), one graph class per Demonstration, and Preset collections registered through `functionPresetCollections.ts` (ADR 0016).

## Function catalogue extension

### Why a separate catalogue

`FUNCTION_IDS` (`square`, `sin`, `exp`) is imported by `DerivativeGraph`, `DefiniteIntegralGraph`, `AccumulationGraph`, `derivativeModel.ts`, `accumulationModel.ts`, `functionPresetCollections.ts` and `src/learning/model.ts`. Every entry there must carry a total value, derivative and antiderivative and is offered in those routes' selectors and validated in stored Presets. Appending poles or `log` there would widen those selectors and break the totality those routes assume. Decision (needs an ADR; alternatives: (a) extend `FUNCTION_CATALOG` with optional antiderivative and partial domains, touching every consumer; (b) separate `SCHOOL_FUNCTION_CATALOG` as below; (c) free-text formulas, already deferred by ADR 0007): proposed (b). Existing ids, `CatalogFunction`, routes and stored Presets do not change.

### Entries and parameters

A `SchoolFunction` is a discriminated union on `kind` with plain numeric parameters, so the model stays a flat validated record usable as Preset data.

| Entry | Parameters | Value and derivative | Notes |
| --- | --- | --- | --- |
| `power` base shapes: \(x^2\), \(x^3\), \(\sqrt x\), \(1/x\), \(|x|\) | none (closed list) | exact | \(|x|\) has no derivative at 0; \(\sqrt x\) none at 0 |
| `exp`, `log` | base \(a\in[0.2,5]\), \(a\ne1\); `log` is \(\log_a\) | \(a^x\ln a\); \(1/(x\ln a)\) | `log` domain \(x>0\) |
| `poly` | zeros \(z_i\) with integer multiplicities \(m_i\in\{1,2,3\}\), leading coefficient \(k\ne0\); total degree \(\le 5\) | product form; derivative by the product rule over factors | stored in product form, never expanded |
| `rational` | numerator and denominator each a `poly` | quotient; quotient rule | domain excludes the denominator's zeros |
| `named` | closed ids `x2-2` (\(x^2-2\)), `cubic-cycle` (\(x^3-2x+2\)), `cubic-x3-x` (\(x^3-x\)) | exact | for [numerical methods](numerical-methods-lessons.md) (optional) |
| transformed | any entry above plus \(a,b,c,d\) | chain rule: \(a\,b\,f'(b(x-c))\) | \(b\ne0\); see S1 |

Each entry exposes `domain` (a union of open or closed intervals), `value(x)` returning a number or `undefined`, `derivative(x)` likewise, optional `antiderivative`, undelimited `latex`/`derivativeLatex` and a plain form. Antiderivative is present only where exact (power shapes, `exp`, `log`: \(x\ln x - x\)); entries without one are not offered in the integral and accumulation routes. Parameter ranges are bounded and validated; imports outside them are rejected with an actionable message, never clamped.

### Evaluation, undefined points and plotting

- `value` returns `undefined` (never `NaN`, `Infinity` or a large sentinel) outside the domain, at poles, at removable holes and where an even root or log argument is invalid. Holes are detected exactly from the factor structure (a common zero of numerator and denominator), not from numeric thresholds.
- Plotting samples adaptively and breaks the polyline into separate pieces at every undefined point and at every pole, so no segment is drawn across a pole. Near a pole, samples whose \(|y|\) exceeds the view height are clipped to the view, and the line is split where the sign changes across a pole of odd multiplicity. A hole is drawn as an open circle at the limit value; a pole as a dashed vertical line only when requested.
- Domain edges (\(\ln\) at 0, \(\sqrt x\) at 0) are drawn up to the last valid sample with no vertical line.
- Slopes and tangents at \(x\) where the derivative is `undefined` show a textual status ("no tangent here"), never a fabricated number.

### Presets and compatibility

New Demonstrations get new Preset collections; existing collections and ids are untouched. A `SchoolFunction` model in a Preset is validated field by field (kind, bounds, multiplicity set, degree cap, denominator not identically zero). Derived data (hole positions, asymptotes, plotted pieces) is recomputed, never trusted from the file.

## Slovenian terms (proposals, to be settled by [choosing new terms](../localization.md#choosing-new-terms))

| SL (proposal) | EN | Note |
| --- | --- | --- |
| prenos / razteg / zrcaljenje grafa | shift / stretch / reflection | separate the three effects |
| inverzna funkcija | inverse function | |
| logaritem pri osnovi \(a\) | logarithm to base \(a\) | |
| ničla, večkratnost ničle | zero, multiplicity | |
| pol, luknja | pole, hole | hole = removable discontinuity |
| navpična, vodoravna, poševna asimptota | vertical, horizontal, oblique asymptote | |
| geometrijska vrsta, delna vsota | geometric series, partial sum | |
| stožnica, gorišče, vodnica, izsrednost | conic, focus, directrix, eccentricity | verify against textbook usage |

## Concept contracts and acceptance criteria

Defaults may be replaced by equivalent examples that keep the learning goal and the checked evidence.

#### S1. Graph transformations \(y=a\,f(b(x-c))+d\)

- Goal: relate each of four parameters to one visible change of the graph. Prerequisites: [functions and calculus](../../src/learning/content/familyChapters.ts) chapter (function as a rule), trigonometric lesson.
- Default: \(f(x)=x^2\), \(a=-2\), \(b=\tfrac12\), \(c=3\), \(d=1\), giving \(y=-2\bigl(\tfrac12(x-3)\bigr)^2+1\). NEW checks: vertex \((3,1)\); the point \((2,4)\) of \(f\) maps to \((7,-7)\); \(x=5\) gives \(-1\).
- Steps: (1) the original with a ghost; (2) predict, then move \(d\); (3) \(c\) (inside shift); (4) \(a\), with sign as reflection in the \(x\)-axis; (5) \(b\), with a sign change as reflection in the vertical line \(x=c\); (6) combine, with a marked point following the rule \((u,v)\mapsto(u/b+c,\,av+d)\); (7) free exploration over all catalogue shapes.
- Capabilities: the transformed entry, ghost toggle, marked tracked point, readout of the composed rule. A change of the base shape keeps the parameters.
- Acceptance: (1) the tracked point formula holds for all shapes; (2) \(b=0\) is rejected; \(b<0\) mirrors about \(x=c\); (3) the order of operations is stated (shift inside is divided by \(b\)); (4) a single slider changes exactly one visible feature in the guided steps; (5) reset and lesson exit restore parameters; (6) both languages; (7) trigonometric and exponential routes unchanged.

#### S2. Inverse functions and the logarithm

- Goal: the inverse graph is the reflection in \(y=x\); slopes at mirrored points are reciprocal; \(\ln\) and \(\log_a\) invert \(e^x\) and \(a^x\). Prerequisites: exponential function, derivative.
- Defaults: \(x^2\) on \(x\ge0\) with \(\sqrt x\): slope \(4\) at \((2,4)\), \(\tfrac14\) at \((4,2)\). Exponential base \(2\): \(2^3=8\), \(\log_2 8=3\), slope of \(2^x\) at \((3,8)\) is \(8\ln2\approx5.5452\), of \(\log_2\) at \((8,3)\) is \(1/(8\ln2)\approx0.18034\) (NEW). \(e^x\) at \((1,e)\): slope \(e\); \(\ln\) at \((e,1)\): \(1/e\approx0.36788\) (NEW).
- Steps: (1) draw \(y=x\) and a point with its mirror; (2) predict the mirrored curve, reveal; (3) why \(x^2\) on all of \(\mathbb R\) has no inverse (horizontal line test), then restrict; (4) tangent and mirrored tangent, slopes multiply to \(1\); (5) base slider: \(a^x\) and \(\log_a\); (6) \(\ln\) domain \(x>0\) and asymptote \(x=0\); (7) free exploration.
- Acceptance: (1) mirrored point has swapped coordinates exactly; (2) product of slopes is \(1\) within \(10^{-9}\); (3) at a point where the derivative is \(0\) (\(x^2\) at \(0\)) the inverse tangent is vertical and no slope is shown; (4) only one-to-one restrictions are offered, stated as a hypothesis; (5) \(a\to1\) is excluded; (6) both languages; (7) the picture of the reflection is given as a construction (swap of coordinates), the slope relation as an illustration of the chain rule identity.

#### S3. Polynomial zeros and multiplicity

- Goal: crossing versus touching, flattening with multiplicity, and end behaviour. Prerequisites: S1 helpful, not required.
- Default: \(p(x)=(x+2)(x-1)^2=x^3-3x+2\); \(p(0)=2\), \(p(1)=0\), \(p'(1)=0\), \(p''(1)=6>0\) (NEW, checked). Then \((x-1)^3\) (crossing with an inflection) and a degree-5 example with multiplicities \(1,2,2\).
- Steps: (1) drag zeros, predict the sign pattern; (2) a simple zero crosses; (3) a double zero touches; (4) a triple zero crosses flatly; (5) degree equals the sum of multiplicities; end behaviour from the leading term; (6) \(y\)-intercept as \(k\prod(-z_i)^{m_i}\); (7) free exploration.
- Acceptance: (1) sign changes at odd multiplicity only; (2) degree cap 5 enforced with a visible reason; (3) two dragged zeros colliding merge into one with multiplicity added, announced in text; (4) the derivative vanishes at every zero of multiplicity \(\ge2\); (5) numeric entry for zeros with keyboard alternative to dragging; (6) both languages.

#### S4. Rational functions: zeros, poles, holes, asymptotes

- Goal: read zeros, poles, holes, and vertical, horizontal and oblique asymptotes from \(p/q\). Prerequisites: S3.
- Defaults: \(\dfrac{x^2-1}{x-2}\): zeros \(\pm1\), pole \(2\), \(=x+2+\dfrac3{x-2}\), remainder \(0.375\) at \(x=10\). Hole: \(\dfrac{x^2-1}{x-1}=x+1\), open circle at \((1,2)\). Horizontal: \(\dfrac{2x^2-2}{x^2-4}=\dfrac{2(x-1)(x+1)}{(x-2)(x+2)}\to2\), zeros \(\pm1\), poles \(\pm2\), at \(x=10\) value \(2.0625\) (NEW, \(2+6/96\)).
- Decision (2026-10-31): the earlier horizontal example \(\dfrac{2x^2+1}{x^2-1}\) was replaced because \(2x^2+1\) has no real zeros and cannot be written in ADR 0026's product form \(k\prod(x-z_i)^{m_i}\). The replacement keeps the lesson point (equal degrees, asymptote \(y=2\)) without adding irreducible quadratic factors to the model.
- Steps: (1) one pole, predict behaviour on each side; (2) drag a zero onto the pole: the hole appears; (3) vertical asymptote from a pole of the reduced fraction; (4) degree comparison selects horizontal or oblique; (5) the remainder term shrinks, with a slider for \(x\); (6) odd versus even multiplicity of the pole (sign change); (7) free exploration.
- Acceptance: (1) a common factor yields a hole, never a pole; (2) the oblique asymptote only when \(\deg p=\deg q+1\), computed by polynomial division; (3) the curve is never drawn across a pole; (4) asymptotes drawn as dashed lines with text labels; (5) a graph may cross a horizontal or oblique asymptote at finite \(x\) and the lesson does not claim otherwise; (6) both languages.

#### S5. Geometric series and partial sums

- Goal: \(S_n=a\dfrac{1-q^n}{1-q}\to\dfrac a{1-q}\) for \(|q|<1\), and divergence otherwise. Prerequisites: sequence convergence lesson.
- Defaults: \(a=1,q=\tfrac12\): \(S_1..S_5=1,1.5,1.75,1.875,1.9375\), limit \(2\); error \(2-S_n=2\cdot2^{-n}\) first below \(0.01\) at \(n=8\) (\(0.0078125\), NEW). \(q=-\tfrac12\): \(S_4=0.625\), limit \(\tfrac23\) (NEW). Repeating decimals \(0.\overline3\) (\(a=0.3,q=0.1\), limit \(\tfrac13\)) and \(0.\overline9=1\) (NEW).
- Steps: (1) bars of terms and a partial-sum bar chart; (2) predict \(S_5\); (3) reveal terms one by one (Next step/Play); (4) the limit marker \(a/(1-q)\); (5) \(q<0\) alternates around the limit; (6) \(|q|\ge1\): divergence, and \(q=-1\) oscillates between \(a\) and \(0\); (7) free exploration with a tolerance band.
- Acceptance: (1) \(S_n\) matches the closed form to \(10^{-12}\); (2) the limit marker is hidden for \(|q|\ge1\); (3) \(q=1\) is handled (\(S_n=na\)) without division by zero; (4) term cap stated; playback stops at the cap and starts stopped; (5) reset and Preset import never start playback; (6) both languages; (7) a finite picture is labelled an illustration of convergence, the closed form carries the proof.

#### S6. Conics: focus, directrix, eccentricity, and the Bézier bridge

- Goal: \(|PF|=e\,|Pd|\) unifies ellipse, parabola and hyperbola; a conic is also a rational quadratic Bézier. Prerequisites: S1 (affine images), the existing rational Bézier chapter.
- Defaults: ellipse \(a=5,b=3\): \(c=4\), \(e=0.8\), directrix \(x=6.25\); at \((0,3)\): \(|PF|=5\), distance to directrix \(6.25\), ratio \(0.8\), focal sum \(10\). Parabola \(y^2=4x\): focus \((1,0)\), directrix \(x=-1\), \(P=(1,2)\): both distances \(2\) (NEW). Hyperbola \(x^2/9-y^2/16=1\): \(c=5\), \(e=\tfrac53\), directrix \(x=1.8\); \(P=(6,\sqrt{48})\): \(|PF|=7\), directrix distance \(4.2\), ratio \(1.6667\); \(|PF_2|=13\), difference \(6=2a\) (NEW).
- Bridge: quarter ellipse as rational Bézier with control points \((5,0),(5,3),(0,3)\), weights \(1,\tfrac{\sqrt2}2,1\) (the affine image of the circle arc with the same weights). At \(t=\tfrac12\): \((3.5355,2.1213)\) with \(x^2/25+y^2/9=1\) (NEW). Middle weight \(<1\) ellipse, \(=1\) parabola, \(>1\) hyperbola for end weights \(1\).
- Steps: (1) point on an ellipse, two focal distances, sum constant; (2) predict the ratio to the directrix, reveal \(e\); (3) slide \(e\) through \(<1\), \(=1\), \(>1\), including the parabola; (4) hyperbola with the difference of focal distances; (5) circle as the limit \(e\to0\) (no directrix); (6) link to the rational Bézier chapter with the weight slider; (7) free exploration.
- Acceptance: (1) the ratio \(|PF|/|Pd|\) equals \(e\) within \(10^{-9}\) for dragged \(P\); (2) the slider includes exactly \(e=1\) as the parabola; (3) \(e=0\) is shown as a circle without directrix; (4) the weight classification matches the conic type in the bridge scene; (5) the conic is drawn from its definition, the Bézier version overlaid, with the maximum deviation reported; (6) both languages.

## User Stories

1. As a student, I move four sliders and see which feature each controls, so I can sketch \(a f(b(x-c))+d\) by hand.
2. As a teacher, I reflect a graph in \(y=x\) in front of the class to introduce the logarithm.
3. As a student, I drag zeros and see crossing or touching, so I connect multiplicity to the sign pattern.
4. As a student, I distinguish a hole from a pole and read the asymptotes from the fraction.
5. As a student, I watch partial sums approach \(a/(1-q)\) and see why \(|q|\ge1\) diverges.
6. As a learner of CAGD, I see that the focus-directrix conic and the rational Bézier arc are one curve.
7. As any user, I use keyboard or numeric alternatives to dragging and switch language live.

## Implementation Decisions

- Pure kernels first, then graph classes on `BaseFunctionGraph`; scenes use the existing `function-parameter`, `function-choice` and `function-visibility` actions; extend the closed name unions only with names these lessons need and keep `sceneAction` rejecting unknown names.
- Lesson scenes run synchronously in one tick and read the graph's written state; do not add graph-field mirrors of state.
- Boards, objects and timers (S5 playback) have explicit owners and disposal; pause on edit, scene change, reset and import.
- ADRs needed: (1) the school catalogue (alternatives above); (2) S5 placement (`SequenceGraph` extension versus sibling); (3) whether the six Demonstrations join the Functions family or become a new family (alternatives: extend `/bezeg-2.0/functions`; new "School function graphs" family; the existing `functions-and-calculus` chapter vs a separate chapter). Routes and Presets are additive; no breaking change is proposed.
- The conic view (S6) is a new focal view; the implicit/point-conic drawing needs only parametric sampling (ellipse, hyperbola branches, parabola), no implicit solver.
- Matura level labels: none until each item is checked in the catalogue PDF; record the check in the task.

## Testing Decisions

- Kernel tests: transformation maps (S1 values), inverse relations and reciprocal slopes against finite differences, polynomial factor sign patterns and derivative zeros, hole/pole/asymptote classification (including degree comparison and polynomial division), geometric partial sums against the closed form, conic distance ratios and bridge deviation; catalogue totality (`undefined` rather than `NaN` outside domain), parameter validation and rejection of out-of-range imports.
- Plotting tests: piece splitting at poles and undefined points; no segment crosses a pole; hole detection exact.
- Scene tests: apply each lesson's full scene as one synchronous sequence; Back, exit and cancel restore; unsupported actions rejected.
- Preset tests: save/reopen, export/import, malformed files with actionable messages; existing function Presets still load.
- `lessonMathNotation.test.ts` must pass unchanged; delimit all symbols and formulas, use `{,}` for decimal commas in Slovenian math.
- Localization: `npx tsc --noEmit --pretty false` and the production build; browser-check SL and EN including a live switch (board text refreshes).
- Smoke: a row per lesson (default scene, controls, reveal, restore, catalogue link, refresh, narrow viewport, keyboard, touch); the full checklist only if shared runtime changes. Performance: measure dragging the adaptive plot (S4) and playback (S5) per the [performance plan](../performance-plan.md) before tuning.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh from its family with its lesson and preview.
2. Its contract above holds with checked examples and honest guarantees.
3. SL/EN, accessible inputs, projection readability, scene restore, Presets and figure export pass.
4. Existing routes and Presets behave as before; regression tests pass.
5. Reviews and evidence are recorded before the handler commits and pushes.

## Correctness Notes

- Inverse needs a one-to-one function on the chosen domain; reflection is exact, the slope relation needs a differentiable inverse (\(f'\ne0\)).
- A common factor gives a hole; a pole needs a zero of the reduced denominator. A graph can cross its horizontal or oblique asymptote.
- A conic with \(e<1\) is an ellipse, \(e=1\) a parabola, \(e>1\) a hyperbola; the circle has no directrix.
- Geometric series: the closed form needs \(q\ne1\); convergence iff \(|q|<1\) (for \(a\ne0\)).
- Floating-point: compare hole positions exactly through integer or rational zeros where possible; numeric tolerances are never presented as exact.
- Pictures illustrate; constructions (reflection by swapping coordinates, definition of the conic) establish.

## Out of Scope

- Assessment, exercises, grading, accounts, backend, progress tracking, free-text formula input, symbolic algebra.
- Level (OR/VR) labelling without checking the PDF; any claim of matura coverage.
- Parametric and polar curves, vectors as a lesson, and complex roots of polynomials.
- General conic recognition from \(Ax^2+Bxy+\dots=0\), rotated conics, and tangent-line theory of conics (a later extension).
- Free-form rational Bézier editing beyond the existing chapters.
- Renderer replacement and build-tool migration.

## Further Notes

Unverified: the gimnazija curriculum and the matura PDF levels; Slovenian terms are proposals. The optional numerical-methods use of `named` entries must not block that family's Batch A.
