# Wave 3 smoke G brief (C29 labels, C30 shared control row)

Frame as `w2-pa-smoke-brief.md`. Preview: production build of `7dcdc1cf` at `http://localhost:4327/bezeg-2.0/` (handler-served; do not start or stop it). Route paths: `src/demonstrations.ts`. Decisions 67, 68 in `docs/specs/shared-graph-controls.md`; evidence `w3-c29.md`, `w3-c30.md`.

**Layout (C30).** Rows moved to `.control-row` (wrapping flex; `--fill` gives equal-width buttons): Delaunay, Triangulation and Voronoi button rows; Euler method step group; B-spline insertion row; Reset example (Voronoi, B-spline graphs); complex multiplication/reciprocal/roots, conic focal, fixed point (bound row), Fourier series, sequence (certificate row), summary statistics, uniform convergence, linear map rows; point-set rows (point-set triangulation) and Pascal steppers. Playback groups lost their wrapper class on bisection, root finding, CLT, fixed point, geometric series and sequence.

Per route, at 1280×800 and 390×844 (touch emulation): no button text clipped or overlapping; rows wrap without horizontal overflow (`document.documentElement.scrollWidth <= clientWidth`); buttons in `.control-row` at least 44 px high at 390 touch; playback groups (`.inspector-playback`) look as before (buttons in one row, not stretched oddly); take one screenshot per route per viewport for the handler to compare.

**Labels (C29).** On bisection, root finding, Euler method, sequence, fixed point, series, hull trace, Fortune, monotone partition and collision inspect: the step button reads "Naslednji korak" / "Next step"; Taylor and fixed point bound buttons read "Pokaži oceno napake"/"Skrij oceno napake" (EN "Show error bound"/"Hide error bound"); point-set "Dodaj točko" and "Počisti"; hull trace counter "Korak k od n". SL→EN→SL on three of them.

Evidence: `w3-smoke-g.md` (write it), screenshots under `.command-logs/w3-smoke-g/`. Return ≤250 words: route × check table, failures first with repro, gaps.
