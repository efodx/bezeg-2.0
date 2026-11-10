# F1 combinatorics kernel 01: worker note

Files: src/combinatorics/{binomial,pascal,latticePaths,expansion}.ts and their .test.ts (19+ tests, all pass).
Checks: just unit src/combinatorics passed; tsc clean apart from src/trig/trigModel*; just lint src/combinatorics passed.

Mutations (each restored; suite green afterwards):
- binomial via doubles: 5 failures (edge values, factorial identity, expansion row sums, pathThrough, pascal vs binomial).
- cap 13: cap test fails. cap 11: cap test and DFS oracle fail.
- Pascal rule shifted (row[k]+row[k+1]): 3 pascal tests fail.

binomialPmf vs exact BigInt ratio, n<=60, p in {1/2,1/4,1/10}: observed max relative error 7.46e-14; asserted bound 1e-13.

Spec issue: docs/specs/combinatorics-lessons.md:40, docs/adr/0048-...md:9 and task 01 line 10 say a double Pascal recurrence "gives 118264581564861420" for C(60,30). The double in row 60 is the nearest double to the exact count (BigInt(double) = ...424); 118264581564861420 is only its shortest printed decimal. The test asserts String(double) differs from the exact digits. First inexact entry of the recurrence is in row 57 (observed).
Decisions: variationsWithRepetition allows k up to 200 (k>n is meaningful there); paths are masks with step 0 as MSB, bit 1 = R; coefficient lists run x^n..x^0.
