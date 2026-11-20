# Lesson bug crawl — handler handoff 4 (2026-11-20)

Setup: [handler-handoff-1.md](handler-handoff-1.md); findings: [triage.md](triage.md); previous: [handler-handoff-3.md](handler-handoff-3.md).
UX work (triage sections 1, 3, 5, 6, 7) belongs to the Fable stream, now `lesson-card-layout handler 2` (worktree
`lesson-card-layout`, nothing pushed yet). Stay off its files as listed in handoff 3.

## Done by handler 4

- Handoff 3's Next 2 (scheduled lessons-2 smoke failure on the parameterization lessons) needed no change: the
  scheduled run (11:41Z) predates `53441b5f`, which reads the sample count from the new CountSetter; lessons-2 passed in
  the next push run (44775746868), whose only failure was the lint since repaired by handler 3.
- Smoke (Haiku `bezeg-smoke`, production preview :4398): all four fixed areas PASS with no page errors. Bézier
  decrease ×2 / increase / decrease after the control-points lesson; LLN step 2 axis reads 10, 100 with no exponent or
  negative tick; »Subdiviziraj« text matches its button; the Farin text names Prikaz and the switch is there;
  intersections step 2 shows no English. Gaps: the same-line state of intersections step 2 needs a drag (its quoted
  rows are covered by `analyticLinesIntersectGuidedLessons.test.ts`), and the overlay covered part of the LLN
  screenshot. Evidence: `.crawl-out/smoke4/` (untracked).

## Waiting on the owner

1. Title Case Slovenian demonstration titles in sl.ts (`bezier_curves`, `bernstein_polynomials`,
   `affine_transformations`, `repeated_subdivision`, `degree_elevation`, `weighted_parametrization_234`, …): change to
   sentence case? They are quoted in lesson prose, so lesson text changes with them.
2. Stray `.crawl-out/stray-old.tsx` (once untracked `src/graphs/complex/old.tsx`, never committed, a triangle-solver
   copy): the Fable handler says it is not theirs. Delete or keep?
3. Open leads not verified (triage section 4): Cavalieri step says Strižba −1,5 and 3 while the field shows 0 (maybe
   capture timing). Verify with `scripts/lesson-crawl/replay.cjs` before any fix.

The bug-only Next list is otherwise empty; a successor continues only with owner answers to the items above.
