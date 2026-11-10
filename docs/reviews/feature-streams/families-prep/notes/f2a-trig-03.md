# f2a-trig-03: trigonometry state models

Files: src/trig/trigModel.ts, src/trig/trigModel.test.ts (28 tests in the model file; `just unit src/trig` 66 pass).
Checks: unit pass, `tsc --noEmit` exit 0 (no isometry errors at that moment), `just lint src/trig` pass.
Mutations (each restored, diff clean): snapSideInput rounds to halves -> side snap test fails; parse spreads `...data` -> derived-values test fails; angle off-grid check disabled -> 'quarter half-degree' rejection test fails.
Decisions: strict parse (reject, never snap) as linear precedent; snap helpers for UI. English messages, no locale keys. Vertex range = kernel GRID_COORD_LIMIT (2^25); the spec names no graph range. Solver data stored as one SolveSpec (type + its inputs only). Unit circle defaults alpha 60, beta 45 (TR2). Extra fields dropped.
Spec issues: spec says "angles snap to half-degrees" but ADR 0044 §2 / kernel use integer degrees 1..179 for solver angles; model follows the ADR. Spec TR1 default (theta=2 rad etc.) is not half-degree, so no single default serves TR1 and TR2.

## Review fixes
`clamped` now true only when the range limit moved the rounded value (all snap helpers); tests added for 179.4, 179.6, 0.4, 1.4, 0.2, 0.05, 12.1, 12.2, 2^25+0.4. Old logic against new tests: 2 tests failed (sides, solver angles/vertices). `parseSolveData` uses a typed builder per spec type (no casts); test `any` removed, 'NaN-like' label now 'null'. unit, tsc (no non-isometry errors) and lint src/trig pass.
