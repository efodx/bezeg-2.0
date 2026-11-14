# Site walkthrough: graphs and captures (package D)

Status: **approved by the owner 2026-11-14** after the pilot preview; phase 3 is in progress. Written for the owner's [site walkthrough](site-walkthrough-intake-2026-11-14.md), package D, session `graphs`, against `master` at `dbf3ff60`. Phase 1 (this spec) is planning; phase 2 is a three-example pilot shown as a preview; phase 3, the rest in batches, does not start until the owner approves the pilot and the policy. Queue: [docs/tasks/site-walkthrough/graphs.md](../tasks/site-walkthrough/graphs.md). State: [docs/reviews/site-walkthrough/graphs/state.md](../reviews/site-walkthrough/graphs/state.md).

Covers intake IDs **G01–G07** and the intake's example table.

**Owner's answers, 2026-11-14, on the pilot preview.** (1) The capture-text rule, including the kept `r` on the correlation card: yes. (2) The three pilot directions: "All look good direction, but you can maybe play with the colors or something to make them even nicer." (3) Literata for plain graph text: "I'm okay with that." (4) Convexity as a smooth sweep: yes. The sections below keep their wording as proposals with alternatives; these answers settle them. Per-row verdicts and per-example directions in later batches follow the approved rule and are shown on the preview as they land.

**What the owner was asked to approve.** The capture-text policy and its per-capture table, the shared typography treatment (G01), the per-example directions, the G06 fix and the yardstick drawn from the positive references are recommendations. Each names the alternatives considered. Nothing here changes a graph, a style or a capture on `master` until it is approved; facts found by investigation (ids, routes, today's fonts, the cause of G06) are stated as facts.

## Goal and limits

Make the weak graphs and their catalog captures as inviting as the ones the owner likes, without changing mathematical meaning.

- Appearance, capture scene and capture presentation may change. Evaluation, constructions, default mathematical inputs of the live graph, routes, preset formats and lesson scenes may not, except where a row below says so with its reason.
- Inspector panels and controls are not edited; [control choice](control-choice-and-composition.md) owns them.
- The epicycles example (G07) is left alone until the owner's pick is recorded in the intake or the `design` session's state note.
- The clips stream is complete. The 20 Demonstrations with no poster or clip and the two with a poster but no clip (`ear-clipping`, `projective-pascal`) are its unfinished work, not defects of this package: `lattice-paths`, `counting-tree`, `circle-construction`, `complex-power`, `complex-euler`, `curve-kinematics`, `phase-portrait`, `logistic-map`, `waves`, `isometries`, `contour-map`, `linear-program`, `line-geometry`, `mechanics-descent`, `prob-simulation`, `recursion-cobweb`, `recursion-growth`, `solids`, `unit-circle`, `triangle-solver`. A batch finishes one only when that is the cheapest way to meet this package's goal.

## Evidence used

Read on 2026-11-14: `scripts/demonstration-previews/manifest.json` (118 posters, 116 clips), all 118 posters as contact sheets, `scripts/capture-demonstration-previews.cjs` (`presentBoard`), the clip row files, `src/graphs/styles/`, the text-creating graph code, the installed JSXGraph 1.14 source, and the specs the intake lists under "Graphs and captures". The raw per-capture text inventory is in [capture-text-raw.json](../reviews/site-walkthrough/graphs/capture-text-raw.json).

Earlier work this builds on, none of which is reopened: [graph visual style](graph-visual-style.md) set the role palette (`GraphPalette`); [palette refinement](graph-palette-refinement.md) fixed eleven named graphs on 2026-11-03 and forbids a silent global palette replacement; [rendered style contracts](rendered-graph-style-contracts.md) test drawn styles on the real SVG renderer; [concept-led previews](concept-led-demonstration-previews.md) and [continuous motion](continuous-motion-previews.md) define the clip contract (96 frames, 24 fps, 300 KiB, camera held, loop closes); [lesson-guided clips](lesson-guided-catalog-clips.md) define rows.

## Capture-text policy (intake decision 5, G03, G04): recommendation

**Recommended rule.** A catalog capture (poster and clip) carries no localized words. Pixels are shared by both languages, so a Slovenian word in a capture is wrong on the English page. Live graph labels are not affected: they stay localized and unchanged unless a batch row changes the graph itself.

What a capture may keep, chosen per Demonstration in the table below:

1. **Axis numbers and axis names** (`Re`, `Im`), where the recipe keeps the coordinate context. The decimal comma in a tick is accepted: it is a number, not prose.
2. **Symbols that name a drawn object**: `T`, `N`, `E`, `f`, `g`, `S(u,v)`, `x₁`, `s1`, `v6`, knot multiplicities.
3. **One formula line** that says which function or distribution is drawn (`f(x) = x²`, `X ∼ N(0; 1²)`).
4. **Numbers that are the result of the motion** (a signed area, `r = …`, equal angles, a cross-ratio), with their words stripped.
5. **Weights**, only where the clip changes a weight or the result is a new set of weights.

Everything else is removed from the capture: titles, readout sentences, legends, status lines, step counters, and any number the viewer cannot read at card size.

**Exceptions with words.** None are proposed. Where the words looked like the content (vertex kinds in the monotone partition, extremum kinds, "left turn"), marker shape, colour or sign already carries it, so the words are stripped and the symbol stays. A later batch that finds a Demonstration whose idea cannot be read without a word records it here under its capture id with the reason, and that capture then shows Slovenian on both pages until per-language captures exist.

**Alternatives.** (a) Per-language captures: every word could stay, but 234 media files and every capture run double; not recommended for cost. (b) Remove all board text including symbols and formulas: simplest, but the owner ruled out a blanket rule (G04) and several references lose their anchor (`x₁`, `Re`, `Im`). (c) Keep today's captures and only fix the named examples: leaves Slovenian on the English page in about 35 captures. The recommendation is the rule above. The verdict in each table row is a proposal the owner can overrule row by row.

**Mechanism (capabilities C1–C3, built once).** `presentBoard` in `scripts/capture-demonstration-previews.cjs` is the one place every poster and clip frame passes through. Today it hides point names and, on windowed routes, any text longer than 65 characters; 28 captures lose their readout that way by accident of length. The policy replaces that length rule with an explicit recipe field:

- **C1 `text` on the recipe** (`scripts/demonstration-preview-recipes.cjs`): `{keep: [...patterns], strip: [...patterns]}`. A board text object that is not an axis label is hidden unless its content matches a `keep` pattern; `strip` patterns are removed from a kept plain-text object's rendered content each frame. A missing field means hide all. The existing `annotations` value is derived from it. The manifest records, per capture, the kept and hidden strings. Guided-example cards share `presentBoard`; they keep today's behaviour until their own decision (out of scope here), so C1 is passed in by the catalog capture and not hard-wired.
- **C2 caption lines** (`BaseFunctionGraph.caption`): each line's `<div>` gets a `data-caption-line` attribute (`math` or `text`, from the existing `math` flag), so the capture keeps the formula line and hides the others. No visual change to the live graph.
- **C3 a tooling test** in `just tooling-test`: every string the manifest records as kept matches a language-neutral pattern (no run of three or more letters outside a short allowlist of mathematical names such as `sin`, `cos`, `exp`, `Re`, `Im`). A capture with a word exception needs an entry naming its reason.

`presentBoard`'s source is fingerprinted (`presentationFingerprint`), so the first capture after C1 runs with `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`, and every capture whose verdict is not "No text" is recaptured in its batch.

### Every catalog capture

Verdicts: **No text** (nothing to do), **Keep**, **Remove**, **Keep in part**. "Already hidden by length" means today's 65-character rule removes it; the verdict makes that deliberate. Totals: 29 no text, 24 keep, 37 remove, 28 keep in part.

| Capture id | Route | Verdict | Reason |
| --- | --- | --- | --- |
| `bernstein` | `/bernstein` | Keep | Axis numbers only; they give the unit interval its scale. |
| `complex-multiplication` | `/complex-multiplication` | Keep in part | Keep the axis names `Re`, `Im`; remove the block. |
| `bezier` | `/bezier/curve` | No text | No board text in the frame. |
| `decasteljau` | `/bezier/decasteljau` | No text | No board text in the frame. |
| `decasteljau-alternative` | `/bezier/decasteljau2` | No text | No board text in the frame. |
| `affine` | `/bezier/affine` | No text | No board text in the frame. |
| `subdivision` | `/bezier/subdivision-2` | No text | No board text in the frame. |
| `repeated-subdivision` | `/bezier/subdivision` | No text | No board text in the frame. |
| `extrapolation` | `/bezier/extrapolation` | No text | No board text in the frame. |
| `elevation` | `/bezier/elevation` | No text | No board text in the frame. |
| `reduction` | `/bezier/reduction` | Remove | Two Slovenian status sentences above the curves; the owner asked for the curves without them. |
| `arc-length-param` | `/bezier/arc-length` | Remove | `t`, `s(t)` and `L` readouts; the evenly spaced markers carry the idea. |
| `bezier-clipping` | `/bezier/clipping` | No text | No board text in the frame. |
| `rational` | `/rational/base` | Keep | Weights `w_i`: the clip changes a weight, so the label is the subject. Language-neutral. |
| `rational-decasteljau` | `/rational/rational-decasteljau` | No text | No board text in the frame. |
| `rational-elevation` | `/rational/rational-elevation` | Keep | Weights `w_i`: elevation produces new weights, which are the result. |
| `rational-extrapolation` | `/rational/rational-extrapolation` | Remove | Weights do not change in this clip and crowd the extended arc. |
| `rational-subdivision` | `/rational/rational-subdivision` | Remove | Weights do not move; the two coloured pieces are the subject. |
| `farin` | `/rational/farin-points` | Remove | Owner: hide the ratios and the weights so the slider-driven curve is foregrounded. Example-specific. |
| `circle` | `/rational/circlen` | No text | No board text in the frame. |
| `spline-cn` | `/spline/spline` | No text | No board text in the frame. |
| `spline-c1` | `/spline/c1spline` | No text | No board text in the frame. |
| `spline-c2` | `/spline/c2spline` | No text | No board text in the frame. |
| `spline-g1` | `/spline/g1spline` | No text | No board text in the frame. |
| `spline-g1-symmetric` | `/spline/g1-sym-spline` | No text | No board text in the frame. |
| `ph-cubic` | `/ph/cubic` | Remove | Arc-length readout ("Dolžina loka"), named by the owner. |
| `ph-quintic` | `/ph/quintic` | Remove | Arc-length readout, as for `ph-cubic`. |
| `spline-parameterization` | `/param/param/alphaparam2` | No text | No board text in the frame. |
| `weighted-parameterization` | `/param/param/alphaparam` | No text | No board text in the frame. |
| `uniform-parameterization` | `/param/param/uniform` | Remove | Arc-length readout above the curve. |
| `curve-parametric` | `/curve-geometry/parametric` | Remove | One long Slovenian readout line across the top. |
| `curve-curvature` | `/curve-geometry/curvature` | Keep in part | Keep the vector names `T`, `N`; remove the three-line Slovenian readout. |
| `curve-comb` | `/curve-geometry/comb` | Remove | Slovenian join readout across the top. |
| `curve-evolute` | `/curve-geometry/evolute` | Keep in part | Keep `T`, `N`, `E`; remove the readout block. |
| `curve-offset` | `/curve-geometry/offset` | Remove | Three Slovenian status sentences. |
| `curve-envelope` | `/curve-geometry/envelope` | Remove | "Število premic" and the `t` readout; the owner wants the animation foregrounded. |
| `interp-lagrange` | `/interpolation/lagrange` | Remove | Long weights readout (already hidden by the 65-character rule; made explicit). |
| `interp-hermite` | `/interpolation/hermite` | Remove | Slovenian spline name and tension. |
| `interp-runge` | `/interpolation/runge` | Remove | Slovenian error readout (already hidden by length). |
| `interp-least-squares` | `/interpolation/least-squares` | Remove | Slovenian fit readout and legend (already hidden by length). |
| `interp-subdivision` | `/interpolation/subdivision` | Remove | Slovenian rule and step line. |
| `bspline-basis` | `/bspline/basis` | Keep in part | Keep the knot labels `0 (×3)`, `1`, `2 (×3)`: multiplicity is the content. Remove "definicijsko območje" and the readout. |
| `bspline-deboor` | `/bspline/deboor` | Remove | Long Slovenian table of levels (already hidden by length). |
| `bspline-insertion` | `/bspline/insertion` | No text | No board text in the frame. |
| `bspline-extraction` | `/bspline/extraction` | No text | No board text in the frame. |
| `bspline-nurbs` | `/bspline/nurbs` | No text | No board text in the frame. |
| `bspline-blossom` | `/bspline/blossom` | Keep | The blossom label `f(0; 0,5)` is the concept and is language-neutral. |
| `patch-tensor` | `/patches/tensor` | Keep | Surface symbol `S(u,v)`. |
| `patch-decasteljau` | `/patches/decasteljau` | Keep | Surface symbol. |
| `patch-derivatives` | `/patches/derivatives` | Keep | `S_u`, `S_v`, `n`: the vectors are the subject. |
| `patch-subdivision` | `/patches/subdivision` | Keep | Piece symbols. They overlap at card size; fix the overlap in the patches batch. |
| `patch-joins` | `/patches/joins` | Keep | Piece symbols; same overlap note. |
| `patch-triangular` | `/patches/triangular` | Keep | Surface symbol. |
| `patch-coons` | `/patches/coons` | No text | No board text in the frame. |
| `linear-function` | `/functions/linear` | Keep | `Δx`, `Δy` and `y = 2x + 1` are the slope triangle. Mathematics, no words. |
| `exponential-function` | `/functions/exponential` | Keep | Formula line only. |
| `trigonometric-functions` | `/functions/trigonometric` | Keep | Formula line only. |
| `function-transformation` | `/functions/transformations` | Keep | Formula and mapped point; mathematics only. |
| `function-inverse` | `/functions/inverse` | Keep in part | Keep the formula line; remove the Slovenian slope line. |
| `polynomial-zeros` | `/functions/polynomial-zeros` | Keep in part | Keep `×2` and the factored formula; remove "stopnja 3". |
| `rational-function` | `/functions/rational-functions` | Keep in part | Keep the asymptote equations and the formula; remove the degree sentence. |
| `geometric-series` | `/functions/geometric-series` | Remove | Six-line Slovenian readout and legend (already hidden by length). |
| `conic-focal` | `/functions/conics` | Remove | Readout block with the conic name (already hidden by length). |
| `continuity` | `/functions/continuity` | Remove | Slovenian jump and limit sentences; the open and filled endpoints show the jump. |
| `derivative` | `/functions/derivative` | Keep in part | Keep `f(x) = x²`; remove the Slovenian slope line. |
| `definite-integral` | `/functions/integral` | Keep in part | Keep the formula; remove "vsota …, integral …". |
| `area-between-curves` | `/functions/area-between` | Keep in part | Keep the curve names `f`, `g`; remove the readout block. |
| `arc-length` | `/functions/arc-length` | Keep in part | Keep the formula; remove "lomljenka …, lok …". |
| `bisection` | `/analysis/bisection` | Keep in part | Keep the formula; remove "korak …, širina …". |
| `root-finding` | `/analysis/root-finding` | Keep in part | Keep the formula; remove the step line from the pixels (the clip driver still reads it from the DOM). |
| `quadrature` | `/analysis/quadrature` | Remove | Readout block (already hidden by length). |
| `euler-method` | `/analysis/euler-method` | Remove | Readout block (already hidden by length). |
| `mean-value` | `/analysis/mean-value` | Keep in part | Keep the formula; remove the Slovenian slope line. |
| `accumulation` | `/analysis/accumulation` | Keep in part | Keep the `+` area sign; remove the legend and readout block. |
| `darboux` | `/analysis/darboux` | Remove | Readout and legend (already hidden by length). |
| `extrema` | `/analysis/extrema` | Keep in part | Keep the sign row and the value lines such as `f(−1) = 1`; strip the Slovenian kind words. The marker shapes carry the kind. |
| `convexity` | `/analysis/convexity` | Remove | Readout and legend (already hidden by length). |
| `taylor` | `/analysis/taylor` | Remove | Readout and legend (already hidden by length). |
| `sequence` | `/analysis/sequence` | Keep in part | Keep the index marker `N`; remove the block. |
| `uniform-convergence` | `/analysis/uniform-convergence` | Remove | Readout block. |
| `fourier-series` | `/analysis/fourier-series` | Remove | Readout block. |
| `fourier-coefficients` | `/analysis/fourier-coefficients` | Remove | Readout and legend. |
| `epicycles` | `/analysis/epicycles` | No text | No board text in the frame. |
| `fixed-point` | `/analysis/fixed-point` | Keep in part | Keep the iterate name `x₁`; remove the block. |
| `prob-density` | `/probability/density` | Keep in part | Keep `X ∼ N(0; 1²)`; remove the Slovenian area sentence. |
| `prob-binomial-normal` | `/probability/binomial-normal` | Keep in part | Keep `X ∼ B(20; 0,5)`; remove the two readout lines. |
| `prob-clt` | `/probability/clt` | Remove | Two Slovenian sentences (already hidden by length). |
| `prob-summary` | `/probability/summary` | Remove | "sredina", "mediana" and the count line. The graph batch must make mean and median tell apart without words. |
| `prob-correlation` | `/probability/correlation` | Keep in part | Keep `r = …`, the number the lesson says to watch; remove the title and the "regresijska premica za y" line label. |
| `linear-map` | `/linear-map` | Keep | Column vectors `a₁`, `a₂`: they change with the motion and are mathematics. |
| `complex-reciprocal` | `/complex-reciprocal` | Keep in part | Keep `Re`, `Im`; remove the block and legend. |
| `complex-roots` | `/complex-roots` | Keep in part | Keep `Re`, `Im`; remove the block. |
| `triangle-centres` | `/triangle-centres` | Remove | Slovenian triangle-kind sentence. |
| `inscribed-angle` | `/inscribed-angle` | Keep in part | Strip to the angle values (`66,8°`, `133,6°`); the equal angles are the payoff, the words are not. |
| `euler-line` | `/euler-line` | Remove | Slovenian collinearity sentence; the line through the three centres shows it. |
| `simson-line` | `/simson-line` | Remove | Slovenian collinearity sentence. |
| `inversion` | `/inversion` | Remove | Slovenian sentence naming the image. |
| `orientation` | `/compgeo/orientation` | Keep in part | Keep the signed value `+8`; strip ": levi zavoj". The sign is the whole idea. |
| `polygon-area` | `/compgeo/polygon-area` | Keep | Signed triangle areas; numbers only. |
| `convex-hull` | `/compgeo/convex-hull` | No text | No board text in the frame. |
| `point-in-polygon` | `/compgeo/point-in-polygon` | Keep | Crossing count; a number. |
| `hull-robustness` | `/compgeo/hull-robustness` | No text | No board text in the frame. |
| `bezier-hulls` | `/compgeo/bezier-hulls` | No text | No board text in the frame. |
| `ear-clipping` | `/compgeo/ear-clipping` | No text | No board text in the frame. |
| `point-set-triangulation` | `/compgeo/point-set-triangulation` | No text | No board text in the frame. |
| `delaunay` | `/compgeo/delaunay` | Remove | "neustrezen rob"; the red diagonal already marks the illegal edge. |
| `voronoi` | `/compgeo/voronoi` | Keep | Direction arrows for unbounded cells; symbols. |
| `voronoi-degenerate` | `/compgeo/voronoi-degenerate` | Keep | Direction arrows; symbols. |
| `interval-sweep` | `/compgeo/interval-sweep` | Keep | Interval letters `a`–`e`. |
| `segment-intersections` | `/compgeo/segment-intersections` | Keep | Segment names `s1`–`s4`. |
| `monotone-partition` | `/compgeo/monotone-partition` | Keep in part | Keep the vertex ids such as `v6`; strip the Slovenian vertex kinds. Marker shapes carry the kind. |
| `monotone-triangulation` | `/compgeo/monotone-triangulation` | Keep in part | Keep the vertex ids; strip the Slovenian chain words. |
| `fortune` | `/compgeo/fortune` | No text | No board text in the frame. |
| `projective-cross-ratio` | `/projective/cross-ratio` | Keep in part | Strip to `(A, B; C, D) = 9/8` and `(A′, B′; C′, D′) = 9/8`: the equality is the theorem. |
| `projective-pascal` | `/projective/pascal` | Keep | Line names `p`, `s₁`…`s₆`. |
| `projective-pole-polar` | `/projective/pole-polar` | Keep | Tangent names `t₁`, `t₂`. |
| `projective-five-point` | `/projective/five-point` | Keep | `w² = 1/2, w ≈ 0,7071`; mathematics. |
| `projective-three-views` | `/projective/three-views` | Remove | Panel captions "Izvirna ravnina", "Slika: elipsa" and `L: y = 2`; the batch makes the two views read without them. |

## Example table (G02)

Ids and routes come from `src/graphs/**/registration.ts` and the manifest; the names follow the intake's section 11. **Layer** says where the change is made: *style* is the graph's own drawing (reaches the live graph, lessons and exports), *scene* is the capture recipe or clip row (start state, framing, motion), *text* is the capture-text policy above.

| Owner's example | Capture id | Route | Layer | What is weak today, and the change |
| --- | --- | --- | --- | --- |
| Correlation and regression line | `prob-correlation` | `/probability/correlation` | style + scene + text | Four ochre dots, one thin moss line cut by the frame, a sans-serif line label over the line. Style: residuals and line get distinct roles and weight, points an outline. Scene: an example with a visible cloud, framed whole. Text: keep `r` only. **Pilot.** |
| Mean, median, standard deviation and box plot | `prob-summary` | `/probability/summary` | style + scene + text | The drawing fills a sixth of the frame; mean and median are told apart only by words. |
| Least squares | `interp-least-squares` | `/interpolation/least-squares` | style + scene | Keep the squares. The fitted line leaves the frame, the squares are small and pale, the data is three dots in a corner. |
| Affine transformations | `affine` | `/bezier/affine` | scene (style if needed) | One curve; nothing shows that it is being transformed, and the clip rotates in held steps. Show the map acting, with smooth motion. |
| Extrapolation | `extrapolation` | `/bezier/extrapolation` | style + scene | The extended arc looks like the original curve. Give the part outside `[0, 1]` its own role. |
| Repeated subdivision | `repeated-subdivision` | `/bezier/subdivision` | style + scene | Poster is a bare curve; the pieces are not told apart. Alternate piece colours as `subdivision` does. |
| Degree reduction | `reduction` | `/bezier/reduction` | style + text | Blue reduced curve lies on the moss original; status sentences sit above. |
| PH curves | `ph-cubic`, `ph-quintic` | `/ph/cubic`, `/ph/quintic` | style + text | Offsets in three similar muted hues with unrelated dashes; arc-length readout top left. Order the offsets as one family around a dominant base curve. |
| Parameterizations / uniform parameterization | `uniform-parameterization`, `weighted-parameterization`, `spline-parameterization` | `/param/param/uniform`, `/param/param/alphaparam`, `/param/param/alphaparam2` | style + text | The brown `parameterSample` markers are small and close in value to the curve. All three share the marker, so all three change together. |
| Curvature and the osculating circle | `curve-curvature` | `/curve-geometry/curvature` | style + scene + text | The subject is a small cluster in a large empty frame under three lines of text. |
| Subdivision curves | `interp-subdivision` | `/interpolation/subdivision` | style + text | Green refined points on a green polyline. **Pilot.** |
| Conics: focus, directrix and eccentricity | `conic-focal` | `/functions/conics` | style + scene | One moss ellipse with thin grey and ochre segments; the focal and directrix distances that define the conic do not stand out. |
| Density and probability as area | `prob-density` | `/probability/density` | style + text | Curve and area share one moss family; the area is the subject and should carry its own role. |
| One conic, three views | `projective-three-views` | `/projective/three-views` | style + scene + text | Two small grey boxes with sans-serif captions; the moving line and its effect are hard to see. Keep the interaction exactly. |
| Initial Bézier curve capture | `bezier` | `/bezier/curve` | scene (style only after the cross-family look) | Soft: moss curve, pale polygon. Any change to the shared curve style reaches every curve graph. |
| Through the points or near them | `interp-lagrange` | `/interpolation/lagrange` | style + scene | Two hues; points nearly black. |
| Farin points | `farin` | `/rational/farin-points` | scene + text | Ratios and weights crowd the polygon. Hide both; let the slider-driven curve lead. |
| Envelope | `curve-envelope` | `/curve-geometry/envelope` | text (+ scene framing) | Two status lines top left; the line family is small in the lower corner. **Pilot.** |
| Delaunay triangulation (G01 example) | `delaunay` | `/compgeo/delaunay` | typography + text | Red sans-serif "neustrezen rob" across the diagonal. |
| Convexity and concavity (G06) | `convexity` | `/analysis/convexity` | scene | See G06. |
| Epicycles (G07) | `epicycles` | `/analysis/epicycles` | scene, after the owner's pick | Waiting. |

## G01: graph typography

**Today.** Board text is drawn in three unrelated ways, which is the inconsistency the owner saw:

| Path | Face | Where |
| --- | --- | --- |
| MathJax HTML (`useMathJax: true`) | MathJax TeX | Point names and weights (`PointStyles.ts`), axis ticks (`AxisStyles.ts`, forced to `MJXTEX`) |
| HTML text with `BOARD_TEXT_STYLE` | Georgia, lining numerals, on a soft plate | The function family's captions and labels (`BaseFunctionGraph.tsx` and three importers) |
| JSXGraph default text | **Arial**: `JXG.Options.text.cssDefaultStyle` is `font-family: Arial, Helvetica, Geneva, sans-serif` | Every text created with `useMathJax: false` and no `cssStyle`: PH arc length, envelope, subdivision, offset, comb, curvature, reduction and the other overlays (15 files), and `display: 'internal'` SVG text in the computational-geometry graphs (5 files) |

The site's display face is Literata (`--bezeg-font-display`, self-hosted, Latin Extended), used for page, chapter and Demonstration titles. No graph uses it.

**What JSXGraph supports.** A text is either `display: 'html'` (a positioned `<div>`; takes `cssStyle`, `cssClass`, `useMathJax` or `useKatex`, and raw HTML with `parse: false`) or `display: 'internal'` (an SVG `<text>`; takes `fontSize`, colour and `cssClass`, rotates with the board, no MathJax). Defaults for every text on a page come from `JXG.Options.text` (`cssDefaultStyle`, `highlightCssDefaultStyle`, `fontSize`, `fontUnit`); a board can override them at creation. Label attributes inherit from the text options. There is no per-glyph control and no font loading: the face is whatever CSS resolves.

**Proposed shared treatment (capability C4).**

1. One constant in `src/graphs/styles/` for plain board text: the display stack (`Literata`, then the current Georgia fallback), lining tabular numerals, `GraphPalette.label`. `BOARD_TEXT_STYLE` becomes that constant.
2. The board's text default (`cssDefaultStyle` and its highlight twin) is set once where `BaseGraph` creates the board, so the 15 unstyled files change face with no per-file edit; a CSS rule gives `display: 'internal'` SVG text the same stack.
3. Mathematics stays MathJax. This slice does not change which labels are typeset: the point labels that bypass MathJax are **M01**, owned by the `polish` session.
4. Sizes: two steps only, label and caption, both derived from `displaySettings.fontSize` as today. Fixed `fontSize: 14` or `15` literals move to the label step.

Reasons: Literata is already loaded, is the face the rest of the site uses for names, and sits with MathJax TeX better than Arial does; a default at the board removes a class of omissions instead of patching each graph.

Alternatives: (a) Georgia everywhere, the function family's current face: no new face on the board, but it is not the site's face and renders differently per platform. (b) The system sans the controls use: consistent with the inspector, but it is the look the owner called uninteresting. (c) Typeset all board text with MathJax: one face for symbols and words, but slow for prose, and it is M01's territory. The owner sees the recommended face on the pilot preview before it reaches any other graph.

**Risks to check in the slice, each with a test or a look.** Text width changes, so label-placement code that measures text (`CorrelationGraph`, `labelLayout.ts`, caption fitting) is rechecked on its real-renderer tests. SVG and PNG export must show the same face or the documented Georgia fallback, never Arial. Plain formula text with a caret (`f(x) = 2^x` on `/functions/exponential`) is recorded as a separate defect, not fixed by a face change. Because this reaches every graph, the slice is accepted only after before-and-after screenshots of one route from each of: Bézier, rational, PH, curve geometry, functions, analysis, probability, plane geometry, computational geometry, projective, patches.

**Order.** After the pilot and before the batches, so each batch capture is recorded once in the final face. The three pilot captures are recaptured with it.

## G06: why the convexity capture skips

It is built to. `convexity` is one of 18 clips still on the pre-row "exact held states" path (`scripts/demonstration-preview-concept-motion.cjs`): the tangent point is typed to `t = 0.5`, `−0.5`, `1`, `0.5`, and each state is held for 18, 14, 14, 38 and 12 frames. Its recorded invariant says "no interpolation between checkpoints". The clip therefore contains four distinct pictures in 96 frames, and the tangent jumps between them. The control ("Točka dotika tangente t") is continuous, so nothing forces this; the concept-led spec of 2026-10-18 chose held states to stage a reveal of `f″`, before the owner's rule that clips move smoothly wherever they can.

**Recommended fix (capability C5).** It follows the owner's settled rule for clips (smooth motion wherever possible), but it drops a staged reveal an earlier spec chose, so it is shown on the preview before it is published. Replace the held-state spec with a lesson-guided row: `parameter-sweep` on the tangent point from `0.5` to `−0.5` to `1` and back, quoting the lesson sentence that asks for it. The `f″` reveal is dropped from the clip: it only changed a line of text, which the text policy removes anyway. The poster scene, the chord, the curve and the colours do not change.

The same cause applies to the other legacy held-state clips whose control is continuous. The blocker triage lists which of the 18 can become sweeps; those whose control is a count (`bernstein`, `darboux`, `definite-integral`, the subdivisions) stay discrete with their reason.

## G07: epicycles subjects

**Owner's pick, 2026-11-14** (recorded in the [design state note](../reviews/site-walkthrough/design/state.md)): add the outline of Slovenia and the cat; the treble clef and the elderflower blossom too if adding examples is easy. The existing graph's look is kept.

**What it takes.** The epicycles loop is a small editable spline: 4 to 8 vertices with draggable handles and two coordinate lists in the inspector (`src/analysis/epicycleModel.ts`). An outline needs 100 to 250 points, so a subject is not a fourth entry in the example list; it is a second kind of loop.

**Design (handler's engineering choices inside the pick).**

- **G07-a Fixed outlines.** The model gains an optional `outline` id. A model with an outline takes its vertices from shipped data (a closed polygon of line spans, resampled evenly by arc length, inside the existing coordinate range), keeps `N` and the parametrization editable, and rejects vertex and handle edits with a new issue kind. The Fourier coefficients stay exact: line spans already have closed-form coefficients in `closedSpline.ts`. Alternative considered: raise the vertex cap to 250 for everyone; rejected because 250 draggable handles and 250 inspector rows are unusable.
- **G07-b Presets.** A stored outline preset holds the outline id, `N` and the parametrization; on load the vertices come from the shipped data. Old presets are unchanged and still load. An unknown outline id is refused with an actionable message.
- **G07-c Graph.** For an outline the vertex handles and the two coordinate lists are not shown; everything else (circles, trace, time, `N`, error readout) works as before. Hiding the lists is the only inspector change and is conditional rendering of existing controls, agreed here because [control choice](control-choice-and-composition.md) owns the panel's composition, not which model it edits.
- **G07-d Subjects and their sources.**
  - Slovenia: border from Natural Earth (public domain), simplified and resampled. The design session's outline was a hand sketch and is not used.
  - Cat: an original silhouette authored for Bezeg. The design mockup traced an emoji glyph from a system font; shipping an outline traced from a proprietary font is not acceptable, so the shipped cat will differ from the mockup. **The owner should look at it.**
  - Elderflower blossom: the mockup's formula, `r = 1 + 0.42 cos 5a + 0.06 cos 10a`.
  - Treble clef: not added. The mockup traced it from a system font as well, and no freely licensed outline is at hand; "easy" does not hold. It can follow if a free source is chosen.
- **G07-e Number of circles.** `N` stays at most 50 (101 circles). If Slovenia is not recognisable at 50, the limit is revisited with a measurement, not raised blindly.
- **G07-f Catalog card.** The card should show a subject, not the uneven loop. That is a capture change and waits for captures to be runnable (see the pilot record); until then the card is unchanged.

**Acceptance.**

1. The example select offers the three subjects in both languages; choosing one draws its outline, and `N` from 1 to 50 draws an increasingly close trace.
2. For each outline, the partial sum at `N = 50` is within a stated sampled error of the outline, and the error does not increase from `N = 5` to `20` to `50` (tested against an independent direct numerical integration of the coefficients, 1e-6).
3. Each outline is closed, has no repeated consecutive point, lies inside the coordinate range, and its data file names its source.
4. Vertex and handle edits on an outline are refused by the model with the new issue; the graph shows no handles and no coordinate lists.
5. Presets: an outline preset round-trips; existing preset fixtures load unchanged; an unknown outline id gives the localized refusal.
6. Analysis plus trace for the largest outline at `N = 50` is measured; moving the time slider does not redo the coefficient analysis.
7. The lesson's scenes and the three existing examples behave as before (their tests pass unchanged).

## What the positive references have in common

References: `epicycles`, `fixed-point`, `accumulation`, `definite-integral`, `function-inverse`, `complex-multiplication`, `subdivision`, `darboux`, `decasteljau`. They are a yardstick, not an instruction to make every graph busy. Read from their posters, as properties a reviewer can check on a 720×440 frame:

| # | Property | How to check | Seen in |
| --- | --- | --- | --- |
| R1 | **The subject is the strongest mark.** The object the clip moves, or the result it produces, has the widest stroke or the largest filled marker in the frame, and is at least 3:1 against the board. | Compare stroke widths and marker radii of the moving object and everything else in the rendered SVG. | Epicycles' thick blue trace; the ochre staircase of fixed-point; the ochre tangent of accumulation. |
| R2 | **Touching roles differ in hue, not only in lightness.** Two objects that overlap or touch and mean different things come from different hue families, and also differ in shape or dash. | Name the hue family of each pair that touches. Moss on sage, or green points on a green curve, fails. | Subdivision's blue and ochre halves; inverse function's moss and blue curves. |
| R3 | **Three or four hue roles, each with one meaning.** Counting moss, blue, ochre, red and violet families and ignoring axes and neutrals. Two is thin unless a fill adds a plane; five or more is busy. | Count. | All nine have three or four. The weak ones (`bezier`, `extrapolation`, `repeated-subdivision`, `affine`) have two. |
| R4 | **There is a plane, not only lines**, where the mathematics has an area, a region or a set: a light fill under a strong boundary. | Is the area the concept talks about filled? | Integral bars, Darboux upper and lower sums, the fixed-point half-plane, accumulation's signed area. |
| R5 | **The subject fills the frame.** Its bounding box covers at least about 45% of the frame and nothing bounded is cut by the edge. | Measure the bounding box of the non-axis geometry. | All nine. `prob-summary`, `projective-three-views`, `curve-curvature` and `interp-least-squares` fail. |
| R6 | **Context is quieter than content.** Axes, grid, control polygon and construction lines are thinner and lower in contrast than the curve and the subject. | Compare stroke width and contrast. | De Casteljau's levels against its final curve. |
| R7 | **Text follows the policy above** and never lies on the subject. | The capture table. | Fixed-point's `x₁`; complex multiplication's `Re`, `Im`. |
| R8 | **The motion is the lesson's motion and is smooth**: the subject moves, the frame has at least 24 distinct images, no cut. | The row checks (state and pixel) pass; no `discreteReason` unless the control is a count. | Fixed-point and accumulation fail this today and are still liked, so R8 is a requirement for changed clips, not a finding against the references. |

A change is judged against R1–R8 on its own frame. Adding a role or a fill that the mathematics does not have, to reach a count, is a failure of the goal.

## Batches

One change applied to many items, so [item batches](../tasks/feature-streams/README.md#item-batches) applies. Order: pilot, capabilities, triage, then file-disjoint family batches.

| Batch | Items | Files it owns |
| --- | --- | --- |
| **P. Pilot** | `prob-correlation` (weak graph), `curve-envelope` (capture text), `interp-subdivision` (colour distinction). Builds C1 and C2 as far as these three need. | `CorrelationGraph.tsx`, `curves/envelope/`, `curves/subdivisionCurves/`, the capture script and recipes |
| **C. Capabilities** | C1–C3 completed for every capture; C4 typography; C5 convexity row | Capture scripts, `styles/`, `BaseGraph`, `BaseFunctionGraph.caption` |
| **T. Triage** | One scripted pass over all 118 captures in their recipe scene with the text policy applied: does the row or legacy spec still pass, what does the frame lose, what blocks it. Output: `docs/reviews/site-walkthrough/graphs/blocker-triage.md` (not written yet), one row per capture, then batches regrouped by blocker if the table says so. | Review folder only |
| **B1 Probability** | `prob-summary`, `prob-density`, text for `prob-binomial-normal`, `prob-clt` | `graphs/functions/SummaryStatisticsGraph.tsx`, density graph, `probability.cjs` |
| **B2 Interpolation** | `interp-least-squares`, `interp-lagrange`, text for `interp-hermite`, `interp-runge` | `graphs/functions/LeastSquares*`, `curves/interpolation/`, `interpolation.cjs` |
| **B3 Bézier** | `bezier`, `affine`, `extrapolation`, `repeated-subdivision`, `reduction` | `curves/bezier/`, `curves/reduction/`, `bezier.cjs` |
| **B4 PH and parameterizations** | `ph-cubic`, `ph-quintic`, the three parameterizations, `arc-length-param` | `curves/ph/`, `curves/parametrisations/`, `curves/arclength/` |
| **B5 Curve geometry** | `curve-curvature`, text for `curve-evolute`, `curve-comb`, `curve-offset`, `curve-parametric` | `curves/bezier/Curvature*`, overlays, `curve-geometry.cjs` |
| **B6 Conics** | `conic-focal`, `projective-three-views` | conic graph in `graphs/functions/`, `graphs/projective/` |
| **B7 Rational** | `farin`, text for `rational-extrapolation`, `rational-subdivision` | recipes only |
| **B8 Text sweep** | Every remaining capture whose verdict is Remove or Keep in part: functions, analysis, maps, plane and computational geometry, B-splines, `projective-cross-ratio`, `delaunay` | recipes; graph files only where a label must be split |
| **B9 Epicycles (G07)** | `epicycles` | After the owner's pick |

Each batch keeps its decisions under a bullet that starts with the capture id, in the section "Batch records" below.

## Acceptance

**Every changed capture.**

1. Before and after posters of the same recipe scene, and the clip, are in the review folder and on the preview. The after frame is judged against R1–R8 and the judgement is written in the batch record with any property it does not meet and why.
2. The capture text matches its verdict; `just tooling-test` passes including C3.
3. The clip passes the row checks (state, pixel, board response, camera, loop, 300 KiB) or, on the legacy path, its existing checks. No threshold is raised and no row is exempted.
4. The manifest is regenerated by its script, never merged by hand.

**Every changed graph (style layer).**

5. The live route is looked at in both languages at desktop width and at 390 px, and its inspector at 310 px is unchanged.
6. The mathematical checks below pass.
7. Lesson prose that names a colour or a marker still tells the truth, in both languages; a changed meaning updates `sl.ts` and `en.ts` together.
8. SVG and PNG export of the route shows the new treatment.
9. A change to a shared style (`GraphPalette`, `CurveStyles`, `PointStyles`, `SegmentStyles`, `AxisStyles`, board text) is accepted only after screenshots of one route per family listed under G01, named in the batch record.

**The package** is done when every row of the example table and every capture with a Remove or Keep-in-part verdict is done or has a recorded reason, and the state note says so.

## Mathematical checks for changes that touch drawing

A style or scene change must leave the mathematics identical. For each changed graph, run its existing model and real-renderer tests (`just unit <path>`), and add a test only where none covers the property:

| Change | Check |
| --- | --- |
| Any recolour, restroke or reorder of drawn objects | The graph's real-renderer test still finds the same number of curves, points, segments and polygons with the same coordinates; where the family has a rendered style contract, its roles are updated in the same commit and fail first. |
| Capture scene (recipe or row start state) | The recipe's outcome check and the row's start-value check pass; the manifest's `evidence` for that capture differs only in the fields the change intends (text, colours), not in point coordinates, unless the row says the scene changed and why. |
| `prob-correlation` | `r`, both regression lines and each residual equal the model's values for the example to 1e-9; the line passes through the mean point. |
| `prob-summary`, `prob-density` | Quartiles, mean, median and σ unchanged for each example and rule; the shaded area equals the reported probability to the graph's stated tolerance. |
| `interp-least-squares` | Each square's side equals its residual; the sum of squares equals the readout. |
| `interp-subdivision`, `repeated-subdivision`, `extrapolation`, `reduction` | The refined, subdivided, extended or reduced curve's points equal the kernel's output; subdivision pieces evaluate to the original curve at corresponding parameters (1e-8). |
| `ph-cubic`, `ph-quintic` | Offsets stay at the set distance from the base curve along the normal; the arc length readout is unchanged. |
| Parameterization markers | Marker positions equal the sampled parameters; a larger marker is still centred on the curve point. |
| `curve-curvature`, `conic-focal` | The osculating circle's centre and radius equal `1/κ` along the normal; `|PF| = ε·|Pd|` holds for the drawn segments. |
| `projective-three-views` | The image conic in each view is the projective image of the source for the current line; its type readout agrees. |
| `convexity` sweep (C5) | For every sampled `t`, the tangent lies below the curve and the chord above it on `[a, b]` (the invariant the held-state clip already asserted). |
| Typography (C4) | No coordinate changes: only text nodes' computed font changes; label-placement tests pass on the real renderer. |

Performance: none of these changes adds objects per frame. A change that does (for example a filled region that follows a drag) is measured first under [the performance plan](../performance-plan.md).

## Recommendations and handler choices

Awaiting the owner:

- **The capture-text rule and each row's verdict.** No word exceptions are proposed; each candidate had a non-verbal carrier.
- **Literata for plain board text**, set once at the board.
- **The per-example directions** in the example table, starting with the three pilot examples.
- **G06 as a smooth sweep**, dropping the staged `f″` reveal.
- **Text hidden by the 65-character accident becomes explicit**, so adding a word to a readout can no longer make it appear in a card.

Routine choices made by the handler:

- **Pilot text example: the envelope, not PH.** The owner said the envelope's problem "occurs in many other captures", so it proves the shared mechanism; PH also needs colour work and is better judged as a whole in batch B4.
- **Typography after the pilot and before the batches**, so each batch capture is recorded once.
- **Shared curve style is not changed for `bezier`'s sake alone.** The first try is the scene; a shared change needs the cross-family look in acceptance 9.

## Batch records

Filled in as batches are accepted.

### Pilot (branch `worktree-walkthrough-graphs`, not on `master`; awaiting the owner)

Before and after posters and clips: `docs/reviews/site-walkthrough/graphs/pilot/` (`index.html` is the comparison page). The after files are trial captures; the catalog and its manifest are unchanged.

- `prob-correlation`: graph: residuals solid at 0.8 of the line width (were dashed, 0.6); line labels use the board serif on a plate at a size derived from the display setting (were Arial, fixed 15 px); the legend's residual swatch is solid. Capture: axes and grid kept (`coordinateContextIds` in `tests/smoke-catalog.cjs`), title and line label hidden, `r = 0,8468` kept with its words stripped. Against the yardstick: R1 the ochre points and their residuals lead; R2 met; R3 three roles (moss, ochre, red-brown); R5 met; R6 met with the grid; R7 met; R8 unchanged row. Not met: R4, no area exists in this mathematics. The example and its four points are the lesson's and were not changed.
- `curve-envelope`: capture only. Text hidden; window `[-0.203, 0.93, 1.203, 0.07]`, so the construction covers about half the frame (was a corner). R1–R3, R5–R8 met.
- `interp-subdivision`: graph: draggable points ochre (were dark), refined vertices blue with a light outline on a lower layer (were moss on the moss polyline), Chaikin limit curve violet (was the blue the vertices now use). Capture: status line hidden. R2 is the point of the change and is met; R3 three roles.
- Capability C1 as built: `applyCaptureText` in `scripts/capture-demonstration-previews.cjs`, recipes' `captureText` table, `textKept` and `textHidden` in the evidence, `annotations: 'capture-text-policy'`. A recipe without the field behaves as before, so no other capture changed. The function-family caption is judged line by line from its `<div>` lines, so capability C2 needs no source change.

Found on the way, for the triage:

- **No capture can run at `HEAD`.** `validateRecipes` fails because `complex-power`, `complex-euler`, `recursion-cobweb` and `contour-map` are in the catalog without a recipe (left by the clips stream); two tests in `scripts/demonstration-preview-capture.test.cjs` fail for the same reason. The pilot's trials used a preload outside the repository that drops those four. `just clip` needs either the four recipes or a rule that a Demonstration without media needs none. This is the first capability for the batches.
- `scripts/demonstration-preview-text.test.cjs` and `demonstration-preview-capture.test.cjs` are not in `just tooling-test`'s file list (`scripts/commands.cjs`).
- `just preview` refuses a dirty `src/`; a worker that must serve while another edits uses `SMOKE_PORT=<port> node scripts/serve-smoke-build.cjs`.
- Every board carries an unnamed text `0,0`; it appears in `textHidden`, so the C3 check must expect it.
- The capture pads every coordinate window by 14 percent a side; windows are chosen with that in mind.
