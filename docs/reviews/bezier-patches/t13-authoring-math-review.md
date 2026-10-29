# Task 13 authoring math review

Reviewed the current task-13 diff against `78002a8`, the Bézier patches chapter/P9 spec, and the moving-iso and evaluation-example worker notes. This is a mathematical/content review, not a completion claim.

## Findings

1. **De Casteljau narration starts with the other order from the displayed default.** In `patchGuidedExamplesEvaluation.ts:43-44`, the first frame says to reduce along `u` first (its (h=3/2) intermediate is correct for that order), then the next frame says to swap and first reduce along `v` (its (h=2) intermediate is correct). But `TensorDeCasteljauGraph` defaults to `rows`, and `TensorDeCasteljauScene` documents that this order reduces each fixed-(u) row along `v` first, then reduces the row results along `u`. The authored initial scene therefore displays the (h=2) path while the opening narration explains the (h=3/2) path. Either author the opening frame for the default (v)-then-(u) order and swap to (u)-then-(v), or set the initial scene to the matching order.

2. **The affine step’s “previous net” reference is ambiguous/misleading.** `patchGuidedExamplesEvaluation.ts:63-64` follows the bilinear-saddle variation counterexample, but its affine fixture returns to the earlier (3\times3) interior-control fixture. “The previous net” can refer to the immediately preceding saddle, whose midpoint height is (0), not the (1) claimed. Say “the original (3\times3) net” or otherwise name that fixture.

## Math and evidence checked

- The moving fixed-(v) curve and controls are correct: (C_v(u)=S(u,v)), with control (Q_i(v)=\sum_j B_j^n(v)P_{ij}). The graph tests compare sampled rendered points and derived controls to Bernstein sums; the quadratic fixture distinguishes the middle control height (0.6) from curve midpoint height (0.3).
- The order-independence fixture is consistent: at (u=1/4), the (h_{11}=4) entry gives a (3/2) first-stage height; at (v=1/2), the reverse first stage gives (2), then the (u)-weight (3/8) yields (3/4) in either order. Existing scene tests check the actual staged polylines/markers.
- The saddle counterexample is valid for the narrowly stated direct intersection-count rule against the **wire control net**: the vertical line at (x=y=1/2) intersects the patch at (z=0), while perimeter net edges have (x\in\{0,1\}) or (y\in\{0,1\}). The prose correctly avoids claiming all forms of variation diminution fail. The hull volume and comparison line are not drawn; this is acknowledged in the worker note and remains a visual acceptance gap for task 13.
- The derivative fixture has (S_u=(1,0,1/2)), (S_v=(0,1,1/2)), (S_u\times S_v=(-1/2,-1/2,1)), and (S_{uv}=(0,0,1)). The new lesson test checks drawn shaft directions; existing scene tests check tangent-plane corner coplanarity and derivative/twist scene geometry. Session tests restore exact initial graph state after changed fixtures and clear the moving scheduler.

The focused notation test run during review failed only on its hard-coded demonstration inventory missing the new lesson IDs; the parent reports that inventory is now corrected and is rerunning the check. The test’s source-level double-backslash check passed.

## Handler 25 disposition

Both authoring findings were repaired locally: the first calculation explicitly starts in the u direction independently of the selected construction order; the affine reference names the original 3×3 net in both languages. No formula or evaluator changed. The handler confirmed the local copy repairs and reran the notation/evaluation suites (7 tests passed, log `2026-10-29T16-36-27-048Z-39164-be056147`). Exact construction-order preparation remains an integration gap; the three definitions stay outside the registry. The moving overlay was subsequently gated by the lesson sweep after the full suite found unrelated scene-count regressions. That gating/lifecycle repair has focused tests but still needs independent engineering confirmation and production smoke; this review predates the gating change.
