# 01 Rational module (F1, Batch 0, `G-CG`)

Spec: "Decisions needing an ADR" 1, "Triangle and circle kernel" (exact types). Decisions: ADR 0030 §1, ADR 0021.

Scope: `src/compgeo/rational.ts` and its test file. Pure TypeScript, no dependency. Other families import this module, so keep the contract small, documented and stable.

Acceptance:

1. `Rational` with `bigint` numerator and denominator: denominator positive, gcd-reduced, zero as `0/1`. Constructors from a safe integer, from an integer pair, and from `bigint`s; a non-integer, non-finite or unsafe number throws.
2. `add`, `sub`, `mul`, `div` (throws on a zero divisor), `neg`, `sign`, `compare`, `equals`, `isZero`, `toNumber`, and a formatter for readouts (`7/2`, `-5/2`, `2`). `RationalPoint` with `add`, `sub`, `scale`, `dot`, `cross` and a conversion from `GridPoint`.
3. Properties over seeded random inputs: normal form after every operation, field identities (commutativity, associativity, distributivity, inverses), `compare` consistent with the sign of the difference, and `toNumber` correctly rounded (or within one ulp) for numerators and denominators up to \(2^{60}\).
4. `cross` of three `RationalPoint`s built from grid points equals `orientValue` from `predicates.ts`.

Checks: `just unit src/compgeo/rational`, `npx tsc --noEmit --pretty false`, `just lint` on the two files, full unit suite once. Report an observed failure of each assertion group against a deliberate mutation. Review: mathematical (Sonnet).
