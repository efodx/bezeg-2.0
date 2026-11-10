# Wave 3 smoke G (C29 labels, C30 shared control row)

Build 7dcdc1cf at localhost:4327. Scripts and outputs: `.command-logs/w3-smoke-g/` (`a.cjs`/`a.out` layout, `b.cjs` labels). 26 routes x 2 viewports (1280x800; 390x844 touch). Hull trace = `/compgeo/convex-hull`; collision inspect = `/harness/collision-playground?count=40&method=sweep`.

## Failures
None observed.

## Layout (C30), automated per route and viewport
- `documentElement.scrollWidth - clientWidth` = 0 on all 52 loads; no visible button with scroll overflow (text clip); 0 console errors.
- `.control-row` buttons min height: 38 px at 1280, 44 px at 390 touch on every route that has the class (delaunay, point-set-triangulation, voronoi, bspline/insertion, euler-method, complex-multiplication/reciprocal/roots, conics, fixed-point, fourier-series, sequence, summary, uniform-convergence, linear-map, pascal). Pascal desktop min is 34 px (desktop, no 44 px requirement).
- `.inspector-playback` groups: buttons on 2 distinct row tops in my metric only because the group holds a counter row plus buttons, not stretched; visual comparison left to the handler via screenshots (`d-*.png`, `m-*.png`). Screenshots are viewport-only, so on 390 the inspector is below the fold (the Voronoi 390 shot shows only the board).
- `/compgeo/ear-clipping` mobile and the routes with no `.control-row` (bisection, root-finding, CLT, geometric-series, Taylor, hull, Fortune, monotone-partition, collision) have none by design.

## Labels (C29), SL
| Route | Result |
|---|---|
| bisection, root-finding, euler, sequence, fixed-point, geometric-series, hull trace, Fortune, monotone partition, collision inspect | "Naslednji korak" present |
| Taylor, fixed point | "Pokaži oceno napake" -> click -> "Skrij oceno napake" |
| delaunay, point-set-triangulation, voronoi, hull, Fortune, monotone | "Dodaj točko", "Počisti vse točke" present (brief says "Počisti"; actual text is "Počisti vse točke") |
| hull trace counter | "Korak 1 od 56"; after Next step "Korak 2 od 56" |

## SL -> EN -> SL (taylor, fixed-point, convex-hull, bisection, point-set-triangulation, sequence)
All relabel: "Next step", "Show/Hide error bound", "Add point", "Clear all points", "Step 1 of 56"; back to SL restores originals; scene state (step 2) kept; 0 errors.

## Gaps
- Euler/Fortune/etc. EN not individually checked beyond the six above; collision EN not checked.
- No visual-clipping judgment beyond DOM metrics; pixel comparison for handler.
- Next-step effect on board only checked via counter (hull).
