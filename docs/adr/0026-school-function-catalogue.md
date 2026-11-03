# School function graphs: a separate domain-aware catalogue, a sibling series graph, and the Functions family

Accepted on 2026-10-31 (F0 of the [school function graphs spec](../specs/school-function-graphs-lessons.md), stream `functions`). The spec's three ADR decisions and one notation decision are recorded here.

## 1. A separate `SCHOOL_FUNCTION_CATALOG`

`src/analysis/schoolFunctions.ts` holds a discriminated union on `kind` (`power`, `exp`, `log`, `poly`, `rational`, `named`, transformed), as the spec describes. Each entry has a domain, partial `value`/`derivative` returning `undefined` outside it, and an `antiderivative` only where it is exact. `FUNCTION_CATALOG` (`square`, `sin`, `exp`) and its consumers (`DerivativeGraph`, `DefiniteIntegralGraph`, `AccumulationGraph`, their models, `functionPresetCollections.ts`, `learning/model.ts`) are unchanged.

Alternatives:

- Extend `FUNCTION_CATALOG` with optional antiderivatives and partial domains. Every consumer assumes total functions, so every consumer, selector and stored-Preset validator would change, for routes that do not need the new entries.
- Free-text formulas. These were rejected by ADR 0007 and are out of scope in the spec.

Graph code that uses the catalogue follows Platform A7's single-owner rules for validity, normalization and structured diagnosis. Kernels stay pure and return typed diagnoses that A7's owner can adopt.

## 2. S5 geometric series: a sibling `SeriesGraph`

A new model (`geometricSeries.ts`) and graph reuse `IterativeFunctionGraph` playback, so `SequenceGraph`'s epsilon–N model is not widened.

Alternative: series examples inside `SequenceGraph`. That avoids one graph class, but it mixes partial sums into a model whose fields (epsilon, limit, threshold) mean convergence of a sequence. Its stored Presets would need a new discriminator.

## 3. Family placement: Functions and calculus, with a chapter of its own

The six Demonstrations join the existing *Funkcije in analiza / Functions and calculus* family ([ADR 0007](0007-function-concepts-family.md)). The Learn chapter *Grafi funkcij za maturo / Function graphs for the matura* is separate.

Alternatives:

- A new "School function graphs" family. It would give a separate heading, but it would make a third adjacent function-related heading, after the confusion ADR 0011 already notes between *Funkcije in analiza* and *Analiza*. It would also need a family illustration and id for topics of the same kind as linear, exponential and trigonometric functions, which already live in the Functions family.
- The existing `functions-and-calculus` chapter. That chapter would grow by six lessons for a different audience (matura preparation), so a separate chapter is chosen.

ADR 0011 notes that the Functions family's students read it as one sequence. These topics belong to that same function-reading step, so the family grows from its current size by six entries. The catalog order places them after the existing function-reading topics and before calculus.

## 4. Notation: ε for the conic ratio

Slovenian school usage writes *e* for the linear eccentricity (\(e=\sqrt{a^2-b^2}\) for an ellipse) and *ε* for the numerical eccentricity (the ratio \(|PF|/|Pd|\)). S6 uses \(\varepsilon\) for the ratio in both languages, and names \(e\) only as the linear eccentricity where it is needed. The spec's English text writes \(e\) for the ratio, so the lesson text corrects this.

Alternative: \(e\) for the ratio, as in most English texts. Students would then read the matura-textbook symbol with a different meaning.

## Consequences

- Existing function routes, Preset collections and stored Presets are unchanged. New Demonstrations get new collections (ADR 0016).
- Catalog counts asserted by tests change when the Demonstrations are registered.
- The numerical-methods family (ADR 0023) may later switch its examples to the `named` entries. Nothing requires it.

## Measurement addendum (2026-11-03, slice 06 F2a: zero drag, Node math path)

Measured at commit 57b30256 plus the uncommitted S4 graph (`RationalFunctionGraph`, `rationalFunctionModel`), on an AMD Ryzen 5 7600 (12 threads), Windows 11 x64, Node v24.20.0. Bench: `just school-function-drag-bench` (`scripts/school-function-drag-benchmark/`, a Node bundle of the models and `plotPieces`; no browser, no JSXGraph, no React). Full output: `.benchmark-output/school-function-drag/` (git-ignored).

**Chain per move**, as the graphs run it: the model edit (`moveRationalZero` or `movePolynomialZero`, which calls `moveZero`), the facts (`rationalFacts` or `polynomialFacts`), and `plotPieces` at the default view ([-11, 9, 11, -9] for S4, [-6, 8, 6, -8] for S3) with the default 600 samples; S3 also samples its 400-point derivative curve. For S4, `analyzeRational` runs twice per move (inside `rationalFacts` and inside `plotPieces` through `schoolFunctionModel`).

**Cases**: numerator zero 1 dragged 150 grid steps (0.1) from -7.5 to 7.5 on each S4 example, passing over denominator zeros and the other numerator zero (hole made and removed; 0 rejected, merges occur), and S3 zero 1 on `default` and `degree-five` (7 of 150 rejected on `degree-five`, a merge above multiplicity 3). 7 recorded runs after 2 warm-ups, about 1050 moves per case. Unchanged moves are excluded.

Median / p95 / max per move in ms at 600 samples (the default), then the same total at 300 samples:

| case | analyzeRational | plotPieces | derivative (S3) | total | vertices | pieces | total at 300 |
|---|---|---|---|---|---|---|---|
| S4 oblique | 0.002 / 0.003 / 0.24 | 0.080 / 0.114 / 0.50 | - | 0.087 / 0.122 / 0.51 | 602 | 2 | 0.038 / 0.088 / 0.52 |
| S4 hole | 0.001 / 0.002 / 0.02 | 0.059 / 0.078 / 0.44 | - | 0.063 / 0.085 / 0.44 | 602 | 2 | 0.031 / 0.066 / 0.17 |
| S4 horizontal | 0.002 / 0.003 / 0.71 | 0.099 / 0.144 / 2.34 | - | 0.107 / 0.152 / 2.35 | 604 | 3 | 0.055 / 0.099 / 0.37 |
| S4 double-pole | 0.001 / 0.002 / 0.21 | 0.075 / 0.131 / 0.49 | - | 0.078 / 0.136 / 0.50 | 604 | 3 | 0.046 / 0.077 / 0.45 |
| S3 default | - | 0.029 / 0.043 / 0.22 | 0.050 / 0.091 / 0.23 | 0.080 / 0.140 / 0.29 | 600 | 1 | 0.083 / 0.177 / 0.31 |
| S3 degree-five | - | 0.052 / 0.063 / 0.63 | 0.096 / 0.249 / 0.63 | 0.151 / 0.336 / 0.85 | 600 | 1 | 0.142 / 0.290 / 0.75 |

Vertex and piece counts were constant per case (median equals max). The hole was present in 595 of 1050 `hole` moves and in 7 of 1050 `oblique` moves (one grid step on the denominator zero per run). The only max above 1 ms is a single 2.3 ms outlier on `horizontal` at 600 samples (one move of 1050, a GC or timer spike; the p95 is 0.15 ms).

**Recommendation**: every median is below 0.16 ms and every p95 below 0.34 ms, far under the 2 ms and 4 ms thresholds, so the default of 600 samples stands (300 was measured only for comparison and roughly halves the sampling cost; no change warranted). Sampling and analysis are not the bottleneck of a zero drag; whatever limits it is in the browser (JSXGraph curve update, SVG, React commit, MathJax readouts).

**Not covered; F2b must measure in the browser** on the S4 route (and S3 once for the shared path): (1) pointer drag of a numerator glider across the view over a denominator zero and back (hole made and removed) on each of `oblique`, `hole`, `horizontal`, `double-pole`, frame time p50/p95/max and dropped frames; (2) drag of a denominator glider across the view (poles move, the piece count changes) on `double-pole`; (3) the `k` slider and the probe slider; (4) example switch and language switch (board labels and readouts); (5) one `degree-five` zero drag on S3 with the derivative visible; (6) a classroom-projector size (1920 px wide) and a touch drag. Use the method of `docs/performance-plan.md`.
