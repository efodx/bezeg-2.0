# Roll lesson play under reduced motion (decision 57 gap)
- Change: `rollCommand` in ParametricCurveGraph.tsx; lesson play/replay under reduced motion set the parameter to the domain end and start no driver.
- Tests: ParametricCurveGraph.test.ts "roll animation" (two new tests: reduced motion, and normal play rolls).
- Before the change: reduced-motion test failed (`expected true to be false`, rolling started); 24 others passed.
- After: `just unit src/graphs/curves/parametric` result in .command-logs/oi-roll-rm-after.txt; tsc in oi-roll-rm-tsc.txt.
- Not verified: browser behavior.
