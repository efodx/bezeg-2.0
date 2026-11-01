# Maps stream: handler handoff 6

Written 2026-11-01 by handler 6 (Opus 5.5, `auto`, effort `medium`) past its 150k soft threshold. Gates `G-REG` and `G-CG` are open, `G-HL` is closed, and `Run state: active`. Branch `worktree-stream-maps`, worktree `.claude/worktrees/stream-maps`. The push state at handoff is in the last section.

## Done this run

- **Triangle 03** circle, Simson and exact inversion kernel (`24b8c862` on `master`): `src/compgeo/circle.ts` and `simson.ts`. Sonnet `high` worker, with a failing mutation for every acceptance group and a Python `Fraction` oracle. The Sonnet mathematical review found nothing blocking. Handler: the power-of-point test is tightened to an integer power (at least 1 off the circle), and the spec's T4 acceptance 1 wording is updated to match.
- **Linear 07 F3+F4** (`a86dc87d`): chapter `linear-maps` with sections `matrix-and-image` and `determinant-area`, lessons `linear-map-basis-image` (L1) and `linear-map-determinant-area` (L2), in `src/learning/content/linearMaps*.ts`. `lesson: false` and the lessonless test exemptions are removed. The poster exemptions (`DemonstrationsPage.test.tsx`, `POSTER_PENDING`) stay for F5.
  - Shared learning code: the new `src/learning/content/chapterOwnedLessons.ts` table replaces the per-chapter `'bezier-patches'` branches in `guidedExamples.ts`, `guidedLessonOwnership.ts` and `lessonCatalog.ts`. A later family (complex 04) now adds one table entry.
  - Engineering and mathematical reviews (Sonnet). Handler repair: the L1 `basis-first-column` text had the grid-line families swapped.
  - Shoelace term: *obrazec z determinantami* (gloss "shoelace"), as in the convexity spec.
  - Two workers: the first reached its budget, and a successor finished from its note.
- **Triangle 04a** notable points graph (`eb159b24`): `NotablePointsGraph` subclasses `PointSetGraph`, whose interface is unchanged. There is no route yet. The engineering and UI/accessibility review (Sonnet) found nothing blocking. Locale: 36 `notable_*` keys after the `hulltrace_*` block. The drag measurement is in `docs/reviews/triangle-geometry/04a-drag-measurement.md` (jsdom only; 89 objects with all overlays on, against the spec's "<50"; no optimization).

## Checks and gaps

- Full unit suite: passed at the linear 07 successor's tree (6716 tests), before 04a's locale move and the handler repair. After that, the focused `just unit` runs passed: linear maps chapter, `lessonMathNotation`, `src/compgeo/notablePoints`, `src/graphs/compgeo` and `src/localization`. tsc and lint were clean at `eb159b24`. **No full suite has run at `eb159b24`**, so run one at the next stable checkpoint, or at F6 with `just check`.
- The linear 07 smoke result is in the push section. Neither the 04a full suite nor its `just build` has its own run; the smoke worker's build covers the build.

## Next, in order

1. If linear 07 is not yet on `master` (see the push section), finish its smoke repairs and push.
2. **Triangle 04b**, the inscribed angle graph (acceptance 2–4 of `docs/tasks/triangle-geometry/04-batch-a-graphs.md`). Follow 04a's pattern and put its locale block after the `notable_*` keys. It uses `circle.ts` (`circlePoint`, `angleBetween`).
3. **Linear 07 F5** (poster clip and example cards; plain cards, since `G-HL` is closed), then **F6** (Batch A gate, `just check`, full smoke in SL/EN, `just linear-map-bench` or a recorded reason). Run media capture only while no other worker is busy. F5 removes the poster exemptions.
4. **Complex 04** registration, lessons and chapter. Add its lessons as one `chapterOwnedLessons` entry. Serialize it with any other registration edit.
5. Triangle 05 (Batch A release: route, real-browser drag measurement, lesson view for the obtuse example's H=(1,6), which the default view hides).

## Open low notes

- `src/demonstrations.ts:26`: the `lesson?: false` opt-out and its filter (~line 91) are now unused. Delete them, or document them as a generic opt-out.
- `getLessonForDemonstration('linear-map')` returns L1 because it is the first registry key. Add a comment, or make it explicit.
- `NotablePointsGraph.tsx:91–95`: the comment says `loadExample` is "one synchronous write", but it is two (`loadModel`, then `setState`). Fix the comment or merge the writes. Validating `exampleId` against the vertices keeps it harmless.
- No 04a host test shows that the `'boundingbox'`/`'up'` listeners are released. They are owned by `session.on`, so this is correct by construction.
- The Terms table says the Slovenian orthocentre name gets "ortocenter" in brackets once. That belongs in the T1 lesson prose.
- The new `linearMap` row in `tests/guided-lessons.smoke.spec.cjs` has `minFrames: 6` (see the smoke result).
- Operational: the worker watcher once crashed with `OSError [Errno 22]` on the transcript path right after launch. A restart fixed it.
- Handoff 5's notes still apply: pushing with a dirty tree through a temporary worktree, the build fingerprint, starting watchers after a delay, and timeouts under load.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium` (`high` for Möbius mathematics). Reviewers: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Sonnet on port 4316. Workers reached the 135k budget in 36–49 turns on lesson and graph slices, so split such slices in two up front (implementation, then checks and repairs).

## Push state

- Linear 07 smoke (Sonnet, port 4316, build at `eb159b24`): passed. The scripted `linearMap` row passed in SL and EN at 390 px, and `minFrames: 6` is correct. The chapter card, all L1/L2 step matrices, the L2 singular step (no inverse control), exit/restore, the live language switch and the plain route all work, at 390 px with no overflow and no console errors. Refreshing mid-lesson restarts at step 1 (not persisted). **For F6:** the board handles are not Tab-focusable; the keyboard reaches the matrix spinbuttons, whose arrow keys work. Decide whether that meets L1's "keyboard alternatives for the handles", or add handle focus. No pointer drag was exercised.
- **Not pushed: rebase conflict, stream stopped.** Rebasing onto `origin/master` conflicted with the Geometry stream's `0af5594b` (convexity 12, registration of the computational-geometry family).
  - `a86dc87d` (linear 07) conflicts in `src/demonstrations.ts`, `src/learning/LearningPage.test.tsx`, `src/learning/chapter/guidedExamples.ts` and `guidedLessonOwnership.ts`.
  - `eb159b24` (triangle 04a), cherry-picked alone, conflicts in `src/localization/sl.ts`/`en.ts`.
  - Only triangle 03 (`24b8c862`) is on `master`. The accepted but unpushed commits are on `origin/stream-maps-handoff-6`. The remote `worktree-stream-maps` holds older divergent history, which was not force-pushed.
  - To resume: rebase the stream branch onto `origin/master`. Resolve each conflict by keeping both sides' registrations, and move linear maps' `chapterOwnedLessons` usage onto whatever convexity 12 changed in `guidedExamples.ts`/`guidedLessonOwnership.ts`. Put the `notable_*` block back after the `hulltrace_*` keys, or after any compgeo block convexity 12 added. Then rerun the full unit suite, tsc, the build and the `linearMap` smoke row before pushing.
