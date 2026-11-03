# Brief (handoff-v12): sweep S3 task 25, Fortune lesson C5

- **Role:** implementation, edit permission in the stream worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry` (branch `stream-geometry`; task 24 registration is committed at HEAD). Do not commit, push, or delegate. Preserve the untracked files under `docs/reviews/`. Your files:
  - `src/learning/content/compgeoGuidedLessons.ts` (one new lesson);
  - `FortuneGraph.tsx` and its run/controls modules, only for lesson actions;
  - `src/learning/chapter/guidedLessonOwnership.ts` (interim owner entry, the same one tasks 19 and 20 used before task 21 moved them; see `git log --stat --grep "sweep task 19"`);
  - `src/demonstrations.ts` (drop `lesson: false` for `fortune`);
  - the lesson count tests (`lessonCatalog.test.ts`, preview-copy counts and copy, `lessonMathNotation.test.ts` counts);
  - the smoke `LESSONS` list in `tests/guided-lessons.smoke.spec.cjs`;
  - locale files and new tests.
- **Goal:** all of [task 25](../../tasks/sweep-algorithms/25-fortune-lesson.md); its numbered items are the acceptance. Read these first, by line range:
  - task 25, whole;
  - spec C5, `docs/specs/sweep-algorithms-lessons.md` lines 113–125 (steps 1–7, default example, exactness, acceptance 1–6), then the testing decisions and the C-criteria (locate with `grep -n "C-1\|Testing decisions"`);
  - [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31).
- **Template:** the C4 lesson `monotone-triangulation` in `compgeoGuidedLessons.ts` and its host test `src/graphs/compgeo/MonotoneTriangulationLessonActions.host.test.tsx` (or the C3 one); copy that pattern. Find every place C4 touched with `git log --stat --grep "sweep task 20"`; the count tests move on every lesson. For the T3 Voronoi lessons' `view` handling, see `VoronoiGraph` and its lesson test.
- **Mathematics:** every quoted value is read from the graph readout or the kernel (`src/compgeo/sweep/fortune.ts`) at that step, in a test:
  - the event order A, B, C, D;
  - the cancelled event: centre \((0,0)\), \(R=5\), \(y=-5\), D inside because \(3<5\);
  - the true events at \(1-\frac{\sqrt{65}}2\), tie broken by \(x\);
  - the vertices \((\mp\frac12,1)\);
  - 2 vertices, 1 finite edge, 4 rays;
  - \(2n-2-h=2\) and \(3n-3-h=5\).
  Step 7's claim that the result equals the Delaunay dual is checked with the kernel's `VoronoiDiagram` equality against the Delaunay-dual value. If a readout differs from the spec, stop and report; do not change the text or the kernel to match.
- **Item 2:** for every scene `view`, assert in the lesson test that each "continues" marker of the drawing lies inside the visible board, with the follow box's pixel inset, on a 1280×720 board. Copy the existing marker-inside assertions in `FortuneGraph.host.test.tsx` and `VoronoiGraph.host.test.tsx`.
- **Text:** one-shot Slovenian and English, terms from the spec's term table and the existing `fortune_*` locale keys (`obalna črta`, `pometalna premica`, `lažni alarm`). Say that the beach line is drawn approximately while the output is exact. Wrap formulas per the AGENTS.md lesson-prose rules; `lessonMathNotation.test.ts` must pass unweakened. Localization per AGENTS.md: typed keys, `sl.ts`/`en.ts` in lockstep, no `any` or casts. Edit locale and content files with Edit only, never `sed -i` or heredocs.
- **Lesson runtime:** actions run synchronously in one tick; unit-test multi-action frames in one synchronous sequence. Playback is stopped by default, with no autoplay. Back and a scene change pause playback and leave no pending callback.
- **Tests:** observe each new assertion fail under a deliberate mutation, revert, and verify the restore with `git diff`. A unit failure tied to `import.meta.glob` may be a stale Vitest cache: clear `node_modules/.vite/vitest` and `node_modules/.vitest-cache` and rerun.
- **Checks:**
  - `npx tsc --noEmit --pretty false`;
  - `npx eslint` on the touched files;
  - `just unit src/learning src/graphs/compgeo src/localization src/demonstrations.test.ts src/Routes.test.tsx`;
  - full `just unit` once;
  - `just build`.
  Run heavy commands one at a time, with output in `docs/reviews/sweep-algorithms/25-*.log`; read only the summary lines and failures. Do not run smoke; the handler does.
- **Return (≤350 words):** files changed; how items 1–3 are met; the step list with the readout values quoted at each step; check results with counts; mutation evidence; anything left open, flagged `file:line`.
- **Budget:** locate with `grep -n` first; read ≤150 lines per call, never a whole file over 300 lines. On `HANDOFF`, or past about 35 turns, stop at a consistent point, write `docs/reviews/sweep-algorithms/25-handoff.md` (state, remaining steps, files touched, checks run), and return partial.
