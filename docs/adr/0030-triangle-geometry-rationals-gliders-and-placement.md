# Triangle geometry: exact `BigInt` rationals, the glider as the only inexact input, and a "Plane geometry" family

Accepted on 2026-10-31 (F0 of the [triangle geometry spec](../specs/triangle-geometry-lessons.md), stream `maps`). The spec lists two ADR decisions and leaves the family placement open. All three are recorded here. The spec's other open items (circumcentre ownership, Euler's inequality, terms) are settled in the [task README](../tasks/triangle-geometry/README.md).

## 1. Number type: `BigInt` rationals for derived points, in a shared `src/compgeo/rational.ts`

[ADR 0021](0021-exact-grid-predicates.md) already requires derived points to be `BigInt` rationals, never doubles that are later compared, and leaves the rational type itself to "the sweep family's ADR". Triangle geometry needs it first: circumcentre, orthocentre, nine-point centre, feet of perpendiculars, power of a point and exact inversion images all have rational coordinates on grid inputs. This ADR fixes the type; the sweep and triangulation families build on it instead of writing a second one.

- `Rational` is an immutable pair of `bigint` numerator and denominator, denominator positive, reduced by gcd, zero as `0/1`. Construction from a non-safe-integer number throws; there is no conversion from arbitrary doubles.
- Operations: add, subtract, multiply, divide (division by zero throws), negate, compare, sign, equality, `RationalPoint`, and `toNumber` for drawing and display only. A readout may also format the exact fraction.
- Kernels decide every discrete outcome (collinear, right angle, inside/on/outside, on the circle, coincident points) on rationals or on the exact integer predicates of ADR 0021, never on `toNumber` results.
- Irrational quantities (incentre, radii, angles, circle–circle intersection points) are doubles computed from exact inputs, and their contracts label them inexact.
- The module is pure TypeScript under `src/compgeo/`. It is written in triangle geometry's Batch 0 (task 01). Geometry-stream families that need it later import it and may add operations; changing its existing contract needs this ADR revised.

Alternatives:

- **Doubles with a documented tolerance.** Cheap, but "collinear", "concurrent" and "on the circle" become approximate, and the lessons would show a tolerance as an equality. Contradicts ADR 0021.
- **Exact predicates only, doubles for derived points** (the convexity spec's minimum). Enough for hulls, but the Euler line, the nine-point circle and Simson collinearity are claims about derived points, so they would again need tolerances.
- **A rational library dependency.** Several exist, but the needed surface is about a dozen operations, the project avoids new dependencies for small kernels, and a local module keeps the contract under ADR control.
- **Scaled integers per formula** (clear each denominator by hand). Exact and fast, but every formula needs its own bound analysis, and composed quantities such as \((O+H)/2\) multiply the denominators.

Consequences: `BigInt` is slower than doubles, but the boards hold three to ten points, so the cost per drag is a few dozen operations. Measure a drag with all overlays on before optimizing ([performance plan](../performance-plan.md)).

## 2. The glider parameter is the only inexact input

Vertices, circle centres and the free points \(P'\) (T4) and \(X\) (T5) are grid-snapped and exact. A point on a circle driven by an angle \(t\) (T2, T4 glider mode) cannot be a grid point, so the glider parameter is a double. It is the only inexact input in the family.

- Every value computed from the glider (T2 angles, T4 glider-mode pedal area) is labelled approximate. Its status reads "equal / collinear to the displayed precision" or "within \(10^{-9}\) of the triangle's area", never "exactly".
- T4's glider tolerance is a named kernel constant, `SIMSON_GLIDER_TOLERANCE = 1e-9` (relative to the triangle's area), with a test showing the observed error is at least \(10^6\) times smaller. The spec makes the release of Batch C (T4) conditional on the owner accepting this tolerance policy; that check stays on task 07.
- Exact instances (T2's lattice point \((1,7)\), T4's lattice points on the circumcircle) are shown as grid points, not glider positions.

Alternatives:

- **Rational points on circles** (Pythagorean parametrization, \(t\) rational). Exact, but the glider would jump between unevenly spaced points, and arrow-key steps by a fixed angle would be impossible.
- **No glider: grid points only.** Exact, but most circles have few lattice points, so T2's "drag along the arc" would not work.
- **A separate ADR for the glider.** The decision is one paragraph and shares its context with §1.

## 3. Placement: a new family *Geometrija ravnine / Plane geometry*

The five Demonstrations form a new catalog family `plane-geometry`, with one Learn chapter *Geometrija trikotnika in inverzija / Triangle geometry and inversion*. The id and family title are fixed at registration (F2b) under the registration rules `G-REG` brings, and may be revisited there.

Alternatives:

- **Join *Računska geometrija* (convexity F0).** Shares the point-set graph, but notable points and the inscribed angle are matura school geometry, and a family called "computational geometry" hides them from students who look for *znamenite točke trikotnika*.
- **Join `maps` ([ADR 0029](0029-complex-maps-placement-graphs-and-domain.md)).** Only T5 is a map of the plane; T1–T4 are not.
- **`basics`.** Euler line, Simson line and inversion are university content.
