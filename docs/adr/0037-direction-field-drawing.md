# Direction-field drawing: one JSXGraph curve

Status: accepted, 2026-11-03 (numerical-methods stream, [07 Batch C](../tasks/numerical-methods/07-batch-c.md) step 1). Affects [N5](../specs/numerical-methods-lessons.md#n5-direction-field-and-eulers-method) and F2a. Measurement: [07-field-measurement.md](../reviews/numerical-methods/07-field-measurement.md).

## Context

The direction field of \(y'=f(x,y)\) is a grid of short line elements up to 41×29 (about 1200 arrows) that depends on the visible window, next to an Euler polyline driven by a draggable point and a step control. The [performance plan](../performance-plan.md) requires a measurement before a drawing approach is chosen. The threshold is the Fourier 05 precedent: p95 frame interval at most 16.8 ms and no frame over 25 ms at 60 Hz.

## Decision

- Draw the whole field as **one JSXGraph `curve`** whose `dataX`/`dataY` list every arrow as two points followed by NaN, regenerated in `updateDataArray` from the current bounding box when the view changes. JSXGraph stays the renderer; this evidence does not support replacing it.
- The field is regenerated only when the window or the right-hand side changes, not on a drag of the initial point or a step change. Arrow length is fixed in screen space, so the generator needs the board size.
- Arrowheads are not part of this decision: a single curve cannot carry them per segment. F2a uses plain slope marks, which is what the harness measured, or measures another native object if arrowheads are required.
- The Euler polyline and the exact curve stay separate JSXGraph curves. Every created object is owned by the Demonstration and disposed with it.

## Evidence

Headless Chromium 156 on a Ryzen 5 7600 at 1280×720 and 1920×1080; the classroom target device was not available. Frame intervals sit at the 16.7 ms display cap for every approach and case, so they do not discriminate. The in-page main-thread cost does. At 41×29, one curve costs about 1 ms per drag, step or view operation (p95 at most 1.8 ms); a canvas overlay costs about the same. One segment per arrow (3574 objects) costs 10 to 12 ms per drag and 14 to 17 ms per view change (p95 up to 21.5 ms), the entire frame, and made the 2 s pointer gesture take 40% longer. An 11×8 grid of segments is cheap (about 1 ms) but coarse. The table is in the review file.

## Alternatives

- **One segment per arrow.** Simplest per-arrow styling, but 41×29 fails the threshold in the view case and the drag case uses 60 to 70% of the frame. Acceptable only up to about 21×15 (3 to 5 ms).
- **Overlay canvas or SVG under the board.** As fast as one curve, but it needs its own resize, high-DPI, disposal and scene-capture handling, which the curve gets from the board. Kept as the fallback if the curve proves unsuitable for styling.
- **Coarse 11×8 grid of segments.** Passes, but shows too few arrows for the shape of the field and does not meet the 41×29 goal of N5.

## Consequences

- No new dependency and no overlay lifecycle. The field is one board object, so tests assert one created and one disposed field object.
- Grid sizes up to the kernel cap are affordable. 41×29 nodes exceed `EULER_FIELD_MAX = 40` (a per-direction cap in `src/analysis/odeEuler.ts`); F2a decides whether the cap counts cells or nodes.
- The measurement is a lower bound for the target device and the React host. F6 re-checks interactivity there, especially zoom and pan at 1920×1080, where every approach showed a few frames over 25 ms in the harness. If the target device misses the threshold, stop and report to the owner (07 Batch C rule).
