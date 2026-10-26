# Final semantic review: Learn improvements Tasks 7–8

Reviewed the final bilingual content in `src/learning/content/familyChapters.ts` and `bezierChapter.ts`, Task 7 family context copy in `FamilyChapterPage.tsx` and `DemonstrationWorkspace.tsx`, against `docs/specs/learn-improvements.md` §§7–8. Slovenian was checked first; English retains equivalent mathematical claims and instructions. This was a source review, not a browser pass.

## Findings

- **P3 — Polish the Slovenian derivative alt.** `src/learning/content/familyChapters.ts:363` says “Na kvadratni grafiki…”, which is awkward Slovenian for a graph. Use a natural equivalent such as “Na grafu kvadratne funkcije sta prikazani sekanta … in tangenta …”; retain the existing English meaning.
- **Task 7 wording recheck:** `DemonstrationWorkspace.tsx:210–213` now says in both languages that the graph opens in its current/default state and the prompt tells the reader what to set up. Together with the “prosto raziskovanje” / “free exploration” link and separate guided-lesson action, this resolves the missing ordinary-state/setup explanation. The wording avoids implying that a worked numerical example is preloaded.

## Coverage and reused checks

- **Foundations:** re-read assumptions, notation, weighted-average interpretation, and Bernstein/complex prompts; reused `foundations-math-review.md` calculations and figure/control review. Its modulo- \(2\pi\) correction is present in both languages.
- **Bézier:** re-read chapter flow and activity distinctions; reused `bezier-pilot-review.md` midpoint rows/weights, partition-of-unity, convex-hull, affine, notation, and prepared-activity correspondence checks.
- **Rational curves:** reused `rational-review.md` conic identity, denominator positivity, midpoint arithmetic, caption/alt distinction, and seven control-matched prompts.
- **Splines:** reused `splines-review.md` global/local derivative scaling, (C^1/C^2/G^1) arithmetic, figure correspondence, and five control-matched prompts.
- **PH curves:** reused `ph-review.md` integrated curve, speed and (4/3) length checks, offset qualifications, figures, and controls.
- **Parametrization:** reused `param-review.md` chord-weight assumptions, timing shares, fixed-trace neutral warp, captions, and control correspondence.
- **Functions and calculus:** reused `calculus-review.md` continuity order, difference quotient, (\int_0^2 x\,dx=2), left-rectangle arithmetic, captions, and eight destination prompts.
- **Analysis:** reused `analysis-review.md` bisection, Darboux, mean-value/extrema/convexity, Taylor, convergence and fixed-point checks, including the corrected power-sequence/domain prompt and all ten destinations.

Across all eight chapters, I reviewed the final source’s assumptions, notation explanations, worked claims, bilingual figure text and linked investigation prompts; where math was unchanged, I reused the exact accepted calculation and control evidence listed above instead of recalculating it. For Task 7, I independently checked the source-section return, exact section heading, bilingual prompt selection, ordinary-state/setup explanation, and distinction between free exploration and guided lesson. The derivative alt remains the sole actionable source finding. No final browser, keyboard, responsive, language-switch, Back/Forward, or activity-return verification is claimed; handler/browser acceptance remains necessary. No mathematical checks were independently recalculated in this final pass; the chapter calculations listed above are reused from the named accepted reviews.

Handler disposition, Task 8: the Slovenian derivative alt now uses the proposed “Na grafu kvadratne funkcije” wording. The reader footer also accurately names free graph exploration and guided lessons in both languages. These two small editorial edits preserve the reviewed mathematical meaning. The handler verified the rendered alt/footer in Slovenian and English, loaded figure, desktop and enlarged narrow output. Final automated/shared-browser evidence and remaining optional coverage are recorded in [final acceptance](final-acceptance.md).
