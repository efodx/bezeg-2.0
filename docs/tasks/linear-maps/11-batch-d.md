# 11 Batch D: power method and stability (F2a–F6, gated)

Status: F2a done 2026-11-11 (families-prep stream, not yet committed): `iterate` and `tracedet` modes, start and step state, playback; evidence in [the F2a note](../../reviews/feature-streams/families-prep/notes/f2a-lm-11.md). F2b done 2026-11-12 (no new row: the modes are reachable from the `linear-map` route; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-complex-linear.md)); F3 L6–L7 written and joined as the chapter sections `power-method` and `trace-determinant` (2026-11-13, handler 16; [F3 note](../../reviews/feature-streams/families-prep/notes/lm-d-s1.md)); F4 (the two sections), F5 (two start-frame card images) and F6 done 2026-11-13: review `.command-logs/lm-d/review.md` (one blocking finding, repaired), browser smoke `.command-logs/lm-d/smoke/report.md` (no defects; step 3 reworded after its readouts were seen in step 2), handler checks green; hosted CI after push. Owed: L7 trace–determinant inset labels overlap at 390 px; controls of L6 step 7 and L7 steps 5–7 not exercised in the browser; no second reader of the Slovenian prose; Presentation mode and figure export of the two modes not checked.

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
