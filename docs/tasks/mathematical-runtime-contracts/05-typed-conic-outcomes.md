# 5. Typed conic variants and solver outcomes

Status: accepted 2026-11-07 ([evidence](05-typed-conic-evidence.md)). Source: [specification, section 5](../../specs/mathematical-runtime-contracts.md#5-typed-conic-variants-and-solver-outcomes), acceptance C1–C3 and shared verification. Independent of trace tasks; coordinate function graph consumers with task 4.

## Scope and entry points

Start at `src/analysis/conic.ts`, `src/analysis/conicFocalModel.ts`, `src/projective/conic.ts` and `src/graphs/projective/fivePointModel.ts`. Inventory constructors, solver returns and actual graph/view consumers. Analytical focus/directrix conics and exact projective conics retain their separate mathematical representations.

## Work and completion

1. Add production-typecheck fixtures for valid variants and the rejected incomplete forms in C1. Confirm the old types accept those invalid forms. Inventory every five-point return branch, including invalid results that retain a diagnostic conic/classification.
2. Encode required fields by domain kind/status. Migrate constructors, evaluations and consumers using ordinary narrowing, removing the invariant-restoring casts and non-null assertions that become unnecessary. Preserve meaningful diagnostic payloads instead of forcing all failures into an empty result.
3. Retain current coefficients, exact arithmetic, degeneracy policy, drawing approximation and readout meanings. Update misleading type comments where the inspected returns contradict them; no numerical algorithm, coefficient-range or residual-policy redesign belongs in this slice.
4. Complete C1–C3 across the consumer inventory. A new fallback value or wider optional field must not conceal an unhandled mathematical branch.

## Verification and return

Run `just typecheck`, the analytical/projective conic tests, conic-focal model tests and affected real-host/lesson contracts, then the final unit suite, lint and build. A behavior-preserving type-only migration with sufficient unit coverage needs no browser run; changed runtime branches/readouts require production smoke of their published workflows under the shared contract.

Return the variant/return-branch inventory, negative and positive type evidence, removed assertions, retained diagnostic examples, mathematical/host check results with exact revision, and any coverage gaps.
