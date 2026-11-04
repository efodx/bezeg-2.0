# Geometry stream: handler handoff 49

Written 2026-11-05 by handler 49 (Opus 5.5, auto, effort medium). Continues [handoff 48](handler-handoff-48.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watcher passed the 175k soft threshold after task 20's rebase.

## Done this run

1. **Hosted CI for 1cbda5fc:** run 41678176456 succeeded.
2. **Task 18 accepted** (point-in-polygon graph), master `8dafd3d8`. The worker corrected test expectations, not the graph: \(q=(1,3)\) has 3 crossings. Review: no blocking finding; the "values hidden" text was made impersonal. The carry-over for task 21 is recorded in [21](../../../tasks/convexity-hulls/21-lesson-point-in-polygon.md): hide `ray` in the predict step; extend `POINT_SET_OVERLAY_NAMES` and `set-query-point`.
3. **Task 19 accepted** (hull robustness graph), master `4bc016c7`.
   - Worker fix: tiny double values had shown as "0".
   - Engineering and UI/accessibility reviews found 2 medium and 9 low findings, all repaired by a repair worker (brief 19c), each with a mutation-observed test.
4. **Fix:** the hull-trace live status doubled the full stop after a note (found by the smoke). Local commit `ab3d27ca`, with a test that fails under the old join.
5. **Task 20 accepted** (registration of both routes, Presets, recipes, smoke, and 19's timing: switch median 20 ms, max 62 ms). Local commit `7a5ff879`.
   - Rebase conflicts were resolved as unions: 109 demonstrations; families `[..., 6 (bspline), ..., 15 (compgeo), 5]`; `POSTER_PENDING` = the two new ids (master had captured geometric-series and conic-focal); `CHAPTER_LINK_PENDING` and the no-lesson list gained `bspline-blossom` + our two; the `LINE_DEFINED_IDS` union includes master's `geometric-series`.
   - Gate at `7a5ff879`: tsc 0. Focused units: 4849 passed; 1 failure, a stale cache, passed on rerun (`49-push2-*.log`). Build passed. All pushed with this note.

## Branch state

- `master` = `4bc016c7`-based upstream. Local `stream-geometry` = origin/master + `ab3d27ca` + `7a5ff879` + this note. **If this note is on origin/master, the push gate passed.** If not, rerun the gate (`npx tsc --noEmit --pretty false`; `just unit src/compgeo src/graphs/compgeo src/graphs/base src/demonstrations.test.ts src/demonstrationPreviewAssets.test.ts src/Routes.test.tsx src/learning/runtime src/learning/content src/learning/chapter src/localization --maxWorkers=2`, which takes over 10 minutes, so run it in the background; `just build`), then fetch, rebase and push.
- The `guidedExamplePreviews.test.ts` failure seen during task 20 was a stale Vitest cache. It passed after clearing `node_modules/.vite/vitest` and `node_modules/.vitest-cache`.

## Next steps, exactly

1. Confirm hosted CI for the push containing `7a5ff879` (`gh run list --branch master`).
2. Task 21 (lesson A3 point-in-polygon), then 22 (lesson A5), then 23 (chapter sections), then F5 (posters: capture `point-in-polygon` and `hull-robustness`, empty `POSTER_PENDING` first per handoff 48's risk), then F6. Split each brief to ~30 worker turns, and run the host test early.
3. Task 22 note: `setAlgorithm` non-chain now throws `UnsupportedLessonActionError`; Play and Next are refused in Kettner mode; the view follows a mode change from a scene change.
4. **Worktree and branch cleanup needs the owner.** `origin/geometry-batch2-wip` can be deleted now that 18 and 19 are on master. The lists are in handoffs 40, 41, 43 and 44, plus `origin/geometry-fortune-lesson-wip` and `origin/geometry-fortune-chapter-wip`. Ask before acting.

## Risks and lessons

- The weekly Sonnet limit stopped a smoke worker mid-run. It resumed with SendMessage after the reset, and its saved work was intact.
- Master moves every few minutes. Rebase right before the push, and expect the enumerating lists to conflict.
- The full focused unit gate now exceeds the 600 s foreground timeout. Run it in the background.

## Live processes

The 215k self-watcher, which ends with this session. No preview is running.

## Settings to keep

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, high), reviews `bezeg-reviewer` (Sonnet), smoke `bezeg-smoke` (Sonnet). At most two at once, each with a 135k watcher.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 51" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own the same way and tells it to do the same.
