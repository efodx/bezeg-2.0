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

## Process
No server or browser is running: the previews (earlier child PID 20872; sweep run child PID 36096, parent 20100) were stopped by PID and port 3012 is closed. The Dump/capture helpers live in `C:\tmp\h`, outside the repo.
