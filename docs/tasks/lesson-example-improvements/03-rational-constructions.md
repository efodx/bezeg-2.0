# 03. Make rational comparisons explicit

**Source spec:** [Batch B](../../specs/lesson-example-improvements.md#batch-b-rational-constructions-and-splines)

**Status:** implemented; accepted 2026-10-25 (task 09, [acceptance](../../reviews/lesson-example-improvements/acceptance.md)). **Dependencies:** 00; coordinate shared content/overlays with 01.

**Lessons:** `rational`, `rational-decasteljau`, `rational-elevation`, `rational-subdivision`, `rational-extrapolation`, `farin`, `circle`.

## Work

- Rational curve: begin with weights \((1,1,1,1)\), then \((1,2,1,1)\), then \((1,4,1,1)\), keeping control points and the comparison parameter fixed. Make endpoints and the influence of the second weight explicit.
- Rational De Casteljau: begin with equal weights and show its ordinary counterpart, then change one weight. Choose a quadratic opening if it reduces calculation burden, followed by the existing cubic; record the selected inputs and update all dependent content.
- Rational elevation: retain useful geometry and show original/elevated control polygons and weights together. Check equality in homogeneous coordinates and after projection.
- Rational subdivision: retain its useful construction, updating any comparison with the ordinary/equal-weight baseline. Check both reparameterized pieces and their weights against the original rational curve.
- Rational extrapolation: keep the main extension around \(1.1\) or \(1.2\). Prepare the negative-weight case as an advanced comparison with its own suitable view. Check the denominator throughout the actual extrapolated interval; a negative control weight is not itself a pole.
- Farin: retain the current unequal-ratio/midpoint example and geometric-weight standardization. Explain that standardization preserves the locus while potentially changing the parameter mapping; weights recovered from ratios require normalization such as \(w_0=1\).
- Circle: retain three pieces and middle weight \(1/2\); keep four pieces as a later familiar comparison. Preserve exact circle geometry rather than implying more pieces improve circular accuracy.

Entry points: `src/learning/content/expansionGuidedLessons.ts`, `additionalGuidedLessons.ts`, `foundationGuidedLessons.ts`, `constructionGuidedLessons.ts`, `rationalConstructionGuidedLessons.ts`, and `src/graphs/curves/rational/`.

## Acceptance and checks

- Bilingual worked examples match every selected degree, weight vector, parameter, and normalization; all scenes prepare synchronously and restore correctly.
- Check equal-weight reduction, weighted evaluation, homogeneous elevation/subdivision, extrapolation denominators, Farin ratios/reparameterization, and circle radii using focused mathematical checks.
- Introductory geometry and weight labels fit the starting view; the advanced extrapolation comparison does not require hunting for an offscreen point.
- Use existing overlays and retention tests when sufficient. Record a retain/change result for each of the seven IDs, including Farin/circle.
- Run focused numerical/content/scene tests, notation tests, typecheck/build, and affected-route browser checks. Follow the spec's review and evidence requirements.
