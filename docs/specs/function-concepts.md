# Function and calculus concepts

**Status:** accepted; implemented concept by concept (see [tasks](../tasks/function-concepts/))

**Source:** the owner's earlier app, [efodx.github.io `src/graphs`](https://github.com/efodx/efodx.github.io/tree/main/src/graphs) (studied 2026-10-11); the owner's request to bring its non-Bézier concepts to Bezeg; [ADR 0007](../adr/0007-function-concepts-family.md); [guided lessons spec](guided-lessons.md) and [content expansion blueprint](guided-lessons-content-expansion.md).

## Goal

Bring the function and calculus demonstrations of the earlier app to Bezeg as a new demonstration family, each with a Guided lesson. Work proceeds one concept at a time: plan the lesson (this spec), implement the graph support the lesson needs, then implement the lesson.

## Study of the earlier app

The earlier app (plain canvas, React class components, i18next) has 12 graphs. Four are Bézier concepts that Bezeg already covers more thoroughly; eight are not in Bezeg.

| Earlier graph | Concept | In Bezeg |
| --- | --- | --- |
| `bezier-curve-graph` | Bézier curve from control points | Yes, `/bezier/curve` |
| `de-casteljau-graph` | De Casteljau construction | Yes, `/bezier/decasteljau` |
| `bezier-subdivision-graph` | Subdivision | Yes, `/bezier/subdivision-2`, `/bezier/subdivision` |
| `bezier-extrapolation-graph` | Extrapolation | Yes, `/bezier/extrapolation` |
| `line-graph` | Line through two draggable points, slope triangle labelled Δx and Δy, editable `k` and `n` | **No** |
| `exponential-fun-graph` | `f(x)=a^x` with editable base | **No** |
| `trigonometric-functions-graph` | `A·g(ωx+φ)+B` for sin, cos, tan | **No** |
| `continuity-graph` | Piecewise `ax²` (x ≤ 1), `−ax+3` (x > 1); points mark the two one-sided values | **No** |
| `derivatives-graph` | Secant of `sin` through `x` and `x+h`; draggable `x`, slider `h`, slope readout | **No** |
| `integral-graph` | Rectangles under `sin` on draggable `[a,b]`, count 3–150, area readout | **No** |
| `area-between-curves-graph` | `f=(x−2)²`, `g=−(x−2)²+3`, editable formulas, `∫f`, `∫g`, `∫(f−g)` | **No** |
| `line-length-graph` | Polyline on `sin` over draggable endpoints, 2–100 segments, length readout | **No** |

Observed defects that the port must not copy:

- The integral graph labels its sum "area of rectangles" but takes `|area|` per rectangle, so it is neither the signed integral nor a correctly computed unsigned area. Bezeg shows the **signed** Riemann sum next to the exact integral, and the lesson explains the sign.
- Its rectangle height is the trapezoid average `(f(x₁)+f(x₂))/2`, drawn as a rectangle, while the commented alternatives (left, upper, lower) were abandoned. Bezeg offers left, right, midpoint and trapezoid rules explicitly, and draws the trapezoid rule as trapezoids.
- The area-between graph wires the `f` input to `g` and vice versa, and its option labels do not match the drawn integrand.
- The continuity graph compares floating-point values with `===`. Bezeg uses a stated tolerance.
- The line graph's `calculateKFromPoints` divides by `p1.x − p1.x`; a vertical line is drawn by reusing `n` as its `x` position. Bezeg represents a vertical line explicitly as `x = c` with an undefined slope.

## Decisions

- **New family.** The eight concepts form a seventh family, *Funkcije in analiza* / *Functions and calculus*, with id and route prefix `/bezeg-2.0/functions`, listed after the existing six families. See ADR 0007.
- **Routes and identities.** Additive; no existing route, preset collection, or file format changes.

| Order | Demonstration id | Route | Preset collection |
| --- | --- | --- | --- |
| 1 | `linear-function` | `/bezeg-2.0/functions/linear` | `linear-function` |
| 2 | `exponential-function` | `/bezeg-2.0/functions/exponential` | `exponential-function` |
| 3 | `trigonometric-functions` | `/bezeg-2.0/functions/trigonometric` | `trigonometric-function` |
| 4 | `continuity` | `/bezeg-2.0/functions/continuity` | `piecewise-continuity` |
| 5 | `derivative` | `/bezeg-2.0/functions/derivative` | `derivative` |
| 6 | `definite-integral` | `/bezeg-2.0/functions/integral` | `definite-integral` |
| 7 | `area-between-curves` | `/bezeg-2.0/functions/area-between` | `area-between-curves` |
| 8 | `arc-length` | `/bezeg-2.0/functions/arc-length` | `arc-length` |

- **Fixed function choices.** Routes that need a function offer a short, named list instead of the earlier free-text formula input. This avoids a formula parser, keeps exact derivatives and integrals available for checks, and keeps presets validatable. Free-text formulas are a possible later feature, not part of this work.
- **Mathematics outside React and JSXGraph.** Pure functions live in `src/analysis/` (function catalog with exact derivative/antiderivative where used, line through two points, difference quotient, Riemann sums, polyline length, numeric arc length, one-sided values). Graph classes only draw and route input to them. Unit tests check the module directly.
- **Shared graph base.** `src/graphs/functions/BaseFunctionGraph.tsx` extends `BaseGraph`. It owns a synchronous parameter model (a plain object field that is the source of truth; React state mirrors it for rendering), generated-object tracking and disposal, preset export/import of that model, lesson default-scene preparation, and lesson capture/restore. Each demonstration subclasses it. Graph lesson actions read and write the synchronous model, never `this.state`, because a scene applies all its actions in one tick (see AGENTS.md).
- **Typed lesson actions.** Three generic `LessonAction` kinds with closed, typed name unions in `src/learning/model.ts`:
  - `{kind: 'function-parameter'; name: FunctionParameterName; value: number}`
  - `{kind: 'function-choice'; name: FunctionChoiceName; value: string}`
  - `{kind: 'function-visibility'; target: FunctionVisibilityTarget; visible: boolean}`

  Matching scene actions `set-function-parameter`, `set-function-choice` and `show-function-element` take a `{name, value}` object. `sceneAction` in `lessonCatalog.ts` rejects unknown names and wrongly typed or non-finite values; each graph enforces its own domain and throws `UnsupportedLessonActionError` for names it does not own. Each concept extends the unions only with the names it needs.
- **Readouts.** Numeric results (slope, intercept, sums, exact values, lengths) appear in an inspector readout with the app's number formatting, and the most important one also on the board. Readouts update while dragging.
- **Default view.** Each route sets a bounding box suitable for its default function; the shared Fit action fits visible points as elsewhere.

## Per-concept lesson plans

Every lesson follows the [content contract](guided-lessons-content-expansion.md#content-contract-for-every-route): 4–6 steps, Slovenian first with English counterparts, Explanation → Calculation when useful → Observation, at least two sources including the implementation correspondence, one worked example, prepared scenes made only of supported scene actions, expected observations, edge cases, and `\(...\)` around all inline mathematics. Numbers below were computed independently (Python, 2026-10-11).

### 1. Linear function (`linear-function`)

Graph: two draggable points `P₁`, `P₂` snapped to a 0.1 grid; the line through them; dashed slope triangle with `Δx` and `Δy` labels; `k` and `n` inspector controls that move the points along the new line. Default `P₁=(0,1)`, `P₂=(2,5)`. When `x₁=x₂` the graph shows the vertical line `x=c`, reports the slope as undefined, and the `k`/`n` controls are disabled.

Lesson ("Linearna funkcija" / "Linear function"):

1. The line `y=kx+n` through two points (default scene).
2. Slope `k=Δy/Δx` from the slope triangle; worked example `P₁(0,1)`, `P₂(2,5)`: `k=4/2=2`, `n=1`.
3. Intercept `n`: the line crosses the y-axis at `(0,n)`; scene sets `n=−2` keeping `k`.
4. Sign of `k`: increasing, constant, decreasing; scene sets `k=−1/2`.
5. Observation: drag a point; parallel lines share `k`. Edge case: `Δx=0` gives a vertical line that is not a function graph.

Actions: `function-parameter` `x1`, `y1`, `x2`, `y2`, `k`, `n`. Checks: line through both points; `k`, `n` agree with the formulas; vertical case reported, never `Infinity`/`NaN` in readouts.

### 2. Exponential function (`exponential-function`)

Graph: `f(x)=a^x`, base slider `a ∈ [0.1, 5]`, step 0.05; marked points `(0,1)` and `(1,a)`; optional mirror graph `(1/a)^x` (toggle). Default `a=2`.

Lesson:

1. Every `a^x` passes through `(0,1)`; `f(1)=a`.
2. Multiplication step: `f(x+1)=a·f(x)`; worked example `a=2`: `f(0..3)=1,2,4,8`.
3. Growth vs decay: `a>1` increases, `0<a<1` decreases (scene `a=0.5`); `a=1` is constant.
4. Mirror: `(1/a)^x = a^{−x}` is the reflection over the y-axis (scene toggles the mirror).
5. Observation: the graph stays above the x-axis; it approaches 0 without reaching it. Edge case: `a≤0` excluded.

Actions: `function-parameter` `a`; `function-visibility` `mirror`.

### 3. Trigonometric functions (`trigonometric-functions`)

Graph: `f(x)=A·g(ωx+φ)+B`, `g ∈ {sin, cos, tan}`; sliders `A ∈ [−3,3]`, `ω ∈ [0.25,4]`, `φ ∈ [−π,π]`, `B ∈ [−3,3]`; dashed reference graph of the plain `g(x)` (toggle); midline `y=B`. `tan` is drawn without connecting across its asymptotes. Default `sin`, `A=1`, `ω=1`, `φ=0`, `B=0`.

Lesson:

1. Base graph `sin x`, period `2π`, values in `[−1,1]`.
2. Amplitude `|A|` and midline `B`: range `[B−|A|, B+|A|]`.
3. Period `2π/ω` (tan: `π/ω`); phase shift `−φ/ω`. Worked example `A=2`, `ω=2`, `φ=π/2`, `B=1`: max 3, min −1, period `π`, shift `−π/4`.
4. Cosine as shifted sine: `cos x = sin(x+π/2)`; scene compares.
5. Tangent: period `π`, asymptotes at `ωx+φ=π/2+mπ`; amplitude has no max/min meaning. Edge case: `ω=0` excluded.

Actions: `function-parameter` `A`, `omega`, `phi`, `B`; `function-choice` `trig-function` (`sin|cos|tan`); `function-visibility` `reference`.

### 4. Continuity (`continuity`)

Graph: `f(x)=ax²` for `x≤1`, `−ax+3` for `x>1`; slider `a ∈ [0,3]`, step 0.05; filled point at `(1, a)` (the value) and open point at `(1, 3−a)` (right limit); both turn green when they coincide within `10⁻⁹`, red otherwise; readout of the left value, right limit and jump `|3−2a|`. Default `a=1`.

Lesson:

1. A piecewise function; at `x=1` the left piece gives the value `f(1)=a`.
2. One-sided limits: left `a`, right `3−a`; jump `|3−2a|` (default 1).
3. Continuity condition `lim_{x→1⁻} = lim_{x→1⁺} = f(1)`; worked example: `a=3−a ⇒ a=3/2`.
4. Scene `a=1.5`: the points coincide, the graph has no jump.
5. Observation: continuous is not smooth — at `a=3/2` the slopes are `2a=3` and `−a=−1.5`; link to C⁰ vs C¹ in the spline lessons. Edge case: the tolerance and slider step make `a=1.5` reachable exactly.

Actions: `function-parameter` `a`.

### 5. Derivative (`derivative`)

Graph: function choice `x²` (default), `sin x`, `eˣ`; draggable point at `x₀` constrained to the graph; second point at `x₀+h`; secant through both; `h` slider in `[−2,2]` excluding `|h|<0.01`; optional exact tangent (toggle); readout of the difference quotient and `f′(x₀)`. Default `x₀=1`, `h=1`.

Lesson:

1. Secant through `(x₀,f(x₀))` and `(x₀+h,f(x₀+h))`, slope = difference quotient.
2. Worked example `f=x²`, `x₀=1`: `((1+h)²−1)/h = 2+h`; `h=1 → 3`, `h=0.5 → 2.5`.
3. Shrinking `h` (scene `h=0.1`): secant approaches tangent; `f′(1)=2`.
4. Tangent toggle: the limit line; negative `h` approaches from the left.
5. Observation with `sin`: at `x₀=1` the quotient approaches `cos 1≈0.5403` (`h=0.2` gives `≈0.4528`). Edge case: `h=0` is undefined, hence the excluded band.

Actions: `function-parameter` `x0`, `h`; `function-choice` `derivative-function` (`square|sin|exp`); `function-visibility` `tangent`.

### 6. Definite integral (`definite-integral`)

Graph: function choice `x²` (default), `sin x`, `eˣ`; bounds `a`, `b` draggable on the x-axis; `n ∈ [1,150]`; method `left|right|midpoint|trapezoid`; trapezoid rule drawn as trapezoids; shapes below the axis shaded differently; readout of the signed sum and the exact integral `F(b)−F(a)`. Default `[0,2]`, `n=4`, `left`. If `a>b`, the sum and integral both change sign (oriented integral).

Lesson:

1. Area under `x²` on `[0,2]`; width `h=(b−a)/n`.
2. Left and right sums; worked example `n=4`: left `1.75`, right `3.75`, exact `8/3≈2.6667`.
3. Midpoint `2.625` and trapezoid `2.75`; better with the same `n`.
4. Increasing `n` (scene `n=100`): all methods approach `8/3`.
5. Signed area with `sin` on `[0, 2π]`: integral 0; parts below the axis count negative. Edge case: `a=b` gives 0.

Actions: `function-parameter` `a`, `b`, `n`; `function-choice` `integral-function` (`square|sin|exp`), `sum-method` (`left|right|midpoint|trapezoid`).

### 7. Area between curves (`area-between-curves`)

Graph: `f(x)=(x−2)²`, `g(x)=3−(x−2)²`; bounds draggable on the x-axis; mode `under-f`, `under-g`, `between` (shading of `∫f`, `∫g`, or the region between); intersection points marked; readout of `∫_a^b (g−f)dx` and the unsigned area `∫|g−f|dx` (numeric, 10⁻⁶ accuracy). Default bounds at the intersections `2∓√1.5`, mode `between`.

Lesson:

1. Area under each curve separately (`under-g`, `under-f`).
2. Between = difference of the two: `∫(g−f)dx` when `g≥f`.
3. Bounds at intersections `(x−2)²=1.5 ⇒ x=2∓√1.5≈0.7753, 3.2247`; worked example area `4√1.5=2√6≈4.8990`.
4. Bounds beyond the intersections (scene `[0,4]`): `∫(g−f)dx=4/3` but `∫|g−f|dx=2√6+2(2√1.5−2/3)≈8.4646`; the parts where `f` is on top subtract from the signed value.
5. Observation: dragging a bound across an intersection changes which curve is on top.

Actions: `function-parameter` `a`, `b`; `function-choice` `area-mode` (`under-f|under-g|between`).

### 8. Arc length (`arc-length`)

Graph: `f(x)=sin x`; endpoints draggable along the graph; polyline with `n ∈ [1,100]` segments and its vertices; readout of polyline length and the arc length `∫√(1+f′²)dx` (adaptive Simpson, 10⁻⁹). Default `[0,π]`, `n=2`.

Lesson:

1. Approximate the curve by chords; each chord length `√(Δx²+Δy²)`.
2. Worked example `n=2` on `[0,π]`: `2√((π/2)²+1)≈3.7242`; `n=1` gives `π`.
3. More segments (scene `n=10` → `3.8153`, `n=100` → `3.8201`); polylines never exceed the arc length.
4. Limit: `L=∫_a^b √(1+f′(x)²)dx ≈ 3.8202` on `[0,π]`.
5. Observation and link: for parametric curves the same idea gives `∫‖r′(t)‖dt`; PH curves (see the PH lessons) are the curves where this integrand is a polynomial.

Actions: `function-parameter` `a`, `b`, `n`.

## Acceptance criteria (each concept)

1. The route opens from the catalog under the new family, with Slovenian and English titles and two prompts; route loading passes the existing automated smoke route coverage.
2. Controls work with mouse, touch and keyboard (sliders and selects are native inputs; draggable points also have inspector equivalents).
3. Presets save, reopen and export/import; the importer accepts the new collection and rejects out-of-domain values with the existing actionable error.
4. `src/analysis/` unit tests cover the concept's formulas, including the numbers in its lesson plan and its edge cases.
5. Graph tests cover lesson actions (including a multi-action scene applied synchronously), default-scene preparation, capture/restore, and generated-object disposal across repeated preparation.
6. The lesson is in the allowlist, passes the content tests and `lessonMathNotation.test.ts`, and has a row in `tests/guided-lessons.smoke.spec.cjs`.
7. `npx tsc --noEmit --pretty false`, the unit suite, and the production build pass; the focused lesson smoke row passes against the build.
8. Capability map, README status and glossary are updated when the family first appears and as routes are added.

## Out of scope

Free-text function formulas; symbolic differentiation or integration; additional functions beyond the listed choices; new families beyond this one; changes to existing Bézier routes or their lessons except catalog counts.

## Verification evidence

Recorded per task in its task file and in commit messages.
