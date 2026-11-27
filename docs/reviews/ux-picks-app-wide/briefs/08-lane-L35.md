# Dispatch: task 08 lane L35 (prob-simulation), round 13

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**). Closest finished lanes: `89e4245ee` (recursion-cobweb: must-marks on the key points, a tight
`followView`, a tight opening intent, captions inside the followed frame) and `e743a87f6` (lattice-paths: several views
in one graph, each framed by its real content extent). Lessons from earlier rounds:
- Frames may highlight only rows present when the step opens.
- The puck snaps off-grid typed values: assert the snap, never drop the case.
- Delete retired catalog keys; don't exempt them.
- A multi-graph `*FirstTask.test.tsx` case for a control that became a puck must move to the strip.
- Anchor board captions in user coordinates inside the marks, so cards never cover them.
- Never write the canvas-sized `fitBoundingBox` result as the view intent; the director then shrinks the board to its 1/2.2 limit. Write the tight content box plus margin.
- Pixel-anchored corner captions stay as they are (08 triage).
- List every new file (fragment, `__parity__/*.json`, declaration test) in your report: the handler stages them.

## Lane (`inventory/08-partition.json`)

- Demonstration: `prob-simulation` (`src/graphs/random/SimulationGraph.tsx`, ~1100 lines).
- Lessons, for this graph's frames only: `src/learning/content/randomnessAreaGuidedLessons.ts`, `randomnessGuidedLessons.ts`,
  `randomnessIntervalGuidedLessons.ts`, `randomnessMarkovGuidedLessons.ts`, `randomnessWalkGuidedLessons.ts`.
- Own tests:
  - `src/graphs/random/SimulationGraph.test.tsx`, `SimulationLessonActions.host.test.tsx`, `randomPresetCollection.test.tsx`;
  - the five matching `src/learning/content/randomness*GuidedLessons.test.ts`.
- Shared tests: `src/graphs/ExportPausesPlayback.test.tsx`. Standing owner permission for shared tests you hit: wrap untagged writes in `runAs('learner', ...)` with values unchanged.
- Route: from the graph's `runtime.ts` or the app route table (no leading slash for graph-check).
- Pucks: only for what a lesson step asks the learner to set, flip or compare; name the step for each. Simulation controls
  without an arbiter key (run, step, reset, speed) stay in Orodja, undeclared.
- Seeded randomness: keep every seed and sample sequence unchanged. Mathematics untouched.
- Unused catalog keys: delete from `sl.ts`/`en.ts` in lockstep (grep first). Slovenian control wording: *krmilnik*.

## Checks

Run these in the foreground, one heavy command at a time. The dev server is at `http://127.0.0.1:4483/bezeg-2.0/`.

1. tsc; lint on changed files.
2. Declaration test: see it fail once.
3. `just graph-check prob-simulation --route <route>`.
4. Golden check: `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t prob-simulation`. Report the diff per state; never re-record.
5. `just unit src/graphs/random src/learning/content/randomness src/learning/content/declarationContract src/localization`.
6. `just unit FirstTask`; `just unit src/graphs/ExportPausesPlayback`.
7. `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t prob-simulation`.
8. Browser shots at 1440x900 and 1280x720 of each lesson's view-changing steps (`just shot`). Compare with master's framing. Look at each PNG and state what you see: the content is framed at least about two thirds as large as on master, and nothing the step names sits under a card.
9. `just build`, then `just smoke-lesson prob-simulation --port 4391 --workers=1`.

## Return

At most 300 words, with `file:line`.
- Write notes to `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L35.md` as you go.
- At the `HANDOFF` budget signal, write done/unverified/next in the notes and return partial.
- Save shots as `.command-logs/l35-*.png`.
- Delete scratch files by explicit name, never with globs.
