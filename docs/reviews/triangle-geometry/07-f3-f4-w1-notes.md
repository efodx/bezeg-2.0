# 07 F3+F4 worker 1 handoff notes (partial)

## Done (uncommitted, in the worktree)
- `src/learning/model.ts`: new action kind `{kind: 'simson'; operation: 'load-example' | 'set-offset'}` (types from `simsonLineModel`). No `set-mode` (no step needs it).
- `src/graphs/compgeo/SimsonLineGraph.tsx`: `applySimsonAction` and `registerLessonActions` (`parameter t` with finite check, `simson`); refused values throw.
- `src/compgeo/pointSetModel.ts`: overlay names `sidelines perpendiculars simson pedal` added.
- `triangleGeometryChapterLessons.ts`: `simsonLineLesson` (7 steps: circle, feet, drag, offset, readout, vertex, explore), constants `SIMSON_T_BELOW/LEFT/RIGHT` = 250/150/320. Step 'readout' states the eps 0.001 "look collinear / readout 0.0005 S / not collinear / only the if" wording.
- `triangleGeometryChapter.ts`: section `simson-line` (4 paragraphs), purpose/prerequisites mention it; inversion not promised.
- Registry, `demonstrations.ts` (`lesson: false` removed), `guidedExamplePreviewCopy.ts` (simson-line entry), smoke row in `tests/guided-lessons.smoke.spec.cjs` (vertex-count assertion only >= 3, unverified), section minimum 4 in `familyChapters.test.ts` and `tests/unified-learning.smoke.spec.cjs`, F2b exemptions removed in `familyChapters.test.ts`, `triangleGeometryChapter.test.ts`, `lessonCatalog.test.ts`.
- `triangleGeometryChapter.test.ts`: existing section-list / no-Simson assertions updated; new describe block "triangle geometry lesson T4" appended (numbers, offsets, vertex, prose, scenes on real graph, action handlers).

## Check status
- `npx tsc --noEmit --pretty false`: 0 errors (log `.command-logs/t07-f3f4/tsc.log`).
- NOT run: eslint, any `just unit`, the transient-state contract, any mutation check.

## Remaining
1. Run eslint on changed files; `just unit src/learning src/graphs/compgeo src/compgeo src/localization src/demonstrations`; fix failures. Expected count updates: `guidedExamplePreviewCopy.test.ts` (77 -> 78 lessons, 84 -> 85 copy), `authoredChapterCoverage.test.ts` (reference count +1), `DemonstrationsPage.test.tsx`/`demonstrations.test.ts` if they list lessonless ids. The new T4 test strings (plain-prose snippets such as `Fapprox(2.20,0)`, `altitude from (B)`) are unrun and may need tweaks.
2. `NO_SYNCHRONOUS_SCENE_CHANGE` in `src/graphs/base/graphTransientStateContract.tsx:60`: remove `'simson-line'` (graph now accepts `parameter t`) and fix the comment above it; then `BEZEG_TRANSIENT_STATE=simson-line just unit src/graphs/base/GraphTransientState.part`.
3. Mutation checks for the new assertions (none done).
4. Scene view: default view assumed [-1, 6, 8, -3]; the offset scene (eps 0.2, t 250) puts P at y about -2.79, close to the bottom edge; the real-graph test will confirm.
5. No new terms were introduced (no localization.md / README rows needed). Docs (task status) not updated.
