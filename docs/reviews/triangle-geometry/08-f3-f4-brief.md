# Triangle geometry 08 F3+F4 brief (maps handler 20, 2026-11-02, handoff-v12)

One `bezeg-worker` (Sonnet 5.5 `medium`) in `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`. Task: [08](../../tasks/triangle-geometry/08-batch-d.md). Spec: [triangle-geometry-lessons.md](../../specs/triangle-geometry-lessons.md) sections T5, Batch-wide acceptance gate, Correctness Notes. One-shot lesson text: [new-lesson-families.md](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Follow AGENTS.md (lesson prose math notation, localization lockstep, synchronous scene actions).

**Template:** 07 F3+F4 (Simson line; `git log --oneline -i --grep "07 F3"` gives the commit; its brief `07-f3-f4-brief.md` and notes `07-f3-f4-w1-notes.md`). Files: lessons `src/learning/content/triangleGeometryChapterLessons.ts`, chapter `triangleGeometryChapter.ts`, registry `triangleGeometryChapterRegistry.ts`, tests `triangleGeometryChapter.test.ts`, preview copy `guidedExamplePreviewCopy.ts`, smoke rows `tests/guided-lessons.smoke.spec.cjs`. On master already: model `src/compgeo/inversionModel.ts` (`INVERSION_EXAMPLES`, `InversionExampleId`), graph `src/graphs/compgeo/InversionGraph.tsx` (public `setFocus`, `setRadius`, `setX`, `setSourceKind`, `setSource`, `setPowerCircle`, `setTheta`, `setAngleCircle`, `setWhich`, `loadExample`), route `/inversion` (`08-f2b-brief.md`).

## Goal and acceptance

1. **Lesson T5** `inversionLesson`, id `inversion`, Demonstration `inversion`, section id `inversion` (mapped in `guidedLessonOwnership.ts` by F2b). Seven steps per spec §T5 Steps:
   1. power focus, example `power` (P = C = (0,0), circle centre (5,0) radius 3), a secant; predict \(PA\cdot PB\) as the secant turns;
   2. the product stays \(16\) (two θ values, e.g. 0° and 20°); the tangent length \(4\) gives the same value (\(4^2=16\));
   3. point focus, example `point` (r = 2), inversion circle on; predict where \(X'\) lies on the ray \(CX\) (\(|CX|\cdot|CX'|=r^2\));
   4. source focus, example `through-centre`: the circle \(|z-(1,0)|=1\) becomes the line \(x=2\) (images \((1,1)\mapsto(2,2)\), \((1,-1)\mapsto(2,-2)\), \((2,0)\mapsto(2,0)\));
   5. example `not-through-centre`: circle centre \((3,0)\) radius \(1\) becomes the circle centre \((3/2,0)\) radius \(1/2\); may mention `orthogonal` (r = 4, the circle maps to itself) and `line-through-centre`;
   6. angle focus, example `angle`: circles centres \((3,0)\), \((3,1)\), radius \(1\), meet at \(60^\circ\) near \((2{,}134;\,0{,}5)\); the images meet at the same unsigned angle with the opposite sign. **The prose must say that inversion preserves the size of angles but reverses their orientation**, and must not call it "conformal" without that qualification (spec acceptance 4);
   7. free exploration, including the centre point: X = C has no image (the panel says so).
2. Theorems (circles through the centre ↔ lines; angles preserved in size, orientation reversed; power constant along secants) with a source by author and title only: FMF *Inverzija* lecture notes as the spec names them; Coxeter, *Introduction to Geometry*, only as "see also", without section numbers. Drags and readouts are described as instances, not proofs.
3. **Prerequisite link** to complex maps lesson 1 (`complex-reciprocal-inversion`, `src/learning/content/complexMapsChapterLessons.ts:23`), where inversion appears as \(z\mapsto c+r^2/\overline{z-c}\); the lesson stays readable without it. Use whatever prerequisite/link mechanism T1–T4 or the complex maps lessons already use (grep `prerequisite` under `src/learning`); add none of your own.
4. Every number in prose recomputed from `inversionModel.ts` / `circle.ts` / `rational.ts` in tests (exact images, \(16\), \(4\), \((3/2,0)\) and \(r^2=1/4\), \((5,3)\mapsto(40/17,24/17)\) if used, the \(60^\circ\) angles and their signs).
5. **Chapter section** `inversion` appended to `triangleGeometryChapter.ts` with `withExample`, like the four existing sections: purpose, prerequisites (T1; complex maps lesson 1 as optional link), theorems with source, the checked default example, how to use the graph (focuses, radius field and handle, θ, examples, the edge marker and "too far to draw"). Raise the chapter's section minimum from 4 to 5 in `familyChapters.test.ts` and `tests/unified-learning.smoke.spec.cjs` if they count sections.
6. **Preview copy** for the new section/lesson in `guidedExamplePreviewCopy.ts` and its test.
7. **Remove the F2b exemptions** for `inversion` (grep `'inversion'` in `familyChapters.test.ts` `CHAPTER_LINK_PENDING`, `triangleGeometryChapter.test.ts`, `lessonCatalog.test.ts`); set `lesson: true` for `inversion` in `src/demonstrations.ts` and update every count or list that treated it as lessonless (grep under `src/` and `tests/`; `GUIDED_LESSON_AVAILABLE_IDS` count included). Keep `POSTER_PENDING` (F5).
8. A `tests/guided-lessons.smoke.spec.cjs` row for the lesson, as the T4 row; include the centre point (spec: "T5 centre point").
9. Terms: use the shipped `inversion_*` terms (*inverzija*, *krožnica inverzije*, *središče inverzije*, *potenca točke na krožnico*, *sekanta*, *tangenta*, *posplošena krožnica*); add rows to `docs/localization.md` only for terms first shipped here.

## Lesson actions

`InversionGraph` registers no lesson actions yet. Add `registerLessonActions` (template: the Simson line's, added in 07 F3+F4), with one new typed action kind following the `simson` pattern in `src/learning/model.ts`, e.g. `{kind: 'inversion'; operation: 'load-example'; exampleId: InversionExampleId}` → `loadExample`, `{kind: 'inversion'; operation: 'set-theta'; degrees: number}` → `setTheta` (finite check), `{... 'set-focus'; focus}` and `{... 'set-x'; point}` only if a step needs them. Refuse invalid values with an error (`setX`/`setRadius` return false). Wire validation and type maps as the `simson` kind is wired (grep `'simson'` across `src/learning`), and unit-test valid and refused values. Overlays go through `point-set set-overlay`; extend `POINT_SET_OVERLAY_NAMES` (`src/compgeo/pointSetModel.ts`) with the inversion overlay ids the steps toggle.

**Transient-state contract:** F2b put `inversion` in `NO_SYNCHRONOUS_SCENE_CHANGE` (`src/graphs/base/graphTransientStateContract.tsx`). If `sceneActions` (`src/graphs/base/realGraphScenes.ts`) gets a candidate the graph now accepts, remove it from that set, as 07 did for `simson-line`; run the contract (check below).

## Tests (in `triangleGeometryChapter.test.ts`, appended describe blocks; do not rewrite existing blocks)

- Every number in T5 prose and the section, recomputed (item 4).
- Every authored T5 scene applied in one synchronous sequence to the graph; each scene's view contains the points it talks about.
- Unit tests for the new action handlers.
- For each new regression assertion, report a deliberate mutation that made it fail.

## Checks (log to `.command-logs/t08-f3f4/`)

- `npx tsc --noEmit --pretty false`; `just lint <changed files>`.
- `just unit src/learning src/graphs/compgeo src/compgeo src/localization src/demonstrations src/Routes src/DemonstrationsPage`.
- `BEZEG_TRANSIENT_STATE=inversion just unit src/graphs/base/GraphTransientState.part`.
- Do not run `just build`, full `just unit`, or smoke; the handler does.

## Rules and return

- Do not commit, push, or spawn agents. Preserve unrelated changes.
- Budget: locate with `grep -l`/`-c` before reading; ≤150 lines per read; full outputs to logs. On `HANDOFF` or past ~35 turns, stop at a consistent point, write `docs/reviews/triangle-geometry/08-f3-f4-w1-notes.md`, return partial.
- Report ≤30 lines: files changed, decisions (source wording, the new action kind, overlay names, prerequisite link), checks with results and log paths, mutations observed, open risks. Longer material goes in `08-f3-f4-w1-notes.md`.
