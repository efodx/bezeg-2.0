# 01 Recursion kernel (F1, Batch 0)

Spec: [recursion kernel](../../specs/recursion-growth-lessons.md#recursion-kernel-owned-by-this-spec) items 1–5; the kernel parts of RG1–RG5 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0052 §2.

Scope: new `src/recursion/iteration.ts`, `affine.ts`, `logistic.ts`, `interest.ts` and `sequences.ts`, and their test files. Tests may import `src/analysis/fixedPoint.ts` as a cross-check. Edit no existing file.

Acceptance:

1. `iterate(map, x0, n)` for \(n\le60\) returns points and steps of shape `{index, from, to}`. It matches a direct loop and, for affine maps, the closed form \(x^*+m^n(x_0-x^*)\). The \(\cos\) iterate \(x_8=0{,}722102\) matches `fixedPointHistory`.
2. The affine classification decides from the integers \(M\) and \(C\) only. It covers attracting, repelling, 2-cycle, all fixed, none, staircase, spiral and the degenerate \(M=0\). The fixed point \(2C/(20-M)\) is an exact rational. The classification is checked over the whole grid \(M\in[-60,60]\), \(C\in[-100,100]\) against an independent rule written in the test.
3. The logistic classification covers \(R\le10\) (tends to 0, with the slope-1 case at \(R=10\)) and \(11\le R\le29\) (attracting \(x^*=1-1/r\)). It is checked against the numeric derivative at \(x^*\). \(R\ge30\) is rejected, and starts are restricted to \(x_0\in(0,1)\).
4. Interest: `simple`, `compound`, `relative` and `conformalRate` match their closed forms and the conformal round trip. `eApprox(n)` rejects \(n>10^6\).
5. Sequences: `arithmetic`, `geometric` and `partialSum` are exact (BigInt or rational) for integer inputs. The RG1 and RG3 numbers match.
6. No label is decided from iterate values.

Checks: `just unit src/recursion`, then `npx tsc --noEmit --pretty false` and `just lint src/recursion`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: `|M| <= 20` in place of `< 20` for attracting, the \(M=0\) case folded into staircase, and the logistic bound \(R\le30\) accepted.
