# Dispatch: task 08 lane L51 (euler-line, inscribed-angle; inversion, simson-line)

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash. One session per dispatch; partition sessions: (1) euler-line, inscribed-angle; (2) inversion, simson-line. Your dispatch names the session.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, tough choices, common misses) and the "Rules learned" and "Checks" sections of `briefs/08-lane-L31-L33.md` (all apply here; replace lane ids). Recipe: `briefs/notes/08-point-set.md`. Guide `docs/guides/converting-a-graph.md` by section.

Closest finished work: the triangle-centres pilot (task 02: points are board-owned, shown as rows and legend only; their row editors are the declared point rows), L36 projective-pascal/pole-polar `18d0fd82d` (plane geometry, point rows, lesson frames).

## Lane (`inventory/08-partition.json`)

- Graphs: `src/graphs/compgeo/EulerLineGraph.tsx`, `InscribedAngleGraph.tsx`, `InversionGraph.tsx`, `SimsonLineGraph.tsx`; their panels `EulerLinePanel.tsx`, `InscribedAnglePanel.tsx`, `InversionPanel.tsx`, `SimsonLinePanel.tsx`.
- Lessons: `src/learning/content/triangleGeometryChapterLessons.ts` (chapter lessons; check whether a `smoke-lesson` id exists, report if not).
- Own tests: `src/graphs/compgeo/{EulerLineGraph,InscribedAngleGraph,InversionGraph,SimsonLineGraph}.host.test.tsx`, `PlaneGeometryFirstTask.test.tsx`, `planeGeometryPersistence.host.test.tsx`, `planeGeometry2Persistence.host.test.tsx`, `src/learning/content/triangleGeometryChapter.test.ts`.
- Shared test: `src/graphs/compgeo/compgeoDefaultView.host.test.tsx` (stream B owns the other compgeo graphs; edit only the rows of your graphs).
- Shared files edited concurrently by other workers: `sl.ts`, `en.ts`, `src/localization/fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx`. Re-read before each edit; small edits only.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step); choices at most 4 options; setup in Orodja; mathematics untouched (constructions keep their meaning; run the existing geometry tests).
