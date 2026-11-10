# 02 Rosette and frieze kernel (F1, Batch 0)

Spec: [isometry kernel](../../specs/isometries-lessons.md#isometry-kernel-owned-by-this-spec) items 5–7; the kernel parts of L4–L5 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0047 §2–3.

Scope: new `src/isometry/rosette.ts`, `src/isometry/frieze.ts` and their test files. Reuse `src/isometry/isometry2.ts` (task 01) and `src/compgeo/rational.ts` as they are. Edit no existing file.

Acceptance:

1. `rosette(n, mirrors, motif)` for an integer \(n\in\{1,\dots,12\}\) returns exactly \(n\) images (\(C_n\)) or \(2n\) images (\(D_n\)) as doubles, and the exact integer order. It rejects other \(n\). A generic point's orbit has the stated size with no coincident images, checked against an independent loop of rotations by \(2\pi j/n\). A point on a mirror has fewer distinct images. With mirrors, orientation alternates between consecutive images.
2. `friezeClosure(generators, L)` for a subset of \(\{V,V',H,R,G\}\) and rational \(L>0\) closes the set under composition modulo translation by \(L\). It returns the closed elements, or `reducesPeriod` when a translation other than \(0\) mod \(L\) appears. `friezeType` reads the signature (vertical mirror, horizontal mirror, half-turn, glide) and returns the IUC name.
3. For \(L=4\), the spec's numbers match: of the 32 subsets, 16 reduce the period and 16 are valid. The valid ones give 10 distinct closed sets in exactly 7 types with distinct signatures. The `p2mg` generator sets are exactly \(\{V,G\}\), \(\{V',R\}\), \(\{V',G\}\), \(\{R,G\}\) and \(\{V',R,G\}\). \(\{V,R\}\) gives `p2mm` and \(\{V,R,G\}\) reduces the period. \(V+H\) yields a half-turn (`p2mm`). The closed-set sizes for `p1`, `p11g`, `p1m1`, `p11m`, `p2`, `p2mg`, `p2mm` are 1, 2, 2, 2, 2, 4 and 4. The "exactly 7" test uses a separate brute-force composition loop as its oracle, not `friezeClosure`.
4. `friezeCopies(type, motif, L, range)` returns the motif images with no duplicates in one period, and they tile the window: each period of the window holds the same number of copies.
5. No \(\varepsilon\) appears in any frieze decision. Rosette points are doubles, but the order is exact.

Checks: `just unit src/isometry`, then `npx tsc --noEmit --pretty false` and `just lint src/isometry`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: `reducesPeriod` never returned, \(G\) without its half-period shift, and a rosette image count off by one for mirrors.
