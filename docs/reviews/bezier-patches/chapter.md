# Bézier patches chapter: section map and verification

Task 12 (`docs/tasks/bezier-patches/12-patches-chapter.md`). Sections 1-4 written by writer A; 5-8 written by writer B, 9-11 placeholders (pending writer C). Content: `src/learning/content/patchChapter*.ts`. Registered in `familyChapters.ts` directly after `parametrization`; prerequisite Bézier curves. No `example` blocks and no authored scenes until task 13; catalog figure captions say the previews show default scenes.

| # | Section id | Takeaway (outcome stated in prose) | Misconceptions addressed | Demonstration | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | `curve-to-patch` | A moving curve sweeps a patch; name the degree pair (m,n); 4x3 net = 12 points, pair (3,2) | M3 (not a product of curves), M9 (rotate before judging) | `patch-tensor` | Count only: (3+1)(2+1)=12 |
| 2 | `bilinear-patch` | S(1/2,1/2) by hand; lines at constant u are straight; diagonal is a parabola of degree m+n | M5 (diagonal degree) | `patch-tensor` | Script below: S=(u,v,uv); S(.5,.5)=(.5,.5,.25); diagonal (t,t,t^2) at t=.2,.5,.9 |
| 3 | `control-net` | (m+1)(n+1) points; partition of unity; only corners interpolated | M1, M3, M4 | `patch-tensor` | Script: quadratic weights at u=1/4 are 9,6,1 over 16; at v=1/2 are 1/4,1/2,1/4; nine products sum to 1 |
| 4 | `boundary-iso-curves` | Iso-curve control points Q_j(u) are computed, not read off | M2, M1 | `patch-tensor` | Script: 3x3 net, h11=4; Q=(.5,0,0),(.5,.5,2),(.5,1,0); iso-curve midpoint height 1 = S(.5,.5) height 1 |
| 5 | `tensor-decasteljau` | Two-stage evaluation; order independent | M3, M4 | `patch-decasteljau` | Script: 3x3 net h11=4, S(1/4,1/2)=(.25,.5,.75) u-first, v-first and direct; 12 lerps each order |
| 6 | `properties` | Hull of whole net; affine invariance; variation diminishing has no general bivariate analogue (no numeric counterexample asserted, decision 4) | M4, M8, M1 | `patch-tensor` | Script: max surface height 1 vs net height 4; z->2z+1 gives S(.5,.5) height 3 |
| 7 | `tensor-derivatives` | Saddle partials, normal, twist; normal undefined at degenerate corner | M9 | `patch-derivatives` | Script: see below |
| 8 | `tensor-subdivision` | Elevate to (2,1), split at u=1/2, exact piece correspondence | M1 | `patch-subdivision` | Script: see below |
| 9 | `tensor-joins` | pending (writer C) | M6 | `patch-joins` | pending |
| 10 | `triangular-patches` | pending (writer C) | M7 | `patch-triangular` | pending |
| 11 | `square-vs-triangular` | pending (writer C) | M7, M9 | `patch-triangular` (comparison view) | pending |

Misconception keys follow `docs/research/bezier-surfaces.md` section 2.3 (M1 passes through all control points, M2 iso-curve is a net row, M3 tensor is a product of two curves, M4 hull of each row, M5 diagonal degree, M6 C1 means tangent line-up, M7 triangular is tensor minus an edge, M8 variation diminishing holds, M9 3D perception).

## Independent computation (sections 1-4)

Script `/tmp/t12a-check.cjs` (scratch, not committed): a generic tensor Bernstein evaluator, run with node. Observed output:

- Bilinear net P00=(0,0,0), P10=(1,0,0), P01=(0,1,0), P11=(1,1,1): S(.5,.5)=[0.5,0.5,0.25]; S(.3,.7)=[0.3,0.7,0.21]=(u,v,uv); diagonal S(t,t)=(t,t,t^2) at t=0.2, 0.5, 0.9.
- Quadratic weights at u=.25 times 16: [9,6,1]; at v=.5: [.25,.5,.25]; double sum of the nine products: 1.
- 3x3 net P_ij=(i/2,j/2,h), h11=4 else 0, u=.5: Q=[[.5,0,0],[.5,.5,2],[.5,1,0]]; iso-curve at v=.5: [.5,.5,1]; full tensor S(.5,.5)=[.5,.5,1].
- Boundary check: S(0,.5)=[0,.5,0]=P_01 of that net (edge midpoint, whose control points are the first row).

`patchChapter.test.ts` repeats the weight, Q_1 height and bilinear S(.5,.5) arithmetic.

## Slovenian terms

All terms come from the spec/`docs/localization.md` approved list (Bézierjeva krpa, tenzorska Bézierjeva krpa, krpa v obliki tenzorskega produkta, kontrolna mreža, robna krivulja, izoparametrična krivulja with "krivulja pri stalnem u", Bernsteinova utež točke, konveksna ovojnica, zveznost C0/C1, geometrijska zveznost G1). "Par stopenj" (degree pair), "razdelitev enote" (partition of unity, as used in the existing curve chapters' register) and "cilj razdelka" (learning outcome) are phrasing choices, not new glossary terms; "par stopenj" is standard wording for the (m,n) pair and is recorded here as the basis under `docs/localization.md#choosing-new-terms`.

## Gaps

- No authored scenes or `example` blocks (task 13); the generic Explore prompts use `demonstration-default`. `guidedExampleScenes.test.tsx` excludes `bezier-patches` from its baseline-alias check for this reason.
- Sections 9-11 are placeholders.

## Carried obligations

- Task 13 must remove the temporary `bezier-patches` exclusion in `src/learning/content/guidedExampleScenes.test.tsx` once its authored guided-example scenes give every prompted section an audited baseline home (handler 20).
- The chapter is not pushed to `master` while sections 5–11 are placeholders; it ships with writers B and C.

## Independent computation (sections 5-8, writer B)

Script `/tmp/t12b/c.cjs` (scratch, not committed): Bernstein evaluator plus separate de Casteljau, finite differences, elevation and subdivision. Observed:

- Section 5, 3x3 net h11=4 (P_ij=(i/2,j/2,h)), u=.25, v=.5: u-first gives (.25,.5,.75), v-first (.25,.5,.75), direct Bernstein sum (.25,.5,.75); Q1 height 1.5 (6/16*4), v-first middle row height 2; 12 lerps in each order (3 columns x 3 + 3, or 3 rows x 3 + 3). Bilinear net: two u-lerps then one v-lerp at .5 gives (.5,.5,.25).
- Section 6, same net: max surface height over a 101x101 grid is 1 (analytically 4*2u(1-u)*2v(1-v) <= 1), net heights 0..4; map z->2z+1: S(.5,.5) height 3 = 2*1+1, S(.25,.5) height 2.5 = 2*.75+1. Variation diminishing: prose states only that no general bivariate analogue exists (Farin); no counterexample was constructed or claimed.
- Section 7, S=(u,v,uv): Su(0,0)=(1,0,0), Sv(0,0)=(0,1,0), cross (0,0,1); at (.5,.5) Su=(1,0,.5), Sv=(0,1,.5) (central differences agree to 1e-12), cross (-.5,-.5,1); twist P11-P10-P01+P00=(0,0,1), mixed finite difference (0,0,1.0). Degenerate net P00=P01=(0,0,0), P10=(1,0,0), P11=(1,1,1): Sv(0,0)=(0,0,0), cross with Su=(1,0,0) is (0,0,0). Parallelogram-zero-twist claim follows from the formula (P11=P10+P01-P00), not separately sampled. The formula in prose S_uv(0,0)=mn(...) is the standard corner result (m=n=1 checked numerically).
- Section 8: elevation of the bilinear net to (2,1) in u gives columns [(0,0,0),(.5,0,0),(1,0,0)] and [(0,1,0),(.5,1,.5),(1,1,1)]; max difference from the original surface at three sample points 5.6e-17. Split at u=.5: left columns [(0,0,0),(.25,0,0),(.5,0,0)], [(0,1,0),(.25,1,.25),(.5,1,.5)]; right columns [(.5,0,0),(.75,0,0),(1,0,0)], [(.5,1,.5),(.75,1,.75),(1,1,1)]; S_L, S_R match S(s/2,v), S(.5+s/2,v) to 5.6e-17; S_L(.5,.5)=(.25,.5,.125). Shared row: last of left = first of right.

Checks: `npx vitest run src/learning` 53 files, 912 tests pass; `npx tsc --noEmit --pretty false` clean (logs `.command-logs/t12-b-vitest.log`, `-tsc.log`).
