# Foundations mathematics and bilingual review

Reviewed `git diff 75536ec -- src/learning/content/familyChapters.ts`, the §6a acceptance criteria, prior content-audit findings, and the named Bernstein and complex-multiplication graph controls/preview recipes.

## Finding

- **P3, wording precision — `src/learning/content/familyChapters.ts:84`.** The prompt says the product's argument “follows the sum of the factor arguments.” The graph displays principal arguments, so the displayed product argument may differ from the raw sum by a multiple of \(2\pi\). Add “modulo \(2\pi\)” (or say the displayed principal argument is the sum reduced to its principal range) in Slovenian and English.

**Disposition:** Resolved. The multiplication explanation and prompt now both specify modulo \(2\pi\) in Slovenian and English. No remaining findings in this narrow recheck.

## Acceptance gaps

None found in this source review. Radians are introduced before polar form and multiplication; sine and cosine are tied to unit-circle coordinates; zero is excluded from polar form and the argument-sum rule. The \(i\) example and zero-factor behavior are correct. The quadratic weights and \((2,1)\) coordinate calculation are preserved, and the text explicitly distinguishes them from the captured cubic basis. Bernstein prompts use the degree selector and explain the observed count/shape or weighted-average meaning. Complex prompts use the product/argument visibility controls and polar inputs to observe rotation or uniform scaling. Slovenian and English instructions are equivalent; formulas in prose and captions are delimited. Captions distinguish the worked quadratic from the cubic figure and correctly describe \((1+i)i=-1+i\). The recipes identify the existing four-cubic-function and multiplication-by-\(i\) captures, consistent with those captions.

No browser behavior or image rendering was independently checked; this review covers source math, prompt/control correspondence, and catalog recipe descriptions.
