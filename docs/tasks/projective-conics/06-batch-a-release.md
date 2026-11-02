# 06 Batch A release: K1–K3 registration, lessons, chapter, media and acceptance (F2b–F6)

Gate: `G-REG`. Depends on 05.

- **F2b:** routes `/bezeg-2.0/projective/…`, catalog entries in the new Projective family, and registration. Keep the edit minimal and push it promptly.
- **F3:** lessons K1–K3 ([one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)).
  - *F3a (K1) accepted 2026-11-02.* `projectiveConicsGuidedLessons.ts`, seven steps on `projective-cross-ratio`, with a `projective` lesson-action kind (`load-example`, `move-handle` through the drag path; strict integer grid, no snapping) on `CrossRatioGraph`. Quoted values recomputed in the handler: 9/8 (originals and images from O=(0,5) onto y=1+x/2; first image gaps 13:20), -1 for 0, 6, 2, -6, 33/20 for D=-10 (image at infinity, direction (2,1), the same point as the spec's (-40,-20,0)), 3/2 for 0, 1, 2, 4. Interim owner `rational-curves`/`worked-conic` until F4. F3b (K2) and F3c (K3) next.
- **F4:** the chapter *Projektivna geometrija stožnic*. The K3 tangent lesson claims no matura level until the VR label is confirmed visually.
- **F5:** media.
- **F6:** the Batch A release condition and the batch-wide gate. Verify that existing routes, Presets and rational Demonstrations are unchanged. Run `just check`, smoke in SL and EN with a live switch, and CI.
