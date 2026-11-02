# 16 — Delaunay lesson B3 (T2, F3)

Status: 16a (item 1) accepted 2026-11-02 (handler 32, `a41d0ff6`); 16b (items 2–3, with 17b) in progress. Task file written 2026-11-02 by geometry handler 25. Source: spec [B3](../../specs/triangulation-voronoi-lessons.md#b3-delaunay-triangulation-and-lawson-flips-showpiece) (goal, examples, steps, acceptance 2–4, 6), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions, readouts and the cited fact, not prose. Depends on 13, 14 and 15. Templates: [09](09-ear-clipping-lesson.md) (`algorithm-trace`, `set-trace-step`), 15 (triangulation actions).

1. **Actions:** `DelaunayGraph` registers `algorithm-trace` (`next-step`, `reset`, `play`, `pause`, `replay`) through its button transitions, and handles `set-trace-step` (as `EarClippingGraph` does) and `{operation: 'select-triangle', triangle: number | null}` for the circle overlay.
2. **Lesson** B3 (`delaunay`); remove `lesson: false`. The spec's seven steps:
   1. Quad \(a=(0,0)\), \(b=(4,0)\), \(c=(5,3)\), \(d=(0,2)\) with diagonal \(ac\).
   2. Predict whether \(d\) is inside the circle through \(a,b,c\) (values hidden).
   3. The circle, centre \((2,\tfrac73)\), \(r^2=\tfrac{85}{9}\), determinant \(+64\).
   4. Flip to \(bd\): both tests \(-64\), minimum \(19{,}65^\circ\to26{,}57^\circ\), both angle vectors.
   5. The seven points of B2 in T0 with the illegal edges \(p_1p_4\), \(p_2p_4\), \(p_4p_6\) marked.
   6. Next step through the three flips; minimum \(1{,}91^\circ\to25{,}35^\circ\).
   7. Free exploration (drag; the trace is recomputed), with the unit square as the cocircular case (determinant \(0\), both diagonals legal, not unique).

   State as a cited fact that an illegal edge always has a convex quadrilateral (de Berg et al., *Computational Geometry*, chapter 9), so a Lawson flip never fails (acceptance 4). Stopped by default; never auto-plays. B2's step 6 (15) gains its forward link to B3 in this slice.
3. **Tests:** frames in one synchronous sequence; the quoted numbers equal the readouts at their steps; `set-trace-step 'end'` equals Next until done; `next-step` ×k equals Next ×k; Back and a scene change pause playback and leave no scheduler callback. A mutation failure per new assertion.

Checks: as 15, with `just smoke-lesson delaunay` and a keyboard-only run of the lesson (the spec's smoke asks for keyboard-only B3).

## Evidence (handler 32, 2026-11-02): 16a, the actions

- Sonnet `bezeg-worker` under `docs/reviews/triangulation-voronoi/16a-brief.md`. `DelaunayGraph` registers the trace commands through `registerTraceCommands`, handles `set-trace-step` through the shared `requestedTraceStep`, and handles the new `point-set` `select-triangle` (out of range throws). Other graphs reject `select-triangle`.
- 15a operations on Delaunay act as the panel does: `set-triangulation` / `set-points` replace the start, step 0, paused; `flip-edge` flips the shown triangulation and makes it the new start; `select-edge` only selects.
- Tests: `DelaunayLessonActions.host.test.tsx` (12) and a catalog shape test. Seven mutations each failed at least one test (`16a-*.log`).
- Reachability: every B3 number is a readout except the circle centre \((2,\tfrac73)\), \(r^2=\tfrac{85}{9}\) and the names of the three illegal edges (count only). Handler decision: no graph feature; 16b quotes them as a calculation and asserts them against the kernel. Panel names are 1-based, so the spec's \(p_1p_4,p_2p_4,p_4p_6\) are \(P_2P_5,P_3P_5,P_5P_7\).
- Checks: tsc, eslint, `just unit src/graphs/compgeo src/learning/runtime` (worker); focused rerun and tsc (handler, `16a-h-unit.log`).
