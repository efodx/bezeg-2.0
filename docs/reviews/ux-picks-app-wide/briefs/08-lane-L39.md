# Dispatch: task 08 lane L39 (waves), round 14

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`). Stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**).

Closest finished lanes:
- `4018483ea`: stream B's darboux, plus the caption sweep on accumulation and convexity. It declares a Funkcija formula row and pucks on a function graph.
- `fab86d054`: caption sweep batch 1.
- `89e4245ee`: recursion-cobweb framing (must-marks on key points, a tight `followView`).

Lessons from earlier rounds:
- Frames may highlight only rows present when the step opens.
- The puck snaps off-grid typed values: assert the snap.
- Delete retired catalog keys; don't exempt them.
- A `*FirstTask.test.tsx` case for a control that became a puck moves to the strip.
- Anchor board text in user coordinates inside the marks, so cards never cover what a step names.
- Never write the canvas-sized `fitBoundingBox` result as the view intent.
- Owner, 2026-11-27: drop board caption lines that only repeat a legend entry or a readout row. A formula shown only on the board becomes a declared Funkcija row. See the "Board captions" bullet in `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md`.
- List every new file in your report: the handler stages them.

## Lane (`inventory/08-partition.json`)

- Demonstration: `waves` (`src/graphs/functions/WavesGraph.tsx`).
- Lessons: `src/learning/content/wavesGuidedLessons.ts` and `wavesSamplingGuidedLessons.ts`.
- Own tests:
  - `src/graphs/functions/WavesGraph.test.tsx`, `WavesLessonActions.host.test.tsx`;
  - `src/graphs/functions/waves/wavesPresetCollection.test.tsx`;
  - `src/learning/content/wavesGuidedLessons.test.ts`, `wavesSamplingGuidedLessons.test.ts`.
- Shared test: `src/graphs/functions/FunctionsFirstTask.test.tsx`. Standing owner permission: wrap untagged writes in `runAs('learner', ...)` with values unchanged.
- Pucks: only for what a lesson step asks the learner to set, flip or compare. Name the step for each. Choices have at most 4 options.
- Playback controls without an arbiter key stay in Orodja.
- Mathematics untouched.
- **Catalog keys:** until the handler says otherwise, another worker may edit `sl.ts`/`en.ts`. Put new keys in a per-graph fragment, and list in your notes the keys to delete from `sl.ts`/`en.ts`.

## Checks

Run every command in the foreground, one heavy command at a time. The dev server is at `http://127.0.0.1:4483/bezeg-2.0/`.

1. tsc, then lint on changed files.
2. The declaration test, named after the graph file (`WavesGraph.declaration.test.tsx`); observe it red once.
3. `just graph-check waves --route <route>` (no leading slash).
4. The golden check: `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t waves`. Report the diff per state; never re-record.
5. `just unit src/graphs/functions src/learning/content/waves src/learning/content/declarationContract src/localization`.
6. `just unit FirstTask`.
7. `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t waves`.
8. Browser shots of each lesson's view-changing steps at 1440x900 and 1280x720 (`just shot`). Look at each PNG and state what you see: nothing a step names sits under a card, and the board is framed at least about two thirds as large as on master.
9. `just build`, `just smoke-lesson waves --port 4391 --workers=1`, then every `tests/*.spec.cjs` that mentions waves or its route (`just smoke <spec>`).

If smoke refuses a stale build because another worker changed files, rebuild and retry once, then note it.

## Return

- At most 300 words, with `file:line`.
- Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L39.md`, written as you go.
- On `HANDOFF`, write done/unverified/next and return partial.
- Shots: `.command-logs/l39-*.png`.
- Delete scratch files by explicit name, never with globs.
