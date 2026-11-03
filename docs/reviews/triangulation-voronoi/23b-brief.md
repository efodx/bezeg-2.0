# Brief (handoff-v12): T3 task 23b, lesson B5 tests and smoke row

Written 2026-11-03 by geometry handler 40. Part b of two. 23a wrote the `set-mode` action, lesson B5 (`voronoi-degenerate`) and the registration edits; its return and step → value table are in `docs/reviews/triangulation-voronoi/23a-return.md` in the stream worktree (`C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry`).

- **Role:** implementation in 23a's worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/agent-a2db2ea2615a0587f` (branch `worktree-agent-a2db2ea2615a0587f`, uncommitted 23a work). Work only there and keep 23a's changes. Do not commit, push or delegate. Pass `--no-fsModuleCache` to every Vitest run. If a preview test reports a missing image `src`, that is a stale Vitest cache (see `docs/commands.md`). If `just build` needs `node_modules`, create the junction as in the 23a brief and delete it before you return.
- **Goal:** item 3 of [task 23](../../tasks/triangulation-voronoi/23-degenerate-lesson.md) and its smoke check. Read by line range: spec B5 acceptance at `docs/specs/triangulation-voronoi-lessons.md:128-136`; the model test `src/learning/content/compgeoVoronoiLesson.test.ts`; the `voronoi` row in `tests/guided-lessons.smoke.spec.cjs` (grep `const voronoi =`, about l.1786) and the `LESSONS` list (about l.2125).
- **Acceptance:**
  1. **New file** `src/learning/content/compgeoVoronoiDegenerateLesson.test.ts`, modelled on the Voronoi lesson test. Frames run in one synchronous sequence. It asserts:
     - the quoted determinants (\(-30\), then \(0\)) and vertex counts and degrees equal the panel readout or kernel at their steps;
     - each quoted number is present in both languages;
     - no vertex count is shown in step 2 before the prediction (spoiler hiding);
     - step 5's collinear message (no Delaunay triangles, parallel strips) appears in both languages;
     - step 6 states the convention (`incircle <= 0`, both diagonals legal when cocircular) and the correctness notes;
     - Back and a scene change (`set-mode`) restore the scene;
     - prerequisite links go to `delaunay` and `voronoi`.
  2. **One observed mutation failure per new assertion**, restored byte-identical afterwards. Example: the step 3 point off the circle by one grid step; the step 2 count left visible; one language's number removed. Log each in `23b-mut*.log`.
  3. **Smoke row:** 23a already added a `voronoi-degenerate` row (required by `lessonSmokeCoverage.test.ts`); review and extend it, following the `voronoi` row, so that it checks the readout is hidden before the prediction and shows the step 3 value after. Write regex escapes such as `\b` with the Edit or Write tool only; then run `grep -c $'\x08' tests/guided-lessons.smoke.spec.cjs` and expect `0`.
  4. 23a's interim owner entry for `voronoi-degenerate` in `guidedLessonOwnership.ts` stays; 24b replaces it. Do not touch `triangulationChapter*.ts`.
  5. Fix any defect the tests expose in 23a's code, and report it. If a spec value disagrees with the readout or kernel, stop and report; do not change either.
- **Checks (worker):** `npx tsc --noEmit --pretty false`, `npx eslint` on the touched files, `just unit src/learning src/graphs/compgeo src/compgeo --no-fsModuleCache`, `just build`, then `just smoke-lesson voronoi-degenerate` (stop any preview you started first; it uses its own server). Heavy commands one at a time; logs to `docs/reviews/triangulation-voronoi/23b-*.log` in the worktree. Do not run the full unit suite; the handler does.
- **Return (≤300 words):** files changed; each assertion → its mutation and the observed failure; check results; defects fixed in 23a's code; unverified cases.
- **Budget:** grep first; ≤150 lines per read; output to logs. On `HANDOFF` or past about 35 turns, write `docs/reviews/triangulation-voronoi/23b-handoff.md` and return partial.
