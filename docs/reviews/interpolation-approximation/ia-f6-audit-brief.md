# IA-F6 criterion audit: brief (handoff-v12)

- **Role:** read-only audit. No edits, no commits, no pushes. Do not run the test suite.
- **Goal:** family 3 never ran its F6 gate: its slices stop at the chapter IA-F4. For I1 to I5, map every acceptance criterion to the test or evidence that covers it, and name real gaps. Sources: `docs/specs/interpolation-approximation-lessons.md` lines 41 to 118 (concept contracts), 152 to 167 (testing decisions, batch gate), 169 to 178 (correctness notes, out of scope), and the decisions in `docs/tasks/interpolation-approximation/README.md`.
- **Format to follow:** `docs/reviews/advanced-bezier/ab-c-6-criterion-audit.md`: a table of criterion, test with file and line, status (`covered`, `partial`, `gap`, `browser`), then ranked gaps.
- **Code:** kernels `src/analysis/interpolation.ts`, `hermite.ts`, `leastSquares.ts`, `subdivision.ts`; graphs under `src/graphs/curves/interpolation/`, `src/graphs/curves/hermite/`, and the Runge, least-squares and subdivision graphs (locate them through `src/graphs/graphFactories.ts`); lessons `src/learning/content/interpolation*`; the rows `interp-*` of `tests/guided-lessons.smoke.spec.cjs`. Evidence: `docs/reviews/interpolation-approximation/`.
- **Read the body of each test you cite,** and say where you did not.

## Questions beyond the table

1. **Instructions against controls.** This gate's predecessor found a chapter prompt naming a control that does not exist. For each of the five chapter investigation prompts and each lesson step's instruction: does every control or action it names exist on that route, under that name, in that state? Check both languages.
2. **Honest guarantees.** Search SL and EN prose for claims the correctness notes forbid: a plot presented as proof, a grid maximum as a true maximum, Chebyshev nodes as best for every function, subdivision pictures as a proof of smoothness.
3. **Quoted numbers.** Recompute a sample of at least ten, weighted to those no test pins; say which quoted numbers are pinned only by `toContain` on short strings.
4. **Lifecycle.** Stopped-by-default playback, restore on exit, and disposal for I5's Play and any other timer.
5. **Stale rows.** Which of `IA-A-* (rest)`, `IA-B-* (rest)`, `IA-C-* (rest)` have any undone content, or are they only stale?

## Return

You cannot write files, so return the audit in your reply, at most 70 lines, with the table first; the handler files it as `docs/reviews/interpolation-approximation/ia-f6-criterion-audit.md`. Rank any gap by what a student or educator would see, with a location and the expected behaviour. Do not report style.

Budget: past about 25 turns, or on `HANDOFF`, stop and return what you have as partial.
