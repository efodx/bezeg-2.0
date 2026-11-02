# Curves stream: handler handoff 19

Handler 19 wrote this on 2026-11-02. It supersedes [handoff 18](handler-handoff-18.md). Stopped at the 150k soft threshold after BS-A-3a. No workers, previews or temporary worktrees are running. Settings unchanged: handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet first pass, Haiku narrow).

## Accepted and pushed to master

| Commit | Slice | Checks |
| --- | --- | --- |
| `d3953bdf`, `c25de49c` | BS-A-2b registration (handler 18's WIP) plus fix: `/bezeg-2.0/bspline` added to `FAMILY_CHAPTER_PENDING` in `LearningPage.test.tsx` (the full run caught it), stale collection comment. [Evidence](../../b-splines-nurbs/bs-a-2b-registration.md). | Full unit scope (one known failure), typecheck, lint, check-localization build; engineering review (Sonnet): no high/medium, three lows deferred; first-pass smoke of both routes incl. live SL→EN (Sonnet). |
| `9da57d56`, `507b315b` | Capabilities rows for the two B-spline routes; stream status line. | Docs. |
| `f8515203` | Decision: optional `LessonCurveFixture.knots` (alternatives recorded in the task plan); BS-A-3 split into 3a (L1) and 3b (L2). | Docs. |
| `e23ee161`, `91dd6ccc` | Fixture `knots` in both B-spline graphs, `parameter` t action on the basis graph, six-step L1 lesson on `bspline-basis` (interim owner `splines/piecewise`), smoke row. [Evidence](../../b-splines-nurbs/bs-a-3a-l1-lesson.md). | Worker complete (137k, 67 tools, ~42 min). Handler: exact Cox-de Boor recomputation of every lesson number; typecheck, lint, build, `smoke-lesson bspline-basis segment-intersections`; units incl. `src/graphs/base`; Haiku browser check SL + live EN. Rebase conflicts with master's `euler-line` and projective K1 lesson (lesson lists, smoke `LESSONS`, preview-copy counts 74/81) resolved by keeping both; rechecked learning, catalog and bspline units, typecheck, lint (`part4` inscribed-angle now passes on master). |

## Next steps, in order

1. **BS-A-3b: L2 lesson on `bspline-deboor`** (spec L2, `docs/specs/b-splines-nurbs-lessons.md` lines 64-71). Copy BS-A-3a's pattern (`bsplineBasisGuidedLessons.ts`): `prepared-scene` lesson fixture with `knots` `(0,0,0,1,2,2,2)` and points `(0,0),(1,2),(3,2),(4,0)`; check whether `DeBoorGraph` supports the `parameter` t action and the `'deboor'` animation `next-step`/`reset` commands in lessons (add like the basis graph if not). Acceptance: `(1,1.5)` at 0.5, `(3,1.5)` at 1.5, `(2,2)` at 1, exactly k+1 highlighted points, moving P0 leaves the curve unchanged for t>1 (sampled), convex hull per span. Remove `bspline-deboor` from the lesson-less list in `lessonCatalog.test.ts`. Run `just unit src/graphs/base` too. Expect one worker (the 3a worker finished in one pass at 137k; the 135k watcher did not fire in time because the worker returned first).
2. **BS-A-4 chapter `b-splines`** (F4): moves both lessons from interim owners; removes `/bezeg-2.0/bspline` from `FAMILY_CHAPTER_PENDING`.
3. **BS-A-5 media**: capture the two pending B-spline posters (`POSTER_PENDING`), and in the same capture fix Geometry's note on `interp-subdivision` (step 0 shows only the control polygon; [posters-visual.md](../geometry/posters-visual.md) line 17): give its recipe in `scripts/demonstration-preview-recipes.cjs:40` an action that shows the first refinement. Capture procedure: `docs/commands.md` line 40 (selective recapture flags).
4. `G-FN` work (I2/I4, family 4) per handoff 18.
5. Deferred lows: BS-A-2b review (poster-pending list duplicated in `DemonstrationsPage.test.tsx:46`; `checkGraphState` only `invalid_value`; `perturbModel` assumes `knots[degree+2]`), BS-A-3a (reject assertions not mutated alone), handoffs 13-18 lows.

## Gaps and notes

- `docs/capabilities.md` route table lacks the Hermite, interpolation and Coons routes from earlier curve slices; its "51 active graph routes" count is stale. A docs pass, not done.
- Memory pressure on 2026-11-02 killed the handler watcher and one check chain; both reran once as the stream README says.
- No live SL→EN browser check yet for I3, I5 or D4 (from handoff 18).

## Evaluation record (not yet logged with `do-log`)

- BS-A-2b engineering review, Sonnet: 29k, 5 tools; no high/medium, 3 lows; it did not catch the `LearningPage` failure (the full unit run did).
- BS-A-2b first-pass smoke, Sonnet `bezeg-smoke`: 32k, 14 tools, ~2 min; all pass, preset switch blocked (only the default exists).
- BS-A-3a worker, Sonnet medium, v12: complete at 137k, 67 tools, ~42 min; added an unbriefed but needed `parameter` action; mutation evidence given.
- L1 language check, Haiku `bezeg-smoke`: 42k, 22 tools, ~4 min; all pass.
