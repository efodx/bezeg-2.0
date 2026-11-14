# B3 worker handoff (partial, stopped at the budget signal)

State: code and tests for items 1, 2, 3 are in the working tree and pass their unit tests; the recapture did NOT complete, so no media, manifest or asset map was written (git status shows none). Server on 4334 stopped. `b3/before/` holds the five originals; `after/` and `live/` are empty.

Done
- extrapolation: `ExtrapolationGraph.tsx` adds `buildExtension` (own JXG curve on [1, extrapolationT], blue `comparisonCurve`, dash 3, same width as the curve, drawn over it; kept at least 1e-6 long so JSXGraph keeps drawing it and the clip's stroke-count check stays constant). Test added in `ExtrapolationGraph.test.ts`. Recipe poster t=1.3, window bottom -6.4; sweep in `demonstration-preview-curve-motion.cjs:236` now [1.3, 1, 1.3], start 1.3 (1.5 leaves the camera: B(1.5).y = -9.875).
- repeated-subdivision: `SubdivisionGraph.tsx` `alternatePieceRoles` (old pieces moss solid, new pieces blue solid; along the curve they alternate). Test added. Recipe poster = one `Subdiviziraj`. Legacy clip spec reworked to start on the poster: values [1,2,3,1] (`demonstration-preview-motion.cjs` ~1255, original polygon now the default cubic constant ~1281, sample checks ~1462, 1799), outcome evidence curves 2 (`recipes.cjs:429`), capture test updated. These are checks edited for the new poster (their strictness is unchanged), flag for the handler.
- reduction: `ReductionOverlay.ts` adds the reduced curve's own thin blue polygon (test in `DegreeReductionGraphReal.test.tsx`); recipe: elevated-net toggle dropped, capture text `reduction: {keep: [], strip: []}` (+ list in `demonstration-preview-text.test.cjs`).
- bezier: recipe window only, now [-5, 3.4, 4, -4.4] (a tighter [-4.9,2.9,3.9,-3.9] failed the legacy drag check's 0.035 tolerance at sample 41).
- affine: no change. Controls are step buttons (18 degree rotation, x1.2, +-0.5), not continuous, so the clip stays discrete; a pale reference of the original needs new drawing code.
- Alt text: none of the five names a colour or dash; no copy change.

Checks observed: `just unit` SubdivisionGraph (passed; old behaviour failed the new test), ExtrapolationGraph (passed), reduction folder (passed); `just typecheck` passed; `just tooling-test` passed (before the last recipe/sweep edits; rerun needed); build passed.

Open
1. Last recapture failed in the `bezier` drag clip restore (`demonstration-preview-motion.cjs:508`: `.point-coordinate-editor summary` not found after the 4334 server restart; first capture and encode of the other three succeeded: extrapolation 90558 B, repeated-subdivision 35600 B, reduction 307070 B, under 307200). Rerun with a fresh build and server; if bezier's drag still fails, restore its old window.
2. Unrun: eslint (`just lint`), affected lesson/content tests, browser live screenshots, SVG/PNG export, poster viewing and R1-R8 lines, flag-condition diff check, after/ copies, pre-change failure runs for the extrapolation and reduction tests.

## Continuation

- Extrapolation extension now solid blue (dash 0) over the moss arc: covers it, one role (ExtrapolationGraph.tsx:66; test line 110).
- Lesson test degreeReductionGuidedLessons.test.tsx ~192 now expects 3 curves (quadratic, its polygon, elevated).
- bezier dropped from B3: drag-clip restore (`.point-coordinate-editor summary`) failed again on a fresh build and server; recipe window restored to HEAD.
- reduction clip was 307070 B; drag amplitude in scripts/demonstration-clip-rows/bezier.cjs reduced 3.3 -> 3.1: now 276071 B. extrapolation 90252, repeated-subdivision 35600.
- Lint: removed unused `first` in motion.cjs:1267 (`_first`). Checks: unit (touched + learning/content) pass, pre-change failures observed (3 tests), typecheck, lint, tooling-test pass; live shots and export in live/, posters+clips in after/.
