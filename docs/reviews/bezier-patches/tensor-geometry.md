# Tensor-product patch geometry acceptance

Task: [05](../../tasks/bezier-patches/05-tensor-geometry.md). Source: [shared geometry/P5](../../specs/bezier-patches.md#shared-geometry-contract). Accepted 2026-10-26 after the repairs and handler checks below. No renderer, route, stored Preset or existing curve behavior changes in this slice.

## Geometry contract

`TensorProductBezierPatch` supports bi-degrees 1–4 with `net[i][j]`: i advances u, j advances v. Evaluation runs the existing dimension-generic curve kernel along each row in v, then through the row results in u. The independent direct recurrence reduces every 2×2 cell simultaneously, then finishes the remaining univariate direction for nonsquare nets. Both constructions expose their intermediate levels.

Boundary order is u=0, u=1, v=0, v=1. Boundary and iso-curve objects retain their captured grid's point references and follow edits to those points; replacing the patch grid requires requesting new curves. First/second partials and twist are exact difference-net evaluations. Normals are unit `S_u × S_v`; zero or nonfinite normal length throws an explicit error. Bounds enclose the control net, so they enclose the surface on the unit square. Finite parameters permit extrapolation; convex-hull bounds apply on the unit square. Subdivision and elevation return new patch snapshots.

The shared patch mesh carries parameter coordinates and explicit indexed triangle faces. Tensor meshes allow independent resolutions; triangular meshes will use equal interval counts and the canonical barycentric lattice. The shared interface states that rule before task06 implementation.

## Independent review and disposition

The mathematical reviewer independently checked the formulas, u/v convention, direct nonsquare remainder, derivatives, normals, subdivision, elevation, boundary order, mesh winding and bounds. No formula defect was found. All seven teapot patch12 goldens were independently recomputed from the licensed fixture with a separate Bernstein sum. The fixture's attribution and license remain in [teapot-data.js](../../prototypes/bezier-patches/teapot-data.js), with [provenance](teapot-fixture.md).

Coverage repairs passed: constant-net reproduction checks partition of unity for all16 degree pairs; central finite differences independently check second partials/twist; an asymmetric nonsquare fixture checks intermediate direct-construction levels and its remainder; and both triangles of a planar mesh have positive-z winding. The handler checked the explicit fixture values and final tests.

[Engineering review](tensor-engineering-review.md) found mutable evaluation-cache results, unbounded point/mesh caches, unprimed structural cache assertions and unspecified triangular resolution semantics. All are closed: evaluations return defensive copies; LRU caches retain at most128 evaluations and4 meshes; each mesh edge is limited to256 intervals (66,049 vertices maximum); tests prime evaluation/mesh/bounds before tracked edits and structural replacement; and the shared interface documents triangular resolution. Handler inspection and final tests confirm these local repairs. Cache-size assertions intentionally inspect private storage as well as observable eviction to catch retained-memory growth.

The new cache suite initially failed five checks (`.command-logs/tensor-cache-before.log`). Four demonstrated real pre-repair defects: mutable evaluation, unbounded evaluation and mesh storage, and no density cap. The fifth, tracked-edit invalidation, used a faulty fixture with coordinate-derived versions masked by the patch's newer structural stamp. Replacing that fixture with `PointImpl` corrected the test. The original implementation was not rerun with the corrected fixture; no pre-repair invalidation defect is claimed, and production invalidation logic is unchanged. The final primed invalidation checks pass.

## Verification

Initial stable implementation at base `2767125` plus task05 additions: handler `just unit src/bezeg` passed 212 tests in 13 files; `just typecheck` and scoped lint passed. Logs: `.command-logs/2026-10-26T21-07-29-034Z-87288-2fb1cbc8.log`, `.command-logs/2026-10-26T21-07-28-943Z-105920-339822a2.log`, `.command-logs/2026-10-26T21-07-28-936Z-93984-ce547884.log`. These checks precede review repairs and do not certify the final revision.

Final stable source at base `2767125` plus task05 additions and repairs: handler `just unit src/bezeg` passed **221 tests in14 files** (`.command-logs/2026-10-26T21-13-02-693Z-12504-e40c4340.log`); `just typecheck` passed (`.command-logs/2026-10-26T21-13-02-595Z-98676-715ae1d0.log`); scoped lint passed (`.command-logs/2026-10-26T21-13-02-572Z-15352-6409fde4.log`). Whitespace check passed. Final checks include existing kernel and curve tests with unchanged expectations.

Ordinary geometry comparisons use10 decimal digits, teapot goldens11, first-partial central differences h=1e-5 and7 digits, second-partial differences h=1e-4 and5 digits. The looser difference tolerances allow truncation and cancellation error; coordinates are classroom-scale and exact recurrences use double precision. Deliberate grid transposition fails both fixed teapot goldens and intermediate construction expectations; a flipped mesh face fails the orientation assertion. These mutation checks cannot pass with missing or nonfinite data.

No browser smoke is applicable to geometry-only code. Root installed JSXGraph differs from the lockfile; these checks do not import JSXGraph and no dependency installation was attempted. C1 joins and tensor/triangular equivalence are cross-task P5 requirements retained for06/10; this acceptance covers05 only.
