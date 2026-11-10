# Recursion and growth models (Rekurzija in modeli rasti)

**Status:** draft, 2026-11-10 (stream families-prep); not scheduled for release.
**Agreed:** owner scheduled preparation 2026-11-10 (family #9 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md)); details below are proposals for owner review.
**Source:** the research note's entry 9 (opening lesson, lesson list, risks) and the matura catalogue M-MAT-2026, text extraction read for this spec: §4.12 *Zaporedja in vrste* (table of contents page 20; extraction lines 950–985: *Definicija zaporedja, Lastnosti zaporedij (končno, neskončno, monotonost, omejenost, konvergentnost), Aritmetično zaporedje, Geometrijsko zaporedje, Vsota prvih n členov aritmetičnega zaporedja in vsota členov geometrijskega zaporedja, Limita zaporedja, Vrste, Konvergenca geometrijske vrste, Obrestni račun, Anuitete, Amortizacijski načrt*; objectives "zapiše člene zaporedja pri danih začetnih členih in rekurzivni formuli", "napove in izračuna limito zaporedja", "razlikuje navadno in obrestno obrestovanje", "razlikuje med konformno in relativno obrestno …" (the line is cut in the extraction)). The page comes from the table of contents, not from a page footer. Level markers (VR) were not verified. Textbooks and FMF pages are not opened. Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

Bezeg teaches the limit of a sequence (`sequence-*`), series and partial sums (`series-*`), exponential functions (`exponential-*`) and the fixed-point theorem with a cobweb (`fixed-point-*`), but only as separate topics. Nothing shows a sequence as a *rule applied again and again*: that adding a constant and multiplying by a constant produce different growth, that the slope of the rule decides whether a cobweb spirals in or out, that compound interest leads to \(e\), and that exponential data is a straight line on a log scale. The matura asks for recursive formulas, interest and the limit (§4.12).

## Solution

Add a Learn chapter **Rekurzija in modeli rasti / Recursion and growth models** with five guided activities, each backed by a Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary. Each lesson is 5–7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress. Each picture is labelled an **argument** or an **illustration**.

**Cross-links, not repeats.** Limits and \(\varepsilon\)-thresholds stay in `sequence-definition` … `sequence-free-exploration` (`src/learning/content/analysisGuidedLessons.ts:2356–2652`). Partial sums, the geometric series and decimals stay in `series-partial-sum`, `series-limit`, `series-alternating`, `series-divergence`, `series-decimals` (`src/learning/content/schoolFunctionGraphsBatchCGuidedLessons.ts:69–223`). The exponential function stays in `exponential-form` … `exponential-growth-decay` (`src/learning/content/functionGuidedLessons.ts:280–387`) and the inverse of the exponential in `inverse-logarithm` (`src/learning/content/schoolFunctionGraphsGuidedLessons.ts:306`). The contraction theorem and error bounds stay in `fixed-point-*` (`analysisGuidedLessons.ts:~2900–2960`). New lessons link to those and add only the recursion view. **Logistic chaos is left to the phase-portraits family (E5, entry 13 of the research note)**: RG4 limits the parameter to the range where the iteration settles.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/recursion/` (below) with oracle tests; ADRs 1–3 accepted | Kernel tests pass; no learner-visible route needed |
| A | RG1 Rule and closed form; RG3 Compound interest and \(e\) | Batch 0 done; sequence/interest graph passes the batch gate |
| B | RG2 Cobweb: the slope decides; RG4 Growth with a limit | Batch A released; cobweb graph with playback passes the gate (needs Controls step 5 for the stepper) |
| C | RG5 Exponential data on a logarithmic scale | Batch A released; ADR 3 accepted |

Publish batches separately. Do not expose unimplemented Demonstrations.

### Reuse and new modules

Verified by search in `src/` (searched `cobweb`, `iterationController`, `compound`, `obrest`, `logistic`):

- `src/analysis/fixedPoint.ts`: `FixedPointStep` (197; `index`, `from`, `to`, drawn as \((from,from)\to(from,to)\to(to,to)\)), `fixedPointHistory` (240), `FIXED_POINT_MAX_STEPS = 60` (16). Its example table is closed (`affine`, `cosine`, `reflection`), so it cannot take a new map; it is reused as the precedent for the step shape and the 60-step limit, not modified.
- `src/analysis/fixedPointModel.ts` (`FixedPointModel`, `fixedPointTransition`, line 150): the model pattern (stored `step`, playback not stored, history recomputed) is copied.
- `src/learning/runtime/iterationController.ts:34` (`IterationController`) and `src/graphs/base/controls/PlaybackButtons` drive playback in `src/graphs/functions/FixedPointGraph.tsx` through `TracePlayback` (`src/graphs/base/tracePlayback.ts`); the new cobweb graph uses the same path. Playback waits on Controls step 5.
- Legend and strings: `fixed_point_legend_cobweb` (`src/localization/sl.ts:1556`, *Pajkova mreža*) is reused.
- No sequence-recursion, compound-interest or logistic code exists (searches above).

New modules (names suggested): `src/recursion/iteration.ts` (iterate a map from \(x_0\), steps in the `FixedPointStep` shape), `src/recursion/affine.ts` (exact classification and fixed point of \(x\mapsto mx+c\)), `src/recursion/logistic.ts` (map and classification for \(r\le 2{,}9\)), `src/recursion/interest.ts` (simple, compound, relative and conformal rates, \((1+1/n)^n\)), `src/recursion/recursionModel.ts` (state parse/validation), graphs `src/graphs/recursion/RecursionCobwebGraph.tsx` (RG2, RG4) and `src/graphs/recursion/GrowthGraph.tsx` (RG1, RG3, RG5). Pure maths stays free of React, JSXGraph, localization and graph-global state.

### Decisions needing an ADR

1. **Cobweb graph: extend or add.** (a) New `RecursionCobwebGraph` with its own kernel, reusing `IterationController` and the step shape; (b) extend `FixedPointGraph` with more maps; (c) generalise `fixedPointHistory` to accept any map. (b) and (c) change the existing graph, Presets and the `fixed-point-*` lessons. Proposal: (a); the fixed-point route is untouched. Before Batch B.
2. **Parameter grid and exactness.** (a) Slope \(m=M/20\) with integer \(M\in[-60,60]\), intercept \(c=C/10\) with integer \(C\), start \(x_0\) on the \(1/100\) grid, logistic \(r=R/10\) with integer \(R\in[5,29]\); classification uses the integers; (b) continuous parameters with a tolerance; (c) rational arithmetic throughout. Proposal: (a); iterates are doubles labelled computed. Before Batch A.
3. **Log scale.** (a) Plot \(\ln y\) (or \(\log_{10}y\)) against \(n\) on an ordinary axis with the straight line, labelled as the logarithm; (b) a true logarithmic axis with ticks \(1,10,100,\ldots\) in the board; (c) both. A log axis is a new rendering feature and would need measuring. Proposal: (a) now, (b) only after a separate decision. Before Batch C.

## Recursion kernel (owned by this spec)

1. **Iteration.** `iterate(map, x0, n)` returns the points and steps \(\{index, from, to\}\), \(n\le 60\). Doubles, labelled computed. The step shape equals `FixedPointStep` so the drawing code is shared in spirit, not by import.
2. **Affine classification** (exact, integers). For \(m=M/20\), \(c=C/10\): if \(M\ne20\) the fixed point is \(x^*=2C/(20-M)\) (exact rational); \(\lvert M\rvert<20\) attracting, \(\lvert M\rvert>20\) repelling (every start but \(x^*\) itself diverges), \(M=-20\) a 2-cycle (every start but \(x^*\)), \(M=20\) either all points fixed (\(C=0\)) or none (an arithmetic sequence with difference \(c\)); the sign of \(M\) gives staircase (\(M>0\)) or spiral (\(M<0\)), and \(M=0\) is degenerate: the first step lands on \(x^*\), neither staircase nor spiral. This classification is exact for affine maps only.
3. **Logistic** \(f(x)=rx(1-x)\), \(r=R/10\), starts \(x_0\in(0,1)\) only (outside \([0,1]\) the orbit diverges to \(-\infty\), and \(x_0\in\{0,1\}\) lands on \(0\)): for \(R\le10\) the orbit tends to \(0\) (attracting for \(R<10\); at \(R=10\) the slope is \(1\), so the slope does not decide it, and the orbit still converges, slowly); for \(11\le R\le29\) the fixed point \(x^*=1-1/r\) with \(f'(x^*)=2-r\), attracting because \(\lvert 2-r\rvert<1\). \(R\ge30\) is rejected (E5).
4. **Interest.** `simple(P,p,t)`, `compound(P,p,t)`, `relative(P,p,m,t)=P(1+p/m)^{mt}`, `conformalRate(p,m)=(1+p)^{1/m}-1`, `eApprox(n)=(1+1/n)^n` for integer \(n\le10^6\) (doubles; above about \(10^{15}\) the double result is wrong: \((1+10^{-15})^{10^{15}}\) gives \(3{,}035\), checked, so the input range is capped).
5. **Sequences.** `arithmetic(a1,d,n)`, `geometric(a1,q,n)`, `partialSum`, as exact BigInt/rational for integer \(a_1,d,q\) and doubles otherwise.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number was computed by the author with `node` scripts (listed with outputs in the families-prep note `docs/reviews/feature-streams/families-prep/notes/spec-combinatorics-recursion.md`); none is guessed.

### RG1. A rule applied again and again: arithmetic and geometric sequences

- Learning goal: \(a_{n+1}=a_n+d\) (linear steps) and \(a_{n+1}=q\,a_n\) (multiplicative steps) are recursive rules; each has a closed form and a sum; the picture of terms against \(n\) is a line or a curve.
- Prerequisites: sequence definition (`sequence-definition`). Follow-ups: `series-limit`, `exponential-doubling`.
- Default example (*checked*): \(a_1=3\), \(d=2\): \(a_{10}=21\), \(S_{10}=120=10(3+21)/2\). \(a_1=3\), \(q=2\): terms \(3,6,12,24,48,96\), \(a_{10}=1536\), \(S_{10}=3069=3(2^{10}-1)\). \(a_1=3\), \(q=\tfrac12\): \(S_{10}=5{,}994140625\), limit \(6\).
- Steps: (1) the first terms of \(a_{n+1}=a_n+2\); predict \(a_{10}\); (2) the closed form; (3) the same for \(a_{n+1}=2a_n\); predict whether \(a_{10}\) is larger or smaller than \(21\); (4) bar chart of both; (5) the sums; (6) \(q=\tfrac12\): terms shrink, sums approach \(6\) (link to `series-limit`); (7) free exploration.
- Graph needs: terms as bars or points, numeric fields \(a_1,d,q,n\) (\(n\le 30\)), mode switch, readouts of \(a_n\), \(S_n\), text status.
- Acceptance:
  1. The numbers above match the kernel; recursion and closed form agree exactly for integer inputs, \(n\le 30\) (BigInt), and within \(10^{-12}\) relative for decimals.
  2. The limit \(6\) is stated as the value of the closed form \(a_1/(1-q)\) for \(\lvert q\rvert<1\), not as an iterate.
  3. Argument or illustration: closed form and sum formulas are stated as results with a short derivation (**argument**); bars are an **illustration**.
  4. Reset, Preset, restore, both languages pass.

### RG2. The cobweb: the slope decides

- Learning goal: for \(x_{n+1}=mx_n+c\) the cobweb converges for \(\lvert m\rvert<1\) (staircase if \(m>0\), spiral if \(m<0\)) and diverges for \(\lvert m\rvert>1\); the fixed point is where the line meets \(y=x\); for a curve the slope at the fixed point plays the role of \(m\) locally: \(\lvert f'(x^*)\rvert<1\) attracts nearby starts, \(\lvert f'(x^*)\rvert>1\) repels, and \(\lvert f'(x^*)\rvert=1\) is undecided by the slope.
- Prerequisites: RG1. Follow-up: `fixed-point-cosine-step` (error bounds).
- Default example (*checked*), \(x_0\) and iterates: \(m=0.5\), \(c=1\), \(x_0=0\): \(0,1,1{,}5,1{,}75,1{,}875\to2\) (11 steps to be within \(10^{-3}\)). \(m=-0{,}8\), \(c=9\), \(x_0=1\): \(1;\,8{,}2;\,2{,}44;\,7{,}048;\,3{,}3616\to5\) (spiral, 38 steps to \(10^{-3}\)). \(m=-1{,}2\), \(c=11\), \(x_0=5{,}1\): \(5{,}1;\,4{,}88;\,5{,}144;\,4{,}8272\) (spiral out from \(5\)). \(m=1{,}5\), \(c=-1\), \(x_0=2{,}1\): \(2{,}1;\,2{,}15;\,2{,}225\) (away from \(2\)). \(m=-1\), \(c=6\), \(x_0=1\): \(1,5,1,5\) (2-cycle). For \(\cos\) from \(x_0=0\) the fixed point is \(0{,}7390851\) and the slope there is \(-\sin x^*=-0{,}6736\) (spiral, the same iterates as the existing lesson: \(x_8=0{,}722102\)).
- Steps: (1) the line and the diagonal; predict the cobweb for \(m=0.5\); (2) play it; (3) \(m=-0{,}8\): predict the shape; (4) \(m=-1{,}2\); (5) \(m=1\), \(m=-1\): borderline; (6) the curve \(\cos x\): zoom on the slope at \(x^*\); (7) free exploration.
- Graph needs: curve and diagonal, cobweb steps (shared drawing idea with `fixed_point_legend_cobweb`), sliders or fields for \(m,c,x_0\), the map choice (affine, cosine), playback and a step counter (Controls step 5), a text status ("spirala navznoter").
- Acceptance:
  1. The numbers above match the kernel to the displayed precision; the classification is by the integers \(M,C\) (ADR 2), so \(m=-1\) is exactly "2-cycle", never "slowly converging".
  2. The drawn steps are exactly the `{from,to}` list of the iteration; the fixed point drawn is \(x^*=2C/(20-M)\) converted once to a double.
  3. For \(\cos\) the slope \(-\sin x^*\) is labelled computed; the claim "spirals in" rests on \(\lvert f'(x^*)\rvert<1\) shown numerically and is called a local statement, not the global theorem (that is the fixed-point lesson).
  4. Argument or illustration: for affine maps the error ratio \(m\) per step is an **argument** (\(x_{n+1}-x^*=m(x_n-x^*)\)); the \(\cos\) cobweb is an **illustration**.
  5. Playback does not store state; Reset, Preset, restore, both languages pass.

### RG3. Compound interest and the number \(e\)

- Learning goal: simple interest grows linearly, compound interest geometrically; splitting the year into \(m\) parts with the relative rate approaches \(e^{p}\); \(e\) is the limit of \((1+1/n)^n\); the conformal rate gives the same yearly growth.
- Prerequisites: RG1. Follow-ups: `exponential-doubling`, `inverse-logarithm`.
- Default example (*checked*): \(1000\) at \(5\,\%\) for \(10\) years: simple \(1500\), compound \(1628{,}89\), monthly relative \(0{,}05/12\) per month \(1647{,}01\), continuous \(1648{,}72\). The conformal monthly rate is \(1{,}05^{1/12}-1=0{,}407412\,\%\), and \(120\) months of it give \(1628{,}89\) again. \((1+1/n)^n\) for \(n=1,10,100,1000,10^6\): \(2;\,2{,}593742;\,2{,}704814;\,2{,}716924;\,2{,}718280\) against \(e=2{,}718282\). Doubling time at \(5\,\%\): \(14{,}2067\) years (\(1{,}05^{14}=1{,}9799\), \(1{,}05^{15}=2{,}0789\)), the rule of \(72\) gives \(14{,}4\).
- Steps: (1) predict the value after 10 years for simple and compound; (2) both curves; (3) the same rate split into months (relative) grows a little more; (4) the conformal rate gives exactly the yearly factor; (5) \(m\to\infty\) and the table of \((1+1/n)^n\); (6) doubling time; (7) free exploration.
- Graph needs: capital, rate (grid \(0{,}5\,\%\)), years (\(\le 40\)), parts per year \(m\in\{1,2,4,12,365\}\), curves and a table, text status. Annuities and amortization (named in PIK §4.12) are out of scope.
- Acceptance:
  1. The numbers above match the kernel; compound equals \(P\cdot(1+p)^t\) and the conformal run reproduces it within \(10^{-9}\) relative.
  2. \(e\) is introduced as the limit; the table is computed and labelled; \(n>10^6\) is not offered (double loss; checked at \(n=10^{15}\)).
  3. Argument or illustration: the equality of conformal and yearly growth is an **argument** (a product of factors); the \(e\) table is an **illustration** of a limit.
  4. Reset, Preset, restore, both languages pass.

### RG4. Growth with a limit: the cobweb of the logistic rule

- Learning goal: growth that slows near a capacity, \(x_{n+1}=rx_n(1-x_n)\), settles at \(1-1/r\) for \(1<r<3\); the cobweb shows why; the slope at the fixed point is \(2-r\).
- Prerequisites: RG2. Follow-up: the phase-portraits family (E5), which covers \(r\ge 3\).
- Default example (*checked*), \(x_0=0{,}1\): \(r=1{,}5\): \(0{,}1;\,0{,}135;\,0{,}17516;\,0{,}21672;\,0{,}25463\to1/3\) (slope \(0{,}5\)). \(r=2{,}5\): \(0{,}1;\,0{,}225;\,0{,}43594;\,0{,}61474;\,0{,}59209\to0{,}6\) (slope \(-0{,}5\)). \(r=2{,}9\): \(0{,}1;\,0{,}261;\,0{,}55935;\,0{,}71479;\,0{,}59122\to0{,}655172\) (slope \(-0{,}9\); after 200 steps \(0{,}6551724137\)).
- Steps: (1) the rule and the parabola; predict where growth stops; (2) \(r=1{,}5\) staircase; (3) \(r=2{,}5\) spiral; (4) \(r=2{,}9\) a slow spiral; (5) \(r<1\): decay to \(0\); (6) the slope \(2-r\) and the rule \(\lvert 2-r\rvert<1\); (7) free exploration with \(r\le 2{,}9\) and a note that larger \(r\) behaves differently, treated elsewhere.
- Graph needs: as RG2 with the logistic map and \(R\in[5,29]\), playback and step counter (Controls step 5).
- Acceptance:
  1. The numbers above match; classification by integers (ADR 2): \(R\le9\) extinction, \(R=10\) slope \(1\) (converges slowly to \(0\), not decided by the slope), \(11\le R\le29\) attracting to \(1-1/r\).
  2. The fixed point and slope are computed from \(R\) once; no claim of convergence is made for \(R\ge30\) (rejected).
  3. Argument or illustration: the local criterion \(\lvert f'\rvert<1\) is an **illustration** (linearisation stated, not proved; it is an argument only for the affine case of RG2); the cobweb is an **illustration**.
  4. Playback does not store state; Reset, Preset, restore, both languages pass.

### RG5. Exponential data on a logarithmic scale

- Learning goal: if \(y_n=y_0q^n\) then \(\ln y_n=\ln y_0+n\ln q\) is a straight line with slope \(\ln q\); reading a growth factor from the slope; polynomial growth is not a line.
- Prerequisites: RG1, RG3; `inverse-logarithm`.
- Default example (*checked*): \(y_n=1000\cdot1{,}05^n\): \(\ln 1{,}05=0{,}0487902\); \(\log_{10}1{,}05=0{,}0211893\); \(\log_{10}y_{10}=3{,}211893\) (\(y_{10}=1628{,}89\)).
- Steps: (1) the exponential data on an ordinary axis; (2) predict the picture when each value is replaced by its logarithm; (3) the straight line; (4) the slope is \(\ln q\); read \(q\); (5) compare \(y=n^2\) (curved on the same axis); (6) free exploration.
- Graph needs: ordinary and logarithm panels, fields for \(y_0\), \(q\) and the model (exponential, power), text status.
- Acceptance:
  1. The numbers above match; slope of the fitted line through exact points equals \(\ln q\) (not a fit, an exact difference quotient).
  2. The panel is labelled "logaritem \(y\)" (ADR 3: not a true log axis).
  3. Argument or illustration: the line follows from \(\ln(y_0q^n)\) (**argument**); the power model is an **illustration** of a contrast.
  4. Reset, Preset, restore, both languages pass.

## User Stories

1. As a student, I change the slope and see the cobweb spiral in or out.
2. As a student, I see that compound interest differs from simple and where \(e\) comes from.
3. As an educator, I project the three cobwebs side by side and ask which slope gives which shape.
4. As a student, I recognise exponential growth as a straight line after taking logarithms.
5. As a reader on a phone or keyboard, I enter \(m\), \(c\), \(x_0\) numerically and step through the lesson with text statuses.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Searched `src/localization/sl.ts`: the app already has *iteracija*, *negibna točka*, *Pajkova mreža* (line 1556) and *Geometrijska vrsta* (line 1087). The PIK text supplies the sequence terms.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| sequence; term | zaporedje; člen zaporedja | PIK §4.12 |
| recursive formula | rekurzivna formula | PIK §4.12 objective |
| arithmetic, geometric sequence | aritmetično, geometrijsko zaporedje | PIK §4.12 |
| cobweb diagram | pajkova mreža | existing `sl.ts:1556` |
| fixed point | negibna točka | existing table |
| simple, compound interest | navadno, obrestno obrestovanje | PIK §4.12 objective |
| relative, conformal rate | relativna, konformna obrestna mera | PIK §4.12 objective (full wording cut in the extraction) |
| doubling time | čas podvojitve | proposal; no source opened |
| Euler's number | Eulerjevo število \(e\) | standard; check against the existing exponential lessons |

## Implementation Decisions

- The kernel is new pure TypeScript (`src/recursion/`); graphs adapt it. No graph-global cache state. `FixedPointGraph`, `fixedPoint.ts` and the `fixed-point-*` lessons are not changed.
- Graph state: map and parameters as integers per ADR 2, \(x_0\) on the \(1/100\) grid, `step` (stored), playback not stored (a reopened Preset is paused), derived values recomputed from validated state.
- Lesson scenes use typed actions (`set-map`, `set-params`, `set-start`, `set-step`, `set-interest`) registered through the lesson-action registry as in the [linear-maps spec](linear-maps-lessons.md#reuse-and-new-modules); multi-action scenes run synchronously in one tick and are unit tested that way.
- Routes and Presets are additive. No breaking change.
- **Gating** (boundary in [families-prep](../tasks/feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)). Ungated now: this spec, F0 plan and ADR drafts, F1 kernel (`src/recursion/` pure files and oracle tests), F2a `GrowthGraph` (RG1, RG3, RG5; no playback) as a new graph class with no route. **Waits on Controls step 5:** F2a `RecursionCobwebGraph` (RG2, RG4) because it has playback and a step counter. Waits on Controls step 7: F2b registration and routes, F3 lessons, F4 chapter, F5 media. The spec plans no edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime or existing panels; if a shared control is needed it is a dependency on the Controls stream.
- Lesson text is one-shot ([rule](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)); prose follows `lessonMathNotation.test.ts`.

## Testing Decisions

- Kernel oracles: `iterate` against a direct loop and, for affine maps, against the closed form \(x^*+m^n(x_0-x^*)\); fixed points against exact rationals \(2C/(20-M)\); classification over the whole grid of \(M\in[-60,60]\), \(C\in[-100,100]\); logistic classification against the numeric derivative at \(1-1/r\); interest against closed forms and the conformal round trip; the existing \(\cos\) iterates (\(x_8=0{,}722102\)) against `fixedPointHistory` as a cross-check (test only).
- Exact-decision tests: \(\lvert M\rvert\) versus \(20\), \(R\) bounds, rejection of \(R\ge30\), \(n>10^6\) and out-of-range fields.
- Scene, Preset (save/reopen, export/import, malformed, out-of-range, paused after reopen), lesson/content (step counts, lockstep languages, `lessonMathNotation.test.ts`, `tsc --noEmit`) tests as in the other families.
- Browser: smoke row per lesson (default scene, drag \(x_0\), numeric entry, playback, 2-cycle and extinction cases, restore, catalog link, narrow viewport, keyboard).
- Performance: at most 60 steps (about 120 segments) per redraw; measure per [the performance plan](../performance-plan.md).

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contracts are met with checked examples and honest guarantees (integer classification, computed doubles labelled as such).
3. Both languages, accessible numeric inputs for every handle, restore on exit, Presets and figure export pass; check legibility in Presentation mode.
4. Existing routes, Presets and the `sequence-*`, `series-*`, `exponential-*`, `inverse-logarithm` and `fixed-point-*` lessons behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- Iterates are doubles; "converges", "2-cycle" and "diverges" are decided from the integer parameters, never from iterate values.
- A limit is a statement about the closed form or the fixed point, not about the last drawn iterate.
- For \(M=-20\) iterates may drift by rounding for other starts; the label comes from \(M\).
- Local statements (slope at the fixed point) are labelled local; no global convergence claim for curves.
- Pictures illustrate instances; every "always" statement is a theorem or an explicit argument.

## Out of Scope

- Logistic chaos, period doubling, bifurcation diagrams (phase-portraits family E5).
- Annuities and amortization plans (PIK §4.12 names them), series convergence tests, the contraction theorem (existing).
- Differential equations, continuous compounding as an ODE.
- Exercises, grading, progress, free-text input, a formula parser; a true logarithmic axis (ADR 3).

## Further Notes

Not verified: VR level markers; the Slovenian terms beyond the PIK text and the existing catalog (no FMF or textbook source opened); the PIK page numbers (from the table of contents); the full wording of the conformal/relative objective; whether the \(M/20\) slope grid feels smooth; the parameter ranges in RG4. The combinatorics spec ([combinatorics-lessons.md](combinatorics-lessons.md)) was written in parallel.
