# F1 phase-portraits task 02 (logistic, bifurcation) note

Files: src/dynamics/logistic.ts, bifurcation.ts and their .test.ts. No existing file edited.

- Map defined locally: src/recursion/logistic.ts takes R in 5..29 with r=R/10, so it does not fit.
- Exact tests: fixedPointAttracts (100<R<300), twoCycleAttracts (R>300, (R-100)^2<60000), checked for every R in 250..400 against the integer multiplier formulas.
- detectPeriod(r, x0=0.2) takes a real r (the spec table has r=3.565, 3.569, 3.835, not on the R grid); detectPeriodAtR(R) validates.
- Raster: columnR, nearestColumn, bifurcationRaster(W, bins), Uint16 counts, memoised.
- 400-bit BigInt oracle: double orbit leaves the exact orbit by >0.1 at step 52 (matches spec); 1e-10 separation reaches 0.1 at step 30 (matches).

Mutations (each shown failing, then restored):
- twoCycleAttracts bound 60000 -> 60026 (R<=345): 2 tests fail.
- PERIOD_START 0.5: 5 tests fail (table/brute-force/r=4 false period 1; one more in bifurcation file as it imports the constant).
- BIFURCATION_TRANSIENT 0: 3 tests fail (oracle match and the route test).

Spec observation: at r=3 (R=300) 200000 steps find no period (algebraic convergence), 400000 find 2. The brute-force comparison skips R=300 and asserts null for r=3. Legitimate "no period found".
Spec numbers all reproduced (table, 2-cycle at 3.1, 52, 30, period 3 window).

Checks: just unit src/dynamics passed; just lint src/dynamics passed; tsc clean outside levelsets/mechanics.
Not verified: browser timing of the raster.
Review repair: 4-cycle at r=3.5 asserted to 6 decimals (logistic.test.ts); with r=3.51 it fails (observed), restored; unit and lint pass.
