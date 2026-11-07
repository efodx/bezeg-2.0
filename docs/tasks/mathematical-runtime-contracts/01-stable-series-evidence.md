# Task 1 evidence: stable series evaluation

## Finite-sum candidates (relative error vs BigInt exact, q grid -2..2 step 0.05 plus near-boundary values, a in 0.1/0.3/1/5, n 1..50)

| method | worst relative error | where |
|---|---|---|
| old `a(1-q^n)/(1-q)` | 2.5e-11 | q=-(1+1e-12), n=50 |
| Neumaier over terms | 6.7e-5 | q=-0.999999999999, n=2 (small S_n, term rounding dominates) |
| pure expm1 | 4.3e-15 | q=1.95, n=50; loses exact 2^n-1 |
| chosen hybrid | 9.2e-16 | q=-1.2, n=49 |

Chosen: closed form with `Math.pow` where `||q|-1| >= 0.25` (keeps q=2, q=1/2 dyadic sums exact), else `-expm1(n*log1p(|q|-1))` (or `1+exp(...)` for odd n, q<0). q=1 is `n*a`, q=-1 is exactly `a`/`0`. Test tolerance 4e-15 (about 4x observed worst, room for libm differences; the defect is 4 orders above it).

## Pre-change failures (unchanged code, tests written first)

- geometricSeries.test: case A (`expected 50 to be less than 50`); case B (`expected 17 to be 19`); exact grid (`a=0.1 q=0.999999999999 n=2` rel err 5.0e-13); partialSums vs partialSum per index (`1.999999999999` vs `2`); tail and bundle tests (`geometricTailError`/`geometricSeriesValues` missing).
- geometricSeriesModel.test: case A (50), case B (17 vs 19), tail equality (missing export).
- Host: bar equals sum readout at q=0.999999999999 (`50 not < 50`); tolerance 1e-18 status text (`Od n = 17`, no `19`).
- 13 failures in total across three files.

## Guards (pass before and after)

Exactness (q=2, 0.5, -1, 1), q=0 (no NaN), finite grid, cap/uncapped/n<=0, no-limit boundaries, y-range at endpoints, bars/readout agreement for five series in the host. Mutations: `q=-1` returns `a` fails 3 tests; strict `<` to `<=` fails 2; removing the redundant `q === 0` branch changes nothing (branch removed from code as dead).

## Existing test that pinned the defect

`geometricSeries.test.ts` "alternating q = -0.5 ... equality does not count" computed the error as `limit - S_n`; with direct tail evaluation the equality case differs by rounding. Its `error` helper now uses `geometricTailError`; assertions unchanged.

## Checks (after)

Focused unit command: passed (3 files). `just lint src/analysis src/graphs/functions`: passed. `just typecheck`: 5 errors, all in `src/analysis/conicTypeContracts.typecheck.ts` (not an owned file, from other working-tree changes in `src/projective`/`fivePointModel`); none in geometric series files.

## Acceptance

Handler changes after the worker: the `as number` cast in `firstTermWithinTolerance` became a null check. After review, the tail test compares against an exact BigInt `limit - S_n`, and the grids include `q` one ulp from ±1. Mutating the tail back to `limit - S_n` fails case B and that test.

Mathematical review found no blocking issue; its two minor test findings are closed above. Its independent script over `q` within a few ulps of ±1 and across the 0.25 switch found a worst relative error of 3.9e-16.

Full unit suite and lint passed on the combined tree of tasks 1 and 5, before the two test-only edits above, and the production build was rerun after them. Typecheck and the focused suites passed again after rebasing onto `5825ceba`.

## Browser smoke (production preview, port 4318, Chromium, 1440x900)

Pass: edits (n = 3 gives S = 1,75, error 0,25); case A (no NaN; limit 1000022122209,5028, which is correct for the double value of `q`); tolerance 0,01 at q = 0,1 gives `Od n = 3`; no-limit states at q = -1 and q = 1,5; playback to the cap of 50; Reset; Preset save and restore; the board in English at n = 4; no console errors.

Tolerance 1e-18 is reachable only from a Preset file, because the field rounds to three decimals. Importing `a = 1, q = 0.1` at n = 18 and n = 19 was accepted, and the readout gave first n = 19 in both.

Gaps:

- The `Od n = 19` status text was not seen in the browser. The script read it with `innerText` while another tools tab was open, and the readouts it did find were read with `textContent`. The status has the same condition as the readout, and the host test asserts its text.
- The case A bar cannot be read at a scale of 1e12 in the browser; the host test compares the real board segment with the reported sum.
- At n = 5 the screenshot showed five sum bars and two term bars, because the viewport cut off the lower part of the board.
- Touch and assistive technology were not covered.
