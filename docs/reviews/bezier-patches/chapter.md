# Bézier patches chapter: section map and verification

Task 12 (`docs/tasks/bezier-patches/12-patches-chapter.md`). All eleven sections are authored; sections 9–11 were recovered from the interrupted writer's working tree. Content: `src/learning/content/patchChapter*.ts`. Registered in `familyChapters.ts` directly after `parametrization`; prerequisite Bézier curves. No `example` blocks and no authored scenes until task 13; catalog figure captions say the previews show default scenes. Independent [content/mathematical review](t12-codex-content-review.md) checked all eleven sections and identified two repairs, tracked [here](t12-codex-repairs.md).

| # | Section id | Takeaway (outcome stated in prose) | Misconceptions addressed | Demonstration | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | `curve-to-patch` | A moving curve sweeps a patch; name the degree pair (m,n); 4x3 net = 12 points, pair (3,2) | M3 (not a product of curves), M9 (rotate before judging) | `patch-tensor` | Count only: (3+1)(2+1)=12 |
| 2 | `bilinear-patch` | S(1/2,1/2) by hand; lines at constant u are straight; diagonal is a parabola of degree m+n | M5 (diagonal degree) | `patch-tensor` | Script below: S=(u,v,uv); S(.5,.5)=(.5,.5,.25); diagonal (t,t,t^2) at t=.2,.5,.9 |
| 3 | `control-net` | (m+1)(n+1) points; partition of unity; only corners interpolated | M1, M3, M4 | `patch-tensor` | Script: quadratic weights at u=1/4 are 9,6,1 over 16; at v=1/2 are 1/4,1/2,1/4; nine products sum to 1 |
| 4 | `boundary-iso-curves` | Iso-curve control points Q_j(u) are computed, not read off | M2, M1 | `patch-tensor` | Script: 3x3 net, h11=4; Q=(.5,0,0),(.5,.5,2),(.5,1,0); iso-curve midpoint height 1 = S(.5,.5) height 1 |
| 5 | `tensor-decasteljau` | Two-stage evaluation; order independent | M3, M4 | `patch-decasteljau` | Script: 3x3 net h11=4, S(1/4,1/2)=(.25,.5,.75) u-first, v-first and direct; 12 lerps each order |
| 6 | `properties` | Hull of whole net; affine invariance; an explicitly scoped line-versus-wireframe bound fails on a bilinear saddle (one intersection vs zero) | M4, M8, M1 | `patch-tensor` | Script: max surface height 1 vs net height 4; z->2z+1 gives S(.5,.5) height 3 |
| 7 | `tensor-derivatives` | Saddle partials, normal, twist; normal undefined at degenerate corner | M9 | `patch-derivatives` | Script: see below |
| 8 | `tensor-subdivision` | Elevate to (2,1), split at u=1/2, exact piece correspondence | M1 | `patch-subdivision` | Script: see below |
| 9 | `tensor-joins` | Distinguish C0, degree-scaled C1 derivatives and sufficient constant-ratio G1; 32-patch read-only teapot | M6 | `patch-joins` | Independent reviewer checked bilinear matching/scaled differences and mixed-degree example |
| 10 | `triangular-patches` | Barycentric weights, six-point quadratic centroid and boundary | M7 | `patch-triangular` | Independent reviewer checked centroid (1,1,2), first de Casteljau level and boundary midpoint height 3/2 |
| 11 | `square-vs-triangular` | Separate variable degree vs total degree; count nets and compare the same surface | M7, M9 | `patch-triangular` (comparison view) | Independent reviewer checked 16 vs 10 cubic controls and six-point quadratic representation of z=xy |

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
- Both independent review findings are repaired: the interior iso-curve claim is qualified with boundary exceptions, and an exact bilinear saddle refutes the stated line-versus-wireframe upper bound. The handler checked the final prose against the separately reviewed premise ([math review](t12-counterexample-review.md)). Focused content/notation tests, typecheck, integrated checks and production build passed; chapter browser acceptance remains pending. Task 13 still owns authored scenes/figures.

## Codex continuation verification — 2026-10-29

Both repairs are implemented and the handler compared their final wording with the independent mathematical premise review. The new authored-text regression failed before the prose repair, then focused content/notation tests (nine tests) and typecheck passed. `just check` subsequently passed TypeScript, lint and 4,802 tests in 239 files, and production build passed. Tested revision: `4dd5f22fd8f4400e080c9ab0d14b6767cbf60207` with only these chapter source edits dirty. Logs: `.command-logs/2026-10-29T08-07-42-551Z-36676-a13001e4.log` and build `.command-logs/2026-10-29T08-11-03-367Z-36676-a83ea691.log` (existing Sass/JSXGraph build warnings).

The successor checked the final build's eleven bilingual sections, desktop reading, both languages at390pixels/200% text, math containment, loaded default figure and chapter navigation; see [browser evidence](t12-codex-chapter-smoke.md). The exact source CI failed a stale eight-chapter-card assertion, now repaired with an explicit nine-ID inventory ([source CI](t12-source-ci.md)). Local selected rows passed after test-authoring repairs. Acceptance remains partial: the chapter has no rendered patch activity invokers and the prerequisite route is plain text. Task13 must wire clickable prerequisite/activity links, authored scenes and actual-scene captures, then verify patch return position/focus. Existing curve-runtime return evidence is not patch activity acceptance.

## Carried obligations

- Task 13 must remove the temporary `bezier-patches` exclusion in `src/learning/content/guidedExampleScenes.test.tsx` once its authored guided-example scenes give every prompted section an audited baseline home (handler 20).
- All eleven sections must be substantive before publication; the recovered sections 9–11 satisfy that content requirement, subject to the review repairs and verification above.

## Independent computation (sections 5-8, writer B)

Script `/tmp/t12b/c.cjs` (scratch, not committed): Bernstein evaluator plus separate de Casteljau, finite differences, elevation and subdivision. Observed:

- Section 5, 3x3 net h11=4 (P_ij=(i/2,j/2,h)), u=.25, v=.5: u-first gives (.25,.5,.75), v-first (.25,.5,.75), direct Bernstein sum (.25,.5,.75); Q1 height 1.5 (6/16*4), v-first middle row height 2; 12 lerps in each order (3 columns x 3 + 3, or 3 rows x 3 + 3). Bilinear net: two u-lerps then one v-lerp at .5 gives (.5,.5,.25).
- Section 6, same net: max surface height over a 101x101 grid is 1 (analytically 4*2u(1-u)*2v(1-v) <= 1), net heights 0..4; map z->2z+1: S(.5,.5) height 3 = 2*1+1, S(.25,.5) height 2.5 = 2*.75+1. Variation diminishing: prose states only that no general bivariate analogue exists (Farin); no counterexample was constructed or claimed.
- Section 7, S=(u,v,uv): Su(0,0)=(1,0,0), Sv(0,0)=(0,1,0), cross (0,0,1); at (.5,.5) Su=(1,0,.5), Sv=(0,1,.5) (central differences agree to 1e-12), cross (-.5,-.5,1); twist P11-P10-P01+P00=(0,0,1), mixed finite difference (0,0,1.0). Degenerate net P00=P01=(0,0,0), P10=(1,0,0), P11=(1,1,1): Sv(0,0)=(0,0,0), cross with Su=(1,0,0) is (0,0,0). Parallelogram-zero-twist claim follows from the formula (P11=P10+P01-P00), not separately sampled. The formula in prose S_uv(0,0)=mn(...) is the standard corner result (m=n=1 checked numerically).
- Section 8: elevation of the bilinear net to (2,1) in u gives columns [(0,0,0),(.5,0,0),(1,0,0)] and [(0,1,0),(.5,1,.5),(1,1,1)]; max difference from the original surface at three sample points 5.6e-17. Split at u=.5: left columns [(0,0,0),(.25,0,0),(.5,0,0)], [(0,1,0),(.25,1,.25),(.5,1,.5)]; right columns [(.5,0,0),(.75,0,0),(1,0,0)], [(.5,1,.5),(.75,1,.75),(1,1,1)]; S_L, S_R match S(s/2,v), S(.5+s/2,v) to 5.6e-17; S_L(.5,.5)=(.25,.5,.125). Shared row: last of left = first of right.

Checks: `npx vitest run src/learning` 53 files, 912 tests pass; `npx tsc --noEmit --pretty false` clean (logs `.command-logs/t12-b-vitest.log`, `-tsc.log`).
