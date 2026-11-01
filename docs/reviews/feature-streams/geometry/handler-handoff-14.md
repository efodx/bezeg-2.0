# Geometry stream — handler handoff 14

Written 2026-11-01 by handler 14 (Opus 5.5, permission mode auto, effort medium) after the 150k soft threshold. Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Previous: [handoff 13](handler-handoff-13.md).

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. `origin/master` = `cfe2bbc2` (pushed this run). The local branch is ahead by `aa9f4e19` (docs: plan convexity 15), `9817fd72` (wip 09a), `7d9d8929` + `3f76a872` (wip 09b; the first staged only the CSS rename and perf note, the second carries the code), and this note's commit, all pushed to **`origin/stream-geometry-h14`**. Never push to the stale `origin/stream-geometry`; never force-push.
- `node_modules` is a junction to the main checkout: delete the junction before removing the worktree. Untracked `docs/reviews/**` logs stay uncommitted (except `09-perf.md`, committed).
- No worker is running.

## Done this run

| Item | Commit | Notes |
| --- | --- | --- |
| Convexity 14 (actions + lesson A4) | `b3ed5795` docs; on master | F3 Sonnet review: no high/medium (low: weak worked-example token checks in `compgeoHullLesson.test.ts:108-113`, accepted). Haiku smoke: `just smoke-lesson convex-hull` passed (`minFrames: 17`), bilingual walk with a live SL→EN switch, no console errors; screenshot checked by handler. |
| Sweep 08 interval sweep graph | `22c9b5f4` fix, `cfe2bbc2` docs; on master | 08b engineering+math and UI/a11y Sonnet reviews (no high). Sonnet repair worker: stale hover dropped on run/step change, literal queue test, `useId`, status bounds visible + title, CSS current/next mark distinct from focus ring, queue head = next event (task text updated). Handler: replaced a duplicate hidden class with Bootstrap's global `visually-hidden`. Full `just unit` 502 s, tsc, lint, build passed at `b3ed5795`+repairs. Side-list CSS never seen in a browser (no route yet). |
| Convexity 15 F4 chapter | `aa9f4e19` (task file only) | **Blocked**: build on the Maps stream's shared `chapterOwnedLessons` table (`a86dc87d`, only on `origin/stream-maps-handoff-6`), which rewrites the same shared learning files. Start 15 only after it reaches `master`. |
| Sweep 09a Bentley–Ottmann graph | `9817fd72` wip | Sonnet worker, hit 135k → HANDOFF; note [09a-handoff.md](09a-handoff.md). Items 1, 2, 4–8; kernel matches the spec's 13 events and statuses. Decisions recorded in the 09 task: 1-based segment names, step 0 after initial schedules, 9 neighbour tests vs 6 pairs (lesson must not claim fewer), fractions as text. |
| Sweep 09b side lists, perf | `7d9d8929`, `3f76a872` wip | Fresh Sonnet worker: shared `SweepSideLists.tsx` (+ `SweepSideLists.css`, renamed from `IntervalSweepLists.css`) used by both sweep graphs; DOM test of the 13 events/statuses; refusal mutation observed (4 failures). Checks: `just unit src/graphs/compgeo` 204 tests, tsc, lint, build. Perf ([09-perf.md](09-perf.md)): jsdom, 12 segments, 40 drags: median ≈20 ms, max 29–38 ms; no optimisation. |

## Next, in order

1. **Review sweep 09** (`git diff cfe2bbc2..3f76a872 -- src`): Sonnet engineering + math (readouts, exact fractions, status order per spec acceptance 4, refusals, disposal; the shared `SweepSideLists` refactor must not change 08's behaviour) and Sonnet UI/a11y (side lists, hover, current marks covering a crossing's segments, a just-popped upper endpoint having no list mark until `enter`). Open: `BentleyOttmannGraph.perf.test.tsx` asserts median < 250 ms in the unit suite — decide whether a timing assertion belongs there (flake risk on a loaded machine) or should become a recorded measurement only. Repair, then full `just unit`, tsc, lint, build; mark 09 accepted in its task, the sweep README and the stream file; rebase onto `origin/master` and push to `master`.
2. Convexity 15 F4 chapter once Maps' `chapterOwnedLessons` is on `master` (check `git log origin/master -- src/learning/content/chapterOwnedLessons.ts`). Otherwise skip to 3.
3. From handoff 12/13: S1 lesson slice (`set-points` must pass `this.allowsIntervals()`/segments before a lesson loads an intervals or segments scene), F5 media, F6; triangulation T1 must register `earClippingPresetCollection` in `presetCollections`.

## Open risks

- Side-list CSS (tint, left bar, ≤400px wrapping) and both sweep graphs are unseen in a browser until registration (S1 F2b); check them then.
- Lesson card covers the point cluster at 1366×768 in A2 and A4 (convex-hull screenshot `14-shots/convex-hull-after-switch-en.png`).
- Deferred from 13: focus to body after Remove; re-lettering after removal not announced; `orientation-predict` hides `turn` while text names line \(pq\); `checkAuthoredAction` uses global `isFinite`.

## Lessons from this run

- `git add` with one stale path aborts the whole add; the commit then holds only what was staged earlier. Check `git show --stat HEAD` before pushing.
- Verify worker claims about global CSS against the built CSS (`build/assets/*.css`): Bootstrap supplies `visually-hidden`.
- A graph slice with tests plus perf still exceeded one Sonnet worker (09a stopped at 135k); split graph core and side lists/perf from the start.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet (`medium` for graphs and lessons, `high` for exact kernels); reviews `bezeg-reviewer` Sonnet; narrow smoke `bezeg-smoke` Haiku.
