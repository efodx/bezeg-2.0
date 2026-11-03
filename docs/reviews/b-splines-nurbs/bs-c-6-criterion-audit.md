# BS-C-6 Batch C criterion-to-test audit (HEAD 8d26fb1b)

Read-only audit; no tests were run. N = `src/graphs/curves/bspline/BSplineNurbsGraph.test.tsx`, K = `src/bezeg/impl/curve/bspline/bspline-kernel-b.test.ts`, LN = `src/learning/content/bsplineNurbsGuidedLessons.test.tsx`, C = `src/learning/content/bsplineChapter.test.ts`, P = `src/graphs/curves/bspline/bsplinePresetCollection.test.ts`.

## Release condition (spec lines 21-28)

| Criterion | Test | Status |
| --- | --- | --- |
| Batch B released | README row BS-B-6 "passed" (handler 40), audit `docs/reviews/b-splines-nurbs/bs-b-6-criterion-audit.md` | covered |
| Rational kernel tests pass | K:441 `describe('rational (NURBS)')`: K:442 circle, K:455 golden points, K:470 basis-sum and scaling, K:488 rejections, K:501 lift (pass status not re-run here) | covered |

## Kernel contract rows (spec lines 47, 49)

| Criterion | Test | Status |
| --- | --- | --- |
| Weights finite and positive; nonpositive rejected with a reason | K:488 (reason codes nonpositive / not_finite / wrong_count with index; evaluateRational throws) | covered |
| NURBS circle radius within 1e-12 | K:442 (1001 samples < 1e-12; unit weights > 1e-2) | covered |

## L5 acceptance

| # | Criterion | Test | Status |
| --- | --- | --- | --- |
| 1 | Radial error < 1e-12 defaults, > 1e-2 unit weights | N:60 (readout and drawn curve, both examples), K:442, LN:72 (steps 1, 3, 4, 5, 6) | covered |
| 2 | Point 1e-12, angle 1e-4 at t = 1/16 and 1/8 | N:82 (point vs exact 0.9297883010624303 / 0.3680947095618728 at 1e-12; angle vs 21.598161 at 1e-4; 1/8 at 1e-12; inspector and board marker), LN:72 step 4 (5e-6 point, exact angle 1e-4), K:455 | covered; accepted deviation: angle compared with the exact 21.59816 deg, because the quoted 21.598 is 1.6e-4 off |
| 3 | Nonpositive weights refused with the reason | N:118 (0, -1.5, NaN, Infinity: reason text, state and curve unchanged, role=alert), N:132, N:288 (lesson fixture weights), N:333 (EN), P:36-38 (imported), LN:187, K:488 | covered |
| 4 | Scaling all weights by a positive factor leaves the curve unchanged | N:148 (x3.7 after a non-trivial edit, 1e-12), K:470 (x7.5, 1e-11 on random cases), LN:167 | covered |
| 5 | Text says picture illustrates exactness at sampled parameters, proof is the rational identity | LN:270 (step `bspline-nurbs-compare`, SL and EN regexes: "le v vzorčenih", "dokaz je racionalna identiteta", "Vzorčenje samo ne dokaže"; EN "only at the sampled parameters", "the proof is the rational identity", "Sampling alone does not prove it"); extra wording at bsplineNurbsGuidedLessons.ts:70-71, :197 | covered |

## L5 Graph (spec line 97)

| Criterion | Test | Status |
| --- | --- | --- |
| Weights shown and editable | N:132, N:118, N:318 (drag), N:212 | covered |
| Radial-error readout | N:71 (inspector, follows example), N:319 | covered |
| Optional unit-circle overlay | N:192 (toggle, default on), LN:223 | covered |

## L5 steps (spec line 96)

| Step | Test | Status |
| --- | --- | --- |
| (1) predict polynomial, reveal error | LN:72 step 1 (6.07e-2), LN:270 (prediction wording) | covered |
| (2) polynomial version and its error | LN:72 step 2 | covered |
| (3) corner weights sqrt2/2, error to rounding | LN:72 step 3, LN:270 (set-weight on the four corner indices) | covered |
| (4) predict angle at 1/16, reveal 21.6 | LN:72 step 4, LN:153 (quoted numbers SL and EN) | covered |
| (5) compare with the four-arc circle (text only) | LN:72 step 5, LN:270 (no navigating action) | covered |
| (6) free exploration | LN:72 step 6, LN:270 (id explore) | accepted deviation: explores weights only, no knot editor |

Chapter section for L5: C:30 (section order, demonstration id `bspline-nurbs`).

## Task row BS-C-2a1

| Deliverable | Test | Status |
| --- | --- | --- |
| 1001-sample readout | N:71 `the readout is the maximum over 1001 uniform samples of the domain, both ends included (BS-C-6 audit)`: `radialError()` equals an independent 1001-sample maximum for weight 2 = 0.37, and a 101-sample maximum differs by more than 1e-6 | covered (closed by the handler after the audit; setting `NURBS_ERROR_SAMPLES` to 101 fails it) |
| Examples "NURBS circle" and "same points, unit weights" | N:179 (switch changes weights and Reset target), N:238, N:60 | covered |
| Slider t, point and angle in inspector, no board text | N:82, N:107 (clamp), N:203 (board draws no text) | covered |
| Reset | N:169, N:179, N:238 | covered |
| Disposal test | N:248 (rebuilds and unmount leave no board objects or language subscription) | covered |
| Weights round-trip through shared `bspline-curve` collection | N:212, N:227 (no weights -> unit), P:16 | covered |
| Refusal of bad imported weights | P:36-38 (nonpositive, non-finite, wrong count; SL reasons), N:288; no EN text of the P rejection | covered |

## Summary

Covered 23 (the audit found 22 and one partial, the 1001-sample count, which the handler closed), missing 0; accepted deviations 2 (step 6 weights only; angle against exact 21.59816).


## Gate checks (curves handler 41)

- `just check` at `8d26fb1b` (dirty: this audit and one added test): 550 files passed (2 skipped), 10100 tests passed (7 skipped), build passed.
- New test N:71 passes; the mutation `NURBS_ERROR_SAMPLES = 101` fails it (1 of 28).
- `just smoke-lesson bspline-nurbs` passed on the `8d26fb1b` build.
- Browser, reused from this session on the same code: route smoke 9/9 (BS-C-2a2) and the L5 lesson walk sl 1440×900 and en 390×844, 13 frames each, no console errors (BS-C-3).
- Poster viewed (BS-C-5).
