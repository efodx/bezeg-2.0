# Lesson bug crawl — handler handoff 2 (2026-11-20)

Objective, owner requirements and tooling are unchanged: read [handler-handoff-1.md](handler-handoff-1.md) first
(objective, setup, tooling, reviewer launch prompt). This note records the state at handler 2's soft budget.

## State

- Preview `just preview 4399` is still served from this worktree (http://localhost:4399).
- Crawl: 31 of 37 chapters finished in `.crawl-full/`. The four crawl processes from handler 1 were still running at
  handoff, working through interpolation, ph-curves, parametrization, curve-geometry, probability and randomness. Check
  `grep -h CHAPTER .crawl-full-*.log`. If a process died, rerun the missing chapters with
  `node scripts/lesson-crawl/crawl.cjs --out .crawl-full <chapter>...`.
- Reviewers: **65 of 80 used** (11 in wave 1, 54 by handler 2). All 54 finished. Every crawled chapter has been
  reviewed except `school-function-graphs`. `assign.cjs` recorded its parts 1/2 and 2/2 in `assigned.txt`, but they
  were deliberately not launched because the pilot (`.crawl-pilot/`) already reviewed that chapter; merge the pilot
  review. Kinematics part 1 was rerun into `review-1of2.jsonl` (wave 1 had overwritten it).
- **15 reviewers remain**: run `node scripts/lesson-crawl/assign.cjs .crawl-full` as the last six chapters finish (it
  prints about 11 parts), and launch each with the handoff-1 prompt and `model: haiku`. Keep the spare few for reruns
  of thin parts.
- Reviewer quality: show.cjs prints only medium/high findings and a subset per part, so reviewers sometimes say
  "partial". That is fine: crawler findings reach the triage through `merge.cjs` directly.

## Verified so far (handler 2)

1. **High, reproduced: JSXGraph polygon exception.** Open `/bezeg-2.0/bezier/curve?example=lesson.bezier-curves.control-points.bezier`,
   step to Finish, then click the edit tab's "Zmanjšaj število" (point count −1) → page error "Can't create polygon /
   polygonalchain with parent types other than 'point'…". On a fresh route, the same click works without an error, and
   the lesson alone raises no error. So the lesson's end state (probably a control polygon or hull built over the
   point list) is not rebuilt when the point count drops. Reproduce with
   `node scripts/lesson-crawl/replay.cjs bezeg-2.0/bezier/curve lesson.bezier-curves.control-points.bezier "click:^Zmanjšaj število:1"`
   (pass the route without a leading slash: Git Bash rewrites `/bezeg-2.0/...`).
2. **Systemic, medium: the floating lesson card covers the top of the graph.** It accounts for about 75 % of all raw
   findings (`panel-covers-graph`) in almost every chapter, and reviewers report legends and readouts cut off behind it
   (taylor, level-sets, waves, compound interest, drag-the-track, trigonometric functions, arc length, linear
   programming). Scene framing does not leave room for the card at 1440×900. Treat it as one root cause.
3. **Crawler artefacts, not bugs** (verified live): the `control-unusable` locator timeouts after Finish
   (recursion-growth a₁/q, isometries P1 x all fill and change the graph). The `control-inspector-only` lead on
   "Oznake točk" across all Bézier, rational and spline routes is also an artefact: the labels toggle correctly, but
   JSXGraph labels are HTML, outside the SVG hash. Bernstein "Stopnja polinomov" + adds a function, and the subdivision t,
   extrapolation t and patch u₀ sliders change the graph on fresh routes. Exclude both kinds from the owner list unless
   a specific one reproduces with `replay.cjs`.
4. Still unverified leads worth a replay: complex-roots "z, Re" (no graph change on a fresh route; maybe it depends
   on a toggle without saying so), projective three-views angle input disabled until an unexplained checkbox is on,
   complex-euler "Prikaži hitrost/pospešek" toggles clipped at the inspector bottom edge, trigonometry unit-circle
   toggles and polygon-area "Sklenjen večkotnik" click timeouts, spline-cn steppers dashed (disabled) with no reason,
   Voronoi buttons dashed.

## Reviewer leads to carry into triage (medium, from screenshots; verify before listing)

- Lesson-card text overflow: formula rows clipped at the card's right edge (kinematics tangential-normal step 7,
  analytic-lines forms-of-a-line c = …, isometries classifying-a-motion, b-spline blossom), and truncated card titles
  (determinant-area, Delaunay, rational De Casteljau). Fixed-point card has no title.
- Inspector: "Parameter subdivizije t" field shows 1 while the slider ends at 0,99 (Bézier and rational subdivision).
  Simson-line "Primer" select and the radical-axis construction select truncate their value. Bézier subdivision
  point block clipped at the panel bottom. Circle-constructions coordinate rows misaligned. The "Stopnja krpe" help
  text stops mid-sentence ("…izbrani smer in").
- Content: an English phrase "the same line" in the Slovenian intersections lesson. The rational-subdivision text says
  »Subdividiraj« but the button reads »Subdiviziraj«. The g1-symmetric lesson names sliders b 2, b 3 that are not
  visible. Phase-portrait linear-system frame asks for trajectories that are not drawn (maybe capture timing).
- Graph: tiny or off-centre patches (Coons, patch De Casteljau and derivatives), oversized axis ranges (drag-the-track,
  geometric series, lattice paths, rosettes), overlapping point labels (De Casteljau superscripts, cross-ratio,
  five-point, trace-determinant), root-finding x₁ label floating with its point off-board.

## Next steps

1. Finish the crawl and the remaining reviewer parts (15 left).
2. `node scripts/lesson-crawl/merge.cjs .crawl-full --min medium > .crawl-full/triage.md` plus `.crawl-pilot`.
3. Verify the remaining high and medium groups (`replay.cjs` for after-lesson control behaviour, `probe.cjs` or
   `probe2.cjs` on fresh routes, a screenshot for visual items), then group them by root cause.
4. Present the triaged list to the owner (systemic card overlap, the reproduced runtime error, then grouped visual,
   content and control items) and **wait for his go-ahead before fixing**.
