# 02 — `incircle` predicate

Status: accepted 2026-10-31 (Sonnet `high` worker; Sonnet math review: no findings, one nit on a weak corner check that is also compared with the rational reference). `INCIRCLE_FAST_LIMIT` and doc comment in `predicates.ts`, tests in `incircle.test.ts` (27). Mutations observed failing: fast limit \(2^{13}\) (crafted case 89510125238 vs 89510125240), negated lift term (24 tests). A \(2^{12}\) limit is not caught by any test: no random or crafted case found where doubles lose exactness there, so the \(2^{11}\) bound is the proven one, not a tight one. Handler checks: tsc 0, `just unit src/compgeo` pass. Source: [spec T0 `incircle`](../../specs/triangulation-voronoi-lessons.md#incircle-implements-the-reserved-extension-point), [B3 acceptance 1](../../specs/triangulation-voronoi-lessons.md#b3-delaunay-triangulation-and-lawson-flips-showpiece), [testing decisions](../../specs/triangulation-voronoi-lessons.md#testing-decisions), [ADR 0021](../../adr/0021-exact-grid-predicates.md), decisions in the [README](README.md). Kind: F1, mathematical review. Worker effort `high` (robust predicate). Depends on convexity 02.

Add to `src/compgeo/predicates.ts`, next to `orient`, with input validation by `assertGridPoint`:

1. `incircleValue(a, b, c, d): bigint` — the determinant of rows \((a_x-d_x,\;a_y-d_y,\;(a_x-d_x)^2+(a_y-d_y)^2)\) for \(a,b,c\). Positive when \(d\) is strictly inside the circle through counter-clockwise \(a,b,c\).
2. `incircle(a, b, c, d): -1 | 0 | 1` — its sign. Throws `RangeError` when `orient(a, b, c) === 0`. Fast path in doubles when all absolute coordinates are at most \(2^{11}\), using the cofactor expansion along the lift column (three \(2\times2\) minors times lifts); `BigInt` otherwise. Document the bound and the expansion order next to `orient`'s \(2^{25}\) comment.
3. Tests (`predicates.test.ts` or a new `incircle.test.ts`):
   - Sample \(a=(0,0),b=(4,0),c=(5,3),d=(0,2)\): `incircleValue` \(=64\), and after the flip to \(bd\) both tests give \(-64\): \((a,b,d\mid c)\) and \((b,c,d\mid a)\); the other triangle of the old diagonal, \((a,c,d\mid b)\), gives \(+64\) (handler-checked with `python -I`, 2026-10-31; an earlier wording here said "three other tests", which was wrong).
   - Unit square \((0,0),(1,0),(1,1),(0,1)\) and the trapezoid \((0,0),(8,0),(9,5),(-1,5)\): \(0\) (cocircular).
   - Clockwise \(a,b,c\) negates the sign; swapping two of \(a,b,c\) negates the value; cyclic rotation keeps it.
   - Grid sweep against an independent exact rational reference written in the test (for example circumcentre with `bigint` numerator/denominator and squared distances compared), including coordinates around \(2^{11}\), \(2^{11}+1\), and up to \(2^{25}\) so both paths run; the test must show the `BigInt` path is taken above the bound (for example by a value above \(2^{53}\)).
   - Collinear \(a,b,c\) throws; non-grid input throws as `orient` does.
   - Observed failures under two deliberate mutations (for example a \(2^{12}\) fast-path bound with a crafted case that loses exactness, or a sign convention flip).

Checks: `just unit src/compgeo --maxWorkers=2`, `just lint src/compgeo`, `npx tsc --noEmit --pretty false`.
