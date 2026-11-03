# Task 25 (Fortune lesson C5): acceptance

Accepted 2026-11-03 by geometry handler 46. Source: [task 25](../../tasks/sweep-algorithms/25-fortune-lesson.md). Brief: [25-brief.md](25-brief.md). Implemented by two `bezeg-worker` slices under handler 45: 25a (prose and actions, to its budget, [25-handoff.md](25-handoff.md)) and 25b (tests, counts and checks; it returned an empty report, and its evidence is in the `25b-*.log` files). Feature commit `a0d1a108`.

## Scope items

1. **Lesson.** Seven steps in SL and EN on `fortune`.
   - Scenes use `point-set` and `set-trace-step`. `FortuneGraph.applyPointSetAction` handles `set-trace-step` (paused, clamped, `'end'` is the last step), and `registerTraceCommands` supplies the `algorithm-trace` animation.
   - `FortuneLessonActions.host.test.tsx` reads every quoted value from the run:
     - the event order;
     - the cancelled circle \((0,0)\), \(R=5\);
     - the true events at \(1-\tfrac{\sqrt{65}}2\);
     - the vertices \((\mp\tfrac12,1)\);
     - \(2n-2-h\) and \(3n-3-h\).
   - It also checks equality with the Delaunay dual (`sameVoronoiDiagram`), and it runs the multi-action scenes in one synchronous sequence.
   - Handler 45 reviewed the prose mathematically in full and found no defects (handoff 45).
2. **Markers inside the view.** The host test asserts that the "continues" markers lie inside a 1280×720 board for every scene view. Mutation 1 (marker inset) failed this test, as intended.
3. **Interim chapter owner.** Added in `guidedLessonOwnership.ts`, as in task 19, until task 26.

## Checks

- **Worker checks** (handler 45, at `b6eb9dff` plus the diff):
  - the full unit run passed (889.7 s), and so did the build;
  - tsc and lint were clean;
  - mutations 1–4 each failed the intended test.
- **Handler 46:**
  - `just build` passed at `b7d8b470` ([25-handler-build.log](25-handler-build.log)).
  - The first `just smoke-lesson fortune` failed both rows ([25-smoke-lesson.log](25-smoke-lesson.log)). In lesson steps 5 and 6 (trace steps 5 and 7), the two beach-line breakpoints lie at about \((\pm31{,}5;\ 63)\), outside the view.
    - That is the correct geometry. The breakpoint between the arcs of B and A lies on the unbounded ray \((-\tfrac12,1)+t(-1,2)\), here at \(t\approx31\).
    - The frame shows those rays' "continues" markers instead.
    - Fix: the smoke row declares `offscreenSteps: [5, 6]`, with the reason in a comment. The lesson and the graph are unchanged.
  - The rerun passed both rows: the SL desktop walk with pointer clicks, and EN at 390×844 ([25-smoke-lesson-2.log](25-smoke-lesson-2.log)).
  - **Legibility at 1280×720 with the card hidden.** A Playwright capture hid the card on every frame, SL and EN, 17 frames each plus the completion state. It used "Skrij navodila vodenega primera" or, on frames that offer it, "Opazuj na grafu".
    - There were no page errors, and the frames were reviewed by eye.
    - The sites, labels, circles (solid with a diamond, dashed with a cross for the false alarm), the beach line and the traced edges are legible.
    - The final diagram shows the ↑, ←, → "continues" markers inside the frame insets.
    - The lower part of the board lies below the 720 px fold under the page header. This is the shared page layout, the same as on the other lesson routes; presentation mode covers projection.

## Review

The graph change is 22 lines and follows the shared trace-command pattern (`traceLessonActions`). The lesson and the host test were reviewed by handler 45. No optional `bezeg-reviewer` was run.
