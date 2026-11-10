# Wave 3 smoke F brief (R1b readouts outside compgeo; Apply 44 px recheck)

Frame as `w2-pa-smoke-brief.md` (role, setup, evidence rules). Preview: production build of `f72c6526` at `http://localhost:4327/bezeg-2.0/` (handler-served; do not start or stop it). Route paths: `src/demonstrations.ts`. Evidence for the slice: `w3-r1b.md`; decisions 18, 63, 65 in `docs/specs/shared-graph-controls.md`.

**Apply recheck:** at 390×844 with touch emulation, Apply on `/bezier/extrapolation`, `/bezier/elevation`, `/bezier/subdivision` and `/rational/rational-elevation` measures at least 44 CSS px high.

**Routes and checks:**

- **Projective** (cross ratio, five point, Pascal, pole and polar, three views): `[data-projective-status]` blocks visible with no `role`/`aria-live`; exactly one `[data-readout-live]`; dragging a point changes the live text at most once after the drag settles; the former nudge sentence appears in the live text where the graph has one.
- **Complex** (multiplication, reciprocal, roots) and **Linear map**: status lines visible as plain text (`[data-complex-status]`, `[data-linear-map-status]` hooks kept), one `[data-readout-live]`.
- **Functions readouts**: Taylor (or any graph with `FunctionReadout`): rows render as label/value with the same text and spacing as before (`.readout-list-row`); help notes visible, no `role="note"`. Fourier decay notes visible. Root finding help visible.
- **Scroll tables**: Epicycle (`/analysis/epicycles`) table and Bezier clipping table: at 390×844 the table scrolls inside its wrapper; the wrapper is a tab stop with an accessible name only while it scrolls (at 1280×800, if it does not scroll, it is not a tab stop).
- **Patches**: one tensor patch route and the triangular patch route: help notes visible, no `role="note"`.
- **Collision Inspect** (find the harness or chapter route by grepping `CollisionInspect` in `src/`): counter "Dogodek k od n", 1-based after Next; Previous at start shows its reason in a polite region; the live region is empty while playing and speaks after Pause.

Per route also: loads with no console errors; SL→EN→SL relabels and keeps the scene. Two routes at 390×844 touch: controls reachable.

Evidence: `w3-smoke-f.md`, screenshots under `.command-logs/w3-smoke-f/`. Return ≤250 words: route × check table, failures first with repro, gaps.
