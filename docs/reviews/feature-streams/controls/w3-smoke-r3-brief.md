# Wave 3 smoke recheck brief (repair 3)

Frame as `w3-smoke-e-brief.md` (read it and `w3-smoke-e.md` for the findings and their repro). Preview: production build of `2f0017c0` at `http://localhost:4327/bezeg-2.0/` (handler-served; do not start or stop it).

Recheck only:

1. **Reason on press.** `/bezier/subdivision`: press Apply until it is unavailable, focus it, press Enter: the reason appears as visible text (`[data-apply-reason]`) under the button, once per press. `/rational/base` (find the rational base route in `src/demonstrations.ts` if this path is wrong): at first render with weight 1, Reset weight is `aria-disabled="true"`; pressing it shows `[data-reset-weight-reason]` "Ta utež je že 1."; after changing the weight it becomes available. If Reset weight is still available at weight 1 on first render, record the weight value shown and the `aria-disabled` value: that is a failure.
2. **44 px Apply.** At 390×844 with touch emulation, Apply on `/bezier/extrapolation`, `/bezier/elevation`, `/bezier/subdivision` and `/rational/rational-elevation` is at least 44 CSS px high.
3. **Settled trace readout.** `/compgeo/delaunay`: watch `[data-delaunay-live]` while dragging a point in 12 moves 40 ms apart with the button held: the text does not change before mouse-up and changes once within about 1 s after it. Same on `/compgeo/voronoi` (`[data-voronoi-live]`).
4. **Point count.** On `/compgeo/point-set-triangulation` (or another route with the "Točk: N od največ M" line): `p.point-collection-count` has no `role`; pressing "Dodaj točko" puts the new count text into `[data-point-collection-status]`; choosing another example (if the route has an example select) leaves that region empty.

Evidence: `w3-smoke-r3.md`, screenshots under `.command-logs/w3-smoke-r3/`. Return ≤200 words: per item pass/fail with repro for failures.
