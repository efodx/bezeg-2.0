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
