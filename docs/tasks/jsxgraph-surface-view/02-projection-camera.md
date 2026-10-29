# 02 — Projection and camera

Status: proposed. Source: [criterion 2](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Extract one pure projection (`SurfaceCamera`, viewport → screen and depth) next to `surfaceMath.ts` and use it for drawing, picking and labels. Replace the `three` oracle in `surfaceMath.test.ts`, `patchGuidedExamplesAdvanced.test.tsx` and `patchGuidedExamplesEvaluation.test.tsx` with an independently written pinhole-camera oracle, keeping every assertion. Check `fitCameraTo` framing at both viewports and stored Preset/lesson cameras for every patch route, comparing against the current Three framing.
