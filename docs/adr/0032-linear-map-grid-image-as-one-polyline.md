# Linear maps: draw the image grid as one NaN-break polyline curve

Accepted on 2026-10-31 (task [04](../tasks/linear-maps/04-grid-drawing-measurement.md) of the [linear maps spec](../specs/linear-maps-lessons.md), decision 4; stream `maps`). It adds to [ADR 0025](0025-linear-map-graph-and-snapped-matrices.md) and records the measurement that the spec asks for before a drawing approach is chosen.

## Evidence

The benchmark in `scripts/linear-map-benchmark/` (`just linear-map-bench`) draws one JSXGraph board with the source grid, the 26 image grid lines from `gridImage`, the unit square image, two draggable handles, a 4-point Bézier fixture and its image, and optionally a 101-point ellipse. A scripted Playwright mouse drag moves one handle for 240 recorded moves, 5 fresh pages per configuration. The run used a production bundle, Chromium 156 headless, a Ryzen 5 3600 with a GTX 1070, a 1280 × 800 viewport and a 60 Hz frame interval, at commit `a23fa74`. Full results are in [grid-drawing-measurement.md](../reviews/linear-maps/grid-drawing-measurement.md).

| Variant | Ellipse | Elements | `board.update` median | p95 (worst run) |
| --- | --- | --- | --- | --- |
| 26 `segment` elements | no | 122 | 7.5 ms | 9.1 (9.4) ms |
| one NaN-break `curve` | no | 45 | 6.4 ms | 7.6 (7.9) ms |
| 26 `segment` elements | yes | 123 | 7.4 ms | 8.7 (9.6) ms |
| one NaN-break `curve` | yes | 46 | 6.4 ms | 7.8 (8.3) ms |

There was one board update per move in every run, and frame intervals stayed at the 16.7 ms refresh (5 frames over 20 ms in about 9,700). The ellipse costs nothing measurable. Most of the 6–7 ms is shared cost from the axes, the source grid and the Bézier fixture.

## Threshold

A drag move must fit one 60 Hz frame (16.7 ms) including paint. On the desktop reference, `board.update` must stay at median ≤ 8 ms and p95 ≤ 12 ms. That leaves room for paint and for a classroom device two to three times slower. Both variants pass, so the choice rests on the smaller cost and element count, not on a failing alternative.

## Decision

1. The image grid is one JSXGraph `curve` whose data arrays hold the 26 `gridImage` segments separated by `NaN`. The unit circle's image is a sampled curve (about 100 points), drawn only when its mode needs it.
2. Image lines are finite segments between the images of the window endpoints, as `gridImage` returns them. There are no infinite `line` elements and no division, and the SVG viewport clips long segments. The benchmark found no non-finite coordinate for a rank-1 matrix, the zero matrix or entries up to 10^12, in model values or in SVG attributes.
3. JSXGraph stays. Nothing here justifies a canvas overlay or a renderer change.
4. If a lesson needs one image line styled differently (for example the images of the axes), draw that line as its own element in addition to the curve. It costs about one segment.

## Alternatives

- **One JSXGraph `segment` per image line.** Each line can be styled separately and it is the simplest code. It was about 1.1 ms (15 %) slower per update, with nearly three times the elements to own and dispose of.
- **A canvas overlay for the image grid.** Not measured. Both measured variants already leave more than half the frame free, and an overlay would add a second rendering owner beside the board, along with its own resize and disposal handling.
- **Infinite `line` elements through two image points.** A rank-1 matrix sends two points to the same point, so the line would not be defined. Finite segments avoid that.

## Open gap

The target classroom device, touch input, integrated GPUs, Firefox and Safari, and high-refresh displays were not measured. Repeat the benchmark on the classroom device in F6 (task 07 acceptance). If `board.update` p95 exceeds 16.7 ms there, revisit this decision before release.
