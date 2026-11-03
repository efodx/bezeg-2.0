# 22 — Lesson A5 degenerate cases and robustness (Batch 2, F3)

Status: planned 2026-11-03 (geometry handler 48). Source: spec [A5](../../specs/convexity-hulls-lessons.md#a5-degenerate-cases-and-robustness) (goal, prerequisite A4, steps 1–7, acceptance 1–5), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3. Depends on 20; run it after 21, because both edit the shared lesson catalog. Template: [14](14-lesson-convex-hull.md).

1. **Actions.** `HullRobustnessGraph` registers `set-mode` (`chain` or `kettner`), `set-pop-rule`, `set-duplicates` and `select-cell` (integers \(0\le i,j<64\)), and inherits the `algorithm-trace` actions from the hull graph. Every edit pauses playback and resets to step 0.
2. **Lesson.** Add lesson A5 on `hull-robustness` and remove `lesson: false`. Its steps:
   1. three collinear points;
   2. predict the rule;
   3. the chain with `<=` and then `<` on sample 1: \((2,0)\) on the hull edge is dropped, then kept (task 17's corrected outputs; with `<`, three collinear points put the middle one on both chains, which step 1 can show);
   4. a duplicate point;
   5. the Kettner map in inexact mode at \(i=41,j=48\), labelled inexact;
   6. the same cell computed exactly, and why grid points avoid the failure (ADR 0021's bound in one sentence);
   7. free exploration.

   The text says what these inputs show, not that doubles always fail. Its prerequisite link goes to `convex-hull`.
3. **Tests:** as 21. Also, the counts \(112\) and \(2052\) and the values at \((41,48)\) equal the readout, and every frame that shows a double value carries the inexact label in both languages.

Checks: as 21, with `just smoke-lesson hull-robustness`.
