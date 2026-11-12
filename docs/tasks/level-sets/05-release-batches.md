# 05 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are A (LS5), B (LS1–LS2, after the contour measurement and the 3D decision) and C (LS3–LS4). Each runs F2b registration, F3 scenes with the typed actions `set-function`, `set-level`, `set-probe`, `set-step` and `set-objective`, [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template).

F2b done 2026-11-12 (routes `/analysis/contours` and `/analysis/linear-program`, after `solids` in the analysis family; Preset collections `contour-map` and `linear-program`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-solids-levelsets.md)). Owed to the first batch: lessons and `LessonAction` entries; media; browser timings measured 2026-11-12 ([results](../../bezier-performance-results.md#f2b-solids-level-sets-and-phase-portrait-browser-timings--2026-11-12)); phone misses owed: contour level and probe drags, surface board updating on drags, N 40/80/120 not reachable.
