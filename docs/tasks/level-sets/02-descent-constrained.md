# 02 Descent and constrained point (F1, Batch 0)

Spec: [kernels](../../specs/level-sets-optimization-lessons.md#kernels) items 3–4; the kernel parts of LS3–LS4 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0053 §4.

Scope: new `src/levelsets/descent.ts` and `src/levelsets/constrained.ts`, and their test files. Reuse `functions2.ts` (task 01) and `src/compgeo/rational.ts` as they are. Edit no existing file.

Acceptance:

1. Descent uses \(h=H/100\) with integer \(H\in[1,30]\) and starts on the \(1/4\) grid. For `valley` it matches the closed form \(x_0(1-2h)^k\), \(y_0(1-20h)^k\). The classification "converges iff \(H\le9\) or \(y_0=0\)", with oscillation at \(H=10\) and divergence for \(H\ge11\), is an integer test checked over \(H\in[1,30]\) and both kinds of start. For other functions there is no claim. The path stops at 200 steps, or at a non-finite value or \(|p|>10^6\).
2. The constrained point on an integer line \(ax+by=c\) has rational coordinates. Tangency \(\det(\nabla f,\nabla g)=0\) is decided exactly with `Rational` for lines. For circles it uses the named tolerance \(|\sin\angle|<0{,}01\) and returns an "approximately" status. The LS4 numbers match.
3. Invalid input (off-grid start, \(H\) outside its range, a line with \(a=b=0\)) throws `RangeError`.

Checks: `just unit src/levelsets`, then `npx tsc --noEmit --pretty false` and `just lint src/levelsets`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: `H <= 10` for convergence, the \(y_0=0\) exception dropped, and a tolerance in the exact line tangency.
