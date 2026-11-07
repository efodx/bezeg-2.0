# CP1 notes (collision model)

## Constants
World 1600x1000, dt=1/60, radius 0.8-1.5, speed 30-120 units/s, mulberry32.
Rationale: measured touching fraction 0.942 % (10 seeds x 10 steps, n=1000), so about 1 %. The test asserts 0.5-2 %.

## Handler change at acceptance (density)
The fixed 0.8-1.5 radii drew sub-pixel bodies at n=1000 on an ~800 px canvas, and nothing would touch at small n. createWorld now scales the base radius with 1/sqrt(n) at a fixed area fraction 0.0125 (radii 0.75-1.25 times the base), so about 5 % of bodies touch at every n. The density test now runs n in {200, 1000, 3000} and asserts 3-8 %; it fails on the original fixed radii (0.94 %). 15 tests pass, tsc and lint clean. Decision recorded in the spec's Mathematical model.

## Mutation log (each assertion group seen failing first)
- Sweep exit tie `<` to `<=`: edge/corner candidates, sweep tie test, stepWorld exact touch.
- Box overlap x or y clause made strict: edge/corner test.
- circlesTouch `<=` to `<`: exact r1+r2 test, stepWorld exact touch.
- Naive inner loop `i+1` to `i+2`: equivalence/binomial test and edge cases.
- Sweep never prunes: equivalence test (below 10 % at n=1000).
- Wall reflection removed / mirror replaced by clamp: inside-world and mirror tests.
- Velocity damping added: velocity-sum test.
- Math.random in createWorld seed: reproducibility test.
Sources diffed against backup after the mutations.

## Results
12 tests pass; whole file about 9 s wall under queue load (tests about 58 %, so about 5 s). n=1000 equivalence uses 12 steps (naive is 500k box tests per step). tsc and lint clean.
