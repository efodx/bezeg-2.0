# Geometry stream — handler handoff 8

Written 2026-11-01 by handler 8 (Opus 5.5, permission mode auto, effort medium) at the 150k soft threshold.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. `node_modules` is a junction to the main checkout: delete the junction itself before removing the worktree.
- `Run state: active` pushed to `master` in `b1c4c35`.
- **Task 12 (convexity F2b registration) is work in progress, committed on the stream branch only and pushed to `origin/stream-geometry`, not to `master`**: see the WIP commit below. It must not reach `master` before the posters exist, because `src/demonstrationPreviewAssets.test.ts` fails for Demonstrations without posters, and CI would fail.
- Untracked files that are not ours to commit: `docs/reviews/convexity-hulls/0[578]-*.log`.

## Done this run

| Item | Where | Notes |
| --- | --- | --- |
| Stream active | `b1c4c35` (master) | G-REG open; `rational.ts` still absent, so triangulation 05 and sweep S0 02 stay blocked. |
| Task files 12, 13, 14 | WIP commit | [12 registration](../../../tasks/convexity-hulls/12-batch1-registration.md), [13 point-set actions + A1/A2 lessons](../../../tasks/convexity-hulls/13-lessons-orientation-area.md), [14 A4 lesson + `algorithm-trace`](../../../tasks/convexity-hulls/14-lesson-convex-hull.md). README row for 12. |
| Task 12 code | WIP commit | Sonnet worker (partial: no tests, posters, build or lint). Family `computational-geometry`, ids `orientation`, `polygon-area`, `convex-hull` with `lesson: false`; factories; own Preset collections in `src/graphs/compgeo/compgeoPresetCollections.ts` registered in `PresetImport.ts`; 10 locale keys; recipes; test updates; architecture row. |
| Handler repairs | WIP commit | (1) The worker made lesson ownership throw for lessonless ids, which would crash every compgeo route (`DemonstrationWorkspace.tsx:52` resolves an owner for every route). Now `getGuidedLessonOwner`/`resolveGuidedLessonOwner` return `undefined` for a lessonless id, `guidedExamples.ts` guards it, `guidedLessonLaunchPath` throws, and a regression test covers all lessonless ids. The pre-fix failure was not observed by running the test (reasoned from the caller). (2) The locale block was moved from the end of `sl.ts`/`en.ts` to after the `hulltrace_*` keys. |

New types in `src/demonstrations.ts`: `LessonlessDemonstrationId`, `GuidedLessonDemonstrationId` (narrow `guidedLessonOwners`, `guidedExamplePreviews.ts`, `guidedExamplePreviewCopy.ts`). F3 removes `lesson: false` and must add the owner entry and preview copy for each lesson.

## Next, in order

1. Run the focused unit tests (command in task 12 Checks plus `src/learning/chapter`). **No test result exists for the WIP:** Claude Code killed handler 8's run (and its watchers) because the system was critically low on memory. `tsc` was clean after the handler repairs. Expect only `demonstrationPreviewAssets.test.ts` to fail (missing posters). Fix any other failures.
2. Posters: the worker flagged that the evidence check in `scripts/demonstration-preview-recipes.cjs` near line 225 asserts `evidence.curves > 0`, which point-set graphs may fail. The recipe viewboxes are guesses. `just build`, then `just preview 4313`, then the selective recapture (task 12 item 5). Look at the three PNGs.
3. `just lint` on touched paths, full `just unit`, `just build`; small-diff engineering review in the main chat (consumers of the new types, Preset key list); smoke of the three routes in both languages (bezeg-smoke, Haiku).
4. Squash nothing. Add the poster commit, fetch and rebase onto `origin/master`, recheck, then `git push origin HEAD:master`. Mark 12 accepted in the convexity README and the stream file.
5. `src/compgeo`-adjacent `rational.ts` landed on master in `4bb0915` (triangle geometry 01). Check whether the circumcentre/circle kernel is there too; if so, triangulation 05 and sweep S0 02 are unblocked (handoff 7, Next 1).
6. Tasks 13 and 14 (F3), then F4 chapter, F5 media, F6 acceptance.

## Environment

- The machine was heavily contended: a path-filtered unit run took more than 10 minutes and the worker's first run never wrote output. If waits repeat, record them in the stream file and use one worker (README test load).
- Handler 8 stopped without launching a successor because memory pressure killed its test run; the supervisor relaunches the `active` stream once it sees no live session.
- The worker budget watcher once failed with "No transcript for this agent id" right after launch; a restart worked.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet `medium`; routine review and narrow smoke on Haiku.
