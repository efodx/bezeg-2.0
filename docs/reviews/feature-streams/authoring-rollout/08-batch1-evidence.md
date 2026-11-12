# Task 08 batch 1 evidence (projective trio)

Tests: `projectivePersistence.host.test.tsx`, `describe.each` "CrossRatio|Pascal|PolePolar projection" (5 tests each) plus "PolePolar finite and ideal P". Expected values hand-authored (model-file data constants only for Pascal indices and the other-example fixture).

Pre-migration `just unit src/graphs/projective/projectivePersistence`: 23 tests, 6 failed, 17 passed.
- Fail before: figure test ("function of its data", all three), lesson default/fixture test (all three).
- Pass before (behaviour preserved, already held): round trip after two preceding scenes, partial Preset, malformed refusal without mutation, finite/ideal P.
Post-migration: `just unit src/graphs/projective` passed (whole directory); `just lint src/graphs/projective` passed.
`npx tsc --noEmit`: only errors in `bspline/BSplineExtractionGraph.tsx` (other worker's file: duplicate `scene`, lines 53, 141, 142); none elsewhere.
