# Geometry stream: handler handoff 34

Written 2026-11-02 by handler 34 (Opus 5.5, auto, effort medium). It continues [handoff 33](handler-handoff-33.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Handoff reason: context soft threshold (175k).

## Done this run (all on `origin/master`)

- **Sweep 16**, the monotone partition graph (`e3f90da5`), accepted after engineering, mathematical and UI reviews ([eng](../sweep-algorithms/16-review-eng.md), [math](../sweep-algorithms/16-review-math.md), [UI](../sweep-algorithms/16-review-ui.md)). The handler added a clockwise-diagonals test, 14 px type labels and piece fill 0.4. Kept as is: a helper change shows at the last event of its vertex.
- **T2 F6 accepted** ([record](f6-t2-acceptance.md); gap commit `e69e1866`, record `22254d51`).
  - The record covers the matrix (66 rows), doc and test gap fixes, `just check` (8641 tests and the build), and a bilingual smoke: 20 passed, 0 failed.
  - Hosted CI on `22254d51` passed (run 41529409890); the record says so.
- **T3 task files 18–24** (`8adfb012`). The [README](../../../tasks/triangulation-voronoi/README.md#batch-t3--b4-and-b5-task-files-written-2026-11-02-handler-34-t2-released) records seven handler decisions.
  - B5 is its own Demonstration `voronoi-degenerate`, because lessons are keyed one per Demonstration. It is served by `DegenerateSitesGraph extends VoronoiGraph`.
  - `VoronoiGraph extends PointSetGraph`, with the Delaunay circle and selection drawing extracted.
  - Task 18 carries the Fortune reuse review that gates T3.
- CI notes: runs for `2512429b` and `e3f90da5` were superseded by later pushes. A cancelled unit shard made the "Require every check job" gate fail; no test failed.

## In flight

No worker is running. Two results are complete and await handler review.

- **Sweep 17, the monotone triangulation graph** ([task](../../../tasks/sweep-algorithms/17-monotone-triangulation-graph.md), [brief](../sweep-algorithms/17-brief.md)). It is uncommitted in the stream worktree. The report is in `docs/reviews/sweep-algorithms/17-handoff.md` under "Final report (continuation worker)".
  - New: `src/graphs/compgeo/MonotoneTriangulation{Graph,Controls}.tsx`, `monotoneTriangulationRun.ts`, `monotoneTriangulationPresetCollection.ts`, and their run and host tests.
  - Hooks in task 16 files (no behaviour change): `partitionRunOf`, `buildRun`, `sweepControls`, exported helpers in `MonotonePartitionControls.tsx`, and an optional Preset-collection `key`.
  - A `monotonetri_*` key block after `monotonepartition_invalid_step` in `sl.ts`/`en.ts`.
  - Worker checks: `just unit src/graphs/compgeo`, tsc, lint, `just build` and 8 mutations, all as expected. The restores were copies from backups, not checked with `cmp`. The edit-reset mutation covered Reset only.
  - The C3 example has 44 steps; the phase boundary is step 14 and nothing is dead.
  - The piece stacks equal task 15's. Monotone counts against ear clipping are 11 vs 21.
  - The y-monotone Preset is \((4,0),(8,2),(6,4),(9,7),(5,9),(1,8),(3,6),(0,5)\).
  - Triangles are derived from event kinds: each `status-remove` after the first in a vertex group closes one triangle. The worker judges this exact, and a mismatch throws. The math review should confirm it.
- **T3 task 18, the Voronoi drawing module** ([task](../../../tasks/triangulation-voronoi/18-voronoi-drawing.md), [brief](../triangulation-voronoi/18-brief.md)). It is committed as `e2e93593` on branch `worktree-agent-a2c0ff0c70ae0ebe9`, pushed to `origin` but not to master. It is still in worktree `.claude/worktrees/agent-a2c0ff0c70ae0ebe9`, which has a `node_modules` junction: remove it with `cmd /c rmdir node_modules` before `git worktree remove`.
  - Files: `src/graphs/compgeo/voronoiDrawing.ts`, its test (15 tests), an opt-in perf test (`BEZEG_PERF=1`), `docs/reviews/triangulation-voronoi/18-fortune-reuse.md` and `18-perf-raw.txt`.
  - Worker checks: compgeo units (562 tests), lint, tsc and 5 mutations. No build and no browser.
  - jsdom draw cost: 9.2 ms median for 40 sites and 2.0 ms for a 12-site redraw.
  - The item-7 recommendation is that Fortune supplies its own partial drawing (beach line, traced half-edges, circle events). The shared `VoronoiDiagram` stays final-only. The handler has not settled this; record the decision in the T3 README.
  - To merge: cherry-pick `e2e93593` onto the stream branch after sweep 17 is committed, then run the checks and the build.

## Next steps, exactly

1. Finish what is in flight (above).
2. **Accept sweep 17**:
   - engineering, mathematical (stack, phase boundary, counts panel, and the triangle-from-event derivation in `monotoneTriangulationRun.ts`) and UI/accessibility reviews, each a Sonnet `bezeg-reviewer`, in parallel;
   - focused checks;
   - commit with explicit paths, rebase on `origin/master`, recheck, push.
   - No smoke: there is no route until task 18 of the sweep family.
3. **Accept T3 task 18**:
   - engineering and mathematical review;
   - settle the item-7 recommendation (a partial diagram for Fortune) in the T3 README decisions;
   - merge into the stream branch, check, push.
4. Then sweep 18 (S2 registration of the monotone graphs) and T3 task 19 (Voronoi graph), at most two workers at once. Run a worker in an isolated worktree when another worker would otherwise share the stream worktree with a `just build`.

## Risks

- Count-test rebase conflicts with other streams (`lessonCatalog`, `familyChapters`, preview copy, coverage). Mechanical ones: keep both sides.
- CRLF files: write them with Edit or Python binary I/O, never `sed -i` or heredocs.
- `just preview` takes the port positionally (`just preview 4313`), not `--port`.
- A rebase is refused while tracked files are dirty. Push docs through a temporary worktree: `git worktree add --detach <tmp> origin/master`, cherry-pick, push, `git worktree remove --force <tmp>`.
- Local `stream-geometry` holds `60b0e2c7`, a duplicate of `8adfb012`. The next `git rebase origin/master` drops it.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium.
- Self watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), medium effort, high for exact-predicate kernels; at most two at once; budget watcher at 135k, then `HANDOFF`.
- Reviews: `bezeg-reviewer` (Sonnet). Smoke: `bezeg-smoke` (Sonnet).
- Successor launch: `claude --bg -n "geometry handler 35" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"` from the stream worktree. It self-spawns its own successor the same way.
