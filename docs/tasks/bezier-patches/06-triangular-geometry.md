# 06 — Triangular patch geometry

Status: ready after05 establishes the shared patch interface. Source: [shared geometry and P5](../../specs/bezier-patches.md#shared-geometry-contract). Depends on03/04/05; share the interface owner with05. No renderer/routes.

Implement `TriangularBezierPatch` for degrees1–4 in canonical descending i, then descending j order. Provide barycentric recurrence/scheme, independent Bernstein comparison, boundary curves, partials/normals, exact elevation, three-piece interior subdivision, bounds and barycentric lattice meshes. Define edge/vertex subdivision behavior and validate finite coordinates and barycentric inputs. Reuse shared curve kernels for boundaries; do not create a parallel curve implementation.

Acceptance: all applicable P5 properties pass, including corners/edges, affine invariance, subdivision reparameterization, elevation, finite-difference partials and degeneracies. Cross-check tensor and triangular representations on a mathematically equivalent split/degenerate configuration. Cache tests change actual point stamps and density. Record independent mathematical/engineering review, tolerances and a mutation that breaks a real property in `docs/reviews/bezier-patches/triangular-geometry.md`.

Verification: focused geometry/kernel/curve tests plus typecheck/lint. No smoke for geometry-only work. Preserve unrelated changes; handler owns commits/push.
