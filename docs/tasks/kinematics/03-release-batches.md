# 03 Release batches A–C (F2b done; split into tasks 04–06)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md) — open. Split on 2026-11-12 (handler 11) into [04 Batch A](04-batch-a-lessons.md) (KN1–KN2), [05 Batch B](05-batch-b-lessons.md) (KN3–KN4) and [06 Batch C](06-batch-c-lessons.md) (KN5).

The batches are A (KN1–KN2), B (KN3–KN4) and C (KN5). Each runs F2b registration, F3 scenes with the typed actions `set-motion`, `set-time` and `set-params`, [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media with clips that scrub \(t\), and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). `curve-parametric` and `curve-curvature` must behave as before.

F2b done 2026-11-11 (route `/curve-geometry/kinematics` in *Geometrija krivulj*; Presets through `parseKinematicsState`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-random-kinematics.md)). Browser timings done 2026-11-11 ([results](../../bezier-performance-results.md#f2b-simulation-and-kinematics-browser-timings--2026-11-11)). Owed to the first batch: captions clear of the y-axis tick labels, and the phone-profile Play miss (30 fps at 4× CPU, one board update of about 12–13 ms per frame); profile the update before choosing a fix (fewer redrawn elements, or canvas).
