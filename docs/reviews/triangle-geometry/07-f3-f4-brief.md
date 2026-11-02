# Triangle geometry 07 F3+F4 brief (maps handler 17, 2026-11-02, handoff-v12)

One `bezeg-worker` (Sonnet 5.5 `medium`) in `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`. Task: [07](../../tasks/triangle-geometry/07-batch-c.md). Spec: [triangle-geometry-lessons.md](../../specs/triangle-geometry-lessons.md) sections T4, Batch-wide acceptance gate, Correctness Notes. One-shot lesson text: [new-lesson-families.md](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Follow AGENTS.md (lesson prose math notation, localization lockstep, synchronous scene actions).

**Template:** 06 F3+F4, commit `3241d59b` (`git show --stat 3241d59b`; its brief `06-f3-f4-brief.md`): lessons in `src/learning/content/triangleGeometryChapterLessons.ts`, chapter `triangleGeometryChapter.ts`, registry `triangleGeometryChapterRegistry.ts`, tests `triangleGeometryChapter.test.ts`, preview copy `guidedExamplePreviewCopy.ts`, smoke rows in `tests/guided-lessons.smoke.spec.cjs`. F2a/F2b are on the branch: graph `src/graphs/compgeo/SimsonLineGraph.tsx`, model `src/compgeo/simsonLineModel.ts` (examples `SIMSON_EXAMPLES`, offsets `SIMSON_OFFSETS`), kernel `src/compgeo/simson.ts`, route `/simson-line` (`07-f2b-brief.md`).

## Goal and acceptance

1. **Lesson T4** `simsonLineLesson`, id `simson-line`, Demonstration `simson-line`, registered under section id `simson-line` (mapped in `src/learning/chapter/guidedLessonOwnership.ts` by F2b). Seven steps per spec §T4 Steps on the T1 triangle \((0,0),(7,0),(2,5)\):
   1. triangle, circumcircle and \(P\) on it (glider, \(\varepsilon=0\)); predict how the three feet lie;
   2. feet and the line through them;
   3. move \(P\) around the circle (one or two `t` values; the line stays);
   4. offset slider off the circle; the foot triangle opens (use a visibly open value, e.g. \(\varepsilon=0{,}2\), then mention \(0{,}001\));
   5. the area readout and the status. **The prose must say explicitly that at \(\varepsilon=0{,}001\) the feet look collinear on the board while the area readout (\(0{,}0005\,S\)) and the status say "not collinear", so the drag shows only the "if", not the "only if"** (spec acceptance 3);
   6. \(P\) at a vertex: the `vertex` example in exact mode (\(P'=B=(7,0)\)); two feet coincide, the line goes through the two distinct feet and the status says so (acceptance 4);
   7. free exploration (may mention the exact grid mode and the lattice point \(P'=(2,-2)\), example `grid-on-circle`).
2. Theorem "the feet are collinear exactly when \(P\) lies on the circumcircle" with a source by author and title only (H. S. M. Coxeter, *Introduction to Geometry*, as T3 does; no section number). Proof sketch through cyclic quadrilaterals (T2) may appear. The drags are illustrations of the "if" and of the quantitative failure off the circle. Do **not** state \(|R^2-OP^2|/(4R^2)\) as a theorem (spec: test oracle only). Owner decision 2026-11-02 (spec T4 acceptance 2): in glider mode at \(\varepsilon=0\) the status is plain "collinear" and the area readout shows \(0\) (Simson's theorem; the residue is rounding only), so the prose may say the feet are collinear there without a tolerance qualifier. Rational "exact" claims (orientation \(0\) as a fraction) belong to exact mode.
3. Numbers in prose: feet for \(P=(2,-2)\) are \((11/2,3/2)\), \((-12/29,-30/29)\), \((2,0)\) with orientation \(0\); offsets give area\(/S\) \(0{,}000500\), \(0{,}005025\), \(0{,}025625\), \(0{,}110\) for \(\varepsilon=0{,}001,0{,}01,0{,}05,0{,}2\); \(S=35/2\), \(O=(7/2,3/2)\), \(R^2=29/2\). Recompute every number you use from the model/kernel in tests.
4. **Chapter section** `simson-line` appended to `triangleGeometryChapter.ts` with `withExample`, like the three existing sections: purpose, prerequisites (T1, T2), theorem with source, the checked default example (\(P'=(2,-2)\) feet and orientation \(0\)), how to use the graph (glider vs exact mode, offset slider, area readout). Keep the chapter's per-language word minimum; promise no later batch (inversion). Raise the chapter's section minimum from 3 to 4 in `familyChapters.test.ts` and `tests/unified-learning.smoke.spec.cjs` if they count sections (06 F6 set them to 3).
5. **Preview copy** for the new section/lesson in `guidedExamplePreviewCopy.ts` and its test, as `3241d59b` did.
6. **Remove the F2b exemptions** for `simson-line` (grep `simson-line` in `familyChapters.test.ts`, `triangleGeometryChapter.test.ts`); set `lesson: true` for `simson-line` in `src/demonstrations.ts` and update every test list that counted it lessonless (grep `simson-line` under `src/` and `tests/`). Keep `POSTER_PENDING` (F5).
7. A `tests/guided-lessons.smoke.spec.cjs` row for the lesson, as the T3 row.
8. Terms: use the terms already shipped in `sl.ts` keys `simson_*` (*Simsonova premica*, *nožišče*, *nožiščni trikotnik*, *nosilka stranice*); add rows to `docs/localization.md` and the README terms table only for terms first shipped here.

## Lesson actions

`SimsonLineGraph` registers no lesson actions yet. Add, in `registerLessonActions` (template: `InscribedAngleGraph.tsx:124-131`):

- the existing `{kind: 'parameter', name: 't', value}` (degrees) → `setT`, with a finite-number check;
- one new typed action kind for the rest, following the `linear-map` / `projective` pattern in `src/learning/model.ts:204-234`, e.g. `{kind: 'simson'; operation: 'load-example'; exampleId: SimsonExampleId}` → `loadExample`, and `{kind: 'simson'; operation: 'set-offset'; epsilon: SimsonOffset}` → `setEpsilon` (refuse with an error when `setEpsilon` returns false). Add `set-mode` only if a step needs it. Wire whatever validation/type maps the existing kinds need (grep how `'projective'` is listed across `src/learning`), and test it.
- Overlays (`SIMSON_LINE_OVERLAY_IDS`: `grid triangle sidelines circumcircle perpendiculars simson pedal`) go through `point-set set-overlay`; extend `POINT_SET_OVERLAY_NAMES` (`src/compgeo/pointSetModel.ts:28`) with the missing names as `3241d59b` did.

**Transient-state contract:** `sceneActions` in `src/graphs/base/realGraphScenes.ts:119` applies `parameter t`, so once the graph accepts it, `simson-line` must **not** be in `NO_SYNCHRONOUS_SCENE_CHANGE` (`src/graphs/base/graphTransientStateContract.tsx:60`); remove it if F2b put it there, and check the contract's per-id field list for `simson-line`. If `sceneActions` should also exercise the new `simson` kind, add a candidate there. Run the contract (check below).

## Tests (in `triangleGeometryChapter.test.ts`, appended describe blocks; do not rewrite existing blocks)

- Every number in T4 prose and the section recomputed from `simson.ts` / `simsonLineModel.ts` / `rational.ts`: the three feet and orientation for \(P'=(2,-2)\); the vertex example's two coincident feet; area\(/S\) for each nonzero offset used in prose (to the printed digits) and status "not collinear" for \(\varepsilon=0{,}001\); \(S\), \(O\), \(R^2\).
- Every authored T4 scene applied in one synchronous sequence to the graph; the scene's requested view contains the points it talks about (feet off the side segments included).
- Unit tests for the new action handlers (valid and refused values).
- For each new regression assertion, report a deliberate mutation that made it fail.

## Checks (log to `.command-logs/t07-f3f4/`)

- `npx tsc --noEmit --pretty false`; `npx eslint <changed files>`.
- `just unit src/learning src/graphs/compgeo src/compgeo src/localization src/demonstrations` (or the nearest path filters covering catalog/route tests).
- `BEZEG_TRANSIENT_STATE=simson-line just unit src/graphs/base/GraphTransientState.part`.
- Do not run `just build`, full `just unit`, or smoke; the handler does.

## Rules and return

- Do not commit, push, or spawn agents. Preserve unrelated changes.
- Budget: locate with `grep -l`/`-c` before reading; ≤150 lines per read; full outputs to logs. On `HANDOFF` or past ~30 turns, stop at a consistent point, write `docs/reviews/triangle-geometry/07-f3-f4-w1-notes.md`, return partial.
- Report ≤30 lines: files changed, decisions (terms, the new action kind, overlay names), checks with results and log paths, mutations observed, open risks. Longer material goes in `07-f3-f4-w1-notes.md`.
