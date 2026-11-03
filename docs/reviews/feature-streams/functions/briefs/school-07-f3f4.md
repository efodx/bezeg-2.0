# Brief handoff-v12: school function graphs 07 F3 + F4 (lessons S5, S6 and their chapter sections)

This brief has two sequential parts. Each worker does only the part named in its prompt.

- **Role:** implementation (`bezeg-worker`, Sonnet 5.5 `medium`). You may edit in the stream worktree `.claude/worktrees/stream-functions`. Do not commit, push, stash or delegate. You are the only editor. Preserve untracked files under `docs/reviews/feature-streams/functions/`.
- **Goal:**
  - Part A: guided lesson S5 "Geometric series and partial sums" on `geometric-series`, and a chapter section owning it.
  - Part B: guided lesson S6 "Conics: focus, directrix, eccentricity, and the Bézier bridge" on `conic-focal`, and its section.
  - Source: `docs/specs/school-function-graphs-lessons.md` §S5 / §S6 (defaults and examples with checked numbers, steps 1–7, acceptance, Correctness Notes) and `docs/tasks/school-function-graphs/07-batch-c.md` (F2a notes list the graph state and F3 obligations; F3, F4).
  - Lesson text is [one-shot](../../../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31): write it once in SL and EN after the scenes work.
  - Terms: the term table in `docs/tasks/school-function-graphs/README.md`, the `docs/localization.md` rows, and the shipped `geometric_series_*` / `conic_*` keys.
  - No poster or card capture; that is F5.
- **Precedent (on master, copy it):** the 06 Batch B lessons and sections. Find the commit with `git log --oneline --grep="06 F3"` and read `git show --stat` of it: `schoolFunctionGraphsBatchBGuidedLessons.ts` + test, `guidedLessons.ts`, `guidedLessonOwnership.ts`, `demonstrations.ts` dropping `lesson: false`, `guidedExamplePreviewCopy.ts` + count tests, `lessonMathNotation.test.ts` (register only), `lessonCatalog.test.ts`, one row in `tests/guided-lessons.smoke.spec.cjs`, and `schoolFunctionGraphsChapter.ts` with its tests.
  - Put the lessons in a new `schoolFunctionGraphsBatchCGuidedLessons.ts` (+ test).
  - The section comes after `rational-function` (Part A) or after the S5 section (Part B). Its `demonstrationIds` is the one route. It needs an investigation prompt. Widen the chapter opening/purpose text to cover the new lesson. Give ownership to the new section. Update the chapter test and recompute any quoted number.
  - If `node --test scripts/generate-guided-example-inventory.test.cjs scripts/capture-guided-example-previews.test.cjs` then needs a first-frame expectation or a capture-route pattern, extend them as the precedent did. Author the expectation from the model, not from a capture.
- **Lesson actions do not exist yet for these graphs.** Add only the names the lesson needs to the closed unions in `src/learning/model.ts` (`function-parameter`, `function-choice`, `function-visibility`), keep `sceneAction` rejecting unknown names, and wire them in the graph (see how `RationalFunctionGraph` / `PolynomialZerosGraph` implement their lesson function actions).
  - Suggested S5 names: parameters `series-a`, `series-q`, `series-n`, `series-tolerance`; choice `series-example`.
  - Suggested S6 names: parameters `conic-epsilon`, `conic-ell`, `conic-phi`, `conic-weight`; choice `conic-example`; visibility `conic-bridge`.
  - Scene values must be valid per the model ranges and rounding. An invalid scene value is a content error and is never rounded. A playing S5 scene must not start playback, since a scene is a state.
  - If a step cannot be shown with these actions, say why rather than adding graph features.
- **Content constraints:**
  - S5: the limit only for \(|q|<1\). \(q=-1\) oscillates. Write 0,3 recurring = \(3/10 \cdot 1/(1-1/10) = 1/3\) and 0,9 recurring = 1. State that a finite picture illustrates and the closed form proves.
  - S6, steps per spec: ellipse sum 10 at \(P=(0,3)\); predict then reveal \(e=0.8\); slide through \(e=1\) (parabola, both distances 2 at \(P=(1,2)\)); hyperbola difference 6; circle at \(e=0\) with no directrix; bridge quarter ellipse with \(w_1=\tfrac{\sqrt2}{2}\) and the weight classification (<1 ellipse, =1 parabola, >1 hyperbola, end weights 1); state the link to the existing rational Bézier chapter (find its route/section id and link it by the existing mechanism, if one exists for cross-chapter links; otherwise name it in text).
  - The deviation readout is the residual \(\bigl||PF|-e|Pd|\bigr|\), so do not call it a distance.
  - Matura level labels: none.
- **Rules:**
  - Lesson scene actions run synchronously in one tick (AGENTS.md).
  - Wrap every symbol in `\\(...\\)`. Use `{,}` decimal commas in SL math and `.` in EN. Keep `latex` fields undelimited.
  - Use typed `t()` with `sl.ts`/`en.ts` in lockstep, with no `any` or casts.
  - No route or stored-Preset change, except that the lesson-action wiring must not alter Preset data.
- **Checks:**
  - Write a real-graph lesson test that applies every scene of the lesson in one synchronous sequence, out of order and twice, asserting the state each scene's text states.
  - Recompute the spec's numbers independently in the test, not via the model. S5: \(S_n\) for the default, the limit 2, 1/3, 1. S6: 5, 6.25, 0.8, 10; 2/2; 7, 4.2, 13, 6; \((3.5355, 2.1213)\). Every number quoted in SL and EN must equal its scene's displayed value.
  - Report one observed failure against a deliberate mutation per new assertion kind, including `sceneAction` rejecting an unknown new name.
  - Run `just typecheck`; `just unit src/learning src/graphs/functions src/localization src/demonstrations.test.ts` with `BEZEG_MEMORY_FLOOR_GB=0.5`, logs to files; and the two `node --test` scripts above. Never run bare `npx vitest`. No browser smoke or `just build`; the handler does those.
- **Return:** ≤ 300 words: files changed, the action names added, the scene list (one line per step), check results with log paths, mutation failures, and spec contradictions or deviations as `file:line`.
- **Budget:** locate with `grep -l`/`-c` first, read ≤ 150 lines per call, and send full output to log files under `C:/Users/1337Hacker/.claude/jobs/dc88fd22/tmp/s07/`. Past ~30 turns or on `HANDOFF`, stop at a consistent point and write a handoff note to `docs/reviews/feature-streams/functions/worker-school-07-f3-<part>-handoff.md`.
