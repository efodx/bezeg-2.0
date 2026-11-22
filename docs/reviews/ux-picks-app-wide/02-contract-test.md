# Task 02 slice 3: declaration contract test

Test: `src/learning/content/declarationContract.test.tsx`. It finds declaring graphs by their `declaration()` override (today `taylor`), applies each lesson step's scene synchronously on the mounted graph, and checks every frame (unsampled) with `checkDeclaration`, `checkFrame`, `drawnObject()` for each legend entry, and a catalog-text walk. It passes on the current tree.

The three seeded failures are permanent negative tests in the same file, run against the real Taylor graph with synthetic frames and declarations. Messages the checks produce (asserted exactly or by substring in the tests):

- (a) wrong id: `seed: highlight no-such-row: no such row or note in this scene` and `seed: uses no-such-control: no such control or action in this scene`.
- (b) hidden highlighted row (the `center` row removed from the scene's declaration): `seed: highlight center: no such row or note in this scene`.
- (c) undrawn legend entry: `seed: legend curve: object "not-drawn" is not drawn`.
- Also covered: `4 highlights, at most 3`, `uses p: locked in this scene`, `declaration.parameters[0].label: not a catalog Message or FormattedValue`.

Note: the first run of (b) also showed that a choice option's `value` is an id, not text; the text walk skips `value` next to a `label`.
