# 03 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are A (RG1, RG3), B (RG2, RG4) and C (RG5). Each runs F2b registration, F3 scenes with the typed actions `set-map`, `set-params`, `set-start`, `set-step` and `set-interest`, [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). The `sequence-*`, `series-*`, `exponential-*`, `inverse-logarithm` and `fixed-point-*` lessons must behave as before.

F2b done 2026-11-11 (routes `/analysis/recursion` and `/analysis/growth` in *Analiza*, after `fixed-point`; Presets through `parseCobwebState` and `parseGrowthState`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-recursion-waves.md)). Owed to the first batch: lessons and `LessonAction` entries for the typed actions (`set-map`, `set-params`, `set-start`, `set-step`, `set-interest`); on a 390 px board the cosine fixed-point caption wraps into the diagonal caption and the map caption touches the y axis; browser timing of the cobweb playback is not measured.
