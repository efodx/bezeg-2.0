# Rational reading review

Independent review of the `handoff-v12` diff against `docs/specs/learn-improvements.md` §6b (2026-10-26).

## Findings

- **[P1] De Casteljau prompt promises an unavailable visible construction.** [`familyChapters.ts:67`](../../../src/learning/content/familyChapters.ts#L67) asks readers to observe “intermediate homogeneous interpolations” and says the final homogeneous point is projected. The rational De Casteljau route currently exposes only a growing curve prefix and parameter slider: [`demonstration-preview-curve-motion.cjs:270-290`](../../../scripts/demonstration-preview-curve-motion.cjs#L270). Update the prompt to ask readers to move `t`, observe the prefix endpoint, and interpret it as `R(t)`; keep homogeneous interpolation as explanatory prose, not a promised graph observation.
- **[P2] Weight prompt implies direct selection of a control point.** [`familyChapters.ts:66`](../../../src/learning/content/familyChapters.ts#L66) tells readers to select the second control point. The weight controls expose previous/next weight navigation and an already-selected weight index; selecting the curve selects the curve, and its second weight is initially highlighted ([`RationalBezierCurveControls.tsx:23-49`](../../../src/graphs/base/controls/RationalBezierCurveControls.tsx#L23)). Rephrase as selecting the curve, checking the highlighted second control point/weight, then using the value field or stepper.

## Verified

The conic algebra is correct: with `a=1-t`, `b=t`, `q=√2ab`, `X=a²+q`, `Y=b²+q`, and `D=a²+b²+q`, expansion gives `X²+Y²−D²=q²−2a²b²=0`. On `[0,1]`, `D>0`; `X,Y≥0`, so the normalized point lies on the unit quarter-circle, with stated endpoints and midpoint correct. Sample checks at `t=0, 1/4, 1/2, 3/4, 1` agree.

Both captions distinguish their actual catalog captures from the worked construction. The preview recipes confirm the rational capture uses a cubic with weights `[1,2,1,1]`, and the circle capture is the complete three-arc radius-3 circle; the captions correctly separate these from the quadratic quarter-arc proof. The other five prompts name an available action, an observable effect, and an interpretation; extrapolation includes the denominator caveat. The changed prose remains bilingual and math delimiters are present. Existing Rational section IDs and all seven catalog destinations remain present in the diff; existing guided lessons/routes/data are untouched. The new test checks prompt presence and asset/caption markers, but cannot catch either interaction mismatch above.


## Follow-up verification (2026-10-26)

Re-read the final prompts at `familyChapters.ts:66-67`. Both findings are resolved: the weight prompt now directs learners to use Previous/Next weight controls, identify \(w_1\), and change it through the value field or stepper; the De Casteljau prompt now asks learners to observe the growing prefix endpoint \(R(t)\) and no longer claims visible homogeneous interpolation levels. These actions match the control implementation and the documented route behavior. This follow-up was a source-only check; no browser validation was performed.
