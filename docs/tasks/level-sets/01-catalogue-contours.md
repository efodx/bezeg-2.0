# 01 Function catalogue and marching squares (F1, Batch 0)

Spec: [kernels](../../specs/level-sets-optimization-lessons.md#kernels) items 1–2; the kernel parts of LS1–LS2 acceptance; Testing Decisions (marching squares, gradient); Correctness Notes. Decisions: ADR 0053 §2.

Scope: new `src/levelsets/functions2.ts` and `src/levelsets/contours.ts`, and their test files. Edit no existing file.

Acceptance:

1. The catalogue is a closed id list (`bowl`, `saddle`, `valley`, `hills`, `product`) with value, analytic gradient and window. There is no parser. Over a grid of sample points, each gradient matches a central difference, used only in the test.
2. Marching squares follows the spec:
   - node coordinates are computed with the integer ratio first;
   - a node with \(f=c\) counts as positive;
   - a segment of zero length is dropped;
   - the level is never perturbed;
   - saddle cells use the division-free decider \(G\cdot D\ge0\).
3. All 16 cases match a hand table. For the ambiguous cell \(f=xy\) on \([-1,1]^2\) with \(N=1\):
   - \(c=0{,}5\) gives the two separated corner cuts the spec names;
   - \(c=-0{,}5\) gives the joined pair;
   - \(c=0\) gives the joined pair.
4. The case selection matches the contour of the bilinear interpolant, found by brute-force fine sampling. The circle length and radius errors match the spec's values. The LS1–LS2 numbers match.
5. Output is one NaN-separated polyline per level, as in ADR 0037.

Checks: `just unit src/levelsets`, then `npx tsc --noEmit --pretty false` and `just lint src/levelsets`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: a node with \(f=c\) counted as negative, the saddle decider's sign flipped, and a gradient component with the wrong sign.
