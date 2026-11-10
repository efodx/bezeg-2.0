# F1 complex-maps task 08 (Batch D kernel) - worker note

Status: complete, not committed.
Files: src/analysis/complexPower.ts, eulerCircle.ts and complexPower.test.ts, eulerCircle.test.ts (all new).
- polarPower(z,n): n integer 1..8 else RangeError; z=0 gives modulus 0 and undefined angles; principal = wrapped n*phi.
- exactIntegerPower(a,b,n): integer grid units |a|,|b|<=40, n 1..8 else RangeError.
- eulerPoint(deg), circularMotion(w,t), expSeriesPartial(theta,N) with N 1..30 (RangeError outside).
Checks: just unit (2 files, 23 tests) passed; tsc clean outside src/linear; just lint src/analysis passed; no trailing whitespace.
Mutations (each observed failing, then restored, cmp identical):
- n<=9 (COMPLEX_POWER_MAX=9): 2 range tests fail.
- principal unwrapped: 5 polarPower tests fail.
- series sign (re: +term.im): 3 tests fail in eulerCircle.test.ts.
Spec issue: M7 acceptance 1 "product rule to 1e-15 on 360 pairs" does not reproduce
for my pair set (i*7, i*13+5 degrees): max error 1.05e-15 (rounding of cos*cos-sin*sin). Test uses 2e-15.
Review repair: product rule tol 4e-15 (spec), BigInt toEqual over whole loop (mutation via Math.pow/atan2 fails), z=-1 cases.
Not verified: other spec numbers only to the digits stated; ADR file path not read.
