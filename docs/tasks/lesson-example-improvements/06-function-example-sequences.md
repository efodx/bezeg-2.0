# 06. Isolate changes in function examples

**Source spec:** [Batch C](../../specs/lesson-example-improvements.md#batch-c-parameterization-and-example-sequences)

**Status:** implemented; accepted 2026-10-25 (task 09, [acceptance](../../reviews/lesson-example-improvements/acceptance.md)). **Dependencies:** none. **Lessons:** `trigonometric-functions`, `area-between-curves`, `taylor`.

## Work

- Trigonometric functions: retain the sine baseline. Introduce amplitude, vertical shift, frequency, and phase through separate comparisons before the existing combined example. Keep each comparison's reference fixed and make the changed quantity explicit. Retain tangent/asymptote exploration.
- Area between curves: keep the current two quadratics. Open with the between-region shaded on \([1,3]\), introduce intersection bounds later, then show the broad \([0,4]\) crossing comparison before the narrow case at \(b=3.5\). Preserve sign/orientation distinctions.
- Taylor: retain \(e^x\) centered at zero. Compare degrees \(1,2,3\) before degree \(6\). Preserve the later sine, geometric-series outside-convergence, and smooth nonanalytic examples and their hypothesis/error-bound qualifications.
- Keep lessons bounded: add only the frames needed for the comparisons, combining redundant prose rather than growing each into a long course. Ensure graph readouts and prediction/reveal timing agree with the new sequence.

Entry points: `src/learning/content/functionGuidedLessons.ts`, `analysisGuidedLessons.ts`, and the corresponding `src/graphs/functions/` and `src/analysis/` modules. Coordinate writes to these shared lesson files with task 07.

## Acceptance and checks

- Each trigonometric introductory comparison changes one intended quantity; check amplitude/range, period, and phase-shift sign against the displayed formula.
- Check the area on \([1,3]\) is \(14/3\), the intersection locations remain \(2\mp\sqrt{3/2}\), and crossing scenes distinguish signed difference from nonnegative geometric area. Swapping endpoints preserves geometric area while reversing the signed integral.
- Check exponential Taylor values and actual errors for degrees \(1,2,3,6\) at the chosen point; state the hypotheses of any shown bound. Do not imply all smooth functions equal their Taylor series.
- Bilingual formulas/prompts and reveal timing match scenes. Run focused content/math/scene tests, notation tests, typecheck/build, and browser checks for the three affected IDs.
