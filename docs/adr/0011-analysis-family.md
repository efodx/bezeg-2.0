# Add a separate Analysis family for the analysis guided lessons

Accepted on 2026-10-15. `src/demonstrations.ts` declares an eighth family, *Analiza* / *Analysis* (id `analysis`, message key `analysis` in `sl.ts` and `en.ts`), next to the existing seventh family *Funkcije in analiza* / *Functions and calculus* ([ADR 0007](0007-function-concepts-family.md)). The eleven topics of the [analysis guided lessons spec](../specs/analysis-guided-lessons.md) (intermediate value theorem and bisection, mean value theorem, accumulated integral, sequence and uniform convergence, fixed-point iteration and others) belong to it. Routes keep the `/bezeg-2.0/` prefix.

`getDemonstrationCatalog()` omits a family that has no demonstration, so neither the catalog page nor the workspace topic list shows an empty topic. The family is therefore declared but invisible until its first demonstration ships. A catalog test and the smoke catalog (`tests/smoke-catalog.cjs`, which mirrors the omission) check this.

The alternatives were these:

- Extend Functions and calculus. The family already holds the function-reading concepts (linear, exponential and trigonometric functions, continuity, derivative, Riemann sums, area between curves, arc length). Adding eleven more topics would roughly double a family that its students read as one sequence, and the new topics (convergence, fixed points, complex multiplication) are a different step in the curriculum than the first function concepts.
- A family per release batch (A, B, C). Batches are a delivery plan, not a topic structure. Students would see arbitrary groupings, and later reorganization would change catalog order and expanded-state behavior again.
- A separate Analysis family, chosen by the owner. It keeps the existing family stable and gives the new topics their own heading. The cost is two adjacent families with overlapping names, which the Slovenian titles ("Funkcije in analiza" and "Analiza") make easy to confuse.

Consequences:

- Existing routes, preset collections and stored presets are unchanged. The catalog still shows seven families and 34 demonstrations until the first analysis demonstration ships; counts asserted by tests change then, not now.
- `DemonstrationsPage` needs an illustration for every family id, so `src/images/demonstrations/family-analysis.svg` ships with the declaration.
- The coordinate-context policy for previews (`tests/smoke-catalog.cjs`) retains axes and grid for the analysis family, as it does for function graphs.
- The titles may be revisited for clarity once the family has entries.
