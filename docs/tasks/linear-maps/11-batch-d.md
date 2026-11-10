# 11 Batch D: power method and stability (F2a–F6, gated)

Gates:

- F2a waits for Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md).
- F2b–F6 wait for Controls step 7.
- The release waits for Batch B (task 08).

Spec: L6, L7 and the [Batch D amendment](../../specs/linear-maps-lessons.md#batch-d-gating-kernel-gaps-f1-terms-and-tests-families-prep-amendment-2026-11-10). Decisions: [ADR 0057](../../adr/0057-linear-maps-batch-d-iteration-modes-in-linear-map-graph.md).

The F2a work adds the `iterate` and `tracedet` modes and the start-vector and step state to `LinearMapGraph`, with step and play controls from step 5. Every existing `linear-map` Preset still loads unchanged, and a test proves it. The scene tests run set-matrix, set-start and step in one synchronous tick. When the gate opens, split this task, following the scene and registration model current at that time.

Terms (F0 decision), entering the [localization table](../../localization.md#choosing-new-terms) when first shipped:

| English | Slovenian | Basis |
| --- | --- | --- |
| power method | potenčna metoda | Standard UL numerical-mathematics term |
| dominant eigenvalue | dominantna lastna vrednost | Standard |
| stability triangle | trikotnik stabilnosti | Transparent |
| trace–determinant plane | ravnina sled–determinanta | As in [phase portraits](../phase-portraits/README.md#slovenian-terms-f0-decision) |
| iterate (noun) | iterat | Standard numerical-mathematics noun next to the existing *iteracija*. Glossed as "\(k\)-ti člen zaporedja \(A^kv\)" on first use |
