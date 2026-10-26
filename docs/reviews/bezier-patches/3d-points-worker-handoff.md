# 3D points worker handoff

Handoff requested by the handler at the 136,337 input-budget trigger. No production code changed in this continuation.

## Current state

- Prior implementation is in place and documented in [3d-points.md](3d-points.md).
- Added table-driven constructor/build rejection coverage for all built-in spline scheme paths in `src/bezeg/impl/curve/bezier-3d.test.ts`: C1 quadratic shared join, G1 quadratic shared join, symmetric G1 shared join, C2 cubic, and Generic.
- Existing direct adapter checks in that test file cover only `JXGBezierCurve` and `ClassMapper` representative paths. Engineering review requested each adapter's direct `toDto` and `fromDto`: still to add for rational, PH, generic spline, C1 quadratic, C2 cubic, G1 quadratic and symmetric G1 adapters.
- A reusable `fakeBoard()` exists in `src/graphs/curves/object/ModelPointBindingAdapter.test.ts` and has already constructed Bézier, rational and C1 adapters. It can be extended to instantiate each adapter, edit a held model point's z, and call the adapter's direct `toDto`; each `fromDto` can be tested with a z-bearing DTO because its guard runs before board use.
- Do not run guard-removal mutations while the handler's integrated check is active.

## Verification status

Before this continuation, focused `bezier-3d.test.ts` passed 13 tests, typecheck and scoped lint passed. The intentional x/y-only mutation was run and restored; see its result in `3d-points.md`. New spline table tests have not yet been run. The handler requested the next agent stop after this handoff.
