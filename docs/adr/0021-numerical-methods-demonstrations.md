# Numerical methods: one root-finding Demonstration, a separate quadrature kernel, and the Analysis family

Accepted on 2026-10-31 (F0 of the [numerical methods spec](../specs/numerical-methods-lessons.md), stream `functions`). The spec lists three ADR decisions. A fourth (the Simpson question) is ADR-sized too. All four are recorded here, except the direction-field drawing approach. That one waits for the measurement N5 requires.

## 1. Root finding: one Demonstration with a method choice

`RootFindingGraph` has a method field `newton | secant` and one shared example list. N1–N3 then share examples, the start controls and the comparison readout. A method switch keeps the example and start, clears the history and pauses playback (N3 acceptance 5).

Alternatives:

- Separate Newton and secant graphs. Each model is simpler, but the secant/Newton comparison in N3 would need two Demonstrations, and the example list and controls would be duplicated.
- Extend `BisectionGraph` with a method choice. This risks changing stored bisection Presets and the released bisection lesson, which the Batch A gate requires to stay unchanged.

## 2. Function source: a closed root-finding example list

`src/analysis/rootFinding.ts` owns its own closed list (`x^2-2`, `x^3-2x+2`, and one more), each with a hand-written derivative tested against a difference quotient. This follows `BISECTION_EXAMPLES` and ADR 0007 (no parser, no symbolic differentiation).

Alternative: use the extended school catalogue from the [school function graphs spec](../specs/school-function-graphs-lessons.md). It has more functions with exact derivatives, but it is not built yet, and Batch A must not wait for it. It remains an optional later extension.

`tangentLine` and `secantLine` in `derivative.ts` are widened to accept any object with `value` (and `derivative` for the tangent), not only a `CatalogFunction`. Existing callers are unaffected. The root-finding tests can then check the intercept identities with these functions, as the spec asks.

## 3. Simpson's rule: a separate quadrature function and Demonstration

`riemann.ts` gains `simpsonRule` (and its parabola overlay data) as functions of their own. `SUM_METHODS` and `DefiniteIntegralGraph` stay unchanged. N4 is backed by a new quadrature Demonstration with rule `trapezoid | simpson`, even `n` for Simpson, the exact value, the absolute error and the error ratio after halving.

Alternatives:

- A fifth `SumMethod` `simpson`. Old Presets would stay valid, since the union only grows. But `subintervals`, `fillData` and the area per subinterval are defined per single subinterval, while Simpson works on pairs. Every switch over `SumMethod` would need a special case, and `DefiniteIntegralGraph` would need an even-`n` rule that applies to only one of its methods.
- A Simpson mode inside `DefiniteIntegralGraph`. This avoids a new route, but it changes a released Demonstration and its Preset schema for one lesson.

The new Demonstration leaves every existing integral route and Preset as it was, and its own Preset fields validate the rule and an even `n`.

## 4. Family placement: the Analysis family

The three new Demonstrations (root finding, quadrature, direction field and Euler) join the Analysis family ([ADR 0011](0011-analysis-family.md)), next to bisection and fixed-point iteration, with a Learn chapter of their own. Registration follows whatever Platform A10 leaves in place.

Alternative: a new "Numerical methods" Demonstration family. It would give a separate heading, but it would split bisection and fixed-point iteration from their direct continuations, and it would add a family illustration, a family id and catalog count changes for three entries.

## Deferred: direction-field drawing

The N5 drawing approach (per-segment JSXGraph objects, one polyline-array curve, an overlay canvas or SVG, or a coarse grid) is decided in a later ADR. That ADR cites the measurement the spec prescribes. Batch C drawing code waits for it.

## Consequences

- Existing routes, stored Presets, the bisection lesson and `DefiniteIntegralGraph` are unchanged. All additions are additive.
- `LESSON_ANIMATION_IDS` gains ids for the new iterations when the lessons ship.
- The Analysis family's catalog counts in tests change when the Demonstrations are registered.
