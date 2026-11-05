# CG-B1-6: criterion audit (L1, L2)

Read-only Sonnet audit against [the spec](../../specs/curve-geometry-lessons.md), then repairs. Test files: PCT `parametricCatalogue.test.ts`, PCG `ParametricCurveGraph.test.ts`, CBG `CurvatureBezierCurveGraph.test.ts`, CBR `CurvatureBezierCurveGraphReal.test.tsx`, CGL `curveGeometryGuidedLessons.test.ts`, KT `curvature.test.ts`, GLS `tests/guided-lessons.smoke.spec.cjs`. Line numbers are from the audit, before the repairs.

| Criterion | Test | Status |
| --- | --- | --- |
| L1-A1 length, area, scaling | PCT:11, 16 | covered |
| L1-A2 cardioid \(\kappa(0)\) | PCT:30 | covered |
| L1-A3 cusp | PCT:80, PCG:132, 229 | covered |
| L1-A4 roll resets | CGL "a real lesson session stops a roll started away from t = 0" | covered by `6d7757b0`. Reading: closing the lesson restores the learner's checkpoint \(t\), not 0, which is the runtime's exit contract |
| L1-A5, L2-A6 both languages | CBR language test (`6d7757b0`), GLS rows in sl and en | covered; browser pass below |
| L1 Steps 1–7 | CGL:64, 85, GLS:1842 | covered; step 1 was wrong, see below |
| L2-A1 values | CBG:68, 85, CGL:139 | covered |
| L2-A2 endpoint formula | KT:125 | covered |
| L2-A3 inflection | CBG:140, 155, 163, CGL:178 | covered |
| L2-A4 tangency after a drag | CBR "dragging a control point keeps the drawn circle tangent" | covered by `6d7757b0` |
| L2-A5 Reset | CGL:245, CBG:317 | covered |
| L2 Steps 1–7 | CGL:121, 139, 178, GLS:1853 | covered |
| Kernel contract | KT:79–169 | covered |

**Found by viewing the L1 card, not by the audit:** step 1 asked for a prediction with the finished arch on the board. Fixed in `fc4e42c8`.

**Mathematics.** The kernel and parametric graph were reviewed earlier ([kernel](cg-1-kernel.md), [graph](cg-b1-2a-graph.md)). The L2 overlay had no independent review; a Sonnet review on 2026-11-05 derived the frame, centre, concave side, line threshold, singular case, parabola and cubic values by hand and found no defect. Deferred, cosmetic: the angle readout gives −180 rather than 180 if \(T_y\) is −0, and no frame is drawn at \(r'=0\) although the tangent direction has a limit.

**Accessibility from code:** N, the circle and the line are dashed, T and N are labelled, the readouts are text. The measurement's \(t\) sweep drove the slider with arrow keys.

## Browser pass and release (handler 45, 2026-11-05)

Sonnet `bezeg-smoke` against a production preview of `9f736678`, Chromium at 1440×900, in sl and en; no console or page error anywhere. Full walks of L1 and L2, both free routes and the chapter page passed.

- **Live language switch.** On L1 and L2, with \(t\) edited and the card open, SL to EN to SL kept the step and frame, the edited value, the point positions and the trace, and Next still worked. Text and readouts changed language. Switching during the L1 roll did not restart it: \(t\) ran on to \(6{,}28\), and Replay worked.
- **Partial trace.** Measured at six moments per language, the trace grew from 5 to 716 px, always ending at the marked point. Screenshots viewed: nothing is drawn ahead of the point, and the prediction step shows no path.
- **Found: card `alt` text exposed LaTeX.** 146 of 384 authored `alt` strings, in seven copy files, carried `\(` delimiters into an attribute that is never typeset. Fixed for all chapters in `7625eb74` by `mathAltText`; one mutation each of the resolver and the converter failed its test. On the rebuilt `be1b4b98`, 20 cards across three chapters in both languages showed no LaTeX and no page error.
- **Known limitation, not fixed: card images are in Slovenian.** An English reader sees "Ukrivljenost κ" in the L2 card, because every example image in every chapter is captured once in `sl-SI` (`capture-guided-example-previews.cjs:578`). The specs ask for bilingual `alt` and caption, not per-language images, and L1-A5 and L2-A6 concern the lessons, so this does not block the release. Per-language capture would double the assets of all chapters and is an owner decision.

Not covered: dragging a control point during a language switch (value edits only); every control of the free routes (one each); other roll speeds. About 7 of 80 screenshots were viewed; the rest were checked through the DOM. The expanded lesson card covers the board's top-left readout and part of the arch.

`just check` passed at `9f736678` (10 405 tests) and at `be1b4b98` (10 466 tests). Hosted CI passed on `64d27a5f` and `9f736678`.
