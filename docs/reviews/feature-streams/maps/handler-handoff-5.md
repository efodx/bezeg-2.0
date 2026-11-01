# Maps stream: handler handoff 5

Written 2026-11-01 by handler 5 (Opus 5.5, `auto`, effort `medium`) at its 150k soft threshold. Both gates (`G-REG`, `G-CG`) are open, and `Run state: active`. Branch `worktree-stream-maps`, worktree `.claude/worktrees/stream-maps`, clean at `24ffb625` (= `origin/master` at handoff, before this note).

## Done this run (all on `master`)

- **Triangle 01 `rational.ts`** (`4bb0915d`): Sonnet worker, Sonnet mathematical review (implementation cleared). Handler repair of the tests: the `toNumber` oracle now steps true adjacent doubles, and new tests cover sticky ties, operands above 2^1024, overflow, tiny values and 60-bit properties. A mutation dropping the sticky bit fails the new test. Geometry has already built sweep S0 02 (`c19a003c`) on it.
- **Triangle 02 triangle kernel** (`26d23762`): `src/compgeo/triangle.ts` (classification, exact centres, `circumcentre` for Geometry's Voronoi vertices, nine-point circle, Euler line, labelled inexact incentre and radii). Sonnet `high` worker; every acceptance group was mutation-checked. The Sonnet mathematical review found nothing blocking. Handler repair: `as RationalPoint` casts replaced by narrowing, and a needle-thin equidistance check.
- **Linear 06 registration** (`24ffb625`): route `/bezeg-2.0/linear-map`, family `maps` (`maps_of_the_plane`: *Preslikave ravnine*), factory, Preset collection in `PresetImport.ts` (with a `checkGraphState` for the nested matrices), `lesson: false`. Engineering review in the handler (small diff). Smoke on port 4316 passed in SL/EN: live switch, edit, Reset, Preset save/reload/restore, catalog card, and `/bezier/affine`. Cosmetic: board labels overlap at 390 px.

## Next, in order

1. **Triangle 03** circle, Simson and exact inversion kernel (`bezeg-worker` Sonnet `high`, as the task says). It uses `circumcentre` from `triangle.ts`. Complex maps 01 (`circleInversion`) is on `master`, so acceptance 6's cross-check applies now. Then triangle 04 (Batch A graphs; reuse Geometry's point-set graph from `G-CG`).
2. **Linear 07** (lessons, chapter, media, acceptance). Remove the lessonless exemptions that 06 added (search for `linear-map` in `lessonCatalog.test.ts`, `LearningPage.test.tsx`, `DemonstrationsPage.test.tsx`, `POSTER_PENDING` in `demonstrationPreviewAssets.test.ts`, and the placeholder owner `linear-maps`/`matrix-and-image` in `guidedLessonOwnership.ts`, whose chapter and section ids must match what 07 authors). Under A10 "authored means offered": once 07 authors the lesson, set `lesson` back to the default.
3. **Complex 04** (registration, lessons, chapter). It touches the same registration files as linear 07, so run it after 07 or serialize the two edits. Read `docs/reviews/linear-maps/06-worker-handoff.md` first: it lists every place a new Demonstration needs an entry under A10.
4. Run two workers in parallel only when they do not share registration files. Kernel tasks (triangle 03) and lesson tasks pair well.

## Notes for the successor

- **Pushing with a dirty tree:** while one worker's edits are uncommitted, push another accepted commit by cherry-picking it onto `origin/master` in a temporary detached worktree under `$CLAUDE_JOB_DIR/tmp`, then remove that worktree. It has no `node_modules` junction, so removing it is safe. The later `git rebase origin/master` drops the local duplicate by patch id.
- **Build fingerprint:** `just build` fingerprints all of `src/`, so do not run a `src/`-editing worker while a smoke worker uses that build.
- **Watchers:** the first `--self` and worker watchers exited with "no transcript" when started immediately. Start them after a short `sleep 30`–`60`.
- The full suite takes about 20 minutes under load. Some unrelated timeouts under load (`lessonRestoration.part4` and others) recur, so recheck a failure in isolation before attributing it.
- Workers once ran bare `npx vitest` when the slot queue blocked them. Briefs now say "use `just`, report if blocked".
- Open low notes from handoff 4 still apply.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium` (`high` for triangle kernels 02–03 and Möbius mathematics), reviewers `bezeg-reviewer` Sonnet, smoke `bezeg-smoke` Sonnet on port 4316.
