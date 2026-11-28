# Dispatch: task 08 lane L53 (solids; owns BaseSurfaceGraph first)

You are a `bezeg-worker` (Opus, owner direction 2026-11-27: recipe-less lanes get Opus). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` and the "Rules learned" and "Checks" sections of `briefs/08-lane-L31-L33.md` (apply where they fit a 3D board). Task file `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md` "3D camera" rule: as the Coons pilot, the view director does not run, the camera stays in the graph's own controls in Orodja, cards rely on placement. Study the Coons pilot first (`patch-coons`: `git log --oneline -S "patch-coons" -- src/graphs/patches | tail -5`, its graph file under `src/graphs/patches/`, its declaration test and parity sample) and write down in your notes what the surface recipe is before converting: this lane becomes the recipe for the other surface lanes (L55, L58).

## Lane (`inventory/08-partition.json`)

- Graph: `src/graphs/solids/SolidsGraph.tsx`; panels `src/graphs/solids/SolidsPanels.tsx`.
- Owned base: `src/graphs/patches/BaseSurfaceGraph.tsx` (first lane to own it). Changes there must keep every other surface graph's behaviour: run the patches dir tests and the patch-coons parity/golden after any edit to it. Prefer opt-in hooks over changed defaults.
- Lessons: `src/learning/content/solidsGuidedLessons.ts`, `solidsRevolutionGuidedLessons.ts`, `solidsVolumesGuidedLessons.ts`.
- Own tests: `src/graphs/solids/SolidsGraph.test.tsx`, `SolidsLessonActions.host.test.tsx`, `SolidsLifecycle.test.tsx`, the three lesson tests, and the solids rows of `src/graphs/PresetRoundTrip.contract.test.tsx`.
- Shared files edited concurrently by other workers: `sl.ts`, `en.ts`, `src/localization/fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx`. Re-read before each edit; small edits only.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step); choices at most 4 options; setup and camera in Orodja; mathematics untouched (volumes, solids of revolution: run the existing tests).
- If the conversion needs a contract change (something the declaration API cannot express for a 3D board), stop and report it with the smallest proposal; do not change `src/graphs/base/declare/**` or `src/workspace/**`.
- Parity report runs leave `src/graphs/**/__parity__/*.report.txt`: delete the ones you create, by name.
