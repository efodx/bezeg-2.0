# 02 Transformation and inverse kernels: review

2026-10-31. Implementation: `bezeg-worker` (Sonnet 5.5, `medium`). Review: `bezeg-reviewer` (Sonnet 5.5, `medium`), covering mathematics and engineering. Scope: `transformation.ts`, `inverse.ts` and their tests.

## Findings and disposition

There were no blockers and no should-fix findings.

- **Fixed: no finite-difference check.** The spec's test list asks for reciprocal slopes against finite differences, and no test checked them. A new test compares the forward and inverse slopes with central differences, at three interior points of each restriction. The handler confirmed that it fails when the kernel slope is scaled by 1.001 (1 failed, 9 skipped, with only that block run).
- **Fixed: no test rejected \(b=-0\).** A test now checks that `b-zero` is reported for it.
- **Fixed: corner case documented.** The rule "in the domain, no derivative, therefore vertical" holds only because \(\sqrt x\) at 0 is the closed list's sole such point. A comment in `inverse.ts` now says so.
- **Fixed: `Point2` declared twice.** It is now exported once, from `transformation.ts`.
- **Accepted: duplicated range checks.** The checks repeat the validator's logic, while the numbers come from the shared `TRANSFORM_BOUNDS` and `BASE_MIN`/`BASE_MAX`. If the validator's rule changes, for example to exclusive bounds, these checks must change with it.
- **Accepted, untested: the vertical-forward branch.** A vertical forward tangent gives inverse slope 0. No restriction in the closed list reaches this branch.

## Cleared

- **Point map:** \((u,v)\mapsto(u/b+c,\,av+d)\) is equivalent to \(af(b(x-c))+d\).
- **Composed rule:** the order of operations is shift inside, scale inside, base, scale outside, shift outside. The mirror flags and the omission of identity steps are correct.
- **Mirroring:** mirrored points swap their coordinates exactly.
- **Spec values:** recomputed independently (\(8\ln2=5.54518\), \(0.180337\), \(1/e=0.367879\)).
- **Outside the domain:** points outside a restriction's domain return `undefined`, never "vertical".
- **\(x^2\) at 0:** gives a vertical inverse slope.
