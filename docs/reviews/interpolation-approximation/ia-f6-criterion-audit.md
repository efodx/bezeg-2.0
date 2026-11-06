# IA-F6: criterion audit (I1 to I5)

**Partial.** Read-only Sonnet audit at `59a9f35b`, by handler 67, from [this brief](ia-f6-audit-brief.md); it stopped at its turn budget. It ran no test. It read the test bodies of `interpolationChapter.test.ts` 101-188 and `interpolation.test.ts` 107-115, 138-146, 162-166; **every other citation rests on test titles and greps**. The handler checked G1 and G2 against the source; G3 to G6 are the auditor's and unchecked.

Files: KI, KH, KL, KS = `src/analysis/{interpolation,hermite,leastSquares,subdivision}.test.ts`; IG, IR = `src/graphs/curves/interpolation/InterpolationGraph.test.ts`, `InterpolationGraphReal.test.tsx`; RG, LG = `src/graphs/functions/RungeInterpolationGraph.host.test.tsx`, `LeastSquaresGraph.host.test.tsx`; HG, HR = `src/graphs/curves/hermite/HermiteGraph.test.ts`, `HermiteGraphReal.test.tsx`; SR = `src/graphs/curves/subdivisionCurves/SubdivisionCurveGraphReal.test.tsx`; GL, SL, CH = `src/learning/content/interpolationGuidedLessons.test.ts`, `interpolationSubdivisionLesson.test.ts`, `interpolationChapter.test.ts`; SM = `tests/guided-lessons.smoke.spec.cjs`.

| Criterion | Test | Status |
| --- | --- | --- |
| I1.1 through every point, polynomial reproduction | KI:107, 116; IR:45, 73 | covered |
| I1.2 weights, defaults | KI:37, 92; IG:61 | covered |
| I1.3 hull | KI:130; IR:89, 258 | covered |
| I1.4 coincident parameters, 2 to 12 points | KI:138; IG:100, 119, 167, 174, 183, 257 | covered |
| I1.5 Reset, restore, Preset | IR:137, 151, 212; IG:193, 236 | covered |
| I1.5 live language switch on a real board | IG:82; `BasisPlot.test.tsx`:83 | partial (G5) |
| I2.1 table | KI:148; CH:126; RG:78; GL:433 | covered |
| I2.2 barycentric only | KI:22, by reading | partial (G6) |
| I2.3 prose | GL:447, 567 | covered by reading |
| I2.4 degree cap, grid-maximum wording | RG:165 | covered |
| I2.5 Reset, Preset, languages | RG:185, 206, 235, 250, 266 | covered |
| I3.1 end conditions, Bézier conversion | KH:58, 76, 84; HR:76, 101 | covered |
| I3.2 \(C^1\), not \(C^2\) | KH:102, 122 | covered |
| I3.2 overshoot or loops shown with a stated example | None | gap (G3) |
| I3.3 locality | KH:132; HR:149; GL:286 | covered |
| I3.4 zero chord | KH:154; HG:71, 105; HR:164, 181, 197 | covered |
| I3.5 Reset, Preset, languages | HR:311, 325, 388, 298, 359 | covered |
| I4.1 to I4.5 | KL:45-177; LG:67-325; GL:708 | covered |
| I5.1 to I5.6 | KS:14-129; SR:112-470; SL:107; CH:170 | covered |
| Gate 1: open, refresh, preview, narrow, keyboard | SM rows `interp-*` | browser, not rerun |
| Gate 5: mathematics review, push | This audit is input | open |

## Ranked gaps

**Read G1 and G2 with care.** The [D4 browser pass](../advanced-bezier/ab-c-6-gate.md#audit-gaps) found that a lesson-owned section's investigation prompt was shown on no page. Check in the browser whether these chapter prompts are displayed before ranking them as student-visible. The route prompt `prompt_interp_hermite` is a separate string.

1. **G1, Hermite chapter prompt (handler confirmed).** `interpolationChapter.ts:80` says to drag a tangent handle, but the default is `mode: 'catmull-rom'` (`hermiteModel.ts:40`), where handles drag only in Hermite mode (HR:232), and the prompt does not name *Vrsta krivulje* / *Curve type*. The default has four points and three segments, so the "at most four" locality cannot be counted; the lesson uses six points. `prompt_interp_hermite` (`en.ts:3385`) has the same default-mode problem. Expected: the prompt names the mode and adding points.
2. **G2, I4 chapter prompt (handler confirmed).** `interpolationChapter.ts:93` says to predict the line by eye, but the fit is already drawn and the comparison needs *Ročna premica* / *Manual line*, which it does not name.
3. **G3, I3 acceptance 2.** The prose says uniform parameters can overshoot or loop and gives no point set; no test pins one. Expected: one verified coordinate set with a kernel test, uniform overshooting and chord length taming it.
4. **G4, weak pins.** CH:162-168 pins `0.7`, `0.4`, `-0.7`, `2.5`, `0.45` with `toContain` on the whole chapter body; each occurs elsewhere. The kernel half is sound.
5. **G5.** No real-board test of I1's board text after a language change. Low.
6. **G6.** Nothing fails if the plotted curve moved to a monomial solve. Low.

Minor: the I1 prompt asks about hull containment, the hull toggle is off by default and not named.

## Answers

1. **Instructions against controls.** I1, I2, I5 prompts and every lesson control name sampled exist. Findings G1, G2. Both-language wording beyond sampling not done.
2. **Honest guarantees.** No finding. One loose phrase, Hermite lesson: "the curve stays smooth at every point"; Catmull-Rom is \(C^1\) and the wording claims no more.
3. **Quoted numbers.** 18 recomputed with a standalone script or by hand, all match: Runge equispaced 1.91566, 2.10756, 59.8223 and Chebyshev 0.10915, 0.083107, 0.015334; least squares \(0.9x+0.9\) with 0.7, quadratic with 0.45, outlier \(2.1x+0.1\) with 8.7; Lagrange weights at \(t=5/2\) and \((3.75, 2.1875)\); Hermite control points; manual-line sums; four-point counts 4, 7, 13.
4. **Lifecycle.** No finding: one `IterationController`, disposed on unmount (`SubdivisionCurveGraph.tsx:143-153`); pausing covered at SR:226-310. Restore through the lesson runtime only by SR:226. No other timer found in I1 to I4.
5. **Stale rows.** `IA-A-*`, `IA-B-*`, `IA-C-* (rest)` are stale: every sub-row is done. The only undone work is the F6 gate, which no row owns.

## Not verified

Test bodies beyond those named; browser rows; both-language wording of each prompt; 200% text and keyboard order. The Hermite smoke row probes only the status line.
