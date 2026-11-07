# Route probe note (clips step 1)

Script: `scripts/probe-demonstration-clip-routes.cjs`. Result: `route-probe.json` (array of 67). Run: `just build`, `just preview 4319`, `node scripts/probe-demonstration-clip-routes.cjs` (about 11 minutes, one browser, sequential; `--id` repeatable; `--no-change` disables the gesture).

## Method
- IDs derived in the script: 118 Demonstrations in `src/demonstrations.ts` minus 51 keys of `src/demonstrationMotionAssets.ts` = 67. It exits 1 if entries written differ from the derived count.
- Example scene: first entry of the Demonstration in the committed inventories (`docs/reviews/*/guided-example-inventory.json`, with `illustrated-chapter-examples/capture-inventory.json` first), marked `chapterFirst`. Only `linear-map` has two candidates; all others have one. The probe opens that URL, presses the lesson's Skrij/Opazuj button (`applyExploreStep`), opens the Uredi/Prikaz/Shrani tabs and lists visible controls (all `details` forced open).
- `liveCheck.control`: the first non-disabled slider/number control in tab order is set with Playwright `fill` (to a value 75 percent of the way to the far end of its range, snapped to step), then the sha256 of a `#jgbox` element screenshot is compared before and after, both taken after the board settled (baseline stable in all 67).
- `liveCheck.point`: on a fresh page, the first draggable visible JSXGraph point (`draggable()`), mouse down, 60 px by 40 px move, up, same hash comparison. The point must be inside the board and hit-test as part of `#jgbox`.

## The check can fail (acceptance 3)
Same script with `--no-change` (gesture skipped, everything else identical): `curve-offset` and `prob-density` both gave `liveCheck.control=false` and `point=false` (`curve-offset: ok ... live=false/false`, `prob-density: ok ... live=false/false`). With the gesture the same ids gave `true/true` and `true/false`.

## Results (final full run: 67 entries, exit 0)
- probeStatus: ok 67, failed 0. Console or page errors: 0. A first full run had `bspline-deboor` fail with `fill: Malformed value` (floating point step noise); fixed by rounding to the step's decimals, then the full run was repeated.
- `liveCheck.control`: true 67, false 0.
- `liveCheck.point`: true 60, false 1 (`prob-density`: its only draggable points `a` and `b` lie outside the board in the opening window), not-applicable 6 (`curve-parametric`, `interp-runge`, `patch-coons`, `geometric-series`, `prob-clt`, `projective-three-views`: no draggable points).
- Surface view: 1 (`patch-coons`). It has no 2D draggable points; 3D controls are not enumerated, so surface point dragging is unknown.

## Handler correction

Recounted from `route-probe.json`; where this differs from the text below, this section holds.

- `liveCheck.control: true 67` does **not** mean 67 Demonstrations have a working mathematical control. It tests the first enabled slider or number control, which is a view setting for 19 of them (18 "Velikost elementov grafa", 1 camera azimuth on `patch-coons`). Only 48 proved an Uredi control live.
- The 19 are the 18 ids listed below plus `interp-hermite`, whose Uredi slider "Napetost" is disabled in its example scene.
- Of the 19, 17 have a live draggable point. `interp-runge` and `patch-coons` have neither a live point nor a proven mathematical control, so their motion is unproven. They do have other Uredi controls: `interp-runge` a degree stepper, `patch-coons` selects.
- Uredi number fields of kind `text` ("Točka 1, x") were not exercised, and neither were lesson frame actions.
- 61 Demonstrations have draggable points and 6 have none.

## Caveats for steps 2 and 3
- Every Demonstration has a working first slider or number control, so controls that exist but do nothing did not show up. But "first control" is crude: for 18 ids the first slider is in the Prikaz (display) tab because Uredi has none: reduction, interp-runge, interp-subdivision, bspline-insertion, bspline-extraction, patch-coons, function-transformation, function-inverse, polynomial-zeros, root-finding, fourier-series, fourier-coefficients, prob-summary, prob-correlation, linear-map, complex-reciprocal, complex-roots, projective-pascal. Display sliders are view settings (element size, camera), not necessarily the lesson's motion. For those, rows must name points, lesson frame actions (lesson panel buttons are not listed by this probe), or a display slider deliberately.
- `interp-runge` and `patch-coons` have neither a draggable point nor an Uredi slider.
- A hash change proves the picture changed, not that the change is the lesson's intended one; check each row's control against the lesson text.
- The slider jumps 75 percent across its range, so this says nothing about smoothness along a path.
- A number control has a companion text field named "<name>, vrednost" (kind `text` in the JSON).

## Per-id table

| id | surface | edit-tab sliders/numbers | draggable pts | first control tested (tab: name) | ctrl live | point live |
|---|---|---|---|---|---|---|
| reduction | no | 0 | 4 | display: Velikost elementov grafa | true | true |
| arc-length-param | no | 2 | 4 | edit: Število delov N | true | true |
| bezier-clipping | no | 12 | 6 | edit: Točka A_0: x | true | true |
| curve-parametric | no | 2 | 0 | edit: Parameter t | true | not-applicable |
| curve-curvature | no | 1 | 4 | edit: Parameter t | true | true |
| curve-comb | no | 2 | 4 | edit: Ojačitev glavnika | true | true |
| curve-evolute | no | 1 | 3 | edit: Parameter t | true | true |
| curve-offset | no | 2 | 3 | edit: Razdalja d | true | true |
| curve-envelope | no | 2 | 3 | edit: Število premic | true | true |
| interp-lagrange | no | 1 | 4 | edit: Položaj s na krivuljah | true | true |
| interp-hermite | no | 1 | 8 | display: Velikost elementov grafa | true | true |
| interp-runge | no | 0 | 0 | display: Velikost elementov grafa | true | not-applicable |
| interp-least-squares | no | 2 | 4 | edit: Naklon k | true | true |
| interp-subdivision | no | 0 | 4 | display: Velikost elementov grafa | true | true |
| bspline-basis | no | 1 | 5 | edit: Parameter t | true | true |
| bspline-deboor | no | 1 | 4 | edit: Parameter t | true | true |
| bspline-insertion | no | 0 | 4 | display: Velikost elementov grafa | true | true |
| bspline-extraction | no | 0 | 4 | display: Velikost elementov grafa | true | true |
| bspline-nurbs | no | 1 | 9 | edit: Parameter t | true | true |
| bspline-blossom | no | 2 | 4 | edit: Argument a | true | true |
| patch-coons | yes | 0 | 0 | display: Azimut (°) | true | not-applicable |
| function-transformation | no | 0 | 2 | display: Velikost elementov grafa | true | true |
| function-inverse | no | 0 | 1 | display: Velikost elementov grafa | true | true |
| polynomial-zeros | no | 0 | 2 | display: Velikost elementov grafa | true | true |
| rational-function | no | 1 | 3 | edit: Točka x za ostanek | true | true |
| geometric-series | no | 2 | 0 | edit: Prvi člen a | true | not-applicable |
| conic-focal | no | 4 | 1 | edit: Numerična ekscentričnost ε | true | true |
| root-finding | no | 0 | 1 | display: Velikost elementov grafa | true | true |
| quadrature | no | 1 | 2 | edit: Število podintervalov n | true | true |
| euler-method | no | 1 | 1 | edit: Korak h | true | true |
| fourier-series | no | 0 | 1 | display: Velikost elementov grafa | true | true |
| fourier-coefficients | no | 0 | 4 | display: Velikost elementov grafa | true | true |
| epicycles | no | 2 | 12 | edit: Število členov N | true | true |
| prob-density | no | 2 | 2 | edit: Povprečje μ | true | false |
| prob-binomial-normal | no | 2 | 1 | edit: Število poskusov n | true | true |
| prob-clt | no | 6 | 0 | edit: Število seštevancev n | true | not-applicable |
| prob-summary | no | 0 | 7 | display: Velikost elementov grafa | true | true |
| prob-correlation | no | 0 | 4 | display: Velikost elementov grafa | true | true |
| linear-map | no | 0 | 2 | display: Velikost elementov grafa | true | true |
| complex-reciprocal | no | 0 | 2 | display: Velikost elementov grafa | true | true |
| complex-roots | no | 0 | 1 | display: Velikost elementov grafa | true | true |
| triangle-centres | no | 8 | 3 | edit: Točka 1: x | true | true |
| inscribed-angle | no | 10 | 4 | edit: Lega točke P (t, stopinje) | true | true |
| euler-line | no | 8 | 3 | edit: Točka 1: x | true | true |
| simson-line | no | 11 | 4 | edit: Lega točke P (t, stopinje) | true | true |
| inversion | no | 9 | 3 | edit: O: x | true | true |
| orientation | no | 6 | 2 | edit: Točka 1: x | true | true |
| polygon-area | no | 12 | 5 | edit: Točka 1: x | true | true |
| convex-hull | no | 20 | 9 | edit: Točka 1: x | true | true |
| point-in-polygon | no | 14 | 6 | edit: Točka q, x | true | true |
| hull-robustness | no | 8 | 3 | edit: Točka 1: x | true | true |
| bezier-hulls | no | 12 | 6 | edit: Točka A_0: x | true | true |
| ear-clipping | no | 12 | 5 | edit: Točka 1: x | true | true |
| point-set-triangulation | no | 16 | 7 | edit: Točka 1: x | true | true |
| delaunay | no | 10 | 4 | edit: Točka 1: x | true | true |
| voronoi | no | 16 | 8 | edit: Točka 1: x | true | true |
| voronoi-degenerate | no | 10 | 5 | edit: Točka 1: x | true | true |
| interval-sweep | no | 10 | 10 | edit: Interval a: levo krajišče | true | true |
| segment-intersections | no | 16 | 8 | edit: Daljica s1, krajišče 1: x | true | true |
| monotone-partition | no | 14 | 6 | edit: Točka 1: x | true | true |
| monotone-triangulation | no | 14 | 6 | edit: Točka 1: x | true | true |
| fortune | no | 10 | 4 | edit: Točka 1: x | true | true |
| projective-cross-ratio | no | 10 | 7 | edit: Točka A: x | true | true |
| projective-pascal | no | 0 | 6 | display: Velikost elementov grafa | true | true |
| projective-pole-polar | no | 2 | 1 | edit: Točka P: x | true | true |
| projective-five-point | no | 10 | 5 | edit: Točka A: x | true | true |
| projective-three-views | no | 2 | 0 | edit: Višina premice L (c, v desetinkah) | true | not-applicable |
