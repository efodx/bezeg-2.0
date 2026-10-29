# Task 13 advanced guided examples — handoff-v12 worker note

## Implemented content and verified geometry

tensor-subdivision uses the bilinear saddle S(u,v)=(u,v,uv). At (1/4,1/2), the evaluated point is (1/4,1/2,1/8). Elevation in u gives middle-row controls (1/2,0,0) and (1/2,1,1/2), while preserving the value. A second scene splits at u=1/2; left-local u=1 and right-local u=0 share S(1/2,1/2)=(1/2,1/2,1/4).

tensor-joins shows the C0 kink, C1 pair, ratio-2 G1 pair and 32-patch teapot. The three joins use graph-owned presets/actions, and the G1 step applies alpha 2. Tests check the graph's numerical join report and rendered boundary/vector owners. The capstone requires 32 nonempty teapot mesh owners and lesson close restores the previous graph state.

The triangular fixture is a canonical degree-3 net with b111=(1/3,1/3,9/2) and all other controls (i/3,j/3,0). At the centroid the central Bernstein coefficient is 6(1/3)^3=2/9, hence the evaluated point is (1/3,1/3,1). Every boundary control has zero height. Tests inspect the actual marked point, all three boundary curves and nonempty de Casteljau construction.

The comparison action renders the tensor overlay derived from the triangular boundary curves. At centroid parameters the triangle is at height 1 while the derived square is at height 0. Tests check actual compare polylines and verify the transient overlay disappears when the lesson closes.

## Capability facts

- Tensor subdivision/elevation use patch-subdivide / patch-elevate on TensorSubdivisionGraph. The split value is limited to [0.05,0.95]; elevation is exact and stops at degree 4.
- Triangular evaluation, subdivision, elevation, de Casteljau and comparison overlay are graph-backed. The overlay is transient and captured/restored by the lesson checkpoint.
- The approved join actions are patch-join-scene (four closed graph scene IDs), patch-join-mode (C0/C1/G1, alpha in [0.25,4]), and patch-tensor-comparison (visible boolean). Teapot is selected as a graph-owned preset scene, not as a one-net lesson fixture.

## Files and checks

Authored only:
- src/learning/content/patchGuidedExamplesAdvanced.ts
- src/learning/content/patchGuidedExamplesAdvanced.test.tsx
- docs/reviews/bezier-patches/t13-advanced-examples-h26.md

Verification passed: just --list; just unit src/learning/content/patchGuidedExamplesAdvanced.test.tsx src/learning/content/lessonMathNotation.test.ts (5 advanced tests plus notation inventory). Log: .command-logs/2026-10-29T17-43-19-727Z-37844-2cae82ae.log. An initial focused run exposed that the second subdivision scene used the Demonstration cubic default; its setup was corrected to prepare the authored saddle, after which the suite passed. No deliberate mutation or pre-fix defect claim is made. No registry, build, browser preview, or Git operation was performed by this worker; handler owns integration and broader checks.
