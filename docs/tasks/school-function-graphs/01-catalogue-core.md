# 01 School catalogue core (F1, Batch A)

Spec: [Function catalogue extension](../../specs/school-function-graphs-lessons.md#function-catalogue-extension). Decision: ADR 0026 §1. `src/analysis/functions.ts` stays unchanged.

Scope: `src/analysis/schoolFunctions.ts` (and a plotting helper module if that is cleaner), with tests. Pure TypeScript.

Acceptance:

1. A `SchoolFunction` discriminated union for `power` (closed shapes \(x^2, x^3, \sqrt x, 1/x, |x|\)), `exp`/`log` (base \(a\in[0.2,5]\), \(a\ne1\)), `named` (`x2-2`, `cubic-cycle`, `cubic-x3-x`) and `transformed` (any entry plus \(a,b,c,d\), \(b\ne0\)). Leave `poly` and `rational` as declared kinds that task 03 fills in, or add them there. A later task must not have to rework the union.
2. Each entry exposes a domain (union of intervals), `value(x)` and `derivative(x)` returning `number | undefined` (never NaN or ±Infinity), an `antiderivative` only where exact (power shapes where defined, `exp`, `log`: \(x\ln x-x\) for ln and the base-\(a\) form), undelimited `latex`/`derivativeLatex`, and plain forms.
3. A validator accepts a plain record (Preset data) field by field, with bounds. It returns a structured diagnosis naming the field and the reason. It never clamps.
4. Derivatives match a central difference at sample points of each entry. Non-differentiable points (\(|x|\) at 0, \(\sqrt x\) at 0) return `undefined`.
5. Transformed: the value is \(a f(b(x-c))+d\) and the derivative is \(a b f'(b(x-c))\). The S1 checks hold: the vertex is (3, 1) for the default \(x^2\), \(a=-2\), \(b=\tfrac12\), \(c=3\), \(d=1\); (2, 4) maps to (7, −7); \(x=5\) gives −1.
6. Plot sampling: `plotPieces(fn, xMin, xMax, viewYMin, viewYMax)` returns polyline pieces split at every undefined point and every domain edge. No piece spans an undefined point. The pieces stop at the last valid sample, with no vertical connector. Tested with \(1/x\), \(\sqrt x\) and \(\log\).

Checks: `just unit src/analysis`, then the full suite once, and `just typecheck`. Report a mutation failure for each assertion group.
