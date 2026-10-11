---
status: accepted
---

# Add a function and calculus family alongside curve demonstrations

Bezeg has taught only curve concepts: Bernstein polynomials, Bézier, rational, spline, PH curves, and parameterizations. The owner's earlier app also taught function and calculus concepts (linear, exponential and trigonometric functions, continuity, the derivative as a limit of secants, Riemann sums, area between curves, and arc length). On 2026-10-11 the owner asked to bring those concepts to Bezeg, each with a Guided lesson.

## Decision

Add eight demonstrations as a seventh family, *Funkcije in analiza* / *Functions and calculus*, under the route prefix `/bezeg-2.0/functions`. The family reuses the shared workspace, presets, figure export and Guided lesson runtime. Its mathematics lives in a React- and JSXGraph-independent module (`src/analysis/`), its graphs share a `BaseFunctionGraph`, and its lessons use three generic typed lesson actions (`function-parameter`, `function-choice`, `function-visibility`) with closed name unions. Functions are chosen from short fixed lists rather than typed formulas. See the [spec](../specs/function-concepts.md).

## Alternatives considered

### Keep Bezeg curve-only and revive the earlier app separately

Rejected by the owner's request. Two apps would duplicate hosting, localization, presets and the lesson runtime, and students would lose the links between the topics (continuity ↔ spline continuity, arc length ↔ PH curves).

### Recast every concept as a curve operation

For example, teach arc length only on Bézier curves, or derivatives only as hodographs. Rejected as the only form: the earlier lessons start from `y=f(x)` graphs, which most students meet first. The lessons instead point to the curve counterparts where they exist.

### One specific lesson action per parameter

The existing lessons use narrow actions such as `bernstein-degree`. Eight routes with two to five parameters each would add about twenty action kinds. The generic kinds keep `model.ts` and the catalog adapter small while still using closed unions for names, so a lesson cannot reference a parameter that no graph owns.

### Free-text function input, as in the earlier app

Deferred. It needs a safe parser, domain validation, numeric derivatives and integrals for every check, and preset validation of arbitrary expressions. The fixed lists cover every lesson.

## Consequences

The product statement "an educational curve app" broadens to curves and the function concepts that lead to them; AGENTS.md product constraints still apply. The catalog grows from 26 routes in 6 families to 34 routes in 7 families, which changes counts asserted by tests and shown on the catalog page. Existing routes, preset collections and file formats are unchanged; eight new preset collections are added and the importer recognizes them. The earlier app's integral, area-between and continuity graphs had defects (unsigned rectangle areas, swapped inputs, exact float comparison) that are deliberately not reproduced.
