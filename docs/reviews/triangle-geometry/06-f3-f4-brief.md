# Triangle geometry 06 F3+F4 brief (maps handler 15, 2026-11-02, handoff-v12)

One `bezeg-worker` (Sonnet 5.5 `medium`) in `.claude/worktrees/stream-maps`, branch `worktree-stream-maps` (clean at `62ad3616`). Task: [06](../../tasks/triangle-geometry/06-batch-b.md). Spec: [triangle-geometry-lessons.md](../../specs/triangle-geometry-lessons.md) sections T3, Batch-wide acceptance gate, Correctness Notes. One-shot lesson text: [new-lesson-families.md](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Follow AGENTS.md (lesson prose math notation, localization lockstep, synchronous scene actions).

**Template:** 05 F3+F4, commit `96c0b2c9` (`git show --stat 96c0b2c9`): T1/T2 in `src/learning/content/triangleGeometryChapterLessons.ts`, the chapter `triangleGeometryChapter.ts`, registry `triangleGeometryChapterRegistry.ts`, tests `triangleGeometryChapter.test.ts`, preview copy `guidedExamplePreviewCopy.ts`, smoke rows in `tests/guided-lessons.smoke.spec.cjs`. F2a/F2b (graph `EulerLineGraph`, model `src/compgeo/eulerLineModel.ts`, panel, Preset collection, route `/euler-line`) are on master; see `06-f2b-brief.md`.

## Goal and acceptance

1. **Lesson T3** `eulerLineLesson`, id `euler-line-nine-point`, Demonstration `euler-line`, registered under section id `euler-line` (already mapped in `src/learning/chapter/guidedLessonOwnership.ts:74`). Seven steps per spec §T3 Steps, on the default T1 triangle \((0,0),(7,0),(2,5)\). Step 5 uses a special triangle with fewer distinct points (right \((0,0),(4,0),(0,3)\): 5 distinct; or isosceles \((0,0),(6,0),(3,5)\): 8). Step 6 is the near-equilateral \((0,0),(8,0),(4,7)\): \(H=(4,16/7)\), \(O=(4,33/14)\), \(|HO|=1/14\) against \(R\approx4{,}64286\); the prose says the line's direction is exact but visually unstable. Use the graph's examples (`eulerExample` ids) where they exist.
2. Theorems with a source, author and title only (H. S. M. Coxeter, *Introduction to Geometry*; or H. Dörrie, *100 Great Problems of Elementary Mathematics*): the Euler line, \(HG=2\,GO\), and the nine-point circle (centre \((O+H)/2\), radius \(R/2\)). Drags are called illustrations. No homothety proof idea (the board does not show it). Say "nine points, fewer distinct ones for special triangles". The equilateral case (\(H=O\), line undefined) may be mentioned; do **not** claim "a lattice triangle is never equilateral" (unsourced).
3. Exact claims only where the model decides them exactly (collinearity, \(HG^2=4GO^2\), \(|X-N|^2=R^2/4\)); decimals are display roundings.
4. **Chapter section** `euler-line` appended to `triangleGeometryChapter.ts` with `withExample`, like the two existing sections: purpose, prerequisites (T1), theorem with source, the checked default example (values from spec §T3), how to use the graph. Keep the chapter's per-language word minimum; promise no later batch (Simson, inversion).
5. **Preview copy** for the new section/lesson in `guidedExamplePreviewCopy.ts` (and its test, as `96c0b2c9` did).
6. **Remove both F2b exemptions:** `'euler-line'` from `CHAPTER_LINK_PENDING` in `src/learning/content/familyChapters.test.ts:33`, and the `demo.id !== 'euler-line'` filter in `triangleGeometryChapter.test.ts:51`. Set `lesson: true` for `euler-line` in `src/demonstrations.ts:105` and update every test list that counted it lessonless (grep `euler-line` under `src/` and `tests/`). Keep `POSTER_PENDING` as is (F5).
7. Add a `tests/guided-lessons.smoke.spec.cjs` row for the lesson (as T1/T2 rows), and any Learn-page/unified-learning smoke expectation that counts the chapter's sections.
8. Terms: new Slovenian terms (e.g. *Eulerjeva premica*, *krožnica devetih točk*, *vznožje višine*) use the ones already shipped in the F2a panel (`src/localization/sl.ts`, keys `euler_*`); add rows to `docs/localization.md` and `docs/tasks/triangle-geometry/README.md` terms table only for terms first shipped here.

## Lesson actions

T1 drives `PointSetGraph` through existing kinds (`set-points`, overlay actions with names in `POINT_SET_OVERLAY_NAMES`, `src/compgeo/pointSetModel.ts:28`). The Euler graph's overlays are `triangle`, `centres`, `line`, `circle`, `ninepoints`, `circumcircle` (`EulerLineGraph.tsx:157,176`); extend the overlay-name vocabulary as W1 did in 05 if needed. Add a new action kind only if no existing one can set the state; keep it typed, synchronous, and tested. **If `EulerLineGraph` gains an action that `sceneActions` in `src/graphs/base/realGraphScenes.ts:119` would apply (e.g. `parameter`), remove `euler-line` from `NO_SYNCHRONOUS_SCENE_CHANGE` in `src/graphs/base/graphTransientStateContract.tsx:58`** — that stale exemption is exactly what broke `inscribed-angle` after 05 (fixed in `62ad3616`). Either way, run the contract for `euler-line` (check below).

## Tests (in `triangleGeometryChapter.test.ts`, appended describe blocks; do not rewrite existing blocks)

- Every number in T3 prose and the section recomputed from the kernel/model (`src/compgeo/triangle.ts`, `eulerLineModel.ts`, `rational.ts`): default \(H,G,O,N\), \(R^2/4=29/8\), \(HG\), \(GO\), foot \((2,0)\), midpoint of \(CH\) \((2,7/2)\), distinct counts (9 / 5 / 8), near-equilateral \(H\), \(O\), \(|HO|=1/14\), \(R\).
- Every authored T3 scene applied in one synchronous sequence to the graph model; the scene's requested view contains the points it talks about (the near-equilateral \(H\) and \(O\) are close: they need not be separated visually, but both must be in view).
- For each new regression assertion, report a deliberate mutation that made it fail.

## Checks (log to `.command-logs/t06-f3f4/`)

- `npx tsc --noEmit --pretty false`; `npx eslint <changed files>`.
- `just unit src/learning src/graphs/compgeo src/localization src/demonstrations` (or the nearest path filters that cover catalog/route tests).
- `BEZEG_TRANSIENT_STATE=euler-line just unit src/graphs/base/GraphTransientState.part`.
- Do not run `just build`, full `just unit`, or smoke; the handler does.

## Rules and return

- Do not commit, push, or spawn agents. Preserve unrelated changes.
- Budget: locate with `grep -l`/`-c` before reading; ≤150 lines per read; full outputs to logs. On `HANDOFF` or past ~30 turns, stop at a consistent point, write `docs/reviews/triangle-geometry/06-f3-f4-w1-notes.md`, return partial.
- Report ≤30 lines: files changed, decisions (terms, any new action kind or overlay names), checks with results and log paths, mutations observed, open risks. Longer material goes in `06-f3-f4-w1-notes.md`.
