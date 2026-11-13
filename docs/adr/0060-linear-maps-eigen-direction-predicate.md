# Linear maps Batch B: the eigen-direction predicate for the dragged test vector

Accepted on 2026-11-13 (decision 3 of the [linear-maps spec](../specs/linear-maps-lessons.md#decisions-needing-an-adr), task [08 Batch B](../tasks/linear-maps/08-batch-b.md), stream `families-prep`, handler 15).

## Decision

The eigen mode of `LinearMapGraph` uses option (c) of the spec: both a stated tolerance and an exact test.

- The test vector \(v=(\cos\theta,\sin\theta)\) is continuous. Its angle is stored on a \(0{,}01^\circ\) grid and set by the angle slider (step \(1^\circ\)), by dragging its tip along the unit circle, or by a "snap \(v\) to the eigen-direction" control. The snap control moves \(v\) to the nearer real eigen-direction, rounded to the stored grid.
- "Approximately parallel" means \(\lvert\sin\angle(v,Av)\rvert<\) `EIGEN_PARALLEL_TOLERANCE` \(=0{,}01\) (`src/linear/eigen2.ts`), For the spec's example \(E\) that is a window of about \(\pm0{,}95^\circ\) around the direction at \(45^\circ\), but only about \(\pm0{,}38^\circ\) around the direction at \(116{,}57^\circ\), because the sine grows faster with the angle there (`.command-logs/lm-b/window.cjs`). The indicator always shows the sine and names the tolerance, and never calls it exact.
- "Exactly parallel" is claimed only when \(\theta\) is a multiple of \(45^\circ\). The direction is then a quarter-grid vector such as \((1,1)\), and the kernel's integer test \(\det(v,Av)=0\) decides it, for example \(1\cdot5-1\cdot5=0\) for \(E\) at \(45^\circ\).

Revisit this if the eigen view is enlarged enough for a drag to hit the window reliably, or if the stored angle grid changes.

## Evidence (drag feel)

Measured on the production build with \(E\) (`docs/reviews/feature-streams/families-prep/notes/lm-b-e1.md`, slice E2):

| Viewport | Circle radius | Pixels per degree | ±0,95° window at 45° | Scripted 1-px drag from 30° landed in it |
| --- | --- | --- | --- | --- |
| 1366×768 | 28,2 px | 0,49 | 0,93 px | never |
| 1920×1080 | 37,8 px | 0,66 | 1,25 px | once |

A pointer drag cannot reliably land in a window about one pixel wide, and the window around \(116{,}57^\circ\) is narrower still. The slider reaches \(45^\circ\) exactly. Its nearest stops to the second direction, \(117^\circ\) and \(297^\circ\), are \(0{,}43^\circ\) away and outside that window, where \(\lvert\sin\rvert=0{,}0115\) (the browser smoke saw "not parallel" there). Dragging and the slider are therefore for exploring, and the snap control is the reliable path to an eigen-direction that is not at a whole degree. The eigen-mode view may be enlarged later (slice E3 fits it to the matrix); that changes the pixel widths, not the predicate. Lesson scenes set the angle with `set-test-vector`.

## Alternatives

- (a) Only quarter-grid \(v\) with the exact test. This succeeds only for rational eigen-directions: \(E\)'s second direction \((1,-2)\) is never a unit vector at a stored angle, and irrational directions would never show as parallel.
- (b) A tolerance alone, with snapping. This gives no exact statement even at \(v=(1,1)\), where the spec's acceptance asks for one.
- A wider tolerance, such as \(0{,}05\). The indicator would then say "parallel" up to about \(3^\circ\) away, which misleads at the scale of the lesson's readouts.

## Consequences

- L3 prose names the tolerance and the constant, and states exact parallelism only at multiples of \(45^\circ\).
- The circle is small in the default view, which is a legibility question for the smoke and UI review, not for this predicate.
