# 02 Transformation and inverse kernels (F1, Batch A)

Spec: S1 and S2 concept contracts. Depends on 01.

Scope: `src/analysis/transformation.ts`, `src/analysis/inverse.ts` and tests.

Acceptance:

1. S1: the tracked-point map \((u,v)\mapsto(u/b+c,\,av+d)\) holds for every catalogue shape at sample points. \(b=0\) is rejected. \(b<0\) mirrors about \(x=c\). A composed-rule readout (structured parts, not localized text) gives the order of operations.
2. S2: the closed list of one-to-one restrictions (\(x^2\) on \(x\ge0\) with \(\sqrt x\); \(a^x\) with \(\log_a\); \(e^x\) with \(\ln\)). A mirror point swaps coordinates exactly. The product of the slopes at mirrored points is 1 within 1e-9. The spec values hold: 4 and 1/4; \(8\ln2\approx5.5452\) and \(0.18034\); \(e\) and \(0.36788\).
3. Where \(f'=0\) (\(x^2\) at 0), the inverse slope is reported as vertical and undefined, never as a number. \(a=1\) is rejected.

Checks: `just unit src/analysis`, then the full suite once, and `just typecheck`. Report mutation evidence.
