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

## Owner answers, applied

1. Sentence case approved: 12 demonstration titles in sl.ts (`cb6978ca`), with the linear-maps lesson quotes of
   »Afine transformacije«. `just check-changed` (full unit suite, typecheck, lint, build) passed.
2. Stray triangle-solver copy: deletion approved and done.
3. Cavalieri lead dismissed: step 2 says the graph is back at Strižba 0 and asks the learner to set −1,5 and 3.

The bug-only stream is complete. Any remaining crawl findings are UX and belong to the lesson-card-layout stream.
