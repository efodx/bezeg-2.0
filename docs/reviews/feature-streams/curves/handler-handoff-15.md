# Curves stream: handler handoff 15

Handler 15 wrote this on 2026-11-02. It supersedes [handoff 14](handler-handoff-14.md). The supervisor relaunched this session after a crash. It stopped at the 150k soft threshold. No agents, previews or temporary worktrees are running. Settings are unchanged: handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet.

## Accepted and pushed this session

| Commit | Slice | Checks |
| --- | --- | --- |
| `302c7383` | IA-A-3: guided lesson I1 (Lagrange vs Bézier). It adds the `interpolation` lesson action (`set-rule`, `set-overlay`, `add-point`) and the `parameter` action `t` on `InterpolationGraph`. A refit in `prepareLessonDefaultScene` makes Reset after the fifth point show the four-point view. The interim owner is `bezier-curves/geometric-properties`. | At `73f044be`, after the rebase, `just unit src/learning src/graphs/curves/interpolation` passed (1297 tests). Typecheck and build passed. `SMOKE_PORT=4314 just smoke-lesson interp-lagrange curve-parametric curve-curvature` passed (sl, and en at 390×844; 6 tests). The worker mutated two numeric assertions; each failed. |
| `9595193e` | BS-A-2a1: `BSplineCurve` (`src/bezeg/impl/curve/bspline-curve.ts`), `JXGBSplineCurve`, and the local `bspline-curve` Preset collection (`src/graphs/curves/bspline/bsplinePresetCollection.ts`). The 11 `bspline_*` locale keys follow `ph_preset_has_an_incorrect_degree_or_number_of_curves`. | At `9595193e`, typecheck, lint, build and `just unit` on the curve, object, bspline, presets and localization directories passed (550 tests). The worker ran 8 mutations; each was caught. The engineering and mathematics review (Sonnet) found one medium. |

**Review disposition (BS-A-2a1).** Medium, fixed by the handler: the inherited JXG `addPoint`/`removePoint` changed the board before the model refused, which orphaned points. `JXGBSplineCurve` now overrides both to throw `InvalidKnotVectorError('wrong_length')` before any side effect. A new test checks that the board and the point counts are unchanged; under a deliberate mutation it failed, with the board going from 24 to 26 objects. Two lows are deferred. First, the 1e-9 domain-end snap at `bspline-curve.ts:169` is relative to the domain length, and it falls below one ulp only for domains like \([10^9, 10^9+10^{-3}]\). Second, the error type thrown by add and remove is a knot error, which is cosmetic.

**Rebase.** The I1 commit conflicted with master's `root-finding` entry in `lessonCatalog.test.ts`. The conflict was mechanical: both sides were kept and the learning units reran.

## Next steps, in order
1. Dispatch the two prepared briefs in [handler-15-briefs](handler-15-briefs/) after changing their `C:\Users\...\jobs\bf5ab8cf\tmp` log and handoff paths to your own job tmp:
   - `brief-bs-a-2a2.md`: the basis-plot graph and knot editor. For 2a2, use `curve.getDomain()` for the plot range. Make knot edits through `setKnots` and catch `InvalidKnotVectorError.reason`. A point-count change needs `setSpline` with new knots. Weighted `deBoorTriangle` rows are homogeneous; project them with `projectHomogeneous`.
   - `brief-ia-b-3.md`: the I3 Hermite lesson, using the I1 template.
2. Then BS-A-2a3 (the de Boor graph, animation id `'deboor'`), the I5 lesson (`SUBDIVISION_ANIMATION_ID` to `LESSON_ANIMATION_IDS`; I5 text notes in [handoff 7](handler-handoff-7.md)), and the D4 `patch-coons` lesson.
3. `G-FN` is open, so the I2/I4 graphs and the family 4 (PS) graphs can start. Read the A8 evidence (`docs/tasks/architecture-deepening-backlog/08-function-graph-sharing.evidence.md`) before briefing them.
4. Deferred lows from handoffs 13 and 14 remain open.

## Gaps
- I1: the live SL→EN switch on the lesson was not browser-checked. The smoke ran sl and en as separate loads, and the lesson text comes from content, not from board text.
- I1 step 2 uses \(s=5/6\) (\(t=5/2\)), where the Lagrange point is \((3.75, 2.1875)\). The handler checked that this point lies outside the hull: the edge from \((3,3)\) to \((4,0)\) is at \(x\approx3.27\) at that height.

## Evaluation record (not yet logged with `do-log`)
- IA-A-3 worker, Sonnet medium, handoff-v12: finished, 115k tokens, 48 tools, about 19 min. It was complete; the only issue was the rebase conflict. One prose mutation did not fail because the number was duplicated in the scene text, and the worker found this itself.
- BS-A-2a1 worker, Sonnet medium, handoff-v12: finished, 112k tokens, 62 tools, about 32 min. It missed the add/remove board side effect, which the reviewer caught.
- BS-A-2a1 reviewer, Sonnet: 28k tokens, 8 tools, about 2 min. It found one useful medium and did not run its spot-check mutations.
- Handler: when a mutation shows "passed", read the vitest summary in `.command-logs`. The wrapper line alone misled the handler once in this session.
