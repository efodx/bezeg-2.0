# F1 circle repair (handoff-v13)
Changed circleConstructions.test.ts (one-to-one line matching; near-tangency d=5 test; smallest-power test) and circleConstructions.ts docstring (internal tangency labelled external).
Mutations: 1e-3 tolerance (power sign, k sign, discriminant) is below the grid gap (>= 7/16 power, 39/16 k) so no test can fail; it is equivalent for grid input. 0.5 tolerance: power -> 5 failures, k -> 2 failures incl. new test; discriminant 0.5 -> 1 failure (older test only). All restored.
