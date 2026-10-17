# Representative demonstration previews

Status: implementation revised after the owner's 2026-10-16 visual review. The current direction is automatic visible looping without thumbnail playback controls, shared with the homepage carousel, plus animated affine/elevation comparisons. See [capture evidence](../tasks/representative-demonstration-previews/capture-results.md) and [release verification](../tasks/representative-demonstration-previews/release-results.md).

Implementation tasks: [representative demonstration previews](../tasks/representative-demonstration-previews/README.md).

## Problem and scope

The catalog captures fresh route defaults. Some defaults intentionally precede the defining construction: Bernstein starts with straight basis functions, repeated subdivision starts before subdivision, and Farin points start hidden. Several coordinate plots give too much space to irrelevant ranges. Preview framing alone cannot resolve hidden content.

Curate static preview scenes for every shipped demonstration using its existing starting curve or function and supported controls. Add short motion previews where change explains the concept. Do not change weights, functions, route defaults, lessons, worked examples, stored presets, catalog navigation, or carousel choices/layout/timing. The homepage carousel reuses the same posters, clips and player; do not duplicate its assets. Static previews and iterative sequences preserve starting control points. Isolated recorded Bézier movement and existing affine transformations may move points as described below; [continuous motion previews](continuous-motion-previews.md) adds further bounded capture-only motions. Preview-only degree, visibility, algorithm-step, and parameter changes are allowed. Operations such as subdivision and degree elevation may derive new control representations from the starting inputs. If a desired result requires changing the starting example or adding a mathematical runtime feature, report that limitation rather than extending this task.

The owner's review supersedes the earlier one-pass, hover/focus activation, sibling Play/Stop/Replay button, one-active-clip-per-collection and homepage-exclusion policies. Visible motion previews now loop automatically, without playback buttons. Affine and both degree-elevation demonstrations use single-board posters plus animated comparisons, replacing split-image compositions. Several visible clips may play concurrently; offscreen media stays unloaded.

This spec supersedes the untouched-default-scene restriction in [closer demonstration previews](closer-demonstration-previews.md) for catalog captures only. Preserve that spec's static assets, aspect ratio, mathematical proportions, and coordinate-context rules.

## Capture approach

- Give each shipped demonstration an explicit preview recipe, including an explicit keep-default recipe where appropriate. Record selected controls/actions, framing, annotation policy, and scene intent in the capture manifest.
- Apply recipes to a fresh real route using supported application controls or graph-owned actions. Keep capture orchestration out of mathematical implementations. Do not reach into React internals, change local default presets, or manufacture approximate geometry for screenshots.
- Reuse existing lesson action capabilities where useful, without depending on lesson step order or modifying lessons. Prefer deterministic state/step selection over timed animation playback.
- Apply scene configuration before fitting. Wait for the resulting board, fonts, and mathematical annotations to settle; assert the recipe's meaningful outcome before capturing.
- Keep PNG posters at the existing 360:220 display ratio and 2x resolution. Motion uses the same framing and proportions. Retain geometric proportions for curve constructions. Use concept-specific coordinate windows for analysis rather than fitting an entire infinite curve or annotation bounds.
- Prefer selective labels to dense annotations. Keep distinctions readable through existing colour and line styles; avoid depending solely on colour. Do not change runtime graph labels or styling for thumbnail cleanup.
- Capture only shipped, ready routes. Replace placeholders for newly shipped demonstrations once their implementation is stable. Do not mark a placeholder as an accepted representative preview.

## Motion system

### Small delivery interface, offline scene generation

Use one generated asset description per demonstration: a required PNG `poster` and optional `motion` with a source URL, MIME type and duration. The catalog player knows only this description and activation state; it does not know control points, graph actions, lesson steps or JSXGraph. Preserve the existing exhaustive `demonstrationPreviewAssets: Record<DemonstrationId, string>` poster mapping and add a separate partial motion mapping, so static callers and existing loading behavior can continue unchanged.

Generate motion offline from real settled board captures, then encode a short silent clip. Start by evaluating WebM for the supported browser set; verify actual playback and deployed MIME handling. Add an MP4 alternative only if target-browser evidence requires it. Unsupported or failed media always falls back to the poster. Do not ship raw frame stacks, GIFs, a browser encoder, or graph instances in cards. No new application dependency is needed for video playback.

The existing `FigureCapture` export code is a useful reference for board readiness, MathJax and lifecycle. Reuse it only where the current capture runner can access its supported interface without a new production bridge. The existing route-owned board screenshot pipeline is a valid frame source and already handles thumbnail presentation. SVG export is another possible intermediate, not a requirement: independently animating SVG paths could lose control-point constraints, rational constructions or mathematical labels. Let the graph recompute every sampled state instead.

### Two recipe modes, one player

Capture-only recipes describe the starting route, setup controls, poster checkpoint, framing, annotation policy, expected outcomes and an optional timeline. They are not lesson content or stored presets. Keep route interaction adapters and outcome checks in capture tooling; do not expose React instances or install a production `window` graph-control bridge.

- **Discrete steps:** capture a small number of exact states and hold each long enough to inspect. Initial pilots: repeated subdivision at rounds 0, 1 and 2 (one, two and four covering pieces), and bisection at two or three consecutive supported steps. A requested step count is not a wall-clock delay. Use Next step or another existing supported action and verify the actual graph/readout after each transition.
- **Smooth motion:** sample a bounded control movement or parameter sweep deterministically, about 24 samples per second over four seconds. The Bézier pilot moves one interior control point away from and back to its initial position, with the control polygon visible and all other points fixed. Affine motion uses existing exact transformation steps or supported pointer interaction and returns to the original scene. Never interpolate screenshot pixels or construct an approximate replacement curve. These isolated recorded transformations do not authorize editing route defaults or other examples.
- **Degree comparisons:** show the original supporting polygon and one exact degree elevation on a single board in successive held states. Preserve the underlying curve and hold the changed construction long enough to inspect. Do not morph between mathematical degrees, crossfade geometry, or combine two pictures into one thumbnail.

Each checkpoint/sample must produce the same mathematical state regardless of machine speed. For independent samples, start from the clean route and replay explicit setup/actions; a sequential capture is allowed when its cumulative actions are specified and each checkpoint is checked. Pause runtime playback throughout. Do not screen-record timed Play and hope to capture the intended iteration.

Choose one camera for the whole clip. Determine the union of meaningful finite geometry across its samples, or use a specified coordinate window, then capture every frame with the same bounding box, scale, dimensions and annotation policy. A measurement pass followed by a capture pass is acceptable. Reapply capture-only presentation after graph updates when necessary. Preserve equal unit scales for geometric constructions. Do not refit between frames or crossfade discrete mathematical states into apparent intermediate constructions.

### Playback and loading policy

- Use one graph-free player and the same generated assets in the full catalog, shared workspace picker and homepage carousel.
- Start with the poster using existing eager-first-three/native-lazy loading and decoded-image handling. Attach a clip source only when its preview frame enters the viewport, the document is visible, and motion preferences permit playback. `preload="none"` alone is not the loading contract; offscreen clips must not be requested.
- With normal motion preferences, visible motion previews play and loop automatically. No Play, Stop or Replay buttons appear on thumbnails. Hover, focus and movement among descendants do not restart a clip or affect navigation. Multiple visible clips may play simultaneously.
- Scrolling a frame out of view, hiding the document, filtering it away, closing the picker, changing the carousel selection or unmounting stops its media and returns to the poster. Re-entry starts the visible loop again. Prevent stale events or rejected play promises from affecting a replacement.
- Reduced motion shows the poster and suppresses automatic playback. Changing the preference to reduced motion stops active clips. No decorative fades are added in this mode.
- Keep the poster visible until the first video frame is ready. Buffering, missing media, decode/play failures and unsupported codecs leave a usable still. Reserve 360:220 space throughout. No spinner, per-frame live announcements, or essential explanation available only through motion. Decorative images and videos stay hidden from assistive technology; image/title navigation targets retain their existing accessible names.

### Pilot budgets and expansion gate

Deliver six clips: repeated subdivision, bisection, Bézier control-point movement, affine transformations, polynomial elevation and rational elevation. Target four seconds, silent, at the poster's 720×440 pixel resolution. Keep each source below 300 KiB, request media only for visible eligible frames, and add no application encoding dependency. Record sizes, durations, sample counts, encoding settings, generation time, browser results, concurrent visible playback and compressed application-code delta. If a clip cannot meet the ceiling with readable mathematics, retain its poster and record the limitation; revise the budget explicitly before shipping a larger clip.

[Continuous motion previews](continuous-motion-previews.md) extends this pilot list with capture-only parameter sweeps and pointer drags (`decasteljau`, `farin`, `derivative`, `weighted-parameterization`, `complex-multiplication` and `accumulation` so far) and widens the movement allowance below to the motions listed there.

Other table entries receive stills. Extend motion only where it makes a specific change clearer and passes the same checks. Many analysis previews need a useful reveal state rather than continuous movement. The owner explicitly replaced the affine and elevation split-picture requirement with animation.

Alternatives considered: live boards add graph lifecycles and computation to every card; many PNG frames make smooth motion delivery expensive; GIFs and always-looping animated images provide poor control over activation and reduced motion; hand-animated SVG would duplicate graph semantics. Pre-rendered clips keep graph correctness in capture and playback concerns in one small catalog module. Codec/encoder selection remains a measured pilot decision, not an approved dependency migration.

## Per-demonstration scene targets

These are visible-result requirements, not a requirement to add missing controls. Exact settings are selected during capture and recorded in the manifest. Keep the existing starting inputs throughout.

This table is a planning snapshot, not a fixed catalog count or a claim that all listed routes are shipped. At implementation start, inventory the then-current `src/demonstrations.ts`, route registrations, preview mapping, assets and manifest. Recount shipped demonstrations and genuine previews, identify missing/placeholder assets and in-progress routes, and refresh this table and all verification totals against that checkpoint. Add targets for newly shipped entries and explicitly account for removed or renamed entries. Recheck placeholder descriptions as they may already have been replaced. Record the source revision and refreshed counts in the implementation evidence; derive exhaustive checks from the live catalog rather than hard-coding the planning total. Counts within scene targets (such as four cubic basis functions or four subdivision pieces) describe the intended construction and are not catalog totals.

The implementation checkpoint at `d4bff5638dcee2da1b6bdaf177b81fda785657a2` contained 45 shipped routes and no in-progress routes. Complex multiplication was added to the targets below. Sequence, uniform convergence and fixed point already had genuine captures, so their earlier placeholder descriptions have been removed. The regenerated set contains 45 distinct own-route posters; exhaustive checks continue to derive their inventory from live metadata.

| ID | Preview target |
| --- | --- |
| bernstein | Degree 3 basis, all four functions visible, coordinate window focused on the unit interval. |
| complex-multiplication | Existing multiplication by \(i\), with product and arguments revealed; retain coordinate context and unchanged operands. |
| bezier | Current asymmetric curve with its control polygon enabled. |
| decasteljau | Existing interpolation levels at an interior parameter; retain separation between levels and suppress redundant thumbnail labels. |
| decasteljau-alternative | Existing component curves and interpolation segment at a parameter where they remain visibly distinct. |
| affine | Single original poster plus a visible loop of an existing transformation and return. Use real supported graph states and a common camera; no split-image composition or new runtime feature. |
| subdivision | Two coloured pieces with their control polygons, split point visible, redundant labels reduced. |
| repeated-subdivision | Two rounds, giving four covering pieces and visibly refined control polygons around the unchanged curve. |
| extrapolation | Moderate extension with original endpoint and extended portion clearly identifiable using existing presentation capabilities. |
| elevation | Single original poster plus a loop comparing the original and one exactly elevated supporting polygon around the unchanged curve. |
| rational | Existing unequal weights, visible polygon, readable weight labels separated from the curve. |
| rational-decasteljau | Construction visible with enough weight information to distinguish rational interpolation; avoid annotation crowding. |
| rational-elevation | Single original poster plus a loop comparing one elevation with supporting polygons and readable existing weights; no split-image composition. |
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
| sequence | Actual starting sequence, enough revealed terms to communicate its behavior, epsilon band and threshold marker. Do not switch examples. |
| uniform-convergence | Actual starting function sequence, limit and epsilon band at a representative supported index. Do not switch examples. |
| fixed-point | Actual starting iteration, diagonal and several deterministic cobweb steps. Do not switch examples. |

## Acceptance and verification

1. Every shipped demonstration has an explicit recipe and a genuine capture of its own route. Preview mapping is exhaustive; asset dimensions and hashes agree with the manifest. In-progress routes are explicitly identified before implementation begins.
2. All static and discrete-preview initial mathematical inputs, route defaults, lesson content and preset behavior remain unchanged. Isolated Bézier movement verifies first/last state and unchanged remaining points; affine motion verifies the supported transform and return. Review the diff for accidental changes outside capture tooling, assets, shared preview playback, tests and documentation.
3. Bernstein shows four cubic basis functions; repeated subdivision shows four pieces; Farin points are present. Assert representative recipe outcomes, including deterministic iteration progress and reveal states, rather than merely waiting for any visible curve.
4. Verify the other targets by reviewing all images at their actual card size. Record any target that cannot be achieved with existing controls and its proposed disposition; do not silently claim completion.
5. Review mathematical fidelity: subdivision and elevation preserve the underlying curve, geometric captures retain equal unit scales, coordinate plots retain useful axes, approximation graphics do not imply exactness, and discontinuities are not joined.
6. Run focused capture/manifest checks, relevant catalog unit tests, TypeScript checking, and the production build. Do not modify unrelated work to make checks pass.
7. Use the smoke-tester workflow and the affected catalog/browser checklist on a stable production build. Check desktop and 390px catalog, picker and carousel views, asset loading, overflow, and representative links opening the unchanged starting scene. Full lesson-runtime testing is unnecessary if runtime and lesson files remain unchanged.
8. Obtain parallel mathematical/engineering review and visual/accessibility review for the multi-preview change. Record coverage gaps, including physical projector/device review if not performed.
9. Verify all six clips at actual card size, including exact algorithm/elevation steps, supported affine transformations and the Bézier curve recomputed from its moved control point. Check the shared poster/clip camera, readable timing and no misleading interpolated geometry. Manifest provenance includes recipe/sample identities, poster selection, source revision and relevant dirty-state fingerprint, frame dimensions/hashes, output clip hashes, duration, MIME type and encoder settings. Do not imply compressed video frames retain PNG pixel hashes.
10. Verify automatic looping in catalog, picker and carousel at desktop and 390px, with no thumbnail playback controls. Check simultaneous visible clips, hover/focus without restarts, reduced motion, offscreen/document-hide cancellation, filtering, picker close, carousel selection, unmount, delayed/failed media, stale events and retained navigation. Observe requests to prove offscreen clips stay unloaded and carousel/catalog use the same media URLs. Record browser coverage and codec fallbacks. Run focused player tests, TypeScript, production build and relevant smoke-tester checks.

## Implementation sequencing

First settle the existing dirty route/catalog work or establish an explicit integration checkpoint with its owner. Implement capture recipes and outcome checks, then regenerate and review the full still set. Prove discrete, smooth, affine and elevation timelines before integrating the shared visible-loop player. Keep regeneration outputs aligned with the same stable source state. Commit only task-owned changes; preserve other work. Follow the linked task dependencies; no implementation is claimed by this planning update.
