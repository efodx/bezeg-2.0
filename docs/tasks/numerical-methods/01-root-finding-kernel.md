# 01 Root-finding kernel (F1, Batch A)

Spec: N1–N3 acceptance in [numerical-methods-lessons.md](../../specs/numerical-methods-lessons.md#concept-contracts-and-acceptance-criteria). Decisions: ADR 0023 §1–2.

Scope: `src/analysis/rootFinding.ts` and its test file. A small, backwards-compatible widening of `tangentLine`/`secantLine` parameter types in `src/analysis/derivative.ts`. No React, JSXGraph or localization.

Acceptance:

1. Closed example list `ROOT_FINDING_EXAMPLE_IDS` with `x^2-2`, `x^3-2x+2` and `x^3-x`. Each has `value`, a hand-written `derivative`, plain and undelimited LaTeX forms, a default start, a default second start (secant) and an independently computed reference root, recorded with the method that computed it. Derivatives are tested against a central difference quotient.
2. `newtonHistory` and `secantHistory` are recomputed from validated `(example, start(s), steps)`. They return the iterates and a typed termination reason: `root-found`, `flat-tangent`, `flat-secant`, `repeated-iterate`, `non-finite`, `step-cap` (cap 60), or `running`. No division by zero is attempted.
3. N1: iterates for `x^2-2` from 1 match 1.5, 1.4166667, 1.4142157, 1.4142136 to 7 decimals, and the errors match the spec. Each iterate equals the `tangentLine` x-intercept of the previous one to 1e-12. Start 0 gives `flat-tangent`.
4. N2: `x^3-2x+2` from 0 gives 1, 0 exactly; an integer-recurrence test confirms this. Detection reports `repeated-iterate` before the cap. From −2 the final iterate is within 1e-10 of the root found by bisection in the test.
5. N3: secant from (1, 2) gives 1.333333, 1.4, 1.414634, 1.414211 to 6 decimals. Each iterate equals the `secantLine` intercept with `h = x_k − x_{k−1}`. Equal starts are rejected by the validator. `f(x_k) = f(x_{k−1})` gives `flat-secant`.
6. Validators reject non-finite or out-of-range starts and unknown example ids.

Checks: `just unit src/analysis`, then the full unit suite once. Report an observed failure of each new assertion against a deliberate mutation.
