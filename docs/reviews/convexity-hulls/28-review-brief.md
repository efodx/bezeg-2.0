# Review brief 28-29 (handoff-v12), geometry handler 54, 2026-11-05

- **Role:** `bezeg-reviewer`, read-only. Do not edit, commit, push or delegate. Worktree `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-geometry`.
- **Diff:** `git show HEAD -- src tests` (commit "lesson A6"; summarise by file first with `--stat`, then read by file).
- **Concern:** engineering, and scene/action correctness of lesson A6. Prose quality is out of scope (one-shot lesson text). Review only:
  1. `set-trace-step` in `BezierHullsGraph.applyPointSetAction`: pauses playback, clamps, `'end'`, no graph-field mirror of state, board updates after the scene write; a lesson scene's action sequence works synchronously.
  2. Scene actions in `bezierHullsScene`: does every scene set everything it depends on, so Back and a jump to any step give the same picture? The overlays at each step match spec A6 and task 28.
  3. Every stated rule or count in the text is true of the kernel (`src/compgeo/curvePairSubdivision.ts`, ADR 0036): 2 of 4; 8 of 256, 32 tested, 24 discarded; twin 2 of 256; near miss 1 of 256, depth 5 keeps 0; "the crossings are shared piece endpoints from depth 2"; "hulls that touch count as overlapping"; separation is certified with a margin, in doubles, not exactly. Acceptance 4–6 of spec A6 in `docs/specs/convexity-hulls-lessons.md`.
  4. Non-vacuity: do the tests in `compgeoBezierHullsLesson.test.ts` and `BezierHullsLessonActions.host.test.tsx` read rendered readouts, or do they compare constants with themselves? Is any assertion unable to fail?
  5. Chapter ownership: `guidedLessonOwnership.ts`, `convexityChapterRegistry.ts`: existing ids and anchors unchanged. `tests/guided-lessons.smoke.spec.cjs` row.
- **Return:** ≤180 words. Findings with `file:line`, severity, expected behaviour; say "no blocker" if so. No praise, no restating the diff.
- **Budget:** about 20 turns, read at most ~150 lines per call, full detail if needed in `docs/reviews/convexity-hulls/28-review.md` is not possible for a read-only role: keep it in the return.
