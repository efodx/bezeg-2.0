# Epicycle rendering: arm chain and all circles as two JSXGraph curves

Status: accepted, 2026-11-05 (Fourier stream, [06 Batch C](../tasks/fourier-series/06-batch-c.md) step 1). Decides [ADR 0034](0034-fourier-series-models-handles-and-closed-loop.md) §3 for [F5](../specs/fourier-series-lessons.md#f5-epicycles). Measurement: [06-epicycle-measurement.md](../reviews/fourier-series/06-epicycle-measurement.md).

## Context

The epicycle graph shows up to \(2N+1\) rotating terms (\(N\le 50\), so 101), a trace of the partial sum, the original loop and draggable loop vertices. The [performance plan](../performance-plan.md) requires a measurement before a drawing approach is chosen. The threshold is the Fourier 05 precedent: p95 frame interval at most 16.8 ms and no frame over 25 ms at 60 Hz.

## Decision

- Draw the **arm chain as one JSXGraph `curve`** (the polyline through the joints) and **all circles as one NaN-separated JSXGraph `curve`** (48 points per circle), both regenerated in `updateDataArray` from the current chain. JSXGraph stays the renderer; this evidence does not support replacing it.
- The trace is one curve of **2000 samples**, sliced to the played part during playback. 400 samples also pass, but a 400-sample trace gives only about 8 points per period of the highest term at \(N=50\); 2000 costs about 1 ms more per drag in the measurement.
- Coefficients, chain and trace are recomputed from the loop when a vertex moves or \(N\) changes, and the chain alone when the time changes. An \(N\) change changes data, never the number of board objects: the graph owns a fixed set of board objects (chain, circles, trace, loop and the loop handles), disposed with the Demonstration.
- Circles use a fixed point count; F2a checks large radii on screen.

## Drag threshold (owner decision, 2026-11-05)

The real route missed the original threshold for drags at \(N=50\) ([host re-check](../reviews/fourier-series/06-epicycle-measurement.md#host-re-check)). The owner chose to relax the threshold over making the coefficients cheaper or recomputing less during a drag, so a drag keeps recomputing the coefficients and trace on every move and spec step 6, "drag a control point and watch the circles", stays live.

- **Dragging a vertex or control, at any \(N\):** p95 frame interval at most 50.1 ms (three 60 Hz frames, so at least 20 updates a second) and no frame over 100 ms (the usual limit for a response to feel immediate). These limits were fixed before the [re-measurement](../reviews/fourier-series/06-epicycle-measurement.md#re-measurement-under-the-relaxed-threshold), though after the host re-check had shown the misses.
- **Playback and \(N\) changes:** unchanged, p95 at most 16.8 ms and no frame over 25 ms.

The owner decided the relaxation; the values and scope are the handler's. A drag follows the pointer, so an update rate of 20 a second still reads as direct manipulation, while playback is the animation the lesson is about and keeps the strict limit. The limit covers every \(N\), not only high \(N\), because \(N=5\) also has isolated frames over 25 ms, although far fewer. The cost is accepted, not removed: at \(N=50\) a drag still drops a frame on each move.

## Evidence

Headless Chromium 156 on a Ryzen 5 7600 at 1280×720 and 1920×1080; the classroom target device was not available. Frame intervals sit at the 16.7 ms display cap, with 0 frames over 25 ms, in all 72 play and drag cases of all approaches; they do not discriminate. The in-page main-thread cost does. At \(N=50\), \(S=2000\), the curve pair (b2) costs 1.5 to 1.6 ms per playback step, 3.0 to 3.6 ms per vertex drag and 2.8 to 2.9 ms per N change (p95 at most 5.7 ms). One circle, arm and point object per term (a) costs 3 ms for playback and 5 ms for a drag, but 18 to 22 ms per N change (p95 54 to 62 ms), with 3 to 6 frames over 25 ms per 2 s sweep. The tables are in the review file.

## Alternatives

- **Individual objects per circle and arm (a).** Simplest to style per term, but 342 objects at \(N=50\), and rebuilding them on each N change fails the threshold. Pre-creating the objects and toggling visibility was not measured and keeps a per-update visit of every object.
- **Arm chain as one curve with the first 5 circles as JSXGraph circles (b1).** Cheapest (1 to 3 ms) and passes, but the picture shows 5 of up to 100 circles, which hides the epicycle idea of the lesson. Kept as the fallback if b2 draws badly on the target device.
- **An overlay canvas or SVG layer.** Not measured: the native curves already meet the threshold, and an overlay would need its own resize, high-DPI, disposal and scene-capture handling.

## Consequences

- No new dependency and no overlay lifecycle. A fixed small object set means the scene tests can assert a created and disposed count independent of \(N\).
- A curve cannot carry per-circle styling, so all circles share one stroke, and highlighting one term needs an additional object.
- The measurement is a lower bound for the target device and the React host, and it moved anchors only. F2a re-checks the drag of control points and the host's update cadence; F6 re-checks interactivity on the classroom device. If it misses the threshold in force, the relaxed one for drags, stop and report to the owner (06 Batch C rule).
