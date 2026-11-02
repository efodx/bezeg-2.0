# Curves stream: handler handoff 18

Handler 18 wrote this on 2026-11-02. It supersedes [handoff 17](handler-handoff-17.md). Supervisor-relaunched; stopped at the 150k soft threshold after the last worker returned. No workers, previews or temporary worktrees are running. Settings unchanged: handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet.

## Accepted and pushed to master

| Commit | Slice | Checks |
| --- | --- | --- |
| `92677a72` | BS-A-2a3b: `DeBoorGraph.presetCollection()` = `bsplinePresetCollection`; NURBS weights ignored (pinned by a test). [Evidence](../../b-splines-nurbs/bs-a-2a3b-presets.md). | Worker complete (37k); handler fixed one TS2345 in the test; bspline units, lint, typecheck. |
| `d799667b` | AB-C-3: D4 Coons lesson (seven steps), `coons` lesson action kind, registration, smoke row `patch-coons`. [Evidence](../../advanced-bezier/ab-c-3-lesson.md). | First worker partial at 135k; finisher complete. Math review: no error. Engineering review: no medium. Handler: units (learning, patches, demonstrations), typecheck, lint, build, `smoke-lesson patch-coons interp-subdivision segment-intersections` and, after the rebase, `patch-coons function-inverse root-finding` (all passed). |
| `f66e274b` | Fix: D4's `prepareLessonDefaultScene → resetView` broke master's `GraphTransientState` contract (patch-coons "lesson default scene drops every earlier change", CI run 41386174893); removed. | Coons lesson test, patches, contract parts 1–3 passed. |

Handler fixes inside AB-C-3: the brief's owner `bezier-patches/curve-to-patch` opens no lesson for `?learn=1` (chapter-owned chapter, `guidedExamples.ts:254-259`); interim owner `bezier-curves/geometric-properties` like I3/I5. Smoke `minFrames` 17→16. Rebase conflicts (S1/S2, N1/N2 lessons on master) mechanical; counts 71/78.

**Lesson learned:** run `just unit src/graphs/base` (the transient and scene-replacement contracts) for every lesson slice that adds lesson actions or Reset behaviour; the AB-C-3 checks skipped it and master went red.

## In progress: BS-A-2b (registration), unverified WIP

Commit `7cfe28da` on `origin/curves-wip-bs-a-2b` (rebased on master `f66e274b` with poster/catalog conflicts resolved). **Not on master and not in this worktree's branch**: start with `git cherry-pick 7cfe28da` (or `git reset --hard origin/curves-wip-bs-a-2b` after checking it is based on current master), then rebase onto `origin/master`. Worker report and handoff: `C:\Users\NonFriedMotherBoard\.claude\jobs\42108f0b\tmp\bs-a-2b-handoff.md` (may be gone with the job; summary here).
- Registers `bspline-basis` (`/bezeg-2.0/bspline/basis`) and `bspline-deboor` (`/bspline/deboor`), family `/bezeg-2.0/bspline` ("B-zlepki" / "B-splines"), `lesson: false`; `bsplinePresetCollection` registered once in `PresetImport.ts` (both Demonstrations share the saved list `preset-bspline-curve`; `PresetCatalog.test.tsx` exempts exactly these two ids); `'deboor'` in `LESSON_ANIMATION_IDS`; `lessonFixtureData` on both graphs (clamped uniform knots: `LessonCurveFixture` has no knot field, `src/learning/model.ts:106`).
- Beyond the brief, forced by shared tests: `checkGraphState` on the collection; `perturbModel` in `realGraphScenes.ts`; explicit hidden points for the basis slider segment (`BSplineBasisScene.ts`, it leaked two implicit points); `resetDisplay` in `graphTransientStateContract.tsx` keeps aspect only for equal-axis graphs. Review each.
- Rebase note: master emptied `POSTER_PENDING` (posters captured); the WIP sets it to the two B-spline ids. `DemonstrationsPage.test.tsx` poster list in the WIP may now be stale against master — check.

Remaining for BS-A-2b, in order: full `just unit` (or `src/graphs src/learning src/demonstrations.test.ts src/DemonstrationsPage.test.tsx src/demonstrationPreviewAssets.test.ts src/localization`); `just check-localization`; build; engineering review (contract-test edits are the risk); browser check of both routes with knot drag, ringed control point drag, de Boor next-step, SL→EN live switch (`$smoke-tester`); then push to master. Known not-ours failure: `GraphTransientState` inscribed-angle "a rollback within one tick…" fails on master since `c8b27a2a` (maps/geometry stream).

## Next steps after BS-A-2b
1. L1/L2 B-spline lessons (F3); decide whether `LessonCurveFixture` needs knots.
2. Geometry's poster note for `interp-subdivision` (step 0 shows only the control polygon): [posters-visual.md](../geometry/posters-visual.md) line 17.
3. `G-FN`: I2/I4 graphs and family 4 (PS) graphs; read `docs/tasks/architecture-deepening-backlog/08-function-graph-sharing.evidence.md` first.
4. Deferred lows from handoffs 13–18 (D4: weak `toContain` number checks, loose payload-error regex, camera check compares only `el`).

## Gaps
- No live SL→EN switch browser check for I3, I5 or D4.
- BS-A-2b: no build, smoke or browser check.

## Evaluation record (not yet logged with `do-log`)
- AB-C-3 worker, Sonnet medium, v12: partial at 136k (37 turns, ~10 min); lesson written, checks unrun, test named `.ts` with JSX. Finisher: 50k, 37 tools, complete. Lesson slices with a new action kind still need two workers.
- BS-A-2a3b worker: 37k, 15 tools, complete; one TS error left.
- BS-A-2b worker: 136k at 102 turns (~67 min), acceptance done but full rerun not finished; it fixed shared tests beyond its brief.
- Reviewers (Sonnet): D4 math 44k/7 (lows), D4 engineering 34k/7 (lows). Neither caught the owner or contract failures; local smoke and CI did.
