# 03 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are A (WV1–WV2), B (WV3) and C (WV4–WV5). Each runs F2b registration, F3 scenes with the typed actions `set-mode`, `set-components`, `set-sampling` and `set-time`, [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). The trigonometric function and Fourier routes must behave as before.

F2b done 2026-11-11 (route `/functions/waves` at the end of *Funkcije in analiza*, after `arc-length`; Preset through `parseWavesState`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-recursion-waves.md)). Owed to the first batch: the browser remeasure of a sinc state change (about 42 ms in jsdom, F2a note) and the split of the error computation from the redraw; `LessonAction` entries for `set-mode`, `set-components`, `set-sampling` and `set-time`; the reduced-motion change shows on the Play and speed controls only after the next render; the sampling wheel labels (true, sample) overlap the arrow tip and the y-axis title touches the top tick label.
