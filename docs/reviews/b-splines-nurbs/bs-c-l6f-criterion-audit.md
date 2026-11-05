# BS-C-L6f L6 criterion-to-test audit (HEAD 36df707e)

Audit of [spec L6](../../specs/b-splines-nurbs-lessons.md#l6-blossoming-as-the-bridge-from-de-casteljau-cvetenje-optional) against the tests, in the form of the [BS-C-6 audit](bs-c-6-criterion-audit.md). K = `src/bezeg/impl/curve/bspline/blossom.test.ts`, G = `src/graphs/curves/bspline/BSplineBlossomGraph.test.tsx`, L = `src/learning/content/bsplineBlossomGuidedLessons.test.tsx`, C = `src/learning/content/bsplineChapter.test.ts`, P = `src/graphs/curves/bspline/bsplinePresetCollection.test.ts`. K and G use the tolerance 1e-12.

## Acceptance (1)–(4)

| Criterion | Test | Status |
| --- | --- | --- |
| (1) Control points \(f(0,0)\), \(f(0,1)\), \(f(1,2)\), \(f(2,2)\) | K:34 kernel; G:78 as drawn | covered |
| (1) \(f(0,\tfrac12)\), \(f(\tfrac12,1)\), \(f(\tfrac12,\tfrac12)\), the de Boor triangle at 0.5 | K:41, compared with `deBoorTriangle`; G:78 | covered |
| (1) Bézier piece on \([0,1]\): \(f(0,0),f(0,1),f(1,1)\) | K:51, compared with `bezierPieces`; G:78 | covered |
| (2) Symmetry to 1e-12 for random pairs | K:72 (50 seeded pairs), K:82 (all 6 orders of a cubic); G:109 (40 cubic and 40 quadratic cases through the controls) | covered |
| (3) \(f(t,t)\) equals the curve | K:97 (every segment, degrees 2 and 3); G:133 (drawn point and readout); G:147, G:165, G:178 (no false claim outside the segment or at a break) | covered |
| (4) Only degree 2 and 3 are offered | K:126 kernel refusal; G:188 selector; G:205 Preset refusal | covered |

## Lesson steps (1)–(6)

| Step | Test | Status |
| --- | --- | --- |
| (1) Predict \(f(0,1)\) | L:65 (scene state, Bézier points hidden), L:268 (prediction wording in both languages) | covered |
| (2) A pair by two interpolations | L:65 | covered |
| (3) \(a=b\): the curve point | L:65, L:255 | covered |
| (4) Symmetry | L:65, L:158 (reversed readout) | covered |
| (5) Bézier points of an interval | L:65, L:190 | covered |
| (6) Free exploration | L:268 | covered |

## Testing decisions (spec lines 146-150)

| Deliverable | Test | Status |
| --- | --- | --- |
| Every value in the L6 section is asserted | K:34, K:41, K:51; L:143 (quoted numbers in the prose of both languages) | covered |
| Steps in one synchronous sequence, reset | L:65, L:239 | covered |
| `lessonMathNotation.test.ts` passes unmodified | in `just check` below; L6 only added the lesson to its list | covered |
| Preset round-trip | G:298, P:16 | covered |
| Each rejection reason in both languages | G:205, P:58 | covered after this audit: see below |
| Disposal shows no leaked board objects | G:317 | covered |
| Reset, drag and language switch | G:236, G:260, G:335 | covered |
| Chapter section with the one-shot terms | C:30, C:43 | covered |
| Poster | `src/demonstrationPreviewAssets.test.ts:13`; viewed by eye (BS-C-L6e) | covered |

## Gaps this audit closed

- The `args` rejection in `bsplinePresetCollection.checkGraphState` (added in BS-C-L6c) had no test. P:58 now covers a non-array and two invalid-element cases, in both languages. Mutating the check to accept any array fails P:58.
- The degree refusal was asserted only in Slovenian. G:205 now asserts the English text too.

## Defect found while viewing the poster

The board label and readouts printed `f(0, 0,5)` in Slovenian, where the decimal comma reads as another argument. They now print `f(0; 0,5)`, matching the `(x; y)` coordinates on the same line; English keeps `f(0, 0.5)`. G:96 and G:335 failed against the old code; G:346 pins the three-argument and `f(0,5; …)` forms (`ffd25687`).

## Summary

Covered 21, missing 0. Two test gaps closed by this audit, one display defect fixed. No accepted deviations.

## Gate checks (curves handler 43)

- `just check` at `36df707e` (dirty: the two new tests): 560 files passed, 1 failed, 2 skipped; 10316 tests passed, 1 failed, 7 skipped. The failure is `guidedExamplePreviews.test.ts`, "publishes the school-function-graphs example cards" (`geometric-series/sl` preview undefined), the pre-existing Functions failure of [handoff 42](../feature-streams/curves/handler-handoff-42.md#risks-and-notes); its resolver imports no poster or blossom code. **The gate therefore holds for L6, but `just check` is not green on master.** The check stops at that failure, so the build ran separately.
- `tsc` and lint on the touched files passed; production build passed at `e562b75c`.
- Focused rerun at `e562b75c`: `lessonMathNotation.test.ts`, `bsplinePresetCollection.test.ts`, `demonstrationPreviewAssets.test.ts` passed. The two new tests also passed at `36df707e`.
- `just smoke-lesson bspline-blossom` passed at `e562b75c`.
- Browser: the sl label `f(0; 0,5)` is on the poster captured from the production preview of `ffd25687`. The L6 walk (sl 1440×900, en 390×844) comes from BS-C-L6d; it predates the separator change, and the en output is unchanged. No new walk was run.
- `scripts/demonstration-preview-capture.test.cjs`: 36 of 37 passed; the failure is the known local FFmpeg VP9 `bt709` gap (handoffs 40, 41).
