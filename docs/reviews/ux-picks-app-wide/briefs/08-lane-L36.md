# Dispatch: task 08 lane L36 (projective-pascal, projective-pole-polar), round 13

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`). Stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**).

Closest finished lanes:
- `9e13f7430` (projective-three-views) and `c50c78a72` (projective-five-point): same folder, point-set style. Both declare no
  pucks, and since `71b3b08ab` they still bind `view` and get a view director.
- `89e4245ee` (recursion-cobweb): framing with must-marks on the key points and a tight `followView`.

Lessons from earlier rounds:
- Frames may highlight only rows present when the step opens.
- Delete retired catalog keys; don't exempt them.
- A multi-graph `*FirstTask.test.tsx` case for a control that became a puck moves to the strip.
- Anchor board text in user coordinates inside the marks, so cards never cover what a step names.
- Never write the canvas-sized `fitBoundingBox` result as the view intent.
- Owner, 2026-11-27: drop board caption lines that only repeat a legend entry or a readout row. See the "Board captions" bullet in `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md` and the Taylor removal `e0bfe3576`.
- List every new file in your report (fragment, `__parity__/*.json`, declaration test): the handler stages them.

## Lane (`inventory/08-partition.json`)

- Demonstrations, one at a time:
  1. `projective-pascal` (`src/graphs/projective/PascalGraph.tsx`);
  2. `projective-pole-polar` (`src/graphs/projective/PolePolarGraph.tsx`).
- Lessons, these graphs' frames only: `src/learning/content/projectiveConicsGuidedLessons.ts`.
- Own tests:
  - `src/graphs/projective/PascalGraph.host.test.tsx`, `PascalLessonActions.host.test.tsx`;
  - `PolePolarGraph.host.test.tsx`, `PolePolarLessonActions.host.test.tsx`, `polePolarModel.test.ts`;
  - `src/graphs/base/sceneReplacementContract.test.tsx`;
  - `src/learning/content/projectiveConicsGuidedLessons.test.ts`, `projectivePascalLesson.test.ts`, `projectivePoleLesson.test.ts`.
- Shared tests: the other `src/graphs/projective/*LessonActions.host.test.tsx`. Standing owner permission: wrap untagged writes in `runAs('learner', ...)` with values unchanged.
- Points are board-owned: shown as rows and legend only, with their row editors as the declared point rows (task 02 decision, as in triangle centres).
- Pucks only for what a lesson step asks the learner to set, flip or compare; name the step for each.
- Mathematics untouched.
- **Catalog keys:** another worker edits `sl.ts`/`en.ts` right now. Put new keys in a per-graph fragment, and list keys to delete from `sl.ts`/`en.ts` in your notes; don't edit those two files.

## Checks (per demonstration)

Run every command in the foreground, one heavy command at a time. The dev server is at `http://127.0.0.1:4483/bezeg-2.0/`.

1. tsc, then lint on changed files.
2. The declaration test: observe it red once.
3. `just graph-check <id> --route <route>` (no leading slash on the route).
4. The golden check: `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t <id>`. Report the diff per state; never re-record.
5. `just unit src/graphs/projective src/graphs/base/sceneReplacementContract src/learning/content/projective src/learning/content/declarationContract src/localization`.
6. `just unit FirstTask`.
7. `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`.
8. Browser shots of each lesson's view-changing steps at 1440x900 and 1280x720 (`just shot`). Look at each PNG and state what you see: no point, label or caption a step names sits under a card, and the board is framed at least about two thirds as large as on master.

Then, once for the lane:
- `just build`;
- `just smoke-lesson <id> --port 4391 --workers=1` per id;
- every `tests/*.spec.cjs` that mentions either id or route (`just smoke <spec>`).

## Return

- At most 300 words, with `file:line`.
- Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L36.md`, written as you go.
- On `HANDOFF`, write done/unverified/next and return partial.
- Shots go in `.command-logs/l36-*.png`.
- Delete scratch files by explicit name, never with globs.
