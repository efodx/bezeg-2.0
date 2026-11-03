# Active highlight review

**Result:** one additional, medium-confidence scene match. The other strong-looking cases in the sampled scenes are the supplied references or an earlier observation and are not recounted. This review covers active stroke treatment, not construction visibility or a full lesson walkthrough.

Frozen scope is the 45 routes in [the original scope](../recent-graph-ux-2026-11-03/scope.md#included-routes-45). Preview was reachable on port 4324; I used the main graph board `#jgbox > svg`. Provenance in the task brief records HEAD `27f6ac07` and build `d2a3b6465f541c687811692f4ae1b3f720483141` with `dirty: true`; this is not described as a clean-source build.

## Calibration

I viewed the three unchanged references first: [polygon area](references/polygon-area-invisible-triangles.png), [interval sweep](references/interval-sweep-heavy-highlight.png), and [segment intersections](references/segment-intersections-heavy-highlight.png). The polygon image shows that objects inside the SVG can still disappear against a continuous fill. The two card images show how a dark brown/olive under-stroke and a green line can merge into a muddy band or ribbon. I therefore judged rendered weight, overlays, joins, and contrast against resting geometry. A thick or brown stroke by itself was not enough to count as a match.

## Additional scene candidate

### Monotone polygon triangulation — dark layered active triangle

- **Route:** `/compgeo/monotone-triangulation` (`Triangulacija monotonega večkotnika`). On the assigned preview, open **Spoznaj to demonstracijo**, then advance six frames to **Korak 4 od 7 · Okvir 1 od 2**. The lesson describes adding diagonal `v₂–v₆` and completing the first triangle. Viewport was 1600×1000; the SVG box is 1162×660.
- **What is visible:** selected edges become 5 px dark olive (`rgb(88, 116, 69)`) against 2 px green resting edges. A 3 px dashed brown path (`rgb(156, 93, 72)`, 5 px dash/gap, round caps and joins) is layered over the active green diagonal, and the current vertex has a 4 px dark brown ring. At this size, the triangle is readable, but the overlaid diagonal and heavy ring form a muddy local cluster. This is a weaker, structurally distinct match to the supplied cards: their dark backing creates broad ribbons around green intervals/segments, while this scene has one dashed brown-on-green diagonal and separate thick green selected edges. It is not a mathematical error.
- **Active board:** [Korak 4, frame 1](evidence/highlights/monotone-triangulation-step4-frame1-graph.png). **Context:** [same state with lesson text](evidence/highlights/monotone-triangulation-step4-frame1-workspace.png).
- **Resting comparison:** after continuing to **Korak 7 od 7 · Okvir 2 od 2**, the polygon returns to 2 px green edges: [final board](evidence/highlights/monotone-triangulation-final-step7-frame2-graph.png) and [workspace](evidence/highlights/monotone-triangulation-final-step7-frame2-workspace.png).
- **Confidence:** medium. The live active/resting comparison confirms the weight change, but this is one default example and a subjective visual-severity judgment.
- **Direction:** preserve the same triangle fill, vertices, and diagonal sequence, while reducing the active edges to one thinner, consistent accent stroke. Keep the base polygon edges thin and avoid drawing a dashed brown stroke directly over a thick green stroke.

The earlier monotone-partition observation is not counted again. The interval-sweep and segment-intersections treatments are the supplied owner-reference cases; segment intersections also includes the previously reported terminal coincidence knot. The polygon-area reference concerns invisible construction parts, not active highlights, and is not a new finding here.

I screened but did not retain the bold orange diagonal in point-set triangulation and the orange Delaunay edge: each reads as one distinct accent without a dark under-stroke. The orange secant in root-finding is similarly legible. These are useful counterexamples to rejecting all thick or warm-colored lines.

## 45-route screening inventory

Each row below was visually screened in its family's **opening, middle, and final** contact-sheet samples; route names and sampled frames are shown on the sheets. These are broad samples, not complete lesson walks. Only the monotone-triangulation case above received targeted live frame-by-frame reproduction and a resting-state comparison. Intermediate frames and non-default lesson examples remain gaps for the other routes. I did not inspect catalog posters in this scene-focused assignment; the separate native-card review owns those.

### Geometry (18)

Evidence: [geometry sheet 1](../graph-aesthetics-2026-11-03/evidence/geometry/coverage-1.png), [sheet 2](../graph-aesthetics-2026-11-03/evidence/geometry/coverage-2.png), [sheet 3](../graph-aesthetics-2026-11-03/evidence/geometry/coverage-3.png). Each sheet contains opening, middle, and final samples.

| Lesson ID | Route | Screen result and gap |
| --- | --- | --- |
| `triangle-centres` | `/triangle-centres` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `inscribed-angle` | `/inscribed-angle` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `euler-line` | `/euler-line` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `simson-line` | `/simson-line` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `inversion` | `/inversion` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `orientation` | `/compgeo/orientation` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `polygon-area` | `/compgeo/polygon-area` | Filled construction appears as in the visibility reference; separate visibility concern, not counted as an active-highlight finding. |
| `convex-hull` | `/compgeo/convex-hull` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `ear-clipping` | `/compgeo/ear-clipping` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `point-set-triangulation` | `/compgeo/point-set-triangulation` | Bold orange diagonal is a single distinct stroke; not a muddy layered match. Intermediate frames not individually reviewed. |
| `delaunay` | `/compgeo/delaunay` | Final orange diagonal is a single distinct accent; not a muddy layered match. Intermediate frames not individually reviewed. |
| `voronoi` | `/compgeo/voronoi` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `voronoi-degenerate` | `/compgeo/voronoi-degenerate` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `interval-sweep` | `/compgeo/interval-sweep` | Supplied owner-reference case; not counted again. Intermediate frames not individually reviewed. |
| `segment-intersections` | `/compgeo/segment-intersections` | Supplied owner-reference treatment and previously reported terminal coincidence knot; not counted again. |
| `monotone-partition` | `/compgeo/monotone-partition` | Earlier observation; not counted again. Intermediate frames not individually reviewed. |
| `monotone-triangulation` | `/compgeo/monotone-triangulation` | Additional candidate; live active/resting comparison above. Other intermediate frames not individually reviewed. |
| `fortune` | `/compgeo/fortune` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |

### Functions and projective conics (14)

Evidence: [functions sheet 1](../graph-aesthetics-2026-11-03/evidence/functions/functions-contact-1.png), [sheet 2](../graph-aesthetics-2026-11-03/evidence/functions/functions-contact-2.png), [sheet 3](../graph-aesthetics-2026-11-03/evidence/functions/functions-contact-3.png). Each sheet contains opening, middle, and terminal samples.

| Lesson ID | Route | Screen result and gap |
| --- | --- | --- |
| `function-transformation` | `/functions/transformations` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `function-inverse` | `/functions/inverse` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `polynomial-zeros` | `/functions/polynomial-zeros` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `rational-function` | `/functions/rational-functions` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `root-finding` | `/analysis/root-finding` | Orange secant remains a distinct accent in the terminal sample; not a muddy layered match. Intermediate frames not individually reviewed. |
| `quadrature` | `/analysis/quadrature` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `euler-method` | `/analysis/euler-method` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `fourier-series` | `/analysis/fourier-series` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `fourier-coefficients` | `/analysis/fourier-coefficients` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `projective-cross-ratio` | `/projective/cross-ratio` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `projective-pascal` | `/projective/pascal` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `projective-pole-polar` | `/projective/pole-polar` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `projective-five-point` | `/projective/five-point` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `projective-three-views` | `/projective/three-views` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |

### B-splines, probability, and maps (13)

Evidence: [opening sheets 1–3](../graph-aesthetics-2026-11-03/evidence/curves/contact-opening-set1.png) ([2](../graph-aesthetics-2026-11-03/evidence/curves/contact-opening-set2.png), [3](../graph-aesthetics-2026-11-03/evidence/curves/contact-opening-set3.png)); [middle sheets 1–3](../graph-aesthetics-2026-11-03/evidence/curves/contact-middle-set1.png) ([2](../graph-aesthetics-2026-11-03/evidence/curves/contact-middle-set2.png), [3](../graph-aesthetics-2026-11-03/evidence/curves/contact-middle-set3.png)); [final sheets 1–3](../graph-aesthetics-2026-11-03/evidence/curves/contact-final-set1.png) ([2](../graph-aesthetics-2026-11-03/evidence/curves/contact-final-set2.png), [3](../graph-aesthetics-2026-11-03/evidence/curves/contact-final-set3.png)). Each set samples five, five, and three lessons respectively.

| Lesson ID | Route | Screen result and gap |
| --- | --- | --- |
| `bspline-basis` | `/bspline/basis` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `bspline-deboor` | `/bspline/deboor` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `bspline-insertion` | `/bspline/insertion` | Orange fill/curve accents remain separated; no muddy layered active stroke in sampled frames. Intermediate frames not individually reviewed. |
| `bspline-extraction` | `/bspline/extraction` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `bspline-nurbs` | `/bspline/nurbs` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `prob-density` | `/probability/density` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `prob-binomial-normal` | `/probability/binomial-normal` | Highlighted probability bars remain visibly separate; no muddy layered stroke. Intermediate frames not individually reviewed. |
| `prob-clt` | `/probability/clt` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `prob-summary` | `/probability/summary` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `prob-correlation` | `/probability/correlation` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `linear-map` | `/linear-map` | Dense grid lines are thin and even; no comparable muddy active highlight. Intermediate frames not individually reviewed. |
| `complex-reciprocal` | `/complex-reciprocal` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |
| `complex-roots` | `/complex-roots` | No comparable muddy active stroke in sampled frames; intermediate frames not individually reviewed. |

No source files, dependencies, or application behavior were changed. Browser/capture processes were closed after the review; the shared preview remains handler-owned.
