# AB-1c evidence: Coons patch kernel

Files (new): `src/bezeg/impl/kernels/coons.ts`, `src/bezeg/impl/kernels/coons.test.ts`. Spec: `docs/specs/advanced-bezier-lessons.md` D4; ADR 0028 item 3.

## Results (observed)

- `just unit src/bezeg/impl/kernels/coons --maxWorkers=2`: 7 tests passed (final run, mutations reverted; quiet runner prints only "passed"). `npx tsc --noEmit --pretty false`: exit 0.
- Spec numbers hold: centre (1.5, 1.5, 0.75) with Lc z = Ld z = 0.375, B z = 0. Interior net: `net[1][1]=(1,1,4/3)`, `net[1][2]=(1,2,1/3)`, `net[2][1]=(2,1,5/3)`, `net[2][2]=(2,2,2/3)` (no contradiction with the spec).
- The test-only general blend (Lc+Ld-B straight from the boundary curves) equals the bicubic net, and the Lc, Ld, B nets equal their own surfaces, to 1e-12 at 50 seeded LCG (u,v) on the default and two random matching-corner boundary sets.
- All four boundaries are reproduced to 1e-12 when corners coincide (default and random).
- Moved corner (d1 end z+2): `coonsCornerCheck` reports `["u1v1"]`, distance 2; the net misses the c1 boundary by 2 at (1,1) and by 1 at u=1/2.
- The net feeds `TensorProductBezierPatch` (`eval(0.25,0.75)` equals the kernel net to 1e-12).
- Invalid input (3 or 5 points, NaN, Infinity, 2-component point) throws RangeError naming the boundary.

## Mutations (each reverted by hand edit; final run green)

1. Sign of B flipped (`- bi` -> `+ bi`): 4 failed (centre/net, blend equality, boundaries, moved corner).
2. Wrong elevation weight (`j/3` -> `j/2` in Lc): 4 failed.
3. Swapped index in Ld (`d0[j],i/3` -> `d0[i],j/3`): 3 failed (centre/net, blend equality, boundaries).
4. Wrong corner pairing (`u1v0` compares `d1[3]` instead of `d1[0]`): 3 failed (blend equality's corner check, moved corner, several corners).

## Decisions

- Convention: `c0` at v=0, `c1` at v=1 (functions of u); `d0` at u=0, `d1` at u=1 (functions of v). Net orientation matches `TensorProductBezierPatch`: `net[i][j]`, i is the u index, j the v index; the kernel net can be passed straight in.
- Exports: `coonsBicubicNet`, `coonsRuledCNet`, `coonsRuledDNet`, `coonsBilinearNet` (each a bicubic 4x4 net of that term), `coonsCornerCheck(b, relTol=1e-9)` returning `{corner, distance}[]` with corners `u0v0 | u1v0 | u0v1 | u1v1`; tolerance is relTol times max(1, largest absolute coordinate).
- B rule: see Repairs (supersedes the original c-corner rule). The graph must use the corner check and not claim interpolation.
- Points are `[x, y, z]` tuples; no dependency on JSXGraph, React or localization.

## What the lesson must state

- The blend is one of many fills; the interior is not determined by the boundaries alone. No twist claim.
- With cubic boundaries the Coons patch is exactly bicubic, so the interior net is read off as Lc + Ld - B at thirds.
- With a corner moved, interpolation is not claimed (the corner check lists the mismatched corners).

## Repairs (review round 1)

- B now uses, per corner, the average of the two boundary end points meeting there (symmetric). With a corner gap g, both boundaries meeting at that corner miss by g/2 there (test: d1 end moved by 2, c1 and d1 each miss by 1; corner check reports `u1v1`). Matching corners are unchanged.
- Corner tolerance is now `CORNER_RELATIVE_TOLERANCE` (1e-9, exported) times the extent (largest bounding-box edge of the 16 points) plus `8*Number.EPSILON*max|coord|`.
- Tests: default boundaries translated by +1e6 with a 1e-4 gap is reported (and the unmoved translated set matches); a gap of 0.5x and 2x the tolerance is matched and mismatched respectively.
- Observed: 8 tests pass; `npx tsc --noEmit --pretty false` exit 0. Old B rule restored: 1 failed (moved corner). Old tolerance rule restored: 1 failed (translation/extent test). Both reverted by hand edit; final run green.

## Mathematical review and disposition (handler 3, 2026-10-31)

Independent review (`bezeg-reviewer` Sonnet, 4 tool uses, ~22k tokens) found no formula errors.
- Lc, Ld, B and P = Lc + Ld - B are correct, the boundary conventions match the spec, and the orientation net[i][j] (i: u) matches `TensorProductBezierPatch`.
- Recomputed in exact fractions: the four interior points and the centre (3/2, 3/2, 3/4).
- The test-only blend evaluator shares no code with the kernel.

Findings, all repaired by the worker in round 1 (see Repairs):
1. Medium. B used the c-boundary corners, so which edge failed depended on which curve was dragged. B now averages the two end points at each corner.
2. Low. The corner tolerance depended on translation; it is now relative to the extent.
3. Low. The scale test was overstated; translated and threshold cases replace it.
4. Low, accepted. Test lines checking the evaluator's own Lc/Ld/B values are evaluator checks, not kernel coverage.

The handler confirmed the repair: the averaged-corner code is at `coons.ts:71-76`, the observed pre-fix failures are listed under Repairs, and 39/39 tests passed across the three AB kernels (`just unit ... --maxWorkers=2`, revision 10beb5e plus this diff). The averaged rule changes the mathematics only at mismatched corners, which is the reviewer's own recommendation, so no re-review was run.

