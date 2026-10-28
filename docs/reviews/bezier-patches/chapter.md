# Bézier patches chapter: section map and verification

Task 12 (`docs/tasks/bezier-patches/12-patches-chapter.md`). Sections 1-4 written by writer A; 5-11 are placeholders (pending writers B/C). Content: `src/learning/content/patchChapter*.ts`. Registered in `familyChapters.ts` directly after `parametrization`; prerequisite Bézier curves. No `example` blocks and no authored scenes until task 13; catalog figure captions say the previews show default scenes.

| # | Section id | Takeaway (outcome stated in prose) | Misconceptions addressed | Demonstration | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | `curve-to-patch` | A moving curve sweeps a patch; name the degree pair (m,n); 4x3 net = 12 points, pair (3,2) | M3 (not a product of curves), M9 (rotate before judging) | `patch-tensor` | Count only: (3+1)(2+1)=12 |
| 2 | `bilinear-patch` | S(1/2,1/2) by hand; lines at constant u are straight; diagonal is a parabola of degree m+n | M5 (diagonal degree) | `patch-tensor` | Script below: S=(u,v,uv); S(.5,.5)=(.5,.5,.25); diagonal (t,t,t^2) at t=.2,.5,.9 |
| 3 | `control-net` | (m+1)(n+1) points; partition of unity; only corners interpolated | M1, M3, M4 | `patch-tensor` | Script: quadratic weights at u=1/4 are 9,6,1 over 16; at v=1/2 are 1/4,1/2,1/4; nine products sum to 1 |
| 4 | `boundary-iso-curves` | Iso-curve control points Q_j(u) are computed, not read off | M2, M1 | `patch-tensor` | Script: 3x3 net, h11=4; Q=(.5,0,0),(.5,.5,2),(.5,1,0); iso-curve midpoint height 1 = S(.5,.5) height 1 |
| 5 | `tensor-decasteljau` | pending (writer B) | M3, M4 | `patch-decasteljau` | pending |
| 6 | `properties` | pending (writer B); variation diminishing: no unverified counterexample (handler decision 4) | M4, M8, M1 | `patch-tensor` | pending |
| 7 | `tensor-derivatives` | pending (writer B) | M9 | `patch-derivatives` | pending |
| 8 | `tensor-subdivision` | pending (writer B) | M1 | `patch-subdivision` | pending |
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
- Sections 5-11 are placeholders.

## Carried obligations

- Task 13 must remove the temporary `bezier-patches` exclusion in `src/learning/content/guidedExampleScenes.test.tsx` once its authored guided-example scenes give every prompted section an audited baseline home (handler 20).
- The chapter is not pushed to `master` while sections 5–11 are placeholders; it ships with writers B and C.
