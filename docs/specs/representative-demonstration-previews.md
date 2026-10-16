# Representative demonstration previews

Status: scoped for implementation after the current demonstration work reaches a stable checkpoint.

## Problem and scope

The catalog captures fresh route defaults. Some defaults intentionally precede the defining construction: Bernstein starts with straight basis functions, repeated subdivision starts before subdivision, and Farin points start hidden. Several coordinate plots give too much space to irrelevant ranges. Preview framing alone cannot resolve hidden content.

Curate static preview scenes for every shipped demonstration using its existing starting curve or function and supported controls. Do not change starting control points, weights, functions, route defaults, lessons, worked examples, stored presets, catalog navigation, or starter cards. Preview-only degree, visibility, algorithm-step, and parameter changes are allowed; preserve initial geometric inputs. Operations such as subdivision and degree elevation may derive new control representations from those inputs. If a desired result requires changing the starting example or adding a runtime feature, report that limitation rather than extending this task.

This spec supersedes the untouched-default-scene restriction in [closer demonstration previews](closer-demonstration-previews.md) for catalog captures only. Preserve that spec's static assets, aspect ratio, mathematical proportions, and coordinate-context rules.

## Capture approach

- Give each shipped demonstration an explicit preview recipe, including an explicit keep-default recipe where appropriate. Record selected controls/actions, framing, annotation policy, and scene intent in the capture manifest.
- Apply recipes to a fresh real route using supported application controls or graph-owned actions. Keep capture orchestration out of mathematical implementations. Do not reach into React internals, change local default presets, or manufacture approximate geometry for screenshots.
- Reuse existing lesson action capabilities where useful, without depending on lesson step order or modifying lessons. Prefer deterministic state/step selection over timed animation playback.
- Apply scene configuration before fitting. Wait for the resulting board, fonts, and mathematical annotations to settle; assert the recipe's meaningful outcome before capturing.
- Keep static PNGs at the existing 360:220 display ratio and 2x resolution. Retain geometric proportions for curve constructions. Use concept-specific coordinate windows for analysis rather than fitting an entire infinite curve or annotation bounds.
- Prefer selective labels to dense annotations. Keep distinctions readable through existing colour and line styles; avoid depending solely on colour. Do not change runtime graph labels or styling for thumbnail cleanup.
- Capture only shipped, ready routes. Replace placeholders for newly shipped demonstrations once their implementation is stable. Do not mark a placeholder as an accepted representative preview.

## Per-demonstration scene targets

These are visible-result requirements, not a requirement to add missing controls. Exact settings are selected during capture and recorded in the manifest. Keep the existing starting inputs throughout.

This table is a planning snapshot, not a fixed catalog count or a claim that all listed routes are shipped. At implementation start, inventory the then-current `src/demonstrations.ts`, route registrations, preview mapping, assets and manifest. Recount shipped demonstrations and genuine previews, identify missing/placeholder assets and in-progress routes, and refresh this table and all verification totals against that checkpoint. Add targets for newly shipped entries and explicitly account for removed or renamed entries. Recheck placeholder descriptions as they may already have been replaced. Record the source revision and refreshed counts in the implementation evidence; derive exhaustive checks from the live catalog rather than hard-coding the planning total. Counts within scene targets (such as four cubic basis functions or four subdivision pieces) describe the intended construction and are not catalog totals.

| ID | Preview target |
| --- | --- |
| bernstein | Degree 3 basis, all four functions visible, coordinate window focused on the unit interval. |
| bezier | Current asymmetric curve with its control polygon enabled. |
| decasteljau | Existing interpolation levels at an interior parameter; retain separation between levels and suppress redundant thumbnail labels. |
| decasteljau-alternative | Existing component curves and interpolation segment at a parameter where they remain visibly distinct. |
| affine | Show one existing transformation as a before/after comparison using two real board captures if practical. A single transformed curve is insufficient. No new runtime overlay feature; record any capture-composition limitation. |
| subdivision | Two coloured pieces with their control polygons, split point visible, redundant labels reduced. |
| repeated-subdivision | Two rounds, giving four covering pieces and visibly refined control polygons around the unchanged curve. |
| extrapolation | Moderate extension with original endpoint and extended portion clearly identifiable using existing presentation capabilities. |
| elevation | One degree elevation; original and elevated polygons distinguishable around the unchanged curve. |
| rational | Existing unequal weights, visible polygon, readable weight labels separated from the curve. |
| rational-decasteljau | Construction visible with enough weight information to distinguish rational interpolation; avoid annotation crowding. |
| rational-elevation | One elevation with supporting polygons visible and sufficient existing weight information to communicate the rational construction. |
| rational-extrapolation | Moderate extension, original interval identifiable, readable existing weight information. |
| rational-subdivision | Coloured pieces with supporting polygons and a selective set of existing weight annotations. |
| farin | Farin points and polygon enabled using unchanged initial weights; show how the points divide the edges. Do not alter weights to exaggerate the result. |
| circle | Full circle with differentiated constituent arcs and supporting polygons; reduce repeated endpoint labels. |
| spline-cn | Existing spline, supporting polygons and a readable representative join. Use existing degree/continuity controls only if the result stays representative of the starting example. |
| spline-c1 | Supporting polygon reveals midpoint construction at a readable join. |
| spline-c2 | Supporting polygon and construction points visible; retain enough adjacent pieces to explain a join. |
| spline-g1 | Existing continuity parameter away from its neutral value, exposing unequal control-leg lengths with a shared tangent direction. |
| spline-g1-symmetric | Parameter away from the midpoint, with the polygon visible so it differs meaningfully from the C1 preview. |
| ph-cubic | Existing curve plus one moderate, readable offset; arc-length readout only where legible. |
| ph-quintic | Existing curve plus one offset that avoids crowding at the tight bend. |
| spline-parameterization | Existing points and a supported parameter setting exposing the sampling pattern; readable sample count. |
| weighted-parameterization | Non-neutral parameter, visibly uneven sample density along the unchanged curve. |
| uniform-parameterization | Supported equal-arc-length sampling mode with a modest readable marker count. |
| linear-function | Retain slope triangle; remove thumbnail label collisions near the intercept. |
| exponential-function | Existing growth example framed around the growth region and reference points, with less unused horizontal space. |
| trigonometric-functions | Retain recognizable sine cycle; keep meaningful coordinate context. Do not add a new tick-formatting feature. |
| continuity | Existing jump, open and closed endpoints, and readable limit information. |
| derivative | Tangent and nearby secant visibly separated; focus around their relevant points. |
| definite-integral | Existing integrand and interval with roughly six rectangles; approximation remains visibly distinct from the curve. |
| area-between-curves | Retain shaded region and both intersections; frame tightly enough to inspect them. |
| arc-length | Retain visibly coarse polygonal approximation and arc, with readable endpoints. |
| bisection | Two or three deterministic steps; current bracket and midpoint prominent near the relevant root. |
| mean-value | Existing function and interval with the interior parameter set so tangent and secant are parallel; both points of contact remain visible. |
| accumulation | Reveal accumulation function alongside integrand and shaded area; frame so all remain readable. |
| darboux | Coarse lower and upper sums, tightly framed around the existing interval; difference visible. |
| extrema | Reveal classification for the existing function and interval; frame around critical points and endpoints. |
| convexity | Reveal conclusion; chord, curve and comparison point visibly separated in a focused window. |
| taylor | Existing function and centre, degree 2 or 3, with local agreement and some visible divergence. |
| sequence | Replace placeholder with the actual starting sequence, enough revealed terms to communicate its behavior, epsilon band and threshold marker. Do not switch examples. |
| uniform-convergence | Replace placeholder with actual starting function sequence, limit and epsilon band at a representative supported index. Do not switch examples. |
| fixed-point | Replace placeholder with actual starting iteration, diagonal and several deterministic cobweb steps. Do not switch examples. |

## Acceptance and verification

1. Every shipped demonstration has an explicit recipe and a genuine capture of its own route. Preview mapping is exhaustive; asset dimensions and hashes agree with the manifest. In-progress routes are explicitly identified before implementation begins.
2. All initial mathematical inputs, route defaults, lesson content and preset behavior remain unchanged. Review the diff for accidental changes outside capture tooling, assets, tests and capture documentation.
3. Bernstein shows four cubic basis functions; repeated subdivision shows four pieces; Farin points are present. Assert representative recipe outcomes, including deterministic iteration progress and reveal states, rather than merely waiting for any visible curve.
4. Verify the other targets by reviewing all images at their actual card size. Record any target that cannot be achieved with existing controls and its proposed disposition; do not silently claim completion.
5. Review mathematical fidelity: subdivision and elevation preserve the underlying curve, geometric captures retain equal unit scales, coordinate plots retain useful axes, approximation graphics do not imply exactness, and discontinuities are not joined.
6. Run focused capture/manifest checks, relevant catalog unit tests, TypeScript checking, and the production build. Do not modify unrelated work to make checks pass.
7. Use the smoke-tester workflow and the affected catalog/browser checklist on a stable production build. Check desktop and 390px catalog views, asset loading, overflow, and representative links opening the unchanged starting scene. Full lesson-runtime testing is unnecessary if runtime and lesson files remain unchanged.
8. Obtain parallel mathematical/engineering review and visual/accessibility review for the multi-preview change. Record coverage gaps, including physical projector/device review if not performed.

## Implementation sequencing

First settle the existing dirty route/catalog work or establish an explicit integration checkpoint with its owner. Implement capture recipes and outcome checks, then regenerate and review the full set. Keep regeneration outputs aligned with the same stable source state. Commit only task-owned changes; preserve other work. A fresh implementation chat is optional: use this spec as the durable scope either way.
