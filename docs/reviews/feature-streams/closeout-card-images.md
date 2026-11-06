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
