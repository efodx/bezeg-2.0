# Curvature comb drawing: one JSXGraph curve, 64 teeth by default

Status: accepted, 2026-11-05 (curves stream, [CG-B2-1](../tasks/curve-geometry/README.md)). Affects [L3 and L4](../specs/curve-geometry-lessons.md#l3-curvature-comb-and-spline-joins-glavnik-ukrivljenosti-in-stiki-zlepkov). Measurement: [cg-b2-1-comb-measurement.md](../reviews/curve-geometry/cg-b2-1-comb-measurement.md).

## Context

A curvature comb is up to 256 teeth plus the line through their tips, recomputed on every drag of a control point, on a Bézier cubic and on spline graphs whose comb is a concatenation of per-span combs. The spec requires the drawing approach and the default tooth count to come from a dragging measurement. The [performance plan](../performance-plan.md) defines no numeric tolerance, so this ADR takes the budget of [ADR 0037](0037-direction-field-drawing.md): on the desktop, frame p95 at most 16.8 ms and no frame over 25 ms at 60 Hz.

## Decision

- Draw all teeth as **one JSXGraph `curve`** whose `dataX`/`dataY` list each tooth as base, tip, NaN, and the tip line as a second curve broken with NaN at spline knots. Both are refilled in `updateDataArray` from `sampleComb`, so a drag needs no listener and the cost lands in `board.update`.
- **Fixed tooth count, default 64**, the value L3 already names, adjustable up to `COMB_MAX_COUNT` (256). A spline's count is shared across its spans.
- The comb is owned by its graph and disposed with it, so L3 acceptance (5) counts two comb objects, plus any clipped-tooth markers.

## Evidence

Headless Chromium 156 on a Ryzen 5 7600 at 1440×900 and 1920×1080, with a comb computing the kernel's values injected into the production page. Every approach at every count meets the desktop budget, so frame intervals do not discriminate; update time and the CPU ÷4 stand-in do.

At 256 teeth the cubic's update median is 2.3 ms for one curve, 2.3 ms for an SVG layer and 5.5 ms for segments, against 1.8 ms with no comb. At CPU ÷4 those become 12.8 to 14.2, 12.1 and 30.6 ms, and segments reach a frame p95 of 66.7 ms. For the count, seven runs of approach A at CPU ÷4 give a median of 12 frames over 25 ms per run with no comb, 38 at 32 teeth, 29 at 64, 92 at 128 and 91 at 256, so long frames triple above 64.

## Alternatives

- **One segment per tooth.** Simplest per-tooth styling, but about 3.3 objects per tooth (830 at 256) and two to three times the update cost. On the CPU ÷4 stand-in nearly every frame exceeds 25 ms from 64 teeth.
- **Custom SVG layer.** As fast as one curve, within noise. It needs its own resize, high-DPI, disposal and scene-capture handling, which the curve gets from the board, as ADR 0037 found for its overlay. Kept as the fallback if a curve proves unsuitable for styling.
- **Tooth count tied to view width.** No measured benefit: a fixed 32 or 64 costs the same as the 25 teeth this rule gave. It also makes the count, and so the lesson's picture, depend on the window.
- **Default of 256.** Allowed by the desktop budget, which is the spec's literal rule, but it triples long frames on the stand-in and 64 teeth already show the shape of the comb. Teachers can raise the count.

## Consequences

- No new dependency and no overlay lifecycle.
- One curve has one style, so a tooth cannot be coloured by its own κ. The spec's requirement that the comb not rely on colour alone is unaffected. The clipped-tooth marker needs its own object; it was not part of the measurement.
- **The comb is not free on a weak device.** At CPU ÷4 any comb takes the cubic's frame p95 from 16.8 to about 33 ms, and the 64-tooth spline comb takes it from 33 to 50 ms, on a drag that already misses 60 Hz with no comb. Default-off keeps that cost to the lessons that switch it on. No real touch or classroom device has been measured; the Batch 2 gate re-measures the shipped graph, including a C1 or G1 spline, and reports to the owner if the desktop budget is missed.
- The budget is borrowed, not agreed. If the owner sets a performance budget for weak devices, the default may need to drop.
