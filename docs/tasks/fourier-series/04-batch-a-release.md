# 04 Batch A release: F1 and F3 registration, lessons, chapter, media and acceptance (F2b–F6)

Gate: `G-REG`. Depends on 03.

- **F2b:** routes, catalog entries and Demonstration registration for the Batch A graph. Keep the edit minimal and push it promptly.
- **F3:** lessons F1 and F3 ([one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)), with the theorem statements and citations the spec lists (Dirichlet midpoint, Gibbs limit, pointwise versus uniform). The link to the uniform-convergence lesson is a catalog link.
  - *F3 accepted 2026-11-02:* one 13-step `fourier-series` lesson (`fourierSeriesGuidedLessons.ts`): F1 in steps 1–6, F3 in 7–13. The \(x\) slider moves by \(0{,}01\), so scenes use \(x=1{,}57\) for \(\pi/2\) and quote recomputed values; the sawtooth jump at \(\pi\) is stated from the formula. The graph has no \(|x|\) example, so F3 step 6 (continuous contrast) is the sawtooth's Gibbs peak and \(|x|\) is only named. Scenes cannot zoom (no zoom action): steps 8–9 ask the student to press the zoom button. The uniform-convergence link is a prerequisite line and a `sources` entry, since lesson content has no link item. No value-reset button is needed: every scene sets all four values and lesson Reset restores the checkpoint.
- **F4:** the chapter *Fourierove vrste / Fourier series*, bilingual, chapter-owned guided activities.
- **F5:** media.
- **F6:** the Batch A release condition and the batch-wide gate: existing routes (trigonometric and uniform convergence), Presets and lessons unchanged. Run `just check`, smoke in SL and EN with a live switch, and CI.
