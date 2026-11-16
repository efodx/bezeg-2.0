# 06 Batch B: SV3–SV4 lessons (F3–F6)

Source: [solids spec](../../specs/solids-volumes-lessons.md), concept contracts SV3–SV4, and the [batch-wide acceptance gate](../../specs/solids-volumes-lessons.md#batch-wide-acceptance-gate). Graph: the solids graph, stack and volume modes. Depends on 05 (Batch A released).

Slices F3–F6 as in [05](05-batch-a-lessons.md); the lessons join the chapter of task 05, and the `solids` action kind gains the shear and disc actions.

Acceptance: the spec's acceptance for SV3–SV4; the disc sums follow `riemann.ts` midpoint semantics; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 slice 1 done (handler 36: actions `set-shear`, `set-discs`, `set-cursor`, `set-axis`; graph slice `set-pyramids` with the cube in three pyramids; stack note at shear 0 removed); F3 SV3 and SV4 written and joined (handler 37); F4 cards captured (handler 37); F5 and F6 gate next.
