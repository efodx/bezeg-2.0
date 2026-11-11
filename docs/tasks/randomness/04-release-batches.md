# 04 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are A (RS1–RS2), B (RS3–RS4) and C (RS5–RS6). Each runs F2b registration, F3 scenes and [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). The prerequisites `binomial-normal-approximation` and `clt-standardized-sum` must behave as before. Statistics are never presented as proof.

F2b done 2026-11-11 (route `/probability/simulation` in *Verjetnost in statistika*; Presets through `randomModel.ts`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-random-kinematics.md)). Browser timings done 2026-11-11 ([results](../../bezier-performance-results.md#f2b-simulation-and-kinematics-browser-timings--2026-11-11)). Owed to the first batch: the markov state box that overflows at 390 px, and the galton \(10^5\) phone-profile miss (a stop re-simulates its whole prefix, about 0.5 s blocked at 4× CPU); measure the prefix re-simulation separately before choosing a fix (cached prefix tallies, or a smaller trial limit in galton).
