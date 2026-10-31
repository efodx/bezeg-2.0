# Fourier series: an own Gibbs model, fixed-breakpoint handles, a pure closed loop, and epicycle drawing by measurement

Accepted on 2026-10-31 (F0 of the [Fourier series spec](../specs/fourier-series-lessons.md), stream `functions`). This ADR records the spec's four *Decisions needing an ADR*. Decision 3 fixes only the procedure; its outcome is a follow-up ADR in Batch C.

## 1. Gibbs and uniform convergence: a Fourier-specific model and graph

F3 gets its own model and graph (`FourierSeriesGraph`, model in `src/analysis/fourier*.ts`). It borrows the band drawing \(f\pm\varepsilon\), the vocabulary (*točkovna napaka*, *enakomerna konvergenca*) and a catalog link to the uniform-convergence lesson. `UniformConvergenceGraph`, `src/analysis/uniformConvergence.ts`, `UNIFORM_EXAMPLE_IDS`, `UNIFORM_MAX_N` and their Presets stay unchanged. The peak marker uses the closed form \(x=\pi/(N+1)\), and the supremum statement \(\sup|S_N-f|\ge1\) is a theorem in the prose, not a computed maximum.

Alternatives:

- **Add a Fourier example to `UniformConvergenceGraph`.** The square wave needs \(N\) up to 1001, against `UNIFORM_MAX_N = 50`, and that module's rule is "the supremum is analytic, never a maximum over sampled points". Either the rule or released Presets would change.
- **Leave the Gibbs contrast out.** F3's learning goal is exactly the failure of uniform convergence, so it would lose its point.

## 2. Function source for F2: handles with fixed breakpoints

A shape is a piecewise-linear function on \([-\pi,\pi)\) with breakpoints at fixed \(x\)-positions, chosen by a closed list of layouts (for example \(\{-\pi,0,\pi\}\) for \(|x|\) and \(\{-\pi,1,\pi\}\) for \(\mathrm{sign}(x-1)\)). Handles move only vertically. Each interior breakpoint has one value, or two (a left and a right value) when the layout marks it as a jump. The seam at \(\pm\pi\) may carry a jump, and the graph shows the seam value as the midpoint. So every shape the handles produce has finitely many jumps, all at known breakpoints, and is piecewise smooth; the Dirichlet midpoint statement applies to all of them. Breakpoints are strictly increasing by construction, so no drag can make them degenerate. The kernel integrates each linear piece times \(\cos kx\) or \(\sin kx\) in closed form, and quadrature is the cross-check.

Alternatives:

- **Handles that also move horizontally, with enforced increasing \(x\).** More expressive, but every drag needs a collision rule, and a breakpoint pair can approach a zero-width piece, which turns a corner into a near-jump that the picture does not show.
- **A closed list of named functions only.** This is simpler but loses "drag a shape and watch the bars", which is F2's main activity.

## 3. Epicycle rendering (Batch C): decided by measurement

No epicycle drawing code is merged before a measurement, following the [performance plan](../performance-plan.md). The Batch C graph slice compares, on the spec's scenes (\(N=10,25,50\); traces of 400 and 2000 samples; change \(N\) and drag a vertex):

- \(2N+1\) circles and arms as individual JSXGraph objects;
- the arm chain as one polyline, with circles for the first few terms or as one overlay;
- the trace as one curve in both cases.

It records frame times and the threshold used in a follow-up ADR. JSXGraph is not replaced on this evidence alone. The coefficient update (\((2N+1)\) terms \(\times\) 16 nodes \(\times\) spans) is cheap and is not part of the choice.

Alternatives: choosing now (either option) without numbers, which AGENTS.md rules out.

## 4. Closed loop: a pure list of Bézier spans

`src/analysis/closedSpline.ts` owns a closed loop of \(m\ge2\) Bézier spans (degree 1 or 3), evaluated with de Casteljau, with the first end point equal to the last. Each span receives equal parameter length \(2\pi/m\). The chord-length alternative is a second parametrization in the same module, so the lesson can show that coefficients depend on it. A degenerate loop (all points equal) is valid and has \(c_0\) only. `BezierSpline` and the Bézier chapters are not changed.

Alternatives:

- **Extend `BezierSpline` with a closed scheme (ADR 0010).** This changes the Bézier curve chapters and their Presets, which the spec puts out of scope.
- **Sample the loop as a polygon and take a discrete transform.** This hides the breakpoint rule (span ends are corners in general) and turns closed-form checks for the diamond into tolerances.

## Complex values

The kernel uses plain `{re, im}` pairs (structurally the `Complex` interface of `src/analysis/complex.ts`) but not that module's grid-restricted operations: Fourier coefficients are unrestricted doubles. The complex-maps family keeps its grid rules (ADR 0029).

## Consequences

- All Fourier routes and Presets are new; existing routes, including `/uniform-convergence` and the trigonometric Demonstration, behave as before.
- The quadrature takes explicit breakpoints, so a caller cannot integrate an unsplit jump. The spec's pitfall test (an unsplit rule misses by more than \(10^{-2}\)) keeps that property.
- Batch C cannot start drawing code until its measurement ADR exists.
