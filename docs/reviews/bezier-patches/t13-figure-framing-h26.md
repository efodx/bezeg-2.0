# Task 13 figure framing — H26

- The triangular patch uses an authored underside view (`az=.6`, `el=-1.39`, `distance=3`, target `(1/3,1/3,0)`) that places the high interior control behind the surface. The fixture and math are unchanged.
- Join C0, C1 and G1 share an underside view (`az=-1.5`, `el=-1.54`, `distance=11.5`, target `(1.5,0,0)`). The teapot keeps its existing scene camera.
- `patch-join-scene` accepts optional typed `view3d`; the handler validates finite angles, positive distance, a finite optional target and perspective projection. The graph applies it through the existing camera clamp path. Preset cameras and saved scenes are unchanged.
- Focused projection assertions use actual mesh vertices and control points at 390×844 and 420×260. The mesh bbox exceeds `.49 × .45` NDC for the triangle and `.52 × .45` for joins; all geometry remains in frame.
- Width goals of `.65` NDC (triangle) and `.9` (joins) cannot fit this shared portrait/capture camera: full portrait fit caps landscape width at `2 × (390/844)/(420/260) = .572` NDC. The camera views approach that ceiling; vertical mesh bounds are comfortably above `.45`.
- Focused tests: `just unit src/learning/content/patchGuidedExamplesAdvanced.test.tsx src/graphs/patches/patchLessonActions.test.tsx` — passed (24 tests).
- Static checks: `just typecheck` and focused `just lint` for the six changed TypeScript files — passed.
- Handler owns image recapture/reinspection to assess the silhouette and labels. No build/browser run, commit or push in this slice.
