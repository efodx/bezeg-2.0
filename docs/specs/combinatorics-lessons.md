# Combinatorics and Pascal's triangle (Kombinatorika in Pascalov trikotnik)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/combinatorics](../tasks/combinatorics/README.md). Decisions 1–3: [ADR 0048](../adr/0048-combinatorics-bigint-counts-and-two-graphs.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #3 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md)); details below are proposals for owner review.
**Source:** the research note's entry 3 (opening lesson, lesson list, risks) and the matura catalogue M-MAT-2026, text extraction read for this spec: §4.15 *Kombinatorika* (table of contents page 22; extraction lines 1073–1086: *Osnovni izrek kombinatorike, kombinatorično drevo, Pravilo vsote, Permutacije, Permutacije s ponavljanjem, Variacije, Variacije s ponavljanjem, Kombinacije, Binomski izrek, Pascalov trikotnik*; objectives "izračuna \(n!\)", "loči posamezne kombinatorične pojme", "izračuna vrednost binomskega simbola", "razvije potenco dvočlenika"). The page comes from the table of contents, not from a page footer. Level markers (VR) were not verified. Textbooks and FMF pages are not opened. Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

Bezeg draws the binomial distribution (`binomial-explore`, route `/probability/binomial`) and the Bernstein basis (route `/bernstein`) and uses \(\binom nk\) in both, but nothing shows where the number comes from. A learner cannot see that \(\binom nk\) counts routes on a grid, why each Pascal entry is the sum of the two above it, or why \((a+b)^n\) has these coefficients. The matura topic (§4.15) is mostly counting vocabulary (permutations, variations, combinations) that students confuse. Counting is best learned by choosing a path and watching the count change.

## Solution

Add a Learn chapter **Kombinatorika in Pascalov trikotnik / Combinatorics and Pascal's triangle** with five guided activities, each backed by a Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary. Each lesson is 5–7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress. Each picture is labelled an **argument** (its construction establishes the claim) or an **illustration**.

**Cross-links, not repeats.** The Bernstein lessons (`bernstein-definition`, `bernstein-partition-of-unity`, step `bernstein-basis-functions`, `src/learning/content/foundationGuidedLessons.ts:39–182`, graph `BernsteinGraph`, route `/bernstein`) use the binomial theorem for the partition of unity (line 66); CB5 links to them and does not re-teach them. The binomial distribution (`binomial-bars`, `binomial-shade`, `binomial-correction`, `binomial-growing-n`, `binomial-poisson`, `binomial-explore`, `src/learning/content/probabilityGuidedLessons.ts:245–325`) is the follow-up of CB5; probability itself is not taught here.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/combinatorics/` (below) with oracle tests; ADRs 1–3 accepted | Kernel tests pass; no learner-visible route needed |
| A | CB1 Lattice paths and Pascal's triangle; CB2 Product rule, tree, permutations, variations, combinations | Batch 0 done; lattice graph passes the batch gate |
| B | CB3 Pascal's identity from the last step; CB4 Binomial theorem by paths | Batch A released; triangle and expansion views pass the gate |
| C | CB5 Row sums, alternating sums and the bridge to Bernstein and the binomial distribution | Batch B released |

Publish batches separately. Do not expose unimplemented Demonstrations.

### Reuse and new modules

Verified by search in `src/` (searched `pascal`, `binomialCoefficient`, `factorial`, `choose(`, `BigInt`; none of the first four exist):

- `src/analysis/distributions.ts`: `logFactorial` (108), `binomialPmf` (130), `binomialMasses` (137) are double-based and stay the source of the distribution graph; the new kernel does not replace them, it is the exact oracle for them (test only).
- Graph infrastructure: new graphs follow the pattern registered in `src/graphs/graphFactories.ts` (for example `'fixed-point'`, line 208) and the demonstration table `src/demonstrations.ts` (Bernstein line 38, binomial line 123). `GRID_COORD_LIMIT` in `src/compgeo/grid.ts` is unrelated and not used.
- `BigInt` is already used in `src/analysis/complexMobius.ts`, so the build target supports it.

New modules (names suggested): `src/combinatorics/binomial.ts` (BigInt factorial, binomial, falling factorial, multinomial), `src/combinatorics/latticePaths.ts` (counts, enumeration, path from a bit mask), `src/combinatorics/pascal.ts` (rows, identity checks, hockey stick), `src/combinatorics/expansion.ts` (coefficients of \((a+b)^n\) and of \((x+c)^n\) as exact BigInt), `src/combinatorics/combinatoricsModel.ts` (state parse/validation), graphs `src/graphs/combinatorics/LatticePathGraph.tsx` (CB1, CB3, CB4) and `src/graphs/combinatorics/CountingTreeGraph.tsx` (CB2, CB5 table). Pure maths stays free of React, JSXGraph, localization and graph-global state.

### Decisions needing an ADR

1. **Number type.** (a) BigInt for every count, with display of the exact digits; (b) doubles, with a warning above \(2^{53}\); (c) BigInt only above a threshold. Doubles represent every integer exactly only up to \(2^{53}\), so a double Pascal recurrence stops being trustworthy there (checked: the largest central entry below \(2^{53}\) is in row \(56\), and the first inexact entry of the recurrence is in row \(57\); \(\binom{60}{30}=118264581564861424\) is held exactly by the double, but its shortest decimal prints as \(118264581564861420\); corrected at F1). Proposal: (a), numbers stored as decimal strings in Presets. Before Batch 0 code.
2. **Enumeration cap.** (a) Draw all paths while \(a+b\le 12\) (at most \(\binom{12}{6}=924\) paths) and show only the count above it; (b) cap by path count \(\le 3432\) (\(n=14\)); (c) never enumerate, sample. Proposal: (a), as a constant in the kernel, with the cap shown to the learner ("prikažemo vse poti do 12 korakov"). Before Batch A.
3. **Graph shape.** (a) Two graphs (lattice with triangle view; counting tree and table); (b) one graph with modes; (c) extend `BernsteinGraph` or the binomial graph. (c) changes existing routes and Presets; (b) mixes unrelated states. Proposal: (a); family placement of the routes decided in the same ADR. Before Batch A.

## Combinatorics kernel (owned by this spec)

1. **Counts.** `factorial(n)`, `binomial(n,k)`, `variations(n,k)`, `variationsWithRepetition(n,k)=n^k`, `permutationsWithRepetition(counts)` (multinomial). All BigInt, exact. Inputs are integers in the stated ranges (`n` up to \(200\) for display; rejected otherwise). `binomial(n,k)` is computed by the multiplicative product with exact division, not by division of two factorials.
2. **Lattice paths.** A path to \((a,b)\) is an \((a+b)\)-bit mask with \(a\) right steps (R) and \(b\) up steps (U); `pathCount(a,b)=binomial(a+b,a)`. `enumeratePaths(a,b)` returns the list in lexicographic order and throws above the cap. `pathThrough(a,b,p,q)` counts paths through a point as a product.
3. **Pascal rows.** `pascalRow(n)` by the addition rule from the previous row (BigInt), independent of `binomial`; the tests compare the two.
4. **Expansion.** `expandBinomial(n)` gives the coefficients; `expandShifted(n,c)` gives \(\binom nk c^{k}\) as BigInt for integer \(c\) (\(\lvert c\rvert\le 9\)).
5. **Readouts.** Counts are shown as exact digits with thousands separators only in display (Slovenian space, English comma), never in stored state.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number was computed by the author with `node` scripts (listed with outputs in the families-prep note `docs/reviews/feature-streams/families-prep/notes/spec-combinatorics-recursion.md`); none is guessed.

### CB1. Lattice paths and Pascal's triangle

- Learning goal: the number of monotone routes (right and up) from \((0,0)\) to a dragged grid point is \(\binom{a+b}{a}\); writing the counts on the grid fills in Pascal's triangle along the diagonals.
- Prerequisites: none. Follow-up: CB3.
- Default example (*checked*): to \((5,3)\) there are \(\binom 83=56\) routes (enumerated by DFS: also \(56\)); to \((6,6)\) there are \(924\); to \((10,10)\) there are \(184\,756\); to \((20,20)\) there are \(137\,846\,528\,820\) (counts only, since \(a+b>12\)).
- Steps: (1) one route from \((0,0)\) to \((2,2)\); predict how many there are; (2) list all \(6\); (3) drag the target and watch the count; (4) every grid point shows its count and the triangle appears along the diagonals; (5) a route is a choice of which \(a\) of the \(a+b\) steps are R (so \(\binom{a+b}{a}\)); (6) above the cap only the count is shown; (7) free exploration.
- Graph needs: a grid with a draggable target, route list (paged), count labels per point, a toggle for the triangle layout, keyboard moves of the target by one cell, numeric fields for \(a\) and \(b\), a text status ("56 poti").
- Acceptance:
  1. The numbers above match, from BigInt `pathCount`; for all \(a+b\le 12\) the enumerated list has exactly `pathCount` distinct elements (unit test).
  2. Count labels are the sum of the labels left of and below the point (cell-by-cell), computed by addition, not by the closed formula; the tests compare both (oracle).
  3. Above the cap the graph says so and draws no routes; no silent truncation.
  4. Argument or illustration: step (5) is an **argument** (a bijection between routes and choices of positions); the filled grid is an **illustration** of the addition rule, proved in CB3.
  5. Reset, Preset, restore, both languages pass.

### CB2. Product rule, tree, permutations, variations and combinations

- Learning goal: choices multiply (counting tree); permutations, variations and combinations differ in whether order matters and whether repetition is allowed; \(\binom nk=V_n^k/k!\).
- Prerequisites: CB1 (optional).
- Default example (*checked*): arranging \(5\) different books: \(5!=120\). Choosing and ordering \(3\) of \(6\): \(V_6^3=120\); with repetition \(6^3=216\); unordered \(\binom 63=20\), and \(120/3!=20\). Letters of MISSISSIPPI: \(\frac{11!}{4!\,4!\,2!}=34\,650\).
- Steps: (1) a tree of choices; predict how many leaves; (2) the product rule; (3) order matters: permutations as the full tree; (4) pick \(k\) of \(n\): variations with and without repetition; (5) forget the order: group the \(k!\) orderings into one combination; (6) permutations with repetition; (7) free exploration with a small decision table ("ali vrstni red šteje?").
- Graph needs: a tree view only while it has at most \(64\) leaves (permutations \(n\le4\): \(24\); variations \(V_5^3=60\); with repetition \(4^3=64\)); the default example \(V_6^3\) and other larger inputs use a table of formulas and values for larger inputs, mode switch (order, repetition), steppers or numeric fields, text status.
- Acceptance:
  1. The numbers above match the kernel; for all \(n,k\le 7\) the number of leaves equals the formula (enumeration oracle in tests).
  2. The grouping step shows exactly \(k!\) orderings per combination for the small example.
  3. Argument or illustration: the tree is an **argument** for the product rule on the small example; the table is an **illustration**.
  4. Reset, Preset, restore, both languages pass.

### CB3. Pascal's identity from the last step of a path

- Learning goal: \(\binom nk=\binom{n-1}{k-1}+\binom{n-1}{k}\), because the last step is R or U.
- Prerequisites: CB1. Follow-up: CB4.
- Default example (*checked*): \(\binom 73=35=\binom 62+\binom 63=15+20\); \(\binom 52=10=\binom 41+\binom 42=4+6\).
- Steps: (1) the target \((4,3)\); predict whether the count is the sum of two neighbouring counts; (2) split the routes by their last step; (3) the two sets are the routes to the two neighbours; (4) the triangle row by row, each entry the sum of the two above; (5) a symmetric entry and the symmetry \(\binom nk=\binom n{n-k}\); (6) free exploration (click an entry to highlight its two parents).
- Graph needs: as CB1 with a split view of the routes and a triangle view with highlight, keyboard navigation of entries.
- Acceptance:
  1. The numbers above match; for all \(n\le 200\) (as in Testing Decisions), `pascalRow` equals `binomial` for every entry (BigInt, exact).
  2. The split colours the routes by last step from the same enumerated list; counts of each colour equal the parents' counts.
  3. Argument or illustration: the split is an **argument** (partition of the route set); the triangle is an **illustration** of what the identity gives.
  4. Reset, Preset, restore, both languages pass.

### CB4. The binomial theorem by paths

- Learning goal: expanding \((a+b)^n\) means choosing a or b from each factor, so the coefficient of \(a^{n-k}b^k\) counts such choices, \(\binom nk\).
- Prerequisites: CB1, CB3.
- Default example (*checked*): \((a+b)^4\) has coefficients \(1,4,6,4,1\). \((x+2)^5\) has coefficients \(1,10,40,80,80,32\) (for \(x^5,\ldots,x^0\)); the coefficient of \(x^3\) is \(\binom 52\cdot 2^2=40\); at \(x=1\) the sum is \(243=3^5\).
- Steps: (1) expand \((a+b)^2\) by hand; (2) each term is a string of a's and b's of length \(n\), a route; (3) collect equal terms: the count is a Pascal entry; (4) \((a+b)^4\) with all 16 strings; (5) \((x+2)^5\): the weight \(2^k\); (6) read a coefficient (the \(x^3\) term); (7) free exploration with \(n\le 12\), \(c\in[-9,9]\).
- Graph needs: strings table (all \(2^n\) for \(n\le 5\)), coefficient bars, numeric fields \(n\) and \(c\), text status.
- Acceptance:
  1. The numbers above match `expandShifted`; polynomial multiplication of \(n\) copies of \((x+c)\) (independent oracle) agrees for \(n\le 30\), \(\lvert c\rvert\le 9\).
  2. The strings table groups strings by number of b's; group sizes equal the coefficients.
  3. Argument or illustration: the string grouping is an **argument** only together with the generic step it shows ("each factor contributes \(a\) or \(b\), so a term with \(k\) letters \(b\) is a choice of \(k\) of the \(n\) factors"); the table for one \(n\) is an instance and, like larger \(n\) from the kernel, an **illustration**.
  4. Reset, Preset, restore, both languages pass.

### CB5. Row sums, alternating sums and the bridge to Bernstein and the binomial distribution

- Learning goal: row \(n\) sums to \(2^n\) (all subsets, or \(a=b=1\)), alternates to \(0\) (for \(n\ge1\)), the hockey stick sums a diagonal, and \(\binom nk t^k(1-t)^{n-k}\) is both the Bernstein basis function and the binomial probability.
- Prerequisites: CB3, CB4; Bernstein lessons and `binomial-explore` as links.
- Default example (*checked*): row \(10\): \(1,10,45,120,210,252,210,120,45,10,1\), sum \(1024=2^{10}\), alternating sum \(0\). Hockey stick: \(1+4+10+20+35=70=\binom 84\). \(n=5\), \(k=2\), \(t=\tfrac12\): \(10/32=0{,}3125\). \(n=20\), \(k=10\), \(p=\tfrac12\): \(184\,756/2^{20}=0{,}176197\), which agrees with `binomialPmf(20, 0.5, 10)` to \(10^{-12}\) (checked against a log-factorial value \(0{,}1761970520019523\)).
- Steps: (1) predict the row sum; (2) \((1+1)^n\); (3) \((1-1)^n\); (4) the hockey stick; (5) the weights \(t^k(1-t)^{n-k}\) times \(\binom nk\), with a slider \(t\); (6) link to `bernstein-partition-of-unity` ("the sum is \((t+(1-t))^n=1\)") and `binomial-explore`; (7) free exploration.
- Graph needs: row selector, sums readout, a \(t\) slider with bars, text status; the bars use exact coefficients times doubles, labelled computed.
- Acceptance:
  1. The numbers above match; for \(n\le 60\) the exact row sum equals \(2^n\) and the alternating sum is \(0\) (BigInt, exact); the bars at the default \(t\) sum to \(1\) within \(10^{-15}\).
  2. The Bernstein values equal `binomialPmf` within \(10^{-12}\) for \(n\le 50\) (test only).
  3. Argument or illustration: the sums are **arguments** by the binomial theorem; the bars are an **illustration**. The prose says the links are to existing lessons, not new content.
  4. Reset, Preset, restore, both languages pass.

## User Stories

1. As a student, I drag a grid point and see how many routes lead to it, and the triangle appears.
2. As a student, I see that the Pascal identity is the last step of a route.
3. As a student, I tell permutations from combinations by watching a tree.
4. As an educator, I project the coefficients of \((x+2)^5\) next to the route picture.
5. As a reader on a phone or keyboard, I enter \(a\) and \(b\) numerically and step through the lesson with text statuses.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Searched `src/localization/sl.ts` and [the glossary](../localization.md): no *kombinacije*, *Pascalov trikotnik* or *binomski* in the table. The PIK text supplies all combinatorial terms.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| combinatorics | kombinatorika | PIK §4.15 |
| product rule (fundamental theorem of counting) | osnovni izrek kombinatorike | PIK §4.15 |
| counting tree | kombinatorično drevo | PIK §4.15 |
| sum rule | pravilo vsote | PIK §4.15 |
| permutation; with repetition | permutacija; permutacija s ponavljanjem | PIK §4.15 |
| variation; with repetition | variacija; variacija s ponavljanjem | PIK §4.15 |
| combination | kombinacija | PIK §4.15 |
| binomial coefficient (symbol) | binomski simbol | PIK §4.15 (objective) |
| binomial theorem | binomski izrek | PIK §4.15 |
| Pascal's triangle | Pascalov trikotnik | PIK §4.15 |
| lattice path | pot po mreži (route on a grid) | proposal; no source for *monotona pot*, so the plain wording is chosen |

## Implementation Decisions

- F2a decisions (handler, 2026-11-11):
  - The state ranges are lattice \(a,b\le20\), expansion \(n\le12\) and counting \(n,k\le20\). The spec said only "small integers". 20 keeps \(\binom{40}{20}\) exact in `BigInt` and the grid legible.
  - The Slovenian step letters are D (desno) and G (gor).
  - Where the task wording predates Controls step 5, the shared rules win:
    - the route list is paged with `CountSetter`;
    - a triangle entry is chosen through the numeric \(a,b\) fields, not by clicking;
    - examples are a select that shows `custom` only while no example matches;
    - the host Reset covers the scene.
  - CB2 acceptance 2 is met on the board, because a readout list alone does not show the grouping. For an unordered kind without repetition with \(2\le k\le4\), the board draws the first three combinations, each with its \(k!\) orderings, and a caption "× \(\binom nk\)". The full grouped tree would exceed the 64-leaf limit at the default \(n=6\), \(k=3\) (120 leaves).
  - Values the program changes are announced in the status: \(k\) lowered when \(n\) drops or a switch changes, and the route and page reset when the target moves. Typed values out of range are refused; only dragging snaps the target to the grid.
  - Weights are shown to 6 decimals, a nonzero weight below that shows as "< 0,000001", and the bar captions name their scale (the largest bar).
  - The only keyboard path to the lattice target is the \(a\), \(b\) fields; there is no focusable board handle.

- The kernel is new pure TypeScript (`src/combinatorics/`); graphs adapt it. No graph-global cache state.
- Graph state: `a`, `b` (CB1, CB3), `n`, `k`, mode (CB2), `n`, `c` (CB4), `n`, `t` on a \(1/100\) grid (CB5), all small integers validated against the stated ranges; derived counts are recomputed from validated state and never trusted from a Preset.
- Lesson scenes use typed actions (`set-target`, `set-counting-mode`, `set-expansion`, `set-row`) registered through the lesson-action registry as in the [linear-maps spec](linear-maps-lessons.md#reuse-and-new-modules); multi-action scenes run synchronously in one tick and are unit tested that way.
- **Handler decision, reversible:** no playback or step counter is used (paged lists and clicking replace them). The owner's boundary still lists this family's F2a among those waiting on Controls step 5 (steppers and paged controls are what step 5 sweeps), so the graphs are not built before it. A route-by-route animation would be a later addition after step 5.
- Routes and Presets are additive. No breaking change.
- **Gating** (boundary in [families-prep](../tasks/feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)). Ungated now: this spec, F0 plan and ADR drafts, F1 kernel (`src/combinatorics/` pure files and oracle tests). Waits on Controls step 5: F2a `LatticePathGraph` and `CountingTreeGraph` as new graph classes with no route. Waits on Controls step 7: F2b registration and routes, F3 lessons, F4 chapter, F5 media. The spec plans no edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime or existing panels; if a shared control is needed it is a dependency on the Controls stream.
- Lesson text is one-shot ([rule](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)); prose follows `lessonMathNotation.test.ts`.

## Testing Decisions

- Kernel oracles: `binomial` against the Pascal addition rule (`pascalRow`) for \(n\le 200\); `pathCount` against DFS enumeration for \(a+b\le 14\); variations and permutations against explicit enumeration for \(n\le 7\); `expandShifted` against repeated polynomial multiplication; the double `binomialPmf` against exact BigInt ratios for \(n\le 60\).
- Exact-decision tests: caps (enumeration refused above \(12\) steps), range rejection of inputs, no use of doubles in stored counts.
- Scene, Preset (save/reopen, export/import, malformed, out-of-range, number as string), lesson/content (step counts, lockstep languages, `lessonMathNotation.test.ts`, `tsc --noEmit`) tests as in the other families.
- Browser: smoke row per lesson (default scene, drag target, numeric entry, over-cap view, restore, catalog link, narrow viewport, keyboard).
- Performance: at most \(924\) drawn routes and \(\approx 80\) labels; measure per [the performance plan](../performance-plan.md) before choosing a drawing approach.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contracts are met with checked examples and exact BigInt counts.
3. Both languages, accessible numeric inputs for every handle, restore on exit, Presets and figure export pass; check legibility in Presentation mode.
4. Existing routes, Presets, Bernstein and binomial lessons behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- Counts are exact integers (BigInt); a double is never used for a count, only for probabilities and bar heights, labelled computed.
- A caught pitfall: a double Pascal recurrence loses exactness from row \(57\) on; the tests include \(\binom{60}{30}\).
- Edge cases: \(\binom n0=\binom nn=1\); \(k>n\) is rejected, not zero; \(0!=1\).
- The alternating sum is \(0\) only for \(n\ge1\); the prose says so.
- Pictures illustrate instances; every "always" statement is an argument or a theorem.

## Out of Scope

- Probability with replacement/without replacement, hypergeometric distribution, multinomial distribution (the multinomial is only a kernel helper).
- Generating functions, inclusion-exclusion, Catalan numbers and Dyck paths, Stirling numbers.
- Exercises, grading, progress, free-text input, a formula parser.
- Changing `BernsteinGraph`, the binomial graph or their lessons.

## Further Notes

Not verified: VR level markers; the Slovenian terms beyond the PIK text (no FMF or textbook source opened), in particular *pot po mreži*; the PIK page numbers (taken from the table of contents); whether \(t\) on a \(1/100\) grid is smooth enough. Logistic or sequence topics are in the [recursion spec](recursion-growth-lessons.md), written in parallel.
