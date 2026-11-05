# 28 — Lesson A6 scene, wiring and chapter section (Batch 3, F3 and F4)

Status: accepted 2026-11-05 (handler 54; handler repairs after reading the pictures: the doubled-grid twin in step 5, step 4 and step 6 observations, the graph help text). Planned by handler 52. Source: spec [A6](../../specs/convexity-hulls-lessons.md#a6-back-to-bézier-hulls-of-control-polygons) (goal, steps 1–7, acceptance 4–6), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3 and F4; the review covers scene actions, readouts and stated rules, not prose. Depends on 27. Templates: [22](22-lesson-hull-robustness.md), [23](23-batch2-chapter.md). A lesson cannot open without its chapter section, so the section is part of this slice.

1. **Actions.** `BezierHullsGraph` inherits `set-points`, `set-overlay` and the `algorithm-trace` commands, and adds `set-trace-step` as `HullTraceGraph` does. `set-points` validates through the graph's limits and returns to step 0. Other graphs reject what they do not own.
2. **Lesson A6** on `bezier-hulls` in `compgeoGuidedLessons.ts` (remove `lesson: false`), prerequisite links to `convex-hull` and to the Bézier chapter's `geometric-properties` section. Spec step 1 names `curve-visibility: convex-hull`; this graph is a point-set graph, so the same picture comes from `set-overlay hull`.
   1. The crossing pair with the `hull` overlay: each curve lies inside its control hull.
   2. Step 1 of the trace (`split`): each curve's two smaller hulls lie inside the first.
   3. Predict which piece pairs can meet, on the same `split` step, whose readout shows no verdict yet.
   4. Step 2 (`discard`): two of four pairs are discarded because their hulls are disjoint, certified with a safety margin.
   5. The last step: depth 4, \(8\) of \(256\) pairs remain. Say why eight: both crossings sit at \(t=\tfrac14\) and \(t=\tfrac34\), which are shared piece endpoints from depth 2, so four pairs touch each crossing. Moving a curve by half a unit (the inside-pieces pair of task 24) leaves two pairs, one per crossing.
   6. The caveat, on the near-miss pair of task 24 at depth 4: one pair remains, yet the curves do not meet. The gap is about \(0{,}01\), and one more halving would discard the pair, but the recursion stops at a fixed depth. Overlap is necessary, not sufficient. Remaining pairs say "look closer", not "here is an intersection".
   7. Free exploration.
3. **Chapter section.** `bezier-hulls` in `convexityChapter.ts`, after A5, owning the lesson through `chapterOwnedLessons`, with short bridging prose and a link to the Demonstration. Existing section ids and anchors stay unchanged.

Keep this slice to the scene and the wiring. **The lesson's tests and gates are task 29.** Before returning, confirm tsc passes and the lesson opens in `just smoke-lesson bezier-hulls`.
