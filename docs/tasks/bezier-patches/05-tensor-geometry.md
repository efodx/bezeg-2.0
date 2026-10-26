# 05 — Tensor-product patch geometry

Status: complete, 2026-10-26; [acceptance evidence](../../reviews/bezier-patches/tensor-geometry.md). Source: [shared geometry and P5](../../specs/bezier-patches.md#shared-geometry-contract), [ADR0018](../../adr/0018-three-surface-view-adapter.md). Depends on03/04. Own mathematical modules/tests; no renderer or routes.

Implement `TensorProductBezierPatch` using the dimension-generic curve kernels and versioned 3D points. Support bi-degrees1–4, row-major nets, exact two-stage evaluation and a separate bilinear recurrence, schemes, boundary/iso curve objects, partials/normal/twist, per-direction subdivision/elevation, mesh sampling and bounds. Cache by complete point/version/density dependencies, with explicit invalid-input and zero-normal behavior. Preserve existing curve results.

Acceptance: independent Bernstein sums, partition/corners/boundaries, affine invariance, evaluation-order agreement, subdivision/elevation invariance, finite-difference partials and perpendicular normals pass. Cover degree1 and4, nonsquare nets, function-backed edits, cache invalidation and degenerate patches. Check a licensed fixed teapot patch against golden samples. Demonstrate a meaningful mutation failure. Record tolerances and independent mathematical/engineering review in `docs/reviews/bezier-patches/tensor-geometry.md`.

Verification: `just --list`, focused geometry/kernel and existing curve tests, typecheck/lint for changed code. No browser smoke for geometry-only changes. Handler commits/pushes after acceptance.
