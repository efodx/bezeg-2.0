# Maps stream: handler handoff 9

Written 2026-11-01 by handler 9 (Opus 5.5, `auto`, effort `medium`) after the 150k context threshold. Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, local branch `worktree-stream-maps`.

## Git state

- `origin/master` has this run's `fce2b629` (complex 04 F2b), `6e113f96` (familyChapters exemption fix), `2c800426` (linear 07 F5 example cards), `98a2b706` (handoff 8), `f61b844e` (prefer-const fix), `6919e041` (linear 07 F6 status) and this note.
- `origin/maps-handler-9-f3f4` = one WIP commit, **complex maps 04 F3+F4** (unreviewed, not smoked, not built), on `f549fc27` (= `f61b844e` + the F6 status + an earlier copy of this note). Local `worktree-stream-maps` = `origin/master`.
- **Rebase conflict pending:** master meanwhile gained `b97a330a` and `2401652f` (other streams' chapter exemptions), which conflict with the WIP in `LearningPage.tsx`, `LearningPage.test.tsx`, `authoredChapterCoverage.test.ts`, `chapterOwnedLessons.ts`, `familyChapters.ts`, `familyChapters.test.ts` and `lessonCatalog.test.ts`. Resolve by keeping both sides (other families' exemptions plus the complex-maps entries and the union-of-family link check), then rerun the focused unit command below.
- Stale remote branches from handler 8 (`maps-handler-8-wip`, `maps-handler-8-f2b`) are superseded by master; delete them only if the owner asks.

## Done this run

- **Complex 04 F2b on master** after a delegated smoke (all 5 checks passed: both routes SL/EN with a live switch, refresh, drag, Preset save/restore/delete on roots, `/complex-multiplication` unchanged; no console errors).
- F2b had broken master in two ways its focused run missed, both fixed and pushed:
  - `familyChapters.test.ts` requires the maps chapter to link every `maps` Demonstration (fixed by a temporary exemption, now replaced in the F3+F4 WIP by a per-family union check);
  - lint `prefer-const` on the TDZ fix in both complex graphs (now a `const` holder object; folding into a const would reintroduce the TDZ).
  - Lesson for the next slice: run `src/learning/content` and `just lint` before pushing a registration.
- **Linear 07 F5 example cards on master:** captured from the production preview of `ac6bd191`; the inventory regenerated identically on master's code. Handler checked both PNGs against the copy and the matrix (a1=(2,1), a2=(−1,1), det 3). The L1 identity card's grid fills only the left ~55 % of the frame (the authored start window).
- **Linear 07 F6 checks** (status in `docs/tasks/linear-maps/README.md`): all `check` parts green at `f61b844e`, smoke 10/10 passed (screenshots `.command-logs/h9-smoke-f6/`), hosted CI checks/build/unit green. Keyboard decision recorded: handles stay pointer-only; the Uredi spinbuttons are the keyboard path. Bench not rerun (classroom device unreachable). **Gate still open:** poster capture, and overlapping labels at the identity default (\(a_2=Ae_2\) over \(e_2\), \(A(e_1+e_2)\), \(a_1=Ae_1\) over \(e_1\)), see `.command-logs/h9-smoke-f6/c1.png`.
- **Complex 04 F3+F4 (WIP branch).** Brief: `docs/reviews/complex-maps/04-f3-f4-brief.md`. Two Sonnet workers in parallel.
  - W1: `complexMapsChapterLessons.ts` (M1 7 steps, M2 7 steps), `complexMapsChapterRegistry.ts`, `chapterOwnedLessons` row; new names in the existing `function-parameter`/`function-visibility`/`function-choice` kinds (`model.ts`) handled by both graphs' `lessonFunctionActions`; lesson tests in `complexMapsChapter.test.ts` (checked values, branch cut, every scene applied synchronously, forward and reverse).
  - W2: `complexMapsChapter.ts` (family `maps`, registered after linear maps), union-of-family link test (no `CHAPTER_LINK_PENDING`), `LearningPage.tsx` topic preview and maps strand, count updates in `LearningPage.test.tsx` and `authoredChapterCoverage.test.ts`, two term rows in `docs/localization.md`.
  - Handler integration: removed `lesson: false` for both routes and the `lessonCatalog.test.ts` exemption; added both lessons' preview copy (`guidedExamplePreviewCopy.ts`, counts 58/65); added smoke rows `complexReciprocal`/`complexRoots` to `tests/guided-lessons.smoke.spec.cjs` (7 steps, 7 frames, not yet run in a browser); renamed M2's title to *Koreni kot pravilni mnogokotnik / Roots as a regular polygon* (math in a title breaks the smoke heading match).
  - Checks at the WIP (dirty on `f61b844e`): tsc clean; eslint on `src/learning src/graphs/complex` and the smoke spec clean; `just unit src/learning src/graphs/complex src/localization src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx` 1260/1261, the one failure (preview-copy counts) fixed and its file rerun green.
  - W2 noted: English math must use decimal points (`lessonMathNotation.test.ts` rejects `{,}` there). W1 noted: M2 "labelling" uses `w=−1+0.05i` because the spec's \(\pm10^{-12}\) is off the 0.05 grid; the prose gives exact `w=−1` angles and "about" values below the axis.

## CI

`Browser smoke` on master still fails in the `other-specs` job: the Geometry routes (`polygon-area`, `convex-hull`, `ear-clipping`, `segment-intersections`), catalogue cards, preview provenance, motion poster and `unified-learning` "Learn opens chapters…". These already failed at `d38a6ad5` before any maps push. Not yet checked: whether the catalogue / provenance / Learn specs also trip on maps entries (posters pending). Check with `gh run view <id> --log-failed` before F3+F4 lands.

## Next, in order

1. **F3+F4 acceptance:** check out `origin/maps-handler-9-f3f4` onto a local branch, rebase onto `origin/master` resolving the conflicts above (counts in tests may change again).
   - Run `just build` and the full `just unit`.
   - Review in parallel: an engineering reviewer and a mathematical reviewer (prose and lesson numbers against spec M1/M2 and Correctness Notes), both `bezeg-reviewer` Sonnet. Verify their repairs.
   - Smoke (`bezeg-smoke`, port 4316): `/learn/complex-maps` SL/EN, M1 and M2 stepped through in both languages, each step's board state, a live switch, restore on exit, `/complex-multiplication` lesson unchanged. Also run `just smoke-lesson complex-reciprocal` and `just smoke-lesson complex-roots` for the new rows.
   - Then squash into a proper commit (new commit) and push to master.
2. **Complex 04 F5:** example cards. Add a `complex-maps` entry to `chapterInventories` (generator), `chapterFamilies` (capture script) and `CHAPTER_GUIDED_EXAMPLE_PREVIEWS`, with authored expectations. Posters for both routes need recipes (`scripts/demonstration-preview-recipes.cjs`) and wait on the same Geometry `validateRecipes` blocker as `linear-map`.
3. **Poster capture** for `linear-map` (and complex) once Geometry's three recipes pass `node --test scripts/demonstration-preview-capture.test.cjs`: `PREVIEW_RECAPTURE_IDS=…`, then drop the ids from `POSTER_PENDING` and the `DemonstrationsPage.test.tsx` exemption.
4. **Linear identity label overlap:** a small label-placement fix in the linear map graph, then a focused browser check. Closes the F6 gate together with the poster.
5. **Triangle 05:** as in handoff 7.

## Operational notes

- Free memory was 3.5–5.6 GB this run. Claude Code killed my idle background build and watcher once. Run long commands in the foreground: they move to the background after 10 min, but the session is not idle.
- `just` heavy commands now have a memory gate (`d38a6ad5`); path-filtered `just unit` waits at it too. A focused `src/learning` run took 734 s.
- Workers sharing one worktree with a smoke build: tell the smoke worker to report the build's dirty state (this run's build finished clean before the workers wrote).

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet 5.5 `medium`; reviewers `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet on port 4316. A shared brief file with fixed names plus a skeleton-first step let two workers run in parallel on lessons and chapter without conflicts.
