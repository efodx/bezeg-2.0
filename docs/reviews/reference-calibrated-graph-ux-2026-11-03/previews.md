# Native catalog card review

## Method and calibration

I viewed the three unaltered owner references first. The polygon-area reference sets a visibility standard: a lesson's construction parts must be distinguishable in the rendered graph, not merely present in source or SVG. The interval-sweep and segment-intersections references establish that readable lines can still be visually harsh when a wide dark brown/olive under-stroke sits behind green geometry.

I opened the frozen app's `/bezeg-2.0/demonstrations` route at HTTP 200. Playwright captured each of the 45 in-scope cards from the rendered UI at a 1680×1100 viewport and device scale factor 1. All media boxes measured 328×200 CSS px; the enclosing cards were 330 px wide and 400–461 px high depending on the copy. Each source poster decoded at 720×440. The [capture manifest](evidence/previews/cards-manifest.json) records every exact card/media rectangle, historical rendered asset URL, intrinsic image dimensions, title, and screenshot filename. The eight unscaled contact sheets ([1](evidence/previews/contact-01.png), [2](evidence/previews/contact-02.png), [3](evidence/previews/contact-03.png), [4](evidence/previews/contact-04.png), [5](evidence/previews/contact-05.png), [6](evidence/previews/contact-06.png), [7](evidence/previews/contact-07.png), [8](evidence/previews/contact-08.png)) show up to six complete cards each at captured pixel size; I also opened all listed individual candidates at their captured size. Loopback URLs record inspection targets; the committed PNGs remain usable after preview cleanup.

The scoped 45 IDs have no entries in `demonstrationMotionAssets`, so no hover video clips apply to this set. All captured frames are default static posters; no hover or focused state is claimed.

## Findings and confirmed references

### Previously observed board treatment, newly confirmed on the catalog card

**`monotone-partition` — medium confidence for the stroke match; severity is subjective.** Route `/bezeg-2.0/demonstrations`, card `demonstration-card-monotone-partition`, default static poster; no control or hover state. The thick dark brown/olive active boundary is laid directly over the green polygon edge. At 328×200 px it reads as a muddy ribbon beside the remaining thin green edges and orange sweep line. This is new native-card evidence for the monotone-partition board treatment already noted in the lesson review, not a new independent app-wide defect. See [native card capture](evidence/previews/poster-monotone-partition.png); the captured asset path is `/bezeg-2.0/assets/monotone-partition-WviA_u-e.png`. A narrower active overlay with a distinct hue or dash pattern could preserve the current-edge meaning while letting the green boundary remain visually separate.

### Owner-confirmed card references (not new findings)

- **`interval-sweep`** (`demonstration-card-interval-sweep`): the default poster at [328×200 px](evidence/previews/poster-interval-sweep.png) confirms the thick dark under-stroke behind a green active interval. This is the supplied owner reference, not an additional instance. Its render URL is `http://127.0.0.1:4325/bezeg-2.0/assets/interval-sweep-R8Ot00tx.png`.
- **`segment-intersections`** (`demonstration-card-segment-intersections`): the default poster at [328×200 px](evidence/previews/poster-segment-intersections.png) confirms dark layered strokes behind green segments meeting at the central event. This is the supplied owner reference. It shows a distributed crossing event, not the previously reported terminal coincident-event knot. Render URL: `http://127.0.0.1:4325/bezeg-2.0/assets/segment-intersections-B3lHdKCQ.png`.

### Prior board visibility reference; not promoted from card-only evidence

**`polygon-area`** has a uniform pale fill and grid marks in its [default poster](evidence/previews/poster-polygon-area.png), with no visibly separated triangle pieces. The supplied visibility reference is a lesson-board state where construction triangles are expected; the poster copy only describes signed area by the shoelace formula. The card capture therefore does not establish whether an enabled triangle construction is missing, and I do not count it as a new card finding.

The nearby `monotone-triangulation` poster is excluded from the muddy-ribbon finding: its active edges remain green, and the dark circular event marker is visually separate. See [native card capture](evidence/previews/poster-monotone-triangulation.png).

## 45-card screening inventory

Every row below is a native rendered card screenshot in the linked evidence folder. “No match” means no confident card-level example of the calibrated muddy-highlight or indistinguishable-construction failures; it is not a general design endorsement.

| Card ID | Native rendered evidence | Screening result |
| --- | --- | --- |
| `triangle-centres` | [poster](evidence/previews/poster-triangle-centres.png) | Dense construction lines, but centers remain visibly differentiated; no calibrated match. |
| `inscribed-angle` | [poster](evidence/previews/poster-inscribed-angle.png) | Chord, arc, and angle marks remain distinguishable; no match. |
| `euler-line` | [poster](evidence/previews/poster-euler-line.png) | Central geometry is dense; no clear missing construction or muddy highlight. |
| `simson-line` | [poster](evidence/previews/poster-simson-line.png) | Several construction lines, visually separable at card size; no match. |
| `inversion` | [poster](evidence/previews/poster-inversion.png) | Source and image circles remain distinct; no match. |
| `orientation` | [poster](evidence/previews/poster-orientation.png) | Shaded oriented triangle and baseline are legible; no match. |
| `polygon-area` | [poster](evidence/previews/poster-polygon-area.png) | Uniform fill is visible; see the separate board-reference note above. |
| `convex-hull` | [poster](evidence/previews/poster-convex-hull.png) | Initial scatter state is clear; no calibrated match. |
| `ear-clipping` | [poster](evidence/previews/poster-ear-clipping.png) | Triangular pieces and diagonals are visible; no match. |
| `point-set-triangulation` | [poster](evidence/previews/poster-point-set-triangulation.png) | Mesh edges remain visible at native size; no match. |
| `delaunay` | [poster](evidence/previews/poster-delaunay.png) | Highlighted diagonal and empty-circle context remain legible; no muddy ribbon. |
| `voronoi` | [poster](evidence/previews/poster-voronoi.png) | Cell edges and central cells remain distinct; no match. |
| `voronoi-degenerate` | [poster](evidence/previews/poster-voronoi-degenerate.png) | Degenerate cells use broad fills, but boundaries remain differentiated; no match. |
| `interval-sweep` | [poster](evidence/previews/poster-interval-sweep.png) | Owner-confirmed dark under-stroke reference; not counted as new. |
| `segment-intersections` | [poster](evidence/previews/poster-segment-intersections.png) | Owner-confirmed dark layered segments; not counted as new or as the terminal event. |
| `monotone-partition` | [poster](evidence/previews/poster-monotone-partition.png) | Repeats the earlier board stroke treatment on a new card surface; see finding above. |
| `monotone-triangulation` | [poster](evidence/previews/poster-monotone-triangulation.png) | Thick green active edges and separate dark event ring; excluded from muddy-ribbon matches. |
| `fortune` | [poster](evidence/previews/poster-fortune.png) | Multiple sweep/construction curves remain distinguishable; no match. |
| `function-transformation` | [poster](evidence/previews/poster-function-transformation.png) | Parent and transformed curves remain separated; no match. |
| `function-inverse` | [poster](evidence/previews/poster-function-inverse.png) | Graphs and identity line remain distinct; no match. |
| `polynomial-zeros` | [poster](evidence/previews/poster-polynomial-zeros.png) | Roots and multiplicity marker are visible; no match. |
| `rational-function` | [poster](evidence/previews/poster-rational-function.png) | Asymptotes and curve branches remain distinguishable; no match. |
| `root-finding` | [poster](evidence/previews/poster-root-finding.png) | Iteration markers remain visible on the curve; no match. |
| `quadrature` | [poster](evidence/previews/poster-quadrature.png) | Region fill and curve are differentiated; no match. |
| `euler-method` | [poster](evidence/previews/poster-euler-method.png) | Slope field and solution steps remain visible; no match. |
| `fourier-series` | [poster](evidence/previews/poster-fourier-series.png) | Partial sum and target are both visible; no match. |
| `fourier-coefficients` | [poster](evidence/previews/poster-fourier-coefficients.png) | Shaded signed regions remain distinct; no match. |
| `projective-cross-ratio` | [poster](evidence/previews/poster-projective-cross-ratio.png) | Points are clustered but still separated in the poster; no confident card finding. |
| `projective-pascal` | [poster](evidence/previews/poster-projective-pascal.png) | Conic points and lines remain visible; no match. |
| `projective-pole-polar` | [poster](evidence/previews/poster-projective-pole-polar.png) | Polar, conic, and pole remain distinct; no match. |
| `projective-five-point` | [poster](evidence/previews/poster-projective-five-point.png) | Five points and conic remain distinguishable; no match. |
| `projective-three-views` | [poster](evidence/previews/poster-projective-three-views.png) | Two conic views remain separated; no match. |
| `bspline-basis` | [poster](evidence/previews/poster-bspline-basis.png) | Basis curves remain distinguishable; no match. |
| `bspline-deboor` | [poster](evidence/previews/poster-bspline-deboor.png) | Control points and curve are visible; no match. |
| `bspline-insertion` | [poster](evidence/previews/poster-bspline-insertion.png) | Knot-insertion hatching is dense but distinct from the curve; no match. |
| `bspline-extraction` | [poster](evidence/previews/poster-bspline-extraction.png) | Curve and control polygon remain distinct; no match. |
| `bspline-nurbs` | [poster](evidence/previews/poster-bspline-nurbs.png) | Circle and control points are separated; no match. |
| `prob-density` | [poster](evidence/previews/poster-prob-density.png) | Interval fill is visibly bounded by the curve; no match. |
| `prob-binomial-normal` | [poster](evidence/previews/poster-prob-binomial-normal.png) | Bars, curve, and shaded mass remain differentiated; no match. |
| `prob-clt` | [poster](evidence/previews/poster-prob-clt.png) | Two curves are close but separately traceable; no match. |
| `prob-summary` | [poster](evidence/previews/poster-prob-summary.png) | Box plot and data marks remain distinguishable; no match. |
| `prob-correlation` | [poster](evidence/previews/poster-prob-correlation.png) | Scatter and fitted line remain clear; no match. |
| `linear-map` | [poster](evidence/previews/poster-linear-map.png) | Grid is dense but transformed shapes remain visible; no match. |
| `complex-reciprocal` | [poster](evidence/previews/poster-complex-reciprocal.png) | Source and image points/lines remain differentiated; no match. |
| `complex-roots` | [poster](evidence/previews/poster-complex-roots.png) | Roots are distributed on the circle; no match. |

## Limits

This screening covers static catalog posters only, at one desktop viewport. No scoped card has a shipped hover video, so hover clips were not applicable. I did not reopen the 45 lesson boards or revalidate prior board states; card imagery cannot establish whether a board's optional construction control is enabled. No app source or dependency was edited, and no tests or build were run.
