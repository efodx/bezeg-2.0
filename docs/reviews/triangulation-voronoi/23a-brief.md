# Brief (handoff-v12): T3 task 23a, `set-mode` action and lesson B5 (`voronoi-degenerate`)

Written 2026-11-03 by geometry handler 39. Part a of two: **23a** writes the action, the lesson and the registration edits with the tests needed to keep the suite green. **23b** (a later worker) adds the dedicated lesson test file, the mutations and the smoke row. The split follows handoff 38: a lesson worker ran out at 135k with half of 22 done.

- **Role:** implementation in your own worktree, branched from `master` after T3 22 was pushed. Do not commit, push or delegate. Pass `--no-fsModuleCache` to every Vitest run. If a preview test reports a missing image `src`, that is a stale Vitest cache (see `docs/commands.md`). If `just build` fails on the CSS import because `node_modules` is missing, create a junction first: `node -e "require('fs').symlinkSync('C:/Users/1337Hacker/Desktop/bezeg-2.0/node_modules','node_modules','junction')"`. Delete the junction before you return (`cmd /c rmdir node_modules`).
- **Goal:** items 1 and 2 of [task 23](../../tasks/triangulation-voronoi/23-degenerate-lesson.md). Read by line range first:
  - spec B5 at `docs/specs/triangulation-voronoi-lessons.md:128-136`, and correctness notes at `:172-181`;
  - lesson B4 (`voronoi`, the model) in `src/learning/content/compgeoGuidedLessons.ts` (grep `VORONOI_`), with `compgeoVoronoiLesson.test.ts`;
  - how 22 added `select-site`, `set-construction` and `set-query-point`: `src/learning/model.ts` (grep `VoronoiGraph only`), `lessonCatalog.ts` and `VoronoiGraph.tsx`;
  - the examples in `src/graphs/compgeo/degenerateSitesPresets.ts:12-30`.
- **Acceptance:**
  1. **Action** `{kind: 'point-set', operation: 'set-mode', mode: 'sites' | 'four-point'}`, typed in `model.ts` and checked for shape only in `lessonCatalog.ts`. Only `VoronoiGraph` and its subclass `DegenerateSitesGraph` accept it. Every other compgeo graph throws `UnsupportedLessonActionError`, and an unknown mode throws. It must do exactly what the mode control does, including what that control clears. Lesson actions run synchronously and write state with `setState`; do not mirror state in graph fields (AGENTS.md).
  2. **Lesson B5** on `voronoi-degenerate`, with the seven steps of task 23 item 2. Remove `lesson: false` from `src/demonstrations.ts`, and remove the id from the lessonless list in `lessonCatalog.test.ts`. Prerequisite links go to `delaunay` and `voronoi`. Move points with the existing point-set actions.
     - Steps 1–4 use the `near` example. P4 moves from \((1,-5)\) to \((0,-5)\) and back, which gives determinant \(-30\) and then \(0\).
     - Step 5 uses `collinear`. Step 7 names the unit square and the trapezoid \((0,0),(8,0),(9,5),(-1,5)\).
     - Invent no point. Every quoted number (determinant, vertex count, vertex degree, diagonals legal, no Delaunay triangles for collinear sites) must equal the panel readout or the kernel at that step. Record each one in your return table.
     - If a spec value disagrees with the readout or the kernel, stop and report. Do not change either.
  3. **No spoiler:** in step 2 the panel shows no vertex count before the prediction. Find how B4 hides it in steps 1–2 (the `diagram` overlay, `VoronoiControls.tsx`) and do the same.
  4. **Convention** (step 6): a diagonal is legal when `incircle <= 0`, so cocircular sites leave both diagonals legal. The snapped grid is what makes "exactly on the circle" reachable. State the correctness notes: four cocircular sites give a degree-4 vertex and a dual that is not a triangulation, and Delaunay is unique only when no four points are cocircular.
  5. **Forward links:** B4's last step and the `voronoi` chapter section may now mention B5. That is optional: task 24b owns the chapter section, so do not add a `voronoi-degenerate` chapter section or ownership entry. Do not edit `triangulationChapter*.ts`. If the "unreleased lessons are not advertised" test in `triangulationChapter.test.ts` fails because the lesson now exists, report it and do not weaken it.
  6. **Registration edits** that keep the suite green: preview copy (`guidedExamplePreviewCopy.ts` and its count test) and lesson counts. Check `CHAPTER_LINK_PENDING`: `voronoi-degenerate` stays there until 24b. Recompute counts from the current files and do not guess.
  7. **One-shot bilingual text.** Prose wraps every symbol in `\(...\)` (doubled backslashes in TS) and uses `{,}` for decimal commas. `lessonMathNotation.test.ts` must pass unchanged. Keep `sl.ts`/`en.ts` in lockstep if you add keys.
  8. **Lint traps:** write regex escapes such as `\b` with the Edit or Write tool, not through a Python or shell string. A worker's `/\b7\b/` became literal backspace characters that way and failed lint.
- **Tests (23a only):**
  - the action's acceptance and rejection, with observed mutation failures, in the existing Voronoi or degenerate host tests;
  - one minimal frame walk proving the lesson validates and runs in one synchronous sequence.

  The full lesson test file is 23b's.
- **Checks (worker):** `npx tsc --noEmit --pretty false`, `npx eslint` on the touched files, `just unit src/learning src/graphs/compgeo src/compgeo --no-fsModuleCache`, then `just build`. Run heavy commands one at a time. Do not run the full suite or smoke; the handler does. Logs go to `docs/reviews/triangulation-voronoi/23a-*.log` in your worktree.
- **Return (≤300 words):**
  - worktree path and branch, and the files changed;
  - a table of step → quoted value → readout or kernel source;
  - check results and mutation evidence;
  - disagreements with the spec, and what 23b must test.
- **Budget:** locate with `grep -n` first. Read at most 150 lines per call, and never a whole file over 300 lines. Send command output to logs. On `HANDOFF` or past about 35 turns, stop at a consistent point, write `docs/reviews/triangulation-voronoi/23a-handoff.md`, and return partial.
