# 01 School catalogue core: review

2026-10-31. Implementation: `bezeg-worker` (Sonnet 5.5, `medium`). Review: `bezeg-reviewer` (Sonnet 5.5, `medium`), covering mathematics and engineering. Scope: `schoolFunctions.ts` and its test.

## Findings and disposition

- **Should-fix, fixed by the worker: missing brackets.** A coefficient or derivative slope was prepended to a sum-shaped base without brackets. With \(a=2\), the entry \(x^2-2\) rendered as `2\,x^{2}-2`, in both LaTeX and plain text. Sum-shaped base text is now bracketed whenever a prefix is present, which also prepares for task 03's `poly` and `rational` numerators. Literal tests cover \(a=2\), \(a=-1\) and \(a=1\). `isSum` looks for a top-level sign at bracket and brace depth 0. With the wrapping disabled, the new test fails (expected `2\,\left(x^{2}-2ight)`, received `2\,x^{2}-2`).
- **Nit, fixed: a misleading test.** The test "central difference actually exercised" only pinned \(\text{cube}'(2)=12\). It is now "the central-difference tolerance rejects a deliberately wrong derivative" and asserts that a wrong value fails.
- **Nit, accepted: overflow leaves gaps in the domain.** When a value overflows, `value` returns `undefined` inside the stated domain. For example, \(5^x\) at large transformed \(x\) has no value. This keeps values total and finite, and such points lie far outside any view.
- **Nit, accepted: pole chords.** Near a pole, the clipped polyline ends with a straight chord to the clipped endpoint. This only affects the drawing.

## Owner decisions and risks

- **Transform bounds.** `TRANSFORM_BOUNDS` limits \(a,b\) to \([-10,10]\) and \(c,d\) to \([-20,20]\). The worker chose these because the spec gives no slider ranges. The S1 default fits within them, and \(b\ne0\) is enforced, including \(-0\). Confirm or change them when the S1 controls are designed.
- **Decimal points.** The `latex` and `plain` forms print decimal points. Lesson prose and readouts must use `{,}` and a decimal comma in Slovenian, so the graph and lesson slices must localize numbers.
- **`poly` and `rational`.** These have their final field shapes. `schoolFunctionModel` throws for them, and the validator rejects them as `unsupported-kind` until task 03.

## Cleared

- **Union shape:** sufficient for task 03.
- **Validator:** inclusive base bounds \([0.2,5]\), with exactly 1 rejected; `not-finite` for NaN and Infinity; no clamping; field paths.
- **Derivatives:** undefined at 0 for \(|x|\) and \(\sqrt x\).
- **Antiderivatives:** only where exact, including \((a/b)F(b(x-c))+dx\) and \(x\ln x-x\) divided by \(\ln a\).
- **Domains:** `mapDomain` mirrors domains for \(b<0\).
- **S1 checks:** asserted with literal values.
- **`plotPieces`:** pieces split at poles and domain edges, endpoints are bisected to within about 1e-20, and \(y\) is clipped to the enlarged view.
