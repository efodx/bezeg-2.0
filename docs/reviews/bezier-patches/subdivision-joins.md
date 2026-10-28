# Task 10 evidence: subdivision, elevation and joins

Evidence for [task 10](../../tasks/bezier-patches/10-subdivision-joins.md). Handler 17. Slices: 10M pure model (this section first, math review before controls), 10S `patch-subdivision` (two slices), 10J `patch-joins` (two slices), 10T teapot capstone.

## Mathematical model (10M)

Notation: a tensor patch `S(u, v) = Σ_i Σ_j P_ij B_i^m(u) B_j^n(v)` on `[0, 1]²`, net row `i` is the `u` index (`TensorProductBezierPatch`, `net[i][j]`). `D` is the diagonal of the bounding box of every control point involved; tolerances are relative, `tol · D` with default `tol = 1e-9`, so classifications are scale invariant.

### Subdivision

Splitting in `u` at `u₀ ∈ (0, 1)` runs de Casteljau on every column `j` (`TensorProductBezierPatch.subdivide("u", u₀)`). The pieces keep the bi-degree `(m, n)` and satisfy, for `s, v ∈ [0, 1]`:

- `S_L(s, v) = S(u₀ s, v)`, `S_R(s, v) = S(u₀ + (1 − u₀) s, v)`.
- Inverse map for a displayed original parameter `u`: piece `L` with `s = u / u₀` when `u ≤ u₀`, else piece `R` with `s = (u − u₀)/(1 − u₀)`. At `u = u₀` both pieces give the same point; the model reports `L` with `s = 1`.
- Shared boundary: the last row of `L` equals the first row of `R` (both are the column de Casteljau results), and `S_L(1, v) = S_R(0, v) = S(u₀, v)`.
- Chain rule: `∂_s S_L(1, v) = u₀ S_u(u₀, v)` and `∂_s S_R(0, v) = (1 − u₀) S_u(u₀, v)`. As two unit-domain patches the pieces therefore form a join with constant ratio `α = (1 − u₀)/u₀` (see joins): C1 exactly when `u₀ = 1/2` (or where `S_u(u₀, ·) ≡ 0`), otherwise G1 without C1 wherever `S_u(u₀, v) ≠ 0`.

Splitting in `v` is the same with rows and `v`. The route accepts `u₀` in `[0.05, 0.95]`; the kernel's extrapolation outside `[0, 1]` is not exposed.

### Degree elevation

Elevating in `u` (`m < 4`) gives `P'_ij = (i/(m+1)) P_{i−1,j} + (1 − i/(m+1)) P_ij`, `i = 0..m+1` (terms with an out-of-range index vanish); in `v` likewise per row. The surface is identical: `S'(u, v) = S(u, v)` for every `(u, v)`, corners and boundary curves unchanged. At degree 4 elevation in that direction is unavailable (the route's maximum).

### Joins

Two patches `A` (net `P`, bi-degree `(m_A, n_A)`) and `B` (net `Q`, `(m_B, n_B)`).

- **Orientation (fixed).** `A`'s boundary `u = 1` (row `P_{m_A,·}`) meets `B`'s boundary `u = 0` (row `Q_{0,·}`), both traversed by the same `v` in the same direction. Each patch keeps its own unit `u` domain; the composite parameter is `t ∈ [0, 2]` with `A` on `[0, 1]` and `B` on `[1, 2]`. Other edge pairings are not offered by the route.
- **Degree matching.** The net conditions compare boundary rows, which needs `n_A = n_B`. If they differ, the lower one is elevated in `v` until both equal `n = max(n_A, n_B)`; this changes the displayed net but not the surface. All conditions below are on the matched pair.
- **Cross-boundary derivatives.** With `d^A_j = m_A (P_{m_A,j} − P_{m_A−1,j})` and `d^B_j = m_B (Q_{1,j} − Q_{0,j})`: `S_{A,u}(1, v) = Σ_j d^A_j B_j^n(v)` and `S_{B,u}(0, v) = Σ_j d^B_j B_j^n(v)`.
- **C0** ⇔ `P_{m_A,j} = Q_{0,j}` for every `j` (Bernstein basis linear independence makes the row condition necessary as well as sufficient).
- **C1** (parametric, in `t`) ⇔ C0 and `d^B_j = d^A_j` for every `j`.
- **G1 with constant ratio** ⇔ C0 and `d^B_j = α d^A_j` for every `j` with one `α > 0`. Then `S_{B,u}(0, v) = α S_{A,u}(1, v)`: tangent planes agree along the boundary wherever the normal is defined, but cross-boundary derivatives match only when `α = 1`. This is a sufficient G1 condition, not the general one (general G1 allows `α(v) > 0` and an added multiple of `S_v`); the route says "G1 (constant ratio)" and never describes tangent-plane agreement as matching derivatives.
- **Enforcement in the route.** `A` is free. Continuity mode `none | C0 | C1 | G1`:
  - C0 sets `Q_{0,j} := P_{m_A,j}`;
  - C1 additionally sets `Q_{1,j} := Q_{0,j} + (m_A/m_B)(P_{m_A,j} − P_{m_A−1,j})`;
  - G1 sets `Q_{1,j} := Q_{0,j} + α (m_A/m_B)(P_{m_A,j} − P_{m_A−1,j})` with `α > 0` from a control (route range `[0.25, 4]`; `α = 1` coincides with C1 and the route says so).

  Constrained `B` rows are derived, recomputed after every edit of `A`, every degree change and every mode change, and are not independently editable.
- **Classification of the displayed pair** (used for the report and in tests, never just echoed from the mode):
  - `c0`: `max_j |P_{m_A,j} − Q_{0,j}| ≤ tol · D`.
  - `c1`: `c0` and `max_j |d^B_j − d^A_j| ≤ tol · D`.
  - Best constant ratio `α* = Σ_j ⟨d^B_j, d^A_j⟩ / Σ_j |d^A_j|²` with residual `max_j |d^B_j − α* d^A_j|`; `g1` (constant ratio) is `c0`, `α* > 0` and residual `≤ tol · max_j max(|d^B_j|, α* |d^A_j|)` — relative to the derivative size, so a direction error is judged as an angle, not against `D`. When `Σ_j |d^A_j|² ≤ (tol · D)²` the ratio is reported as undefined (degenerate `A` boundary derivative), not as G1. When both `max_j |d^A_j|` and `max_j |d^B_j|` are `≤ tol · D` the report sets `derivativesVanish`: `c1` holds (the parametric derivatives match) but there is no tangent plane along the boundary, and the route must say so rather than show "C1 yes, G1 no" bare.
  - Sampled checks on the actual pair at `v_k = k/K` (`K = 16`): positional gap `max_k |S_A(1, v_k) − S_B(0, v_k)|`, derivative mismatch `max_k |S_{B,u}(0, v_k) − S_{A,u}(1, v_k)|`, and the largest angle between unit normals where both are defined (tangent-plane agreement), with the count of samples where a normal is undefined.

Normals in the sampled checks use each patch's own degeneracy scale (`tensorDifferentials`), while the net conditions use the joint `D`; the two can disagree only within the tolerance band. `enforceJoin(a, b, "none")` returns `B` elevated in `v` when `n_A > n_B`; the route does not store that net in `none` mode (degrees stay independent there). `locateInPieces` expects in-domain `u, v ∈ [0, 1]`.

Required independent checks (tests): piece maps against the original at random samples for both directions and several `u₀`; elevation invariance at random samples for both directions and all degrees below 4; net classification agrees with sampled derivatives on enforced C0, C1 and G1 (`α ≠ 1`) pairs and on non-C1 counterexamples (C0 only; G1 `α = 2`; perturbed second row; unequal `v` degrees matched by elevation); subdivision pieces classified as G1 with `α* = (1 − u₀)/u₀` and C1 at `u₀ = 1/2`; degenerate `A` derivative reports undefined ratio. A mutation of each net condition must fail a test.

## 10M implementation and math review

- Implementation (Sonnet high worker, [brief](t10m-brief.md), 21 tool uses, ~62k tokens): `src/graphs/patches/tensorSubdivision.ts`, `tensorJoins.ts` + tests (35). Every net condition, `α*`, degree-matching direction, inverse piece map and the elevation kernel have an observed mutation failure (`.command-logs/t10m-mutations.log`).
- Math review (Sonnet medium, read-only, 7 tool uses): no high. Verified piece maps, inverse map, `α = (1 − u₀)/u₀`, elevation, orientation, C0/C1/constant-ratio G1 necessity and sufficiency incl. `m_A/m_B`, `α*`, enforcement, test independence.
  - M1 G1 residual was absolute (`tol · D`), so a tiny `d^A` with a 1e-3 rad turn classified as G1 → fixed (handler): relative threshold; test "judges G1 relative to the derivative size" observed failing with the absolute threshold.
  - M2 both derivatives vanishing reported `c1` true, `g1` false with nothing to explain it → fixed: `derivativesVanish` flag, doc wording, non-collapsed both-zero test.
  - L3 normal vs join tolerance scales; L4 `none` elevation; L5 in-domain inverse map → documented above; L4 also bound into the 10J brief. L6 unbounded `α` accepted (route clamps) → no change.
- Model accepted for controls. 37 tests pass.

## Route cores and wiring (handlers 17–18)

| Commit | Content | Evidence |
|---|---|---|
| `515d82a` | Route cores 10S-1/10J-1 ([brief](t10sj-core-brief.md)): `TensorSubdivision{Graph,Scene}`, `TensorJoin{Graph,Scene}`, optional route fields on `TensorPatchGraphState`, `settleNet` hook and `netWithDegree` | 35 + 38 tests; mutations observed (10J-1 15/16, one equivalent mutant); `just check` 4605 |
| `1b15888` | `patch-subdivision` route ([brief](t10w-brief.md), [handoff](t10ws-handoff.md)); recipes and smoke catalog accept a declared 0 control points for this route | 13 mutations; poster by selective recapture; built smoke 119/0; `just check` 4670 |
| `3c38f9c` | `patch-joins` route ([handoff](t10wj-handoff.md)); starting scenes C1, G1 α = 2, C0 kink; `Slider` `disabled`; `framedPoints` hook | 39 panel tests, 8 mutations; poster recaptured; built smoke 120/0; `just check` 4719 |
| `d3a44fc` | Review repairs: [math review](t10-math-review.md) M1 (`c0-planes` report case, `COINCIDENT_PLANES_ANGLE = 1e-6`), L1, L3; [engineering review](t10-engineering-review.md) medium (subdivision point editor locked), α `aria-describedby`, no setState in render | 6 mutations; `just check` 4723 |
| `6d8d48b` | Capabilities, UI-functionality and architecture docs | master CI green at `b0a9cd2` |

- Reviews: math 0 high / 1 medium / 4 low (L2, L4 accepted as is); engineering+UI 0 high / 1 medium / 5 low. Accepted lows: `checkState` for all collections (consistent with `decasteljauOrder`/`showTwist`); derived `B` points look draggable but a drag is refused without a message.
- Smoke (`bezeg-smoke` Sonnet medium, WebGL2/SwiftShader, 1366×768 and 390×844): all selected checks pass on both routes, no console errors. Gaps: joins Preset export/import, `none`/`C0` on a non-C1 scene, touch. Switching the default C1 pair to none/C0 keeps its free rows, so the measured report stays C1 (expected).
- Carried to task 13: `patch-subdivision.png` sits slightly right of centre; `patch-joins.png` has overlapping `S(u,v)`/`S_{B,u}` labels; motion clips of all six patch routes.

## 10T capstone integration (handler 19)

- Starting master CI was confirmed successful for `6d8d48b` ([run 40782455112](https://github.com/efodx/bezeg-2.0/actions/runs/40782455112)) and `b0a9cd2` ([run 40782559388](https://github.com/efodx/bezeg-2.0/actions/runs/40782559388)). Interrupted implementation was recovered from the worktree rather than discarded.
- Decision: a read-only `joinCapstone: "teapot"` scene/Presets on `patch-joins` reuses camera, export and lifecycle ownership. A separate route was unnecessary; the existing editable two-patch model cannot represent 32 owners. The default joined pair and route remain unchanged, and Reset returns to that pair. The additive discriminator is validated; legacy files remain supported.
- The production asset retains the pinned raw z-up data (`blinn: true`, `fitLid: false`, no display transform), Newell/SPD attribution and complete MIT notice beside it. Literal parity with the reviewed prototype is exact. Slovenian uses the descriptive name *čajnik iz Utaha*; see [asset handoff](t10ta-handoff.md).
- The scene has 32 sequential patch-owner blocks, 2,592 vertices and 4,032 nondegenerate triangles at tiling 8 (64 collapsed cusp triangles removed). It offers shading/boundary switches and camera controls, with no net, points, inset or extra default surface. Tiling 16 remains unavailable pending stress acceptance. Exact control boundaries form 52 two-edge groups and two four-edge cusp groups; 16 edges are unshared. All 64 pair relations agree within `1e-12` in both sampled boundary curves and actual mesh positions.
- Commit `b43fdb6` closes task 07's camera-orbit resampling item: camera-only changes reuse scene geometry when revision, selection and all other state fields are unchanged. View creation/disposal, redraw and scene replacement invalidate the cache. Five focused tests and two deliberate mutations cover reuse and rebuilding; see [cache handoff](t10tb-handoff.md).
- [Mathematical review](t10t-math-review.md) and [engineering/UI review](t10t-engineering-review.md) found two coverage gaps, both closed by [test-only repairs](t10t-review-repairs.md): direct mesh seams and saved-Preset restore/Reset from an active capstone. Deliberate mesh-only and discriminator mutations failed the new assertions. The restored focused suite passed 74 tests; the original asset slice passed 149 tests with six observed mutations. No mathematical implementation change was needed after review.
- [Orbit measurements](t10t-orbit-measurement.md) on the integrated production build at 1440×1000 and 390×844 pass ADR 0018: pointer-to-next-rAF p95 3.5–6.4 ms, active rAF interval p95 16.7–16.8 ms. These are scheduling/active-frame proxies, not presentation latency or CPU render time. The same integrated teapot with the exact pre-cache base class in a scratch build missed the pointer target (19.9/18.7 ms); with reuse the corresponding values were 3.8/3.5 ms. Each case is one 36-move gesture, without a statistical speedup claim. The scratch browser/preview were closed; live sources were unchanged.
- Final source is committed as `4064ae8` (following `b43fdb6`). `just check` passed 234 files / 4,735 tests plus TypeScript, ESLint and production build; logs `.command-logs/2026-10-28T23-15-16-802Z-38080-6a4ed110.log` and `.command-logs/2026-10-28T23-19-19-374Z-38080-1128f4be.log`. The required `tests/demonstrations.smoke.spec.cjs` passed all 59 tests against that same source/build; log `.command-logs/2026-10-28T23-19-38-890Z-38084-68568d47.log`. No preview manifest was edited or fabricated.
- [Browser smoke](t10t-smoke.md) confirms rendered capstone, keyboard orbit and resize, then actual SVG/PNG downloads, Preset JSON export/import with the camera, and Reset to the default pair. The SVG uses the accepted embedded raster; the PNG contains 13,053 non-background pixels. No page errors were captured. Browser-only boundary/shading toggles, narrow touch, invalid-file rejection, navigation/remount and old-curve baseline were not exercised in this bounded run; preserve those explicit limits for task 14. All worker browsers were closed.
- The authored portrait-fit camera leaves substantial desktop margin for the teapot too; include it in task 13's existing fresh-view framing decision.
