# Geometry stream — handler handoff 13

Written 2026-11-01 by handler 13 (Opus 5.5, permission mode auto, effort medium) after the 150k soft threshold. Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. `origin/master` = `02a6ac3a` (sweep 07). The local branch is three commits ahead, pushed to **`origin/stream-geometry-h13`** (`0f46eea7`). `origin/stream-geometry` is a stale old branch (`0627de12`); do not push there and never force-push.
  - `67da7944` feat: hull trace lesson actions (convexity 14 part 1): accepted by the handler (diff read, cast removed); scoped `just unit src/graphs/compgeo src/learning`, lint and tsc passed. Not pushed to master yet: push after the full suite runs.
  - `d355d114` **wip**: lesson A4 `convex-hull` (convexity 14 part 2). Review and smoke pending.
  - `0f46eea7` **wip**: interval sweep graph (sweep 08, all items). Review of the 08b part pending.
- The WIP commits are real work, not to be squashed blindly. When accepted, either keep them with a follow-up commit or (handler's choice) leave the history as is; do not amend pushed commits. Rebase only the new commits onto `origin/master` and push as a fast-forward (`git push origin HEAD:master`).
- `node_modules` is a junction to the main checkout: delete the junction itself before removing the worktree. Untracked `docs/reviews/**` logs are not committed.
- No worker is running.

## Done this run

| Item | Commit | Notes |
| --- | --- | --- |
| Sweep 07 interval mode | `02a6ac3a` (on master) | Sonnet `medium` worker; Sonnet engineering + UI/a11y review, no high findings. Handler repairs: pending text named the internal row (new `pointset_interval_pending`, mutation observed); mode-switch range guard now checks the row. Full `just unit` 490 s, tsc, lint, build passed. No smoke: no graph enables intervals at that commit. |
| Convexity 14 part 1 (actions) | `67da7944` | Sonnet worker; 10 host tests, 4 mutations observed. `set-overlay` keeps the step (display change); `set-algorithm` refused by other point-set graphs (`UnsupportedLessonActionError`). `learning/model.ts` and `lessonCatalog.ts` import from `graphs/compgeo/hullTraceRun.ts` (pure, kernel-only imports; accepted). |
| Convexity 14 part 2 (lesson A4) | `d355d114` wip | Sonnet worker: tsc 0, build, `just unit src/learning src/graphs/compgeo/HullTrace` passed, 3 mutations. Worker notes: the −2 test at \((2,0)\) pops \((1,1)\) (text says so); value 0 at \((2,5)\) at press 11; gift wrapping ends on one 5-vertex path; slow-test counter reads 7 at step 1. Smoke row `convexHull` added to `tests/guided-lessons.smoke.spec.cjs` with a hand-counted `minFrames: 17`, never run. |
| Sweep 08 interval sweep graph | `0f46eea7` wip | 08a (items 1, 2, 4–7) reviewed: engineering/math no high/medium; UI one medium (pair link invisible on the sweep line). 08b did item 3 side lists and the repairs (pair link and marks in `comparisonCurve` blue, legend explains the dashed current interval, `intervalsTouch` now: one shared point that is an endpoint of both, intervals not identical). 08b checks: 168 compgeo tests, lint, tsc 0, build; 5 mutations. `PointSetGraph.syncScene` became `protected` (hover redraw). Handler decision on side-list sources recorded in the 08 task. |

## Next, in order

1. **Review 08b** (`git show 0f46eea7`, focus `intervalSweepRun.ts` queue/`intervalsTouch`, `IntervalSweepControls.tsx` `IntervalSweepLists`, hover in `IntervalSweepGraph.tsx`): one Sonnet engineering+math and one UI/a11y reviewer (08a parts were already reviewed). Open questions: the task asks for a current-entry highlight in the queue too, but the queue lists only remaining events (worker left it out; consider highlighting the next event instead); fixed panel ids `interval-sweep-queue-label`/`-status-label` (`IntervalSweepControls.tsx:~143`) clash with two panels; status entries are inline-styled. Then mark 08 accepted in its task, the sweep README and the stream file.
2. **Review and smoke convexity 14 part 2:** F3 review (scene actions, readouts, counts, not prose) by a Sonnet reviewer; `just smoke-lesson convex-hull` through a Haiku `bezeg-smoke` worker (it will exercise the hand-counted `minFrames`), both languages including a live switch (memory: verify both languages). Then mark 14 accepted in its task, the convexity README and the stream file.
3. Full `just unit`, tsc, `just build`; rebase onto `origin/master`, push to `master`.
4. Then, from handoff 12: sweep 09 (Bentley–Ottmann graph; needs a drag measurement at 12 segments, may reuse 08's side list), F4 convexity chapter (moves the interim owners of `orientation`, `polygon-area` and now `convex-hull` in `guidedLessonOwnership.ts`), F5 media, F6; triangulation T1 must register `earClippingPresetCollection` in `presetCollections`.

## Open risks

- `applyPointSetAction` `set-points` parses without `allowIntervals`/`allowSegments`; the S1 lesson slice must pass `this.allowsIntervals()` before a lesson can load an intervals scene.
- Deferred, shared with the segment list: focus falls to the body after Remove; re-lettering after a removal is not announced.
- From handoff 12: lesson card covers the A2 pentagon at 1366×768; `orientation-predict` hides `turn` while the text names line \(pq\); `checkAuthoredAction` uses global `isFinite`.

## Lessons from this run

- Parallel workers in one tree worked when each brief named the other's owned files and required fresh exact Edits on the shared locale files; a worker still made a one-word change outside its list (`syncScene`), so check `git status` for unowned paths before committing.
- Python heredocs in Git Bash mangle non-ASCII (`č`) in match strings; use the Edit tool for locale edits.
- Commit each worker's files with explicit paths as soon as it returns, so concurrent workers' changes stay separable.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet (`high` for exact predicates and kernels, `medium` for graphs and lessons); reviews `bezeg-reviewer` Sonnet; narrow smoke `bezeg-smoke` Haiku. Split lesson and graph slices across two sequential workers (about 110–130k each this run).
