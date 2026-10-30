# 02 — Projection and camera

Status: done, 2026-10-30. The gate projection stretched x by the aspect ratio (no division by aspect in NDC x, view3d frame sized 0.4W×0.4H); fixed and covered by an 86-case framing test against an independent pinhole oracle and Three. Source: [criterion 2](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Extract one pure projection (`SurfaceCamera`, viewport → screen and depth) next to `surfaceMath.ts` and use it for drawing, picking and labels. Replace the `three` oracle in `surfaceMath.test.ts`, `patchGuidedExamplesAdvanced.test.tsx` and `patchGuidedExamplesEvaluation.test.tsx` with an independently written pinhole-camera oracle, keeping every assertion. Check `fitCameraTo` framing at both viewports and stored Preset/lesson cameras for every patch route, comparing against the current Three framing.

From the gate: every preset framed the content at about a third of the host, smaller than Three. The JSX view must frame stored and fitted cameras as Three does; record the residual against Three's framing. Remove the `view3d` gate strategy once `board2d` owns the projection (ADR 0019).
