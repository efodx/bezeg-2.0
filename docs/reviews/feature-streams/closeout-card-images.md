# Closeout card images (handoff-v13 worker note)

The earlier note (convexity-hulls, uncaptured) is obsolete: HEAD 554a670f finished that chapter.

## 1. triangulations-voronoi (5 cards) - captured, one card cropped (stopped on it)

Capture passed on the first run: every authored expectation matched the board, so no expectation was corrected.
Files: generator `triangulationExpectedFor` and five functions (sources named in comments), capture `chapterFamilies`, `triangulationPreviewCopy.ts`, `CHAPTER_GUIDED_EXAMPLE_PREVIEWS`, `functionsCards` row, both script tests, `docs/commands.md` line 54, generated inventory and `src/images/learning/examples/triangulations-voronoi/`.

Observed failures: `functionsCards` row failed with ENOENT on `docs/reviews/triangulations-voronoi/guided-example-inventory.json` with the inventory moved aside; passes after. In the script tests the `assert.throws` for a missing `set-triangulation` ("exactly once") and for the non-sites mode passed for the right reason.

Images (all 840x520, viewed):
- ear-clipping: pentagon (0,0) (6,0) (6,4) (3,2) (0,4), five green edges, five points; the reflex marker sits under the point at (3,2), so it is not visibly different (copy does not claim a marker). OK.
- point-set-triangulation: seven points, no edges. OK.
- delaunay: four points, five grey edges, diagonal (0,0)-(5,3) dashed red with the label "neustrezen rob"; label does not overlap a point. OK.
- voronoi: seven sites and the square query point (-2,1), nothing else. OK.
- voronoi-degenerate: the first capture cropped site (1,-5). The handler added the `finite-geometry-fit` override (67d84752) and recaptured the chapter; all four sites are visible.

Checks: `node --test` of both script files 39/39 passed; `just unit --no-fsModuleCache src/learning/chapter/guidedExamplePreviews.test.ts` passed; `just typecheck` passed (before the final copy rewrite).

## 2. sweep-algorithms (5 cards) - captured and viewed, all five

Done: generator `sweepExpectedFor` and five functions (sources named in comments) and its test, capture `chapterFamilies` entry, `sweepPreviewCopy.ts`, registry entry, `functionsCards` row, `docs/commands.md` line 54, generated inventory (5 entries). No `captureRecipeForEntry` override was needed: no sweep image is cropped.

Capture: interval-sweep, segment-intersections, monotone-partition and monotone-triangulation captured (840x520) and passed every authored expectation, including the monotone-triangulation hand count (point 11, segment 10, curve 5, text 4, polygon 1), so it was not corrected. `fortune` aborted the run: first on the curve count (authored 2, board 1), then on `assertPresentationGeometryStable`. The capture stopped before `manifest.json`, so the four PNGs have no manifest and the `functionsCards` row fails (ENOENT on the manifest).
- Corrected expectation (generator `fortuneExpectedFor`, test, `functionsCards` counts [1, 4]): the beach line is `fortune-beach`, a data curve set to empty arrays at step 0 (`fortuneDrawing.ts` update: `view.arcs` empty), so only the sweep line is a visible curve.
- Fortune blocker, resolved by the handler: the sweep line before the first event is drawn at the top of the view grid box (`lineY: level ?? maxY`), so it follows the camera. `assertPresentationGeometryStable` now lets that one card move the line only while it stays above every site. A first rule (line above the view) was wrong and removed: the presented box is [-14.14, 9.64, 14.14, -7.64], so the line at y=8 is inside the view.

Observed failures: `functionsCards` sweep row failed with ENOENT on `docs/reviews/sweep-algorithms/guided-example-inventory.json` before the inventory existed. The generator test `assert.throws` for fortune with no `set-points` fails with "opening scene must run point-set set-points exactly once" (0 !== 1) and for trace step 7 with "only the queued first step is authored" (7 !== 0), the right reasons.

Images (viewed):
- interval-sweep: sweep line at x=0 through the left end of a, a dashed (current interval), five rows labelled a to e, all in frame. OK.
- segment-intersections: four crossing segments, 8 endpoints, in frame. The labels s1 and s2 both sit at the segments' common midpoint (3,2) and overlap into an illegible "s2"; this is the board's layout (PointSetGraph labels), not something the card can change.
- monotone-partition: polygon with six vertices, orange sweep line above, in frame. OK.
- monotone-triangulation: polygon, thick blue first piece, dashed diagonal (4,3)-(8,5), ring on the top vertex, Slovenian chain labels ("zgornje oglišče", "desna veriga", "spodnje oglišče"); some labels touch edges and points, all legible, nothing cropped.
- fortune: four sites with the sweep line above them; matches the copy.
- Legibility, board layout, left as is: s1 and s2 overlap at their shared midpoint (3,2) on segment-intersections; lines cross labels on monotone-triangulation.

Checks: `node --test` both script files 41/41 passed; `just typecheck` passed; lessonMathNotation passes; `guidedExamplePreviews.test.ts` fails only on the sweep row (manifest missing, because of fortune).

## 3. triangle-geometry (5 cards) - captured and viewed, all five

Done: generator `triangleGeometryExpectedFor` and five per-lesson functions (graph sources named in comments) with a test, capture `chapterFamilies` entry, `trianglePreviewCopy.ts`, registry entry, `functionsCards` row, `docs/commands.md`, inventory and manifest.

Capture: all five captured (840x520) and passed every authored expectation on the first run, so no expectation was corrected. Authored counts (visible elements): notable-points point 4, segment 6, text 1 (three vertices plus G; three sides plus three medians; chip); inscribed-angle point 5, circle 1, segment 5, curve 3, text 1; euler-line point 6, segment 3, text 1; simson-line point 8, segment 3, line 3, circle 1, text 1 (the feet exist whatever the perpendiculars overlay says); inversion point 5, circle 1, line 1, text 1 (P, O, theta handle, A, B).

Crop and recipe: the inversion card was cropped on the first capture (circle about (5,0) with radius 3 ran off the right edge, B=(8,0) outside the frame). Fixed with a `captureRecipeForEntry` id (`triangle-geometry.inversion.inversion` fits its own finite geometry) and a test; no validator rule was changed. Recaptured, circle and both secant points in frame.

Observed failures: `functionsCards` triangle row failed with "triangle-geometry.notable-points.triangle-centres/sl: expected undefined to be truthy" (copy not yet registered) before it passed; the new capture test failed with the inversion id removed from `captureRecipeForEntry`; two generator test cases first failed on the wrong error message, because an extra action is rejected before the later assertion.

Images (viewed):
- notable-points: acute triangle, three dashed medians meeting at an x mark, chip "Vrsta trikotnika: ostrokotni"; no letter labels on the board. OK.
- inscribed-angle: circle, chord AB, orange angle mark at C, dashed green marks at P and a blue dashed central arc at O; chip "APB = 66,8; ACB = 66,8; sredisccni kot = 133,6"; letters not drawn. P (green) sits at the top of the circle. OK.
- euler-line: triangle with a square (H), an x (G) and a plus (O) near each other inside; no line drawn; chip "Eulerjeva premica: O, G in H so kolinearne". The caption says the line is not drawn yet. OK.
- simson-line: triangle, three dashed side lines, circle with x centre, green P below AB, three green squares for the feet (one on AB, one on BC, one beyond CA); no perpendiculars; chip "Nozisca D, E, F: kolinearna". Circle fully in frame. OK.
- inversion: P orange at the origin, circle with dark centre dot, grey secant along the x-axis, A and B at the circle, small theta handle dot between P-side intersection and the centre; chip "Potenca = 16". OK after the recrop.
- Board labels vs captions: the chips say the points or feet are collinear while the line is not drawn; the captions report that as the board text and state the line is absent.

Checks: `node --test` both script files 44/44; `just unit --no-fsModuleCache` `guidedExamplePreviews.test.ts` and `lessonMathNotation.test.ts` passed; `just typecheck` passed. Preview (PID 34132) stopped, port 3012 closed.

## Process
No server or browser is running: the previews (earlier child PID 20872; sweep run child PID 36096, parent 20100) were stopped by PID and port 3012 is closed. The Dump/capture helpers live in `C:\tmp\h`, outside the repo.

## 4. interpolation (5 cards) - captured and viewed, all five

Done: generator `interpolationExpectedFor` with five per-section authors (graph sources named in comments) and a test, `chapterInventories` and `chapterFamilies` entries, `interpolationPreviewCopy.ts`, registry entry, `functionsCards` row, `docs/commands.md`, inventory and manifest. The lazy registry getters load fine through the generator's `ssrLoadModule`; no loader change. No `captureRecipeForEntry` change was needed (no crop).

Corrected expectations (found by capture, then explained from the source):
- lagrange: authored `text: 1` was wrong. `InterpolationScene.ts` shows the readout only when `board.canvasWidth >= 480`, and the card board is 420 CSS px wide, so no text. Now no text.
- runge and least-squares: authored `text: 1` was wrong; the caption block of `BaseFunctionGraph.caption` was not counted as a visible `text` at capture (the existing quadrature comment says the same). Text removed from both; types are not asserted for it. Handler correction: this reason is wrong. The caption is a text; the capture hides it because its text exceeds 65 characters (`capture-demonstration-previews.cjs:207`). The counts stand; the generator comments were corrected with the probability chapter.
- least-squares: authored `curve: 1, functiongraph: 1` was wrong. JSXGraph types the manual `functiongraph` as `curve` here (observed by a board dump), so `curve: 2`, `curveCount: 2`.
- `functionsCards` counts are `[curveCount, points]`; my first row had them reversed and failed with `[1,8] ... to deeply equal [+0,8]`.

Images (viewed, 840x520, no axes, no point labels on any board):
- lagrange: one green arc through four small dark dots (the end dots at the bottom corners, two above), one larger green dot on the arc between dots 2 and 3 at (2; 2,8125). No hull, no Bezier, no text. OK.
- runge: faint bluish bell curve f, green polynomial through seven green dots on f; bumps above f at both ends and dips below it between nodes; all in frame (no far peaks). No text. OK.
- hermite: green curve; dark dots at (0,0), (3,3), (4,0); (1,2) is orange because the tip of the P0 arrow covers it; four orange arrows ending in orange dots (1,2), (2,5;3,5), (4,5;2), (5;-3); top-left text "Hermiteova krivulja z izbranimi tangentami". OK.
- least-squares: full-width horizontal blue line y=2, four orange dots (0,1) below, (1,2) and (2,2) on it, (3,4) above; two brown dashed residuals (lengths 1 and 2, measured 80 and 193 px). No text. OK.
- subdivision: open polygon, four dark dots, three green edges (dashed original polygon coincides), text "Chaikinovo pravilo, korak 0 od 6, 4 oglišč". OK.

Checks: `node --test` both script files 45/45; `just unit --no-fsModuleCache` `guidedExamplePreviews.test.ts` and `lessonMathNotation.test.ts` passed (the row failed first on the reversed counts); `just typecheck` passed. Preview stopped, port 3012 closed.

## 5. probability (5 cards) - captured and viewed, all five

Done: generator `probabilityExpectedFor` and `chapterInventories.probability` (scripts/generate-guided-example-inventory.cjs, comments name the graph sources), test in the `.test.cjs`, `--family probability` in the capture script, inventory `docs/reviews/probability/guided-example-inventory.json`, all 5 PNGs and manifest captured (preview on 3012, stopped, port closed), copy `src/learning/content/probabilityPreviewCopy.ts` registered in `guidedExamplePreviews.ts`. `node --test` of both script files: 46 pass (before the last CLT comment/text edit; not rerun).

NOT done: the `functionsCards` row in `guidedExamplePreviews.test.ts` (ids in alphabetical order: binomial-normal, clt, correlation, density, summary; the second number of `counts` is the alt/fact count I did not derive), `just unit` and `just typecheck` (never run; copy and registry unchecked by tsc, lessonMathNotation not run), docs/commands.md line 54, a re-capture after the final inventory regeneration (only the CLT `text` expectation changed; scene fingerprints are identical).

Capture command: `PREVIEW_BASE_URL=http://127.0.0.1:3012/bezeg-2.0 node scripts/capture-guided-example-previews.cjs docs/reviews/probability/guided-example-inventory.json --family probability` (the family flag goes AFTER the inventory path).

Determinism: all five deterministic (no Math.random or crypto in the five graphs or their analysis models; CLT is a convolution; scenes are the lesson's first steps with fixed values).

Corrections to the brief/authored counts: (1) the caption block IS a visible `text` object on the card (density 1, binomial 1, summary 3 = caption + mean label + median label, correlation 2 = caption + line label) because BaseFunctionGraph.caption creates one JSXGraph text; (2) CLT has 0 texts: capture-demonstration-previews.cjs:208 hides any text over 65 characters and the two-line CLT caption exceeds it (density/binomial/correlation captions are 52-60 characters). Authored CLT expectation omits `text` and uses `points: []` plus one curve check (the dashed normal, data from x = -6 step 0.02, samples -6/-5.99/-5.98 with y 0), because `assertExpectation` needs points or curves.

Per image (all viewed): density: green bell, grey-green fill, flat green tail along the axis to both edges, two orange handles at x = -4 and 4 (unlabelled), caption "X ~ N(0; 1^2)" and "Ploscina ... 99,99 %" (99,99 verified: P(|Z|<4) = 0.99994, and the lesson says 99,99). binomial: touching outlined bars, bars 0..10 shaded blue-grey (shade ends at the 10.5 edge), green normal curve, one orange handle at k = 10 under the tallest bar, three caption lines; verified mean 10, sigma sqrt(5) = 2.236, P(X<=10) = 0.5881 against the lesson. clt: dashed red-brown standard normal plus a blue flat segment at 0.2887 from -sqrt3 to sqrt3 (sampled start -1.7319, 0.288704, matches 1/(2 sqrt3)), height ratio 0.72 of the normal peak; no caption, no points. summary: 7 orange draggable dots (row 4,5,6,7,8; second row above 5 and 6), blue triangle "sredina" at 41/7 slightly left of the column at 6, brown square "mediana" at 6, caption "Stevilo vrednosti: 7", no box plot or band. correlation: 4 orange draggable dots, green y-on-x line across the board, label "regresijska premica za y", caption with r = 0,92338 (verified by hand: Sxy 4.5, Sxx 5, Syy 4.75, r = 0.92338); the first two points sit just above the line, the third below, the fourth above.

Copy: written for all five, Slovenian number agreement checked (sedem oranznih krogcev, stirje oranzni krogci, dva krogca). The CLT alt was corrected from "half height" to "about three quarters (0.72 of the peak)". Not re-reviewed after that edit.

Observed failures during work: `--family` placement error; summary `text` 3 != 2; CLT `text` 0 != 1; missing `points: []` for CLT. No observed failure yet for the `functionsCards` row (not added).

Handler completion, replacing the "NOT done" list above: the worker stopped at its budget. The handler added the `functionsCards` row (`counts` are `[curveCount, types.point]`, not an alt count), the `docs/commands.md` line and the corrected reason for hidden captions. The row failed with ENOENT with the inventory moved aside. After the final inventory the chapter was recaptured: all five PNGs were byte-identical. Two false alt claims were fixed: the regression line does not span the whole board, and the CLT curve flattens above the bottom edge, not on it. Numbers recomputed by hand: \(\sigma=\sqrt5\), \(r=4.5/\sqrt{23.75}\), line \(y=0.9x+0.9\), \(1/(2\sqrt3)\), mean \(41/7\).

## 6. b-splines (6 cards) - captured and viewed, all six

PARTIAL (worker budget stop). State: wiring, generator entry and test, chapterFamilies entry, copy file, registry entry, `functionsCards` row, docs/commands.md and the inventory are done; all 6 cards were captured (strict inventory, manifest written) and every PNG was viewed. The copy was written after viewing but NOT re-verified, and the final checks were NOT rerun after the last copy edits.

- Chapter id is `b-splines` (bsplineChapterId.ts). All scenes deterministic (no Math.random/Date.now outside tests); recapture hashes were identical across two runs.
- Corrected expectations (generator, bspline comments): de Boor level 0 has k + 1 - r = 3 rings, not 4, so points 7 and segments 2 (first draft said 8 and 3). Basis text: the first-frame check sees 5 texts (readout included) but the presentation check sees 4 (readout hidden, over 65 characters); no single text count satisfies both, so `text` is not asserted for basis and de Boor (handler decision: confirm that is acceptable, or change the check). Blossom label text 1 holds in both.
- Observed capture failures: basis `text 5 !== 4` (initial, first draft), then `4 !== 5` (post-presentation, after setting 5). Authored: basis curve 3/point 8/segment 1; de Boor 1/7/2; insertion 3/4; extraction 5/4; NURBS 2/10; blossom 1/7/1/text 1.
- Images: basis = three hat lines, dashed foot line, 5 diamonds, labels "0 (×2)", "1", "2 (×2)", note "definicijsko območje [0, 2]"; de Boor = rings on the first three of four points; insertion = comb left of centre, uncropped; extraction = two coloured pieces with dashed polygons meeting at (2,2); NURBS = rounded square inside dashed circle, 8 small dots plus a larger marker at C(1/16); blossom = label f(0; 1), larger dots at (0,0) and (1,2).
- Not done: lessonMathNotation and guidedExamplePreviews unit run with the final copy, `just typecheck` after the copy, the final node tests rerun, preview stop, the lesson tests (nurbs 6.07e-2) as evidence for the caption numbers, a counts-row failure observation, and the Slovenian copy proofread (check "polarne oblike", "srečata").
- The preview server on port 3012 may still be running; stop it by PID.

Handler completion: the worker stopped at its budget. The handler ran the checks and fixed the `functionsCards` row, which failed on de Boor (8 for 7): `counts` are `[curveCount, types.point]`. `text` stays unasserted for basis and de Boor, as for the clt, runge and least-squares cards, because a long readout is seen before the presentation step and hidden after it. Copy fixes: the comb narrows sharply but not to nothing (end curvature about 0.09 against 1 at the peak), the arch is not low, "med ogliščem", and "left edge" on the basis card means the end of the domain. Hand checks: NURBS deviation at \((0.75,0.75)\) is \(1.0607-1\), the marker is \(C(1/16)=(0.9375,0.4375)\), and \(f(0;1)\) is the second control point. "Bézierjeva" and "polarna oblika" are the app's terms. The insertion card sits left of centre with empty space to its right: nothing is cropped.

## 7. phase-portraits (4 cards) - captured and viewed, all four

Chapter id `phase-portraits`; cards PP1 and PP2 on `phase-portrait`, PP4 and PP5 on `logistic-map`; copy in `phasePortraitsPreviewCopy.ts`, `functionsCards` row counts `[curveCount, points]` = bifurcation [7, 2], linear-system [3, 5], logistic-map [7, 3], pendulum [3, 5]. PP5 needed the step-0 cobweb to be a zero-length two-point segment (`LogisticMapGraph.tsx`), otherwise the capture's three-finite-samples check rejects the one-point curve. PP1 and PP2 frames carry overlapping pixel-sized board texts (no recipe option hides them); the alt text does not rely on them. Details: `notes/pp-f5.md`.

## 8. trigonometry (4 cards) - captured and viewed, all four

Chapter id `trigonometry`; cards TR1 and TR2 on `unit-circle`, TR3 and TR4 on `triangle-solver`; copy in `trigonometryPreviewCopy.ts`, `functionsCards` row counts `[curveCount, points]` = addition-formulas [2, 5], cosine-rule [0, 3], radian-sine-cosine [1, 2], sine-rule [0, 3]. Capture family from the trig registration (`identities`); recipes for `unit-circle` and `triangle-solver` in `demonstration-preview-recipes.cjs`. TR3 and TR4 open on the same scene (sides mode, A = (0, 0), B = (7, 0), C = (2, 4)), so their two PNGs are identical (same sha256) and the card image cannot tell them apart. The TR1 frame draws four segments, not five: the zero-length sine leg at angle 0 is not rendered. The TR1 and TR2 circle is small (radius about 85 px) because the window must also hold a full turn of the sine trace. Details: `notes/trig-f5.md`.

## 9. analytic-lines (4 cards) - captured and viewed, all four

Chapter id `analytic-lines`; all four cards on `line-geometry` (forms-of-a-line, normal-parallel-perpendicular, angle-between-lines, distance-point-line); copy in `analyticLinesPreviewCopy.ts`, `functionsCards` row counts `[curveCount, points]` = angle-between-lines [1, 5], distance-point-line [0, 4], forms-of-a-line [0, 2], normal-parallel-perpendicular [0, 4]. Capture family from the lines registration (`identities`); one recipe row for `line-geometry`. The frames carry no axes or grid and the handle labels P, Q, R, S, T are not drawn, so the alt text says "dots". The angle frame shows the arc label with its value and the distance frame the value of d, so the images show what steps 3 and 4 ask for; the alt text and captions do not state them. In the angle frame the direction labels u and v sit on top of the labels of the lines (graph-owned placement, not fixable in the recipe). Details: `notes/f5-analytic-lines.md`.

## 10. isometries (3 cards) - captured and viewed, all three

Chapter id `isometries`; all three cards on `isometries` (two-mirrors, classifying-a-motion, dilation-similarity); copy in `isometriesPreviewCopy.ts`, `functionsCards` row counts `[curveCount, points]` = classifying-a-motion [2, 2], dilation-similarity [2, 2], two-mirrors [3, 5] (the rotation centre cross counts as a point). Capture family from the isometry registration (`identities`); one recipe row for `isometries` (window [-4.4, 5.6, 10.9, -3.9]). The captions in the frames are Slovenian graph labels (lik, slika 1, zrcalo 1, središče, os), so both alt texts quote them. Crowding that is graph-owned and not fixable in the recipe: the label slika 1 sits on the diamond handle and the axis label os on the circle handle (classifying), slika 1 on the dashed image edge (two mirrors), središče next to the ratio handle (dilation). Details: `notes/f5-isometries.md`.
