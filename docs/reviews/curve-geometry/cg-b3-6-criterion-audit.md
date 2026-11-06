# CG-B3-6: criterion audit (L5, L6)

Read-only Sonnet audit against [the spec](../../specs/curve-geometry-lessons.md) at `8146bef0`, by handler 56. It read code and ran no test. Totals: 36 rows, 26 covered, 7 partly, 2 measured separately, 1 uncovered. The handler has not rechecked the rows; the gaps are open for the gate.

Files: CO=src/graphs/curves/offset/curveOffset.test.ts, COG=offset/CurveOffsetGraphReal.test.tsx, COG2=offset/CurveOffsetGraphReal.part2.test.tsx, CE=src/graphs/curves/envelope/curveEnvelope.test.ts, CEG=envelope/CurveEnvelopeGraphReal.test.tsx, LO=src/learning/content/curveGeometryGuidedLessons.offset.test.ts, LE=curveGeometryGuidedLessons.envelope.test.ts, PC=src/graphs/curves/curvePresetCollections.test.ts, SM=tests/guided-lessons.smoke.spec.cjs, EV=docs/reviews/curve-geometry/cg-b3-*.md

| Criterion | Test | Status |
| --- | --- | --- |
| L5-A1 distance to base = abs(d) to 1e-9 | CO:131 (own bisection foot-point); LO:237 (board data, closed form and golden-section distance, scenes 2, 3, 5); the d=-1 case checks the generating distance only, by design | covered |
| L5-A2 cusp params solve 1+d*kappa=0 to 1e-6 | CO:45, 65 (X_D1 closed form), CO:94-128 (end intervals); LO:266 | covered |
| L5-A3 sampled labelled approximate, PH exact | COG:304 (Bezier no exact line, PH adds it); LO:323 (every scene, sl and en) | covered |
| L5-A4 only local cusps claimed | COG:321 (inspector); LO:355 (sl and en) | covered |
| L5-A5 sign = phOffsetRational (cubic, quintic; d -0.7, 0.4, 1.3) | CO:156; LO:306 (on the board); prose LO:365 | covered |
| L5-A6 both languages | LO:380, 398; COG:328 (caption); SM:1930 readouts accept both | partly: no English walk of all six steps in a unit test |
| L5 default d=-1/2: one cusp (0,1/2) | CO:35 (6 sample counts incl. tangential search); COG:146; LO:266 | covered |
| L5 default d=-1: x=+-0.38321, offset (-+0.2251,0.9406), on evolute | CO:45 (X_D1 = sqrt((2^(2/3)-1)/4), literals to 5e-5, evolute via kernel evolutePoint); COG:146; LO:266, 398 | covered (the closed form is independent; the evolute comparison uses the code under test, but (-4x^3,3x^2+1/2) gives the same numbers by hand) |
| L5 step 1 predict segment and circle arc | LO:152 (segment, parallel at y=1/2); the arc is prose only (curveGeometryGuidedLessons.ts:927-929: no picture, a quadratic Bezier cannot be a circle) | partly: arc neither drawn nor tested; the spec allows prediction only |
| L5 step 2 small d | LO:126 (-1/4, 0 cusps), LO:237 | covered |
| L5 step 3 toward threshold | LO:126, 266 (d=-1/2, one cusp) | covered |
| L5 step 4 PH exact beside sampled | LO:212, 306; COG:52, 227, 244 | covered |
| L5 step 5 cusps and 1+d*kappa plot | LO:126, 266; CO:214 (speedFactorSamples); SpeedFactorPlot.test.tsx | covered |
| L5 step 6 explore with sample count | LO:126 (128 samples), COG:110 | covered |
| L5 dispose and Reset | COG:27; COG2:162, 217, 236, 264 | covered |
| L5 leave through real lesson session | LO:457 (steps to PH, closes; state, curve, view, overlay, count restored) | covered |
| L5 multi-action scene in one sync tick | COG2:65, 96; LO:181 | covered |
| L5 Preset round trip and rejection | COG2:127, 144 (clamp), COG:244; PC:159-174 (rejects offsetD 3.5, "1", samples 63, 513, 100.5) | covered |
| L5 dragging measurement | EV cg-b3-2a (scripts/offset-gate-perf.cjs, 3 runs, CPU/4) | measured separately |
| L6-A1 touch = de Casteljau point to 1e-9 | LE:174 (own Bernstein and row one, every non-collinear scene, t in 0..1, drawn point and segment); CE:39, 54 | covered |
| L6-A2 at most 200 lines, note attached | CE:94, 112; CEG:185 (201 rejected); LE:230 (200 segments, 199 separators); measurement in EV cg-b3-4a | covered (the note is the evidence document, not in-app text) |
| L6-A3 collinear shows the segment | CE:136, 144-170; CEG:252, 272, 289; LE:257 (all lines on x+y=1, sl and en) | covered |
| L6-A4 both languages | CEG:253, 348, 359; LE:303 (prose numbers sl and en) | partly: SM walks sl; English only on steps 4 and 6 per EV cg-b3-4b |
| L6 default: x/(1-t)+y/t=1, sqrt x+sqrt y=1 ("sample 14" is a research sample id, not a count) | CE:122; CEG:109; LE:201 | covered |
| L6 step 1 predict (4 lines) | LE:124, 134 | covered |
| L6 step 2 increasing counts (64, 200 shipped as two steps) | LE:134, 230; CEG:185 | covered |
| L6 step 3 slide t | LE:174; CEG:129 | covered |
| L6 step 4 drag middle point, curve stays Bezier | LE:134 (MOVED), 174; CEG:168 | covered |
| L6 step 5 explore | LE:134 (envelope-explore) | covered |
| L6 dispose and Reset | CEG:333, 380, 399, 419 | covered |
| L6 leave through real lesson session | LE:474 (closes on the collinear step; state, points, view, overlay restored) | covered |
| L6 multi-action in one tick | CEG:224, 322; LE:418 | covered |
| L6 Preset round trip and rejection | CEG:303; PC:134-150 (rejects envelopeT -0.1, 1.1, "0.5") | covered |
| Stored Presets and routes unchanged | git diff 90b048d3..HEAD on src/graphs/curves/ph, src/routes is empty; PresetCatalog.test.tsx:40 lists the new ids | partly: nothing pins the existing routes or ids against literals |
| Batch gate: independent mathematical review | Kernel: EV cg-b3-2a:29, closed in handoff 52; L6 formulas derived twice (cg-b3-4b:16); no named review of the L5 lesson numbers (LO:398 compares with the closed form) | partly |
| Batch gate: dragging measurement | EV cg-b3-2a, cg-b3-4a | measured separately |
| Batch gate: UI and accessibility (not colour alone, keyboard sliders, text readouts) | Text readouts and live region tested (COG2:196, CEG:370; LO caption tests). Sliders are the shared Slider (CurveOffsetGraph.tsx:321, 328; CurveEnvelopeGraph.tsx:241, 246). No test operates a slider by keyboard; no check on colour alone | uncovered |

## Gaps, most important first

1. **Accessibility gate, uncovered.** No keyboard slider test or review for the offset and envelope controls, and no colour-alone check. At 200 lines the envelope's curve reads only as the fill's edge.
2. **Spec text is stale for L6.** The spec lists 5 steps; the shipped lesson has 7 (`envelope-reveal`, `envelope-collinear`; LE:124) and 15 frames. Update the spec or record the change.
3. **L5 lesson numbers.** No independent reviewer is named for them, though the tests use closed forms. Record or run one pass.
4. **English coverage.** No unit test walks all steps in English for either lesson, and smoke covers L6's steps 4 and 6 only. The gate's both-languages browser check should cover both rows.
5. **Existing routes and stored Presets.** Add one literal pin for old ids, or accept the empty diff as the evidence.
6. **L5 step 1's circle arc** is text only, by design: a quadratic Bézier cannot draw it.
7. **Low.** L6-A2's measurement note lives only in the evidence document; the board caption crosses a y tick label at 390 and 1440 px.

Not verified: that any test fails against pre-change code (no mutations, per the brief); smoke rows SM:1933 and 1946 were read, not run.
