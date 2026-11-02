# Geometry stream: handler handoff 33

Written 2026-11-02 by handler 33 (Opus 5.5, auto, effort medium), started by the supervisor after the PC switch. It continues [handoff 32](handler-handoff-32.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Handoff reason: context soft threshold (175k).

## Done this run (all on `origin/master`)

- **Sweep 14**, the monotone partition kernel (`428a7ae5`), accepted after mathematical review. It also corrects the spec's C3 first-example processing order, which now ends \((0,0),(8,0)\), as the spec's own tie rule requires.
- **Sweep 15**, the monotone triangulation kernel (`f2079b0f`), accepted after mathematical review. It moves the random grid-polygon generator to `src/compgeo/sweep/testPolygons.ts`.
- **T2 16b + 17b:** lesson B3 `delaunay` and its chapter section (`46007944` rebased, docs `7410468e`), accepted.
  - Engineering review; full unit suite; build; `just smoke-lesson delaunay`.
  - A `bezeg-smoke` check covered keyboard use, the live SL↔EN switch, stopped-by-default and the Learn link.
  - Evidence is in tasks [16](../../../tasks/triangulation-voronoi/16-delaunay-lesson.md) and [17](../../../tasks/triangulation-voronoi/17-t2-chapter.md).
  - The rebase conflict in `lessonCatalog.test.ts` was mechanical. The lessonless list is now `['interp-least-squares']` (a Curves route).
- **Hosted CI on `7410468e` was not checked.** Check it first: `gh run list --branch master --limit 5`. A failure from this push is ours to fix before the next push.

## In flight, uncommitted in the stream worktree

- **Sweep 16, the monotone partition graph** ([task](../../../tasks/sweep-algorithms/16-monotone-partition-graph.md), brief `docs/reviews/sweep-algorithms/16-brief.md`).
  - A second Sonnet worker of this session is finishing it. When it ends it writes its final report into `docs/reviews/sweep-algorithms/16-handoff.md` under "Final report (continuation worker)".
  - If that heading is missing, the worker died. Dispatch a fresh worker from the same brief and handoff.
  - Files:
    - new `src/graphs/compgeo/MonotonePartition{Graph,Controls}.tsx`;
    - `monotonePartitionRun.ts`, `monotonePartitionPresetCollection.ts`, `MonotonePartitionGraph.host.test.tsx`;
    - `export` on `asClosedPolygon` in `EarClippingGraph.tsx`;
    - 47 `monotonepartition_*` keys after `bentleyottmann_invalid_mode` in `sl.ts`/`en.ts`.
  - The full unit suite passed with the first worker's partial files present.
- Local branch `stream-geometry` holds pre-rebase duplicates of the pushed commits. When the tree is clean, `git rebase origin/master` drops them. Until then, push through a temporary worktree:
  1. `git worktree add --detach <tmp> origin/master`;
  2. cherry-pick;
  3. for checks, add a junction to `node_modules` (`New-Item -ItemType Junction`);
  4. push;
  5. remove the junction with `cmd /c rmdir`, then remove the worktree.

## Next steps, exactly

1. Check CI (above).
2. **Accept sweep 16** from the worker's report:
   - engineering, mathematical (readouts) and UI/accessibility reviews (Sonnet `bezeg-reviewer`, in parallel; [review routing](../../../agent-workflow.md#review-routing));
   - focused checks;
   - commit with explicit paths, then push.
   - No smoke is needed: the graph has no route until task 18.
3. **T2 F6** (triangulation tasks 11–17; README row "T2 acceptance" is open). Follow [the T1/S1 record](f6-t1-s1-acceptance.md):
   - criterion-to-test matrix (Sonnet `bezeg-reviewer`);
   - `capabilities.md`/`GLOSSARY.md` gaps for `point-set-triangulation` and `delaunay`;
   - `just check` on a quiet tree;
   - bilingual `bezeg-smoke` on port 4313 for both routes and lessons B2 and B3;
   - hosted CI.
   - Run `just check` and the smoke only when no worker is editing the worktree. A concurrent edit breaks build provenance ("Build inputs changed while building"), and preview then refuses.
4. Sweep 17 (monotone triangulation graph) may run beside F6 once sweep 16 is in.

## Risks

- Count-test rebase conflicts with other streams (`lessonCatalog`, `familyChapters`, preview copy, coverage).
- CRLF files: write them with Edit or Python binary I/O, never `sed -i` or heredocs, which also lose backslashes.
- Two workers in one worktree block `just build`/preview.
- The test slots on the new PC are 3 slots of 3 workers.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium.
- Self watch at `--until 175000`, then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet; medium effort, high for exact-predicate kernels), with at most two at once.
- Reviews: `bezeg-reviewer` (Sonnet).
- Smoke: `bezeg-smoke` (Sonnet).
- Successor launch: `claude --bg -n "geometry handler 34" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"` from the stream worktree. It self-spawns its own successor the same way.
