# Geometry stream: handler handoff 40

Written 2026-11-03 by handler 40 (Opus 5.5, auto, effort medium). Continues [handoff 39](handler-handoff-39.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run

1. **Hosted CI at start:** `3b5c93c1` passed. `65fbad83` had failed lint, which `6754e336` had already fixed.
2. **Sweep S2 F6 accepted** and pushed to `origin/master`. Commits `3c3a4c91` (gap tests and docs) and `39768524` (record and the Slovenian number-agreement fix); [record](f6-s2-acceptance.md).
   - Evidence: the matrix (53 rows), 18 gap assertions each with an observed mutation, `just check` at `3b5c93c1`, and the bilingual smoke (22/22).
   - The piece readout now reads "Kos 2: število oglišč 4, število trikotnikov 2".
3. **T3 23a, 23b and 24b implemented** by three Sonnet workers in `agent-a2db2ea2615a0587f`:
   - 23a: the `set-mode` action and lesson B5. Return in [23a-return.md](../../triangulation-voronoi/23a-return.md).
   - 23b: `compgeoVoronoiDegenerateLesson.test.ts` (6 tests, 10 mutations) and the extended smoke row.
   - 24b: the `voronoi-degenerate` chapter section, the registry entry (which `?learn=1` needed), the ownership move and the removal from `CHAPTER_LINK_PENDING` (4 mutations). The worker reported `smoke-lesson voronoi voronoi-degenerate` at 4/4.
   - **Integrated into the stream branch** as one patch over `39768524`. The count conflicts were resolved by keeping master's lists and adding the T3 delta: `authoredChapterCoverage` 110, preview copy 96 lessons and 103 entries, `prob-summary` the only lessonless id, and `voronoiDegenerate` in `LESSONS`. The handler's integration checks are in `docs/reviews/triangulation-voronoi/t3i-*.log` (status below).

## State of the T3 integration

Commit `ef81f45c` on branch `stream-geometry`, also pushed to `origin/geometry-t3-23-24b` (`origin/stream-geometry` is an older diverged branch; not force-pushed). It is **not on master** and **not yet accepted**. Integration checks on that tree:

- tsc, `just lint` and `just build` pass.
- `just smoke-lesson voronoi voronoi-degenerate` passes, sl and en.
- `just unit src/learning src/graphs/compgeo`: 2397 passed, 3 skipped, 1 failed. The failure is the functions-stream `guidedExamplePreviews` test already failing on master.

Missing for acceptance: the review, the chapter-page browser check, a full unit run and the acceptance record. Rebase onto `origin/master` before pushing to master.

## Next steps, exactly

1. If the T3 integration commit is not yet on `origin/master`, finish acceptance of tasks 23 and 24b:
   - Run a full `just unit` (the curves and functions failures below may still be on master). Recount if counts conflict.
   - Get one Sonnet `bezeg-reviewer` engineering review of the T3 diff (`git show` of the integration commit). Add a mathematical review of the B5 quoted values against the kernel: determinant −30 and 0, vertex degrees, and the collinear case with 4 lines and 0 vertices. Use [23a-return.md](../../triangulation-voronoi/23a-return.md) as the table.
   - Check the chapter page `/learn/triangulations-voronoi` in sl and en with the new section, its activity link and the return link.
   - Write `docs/reviews/triangulation-voronoi/23-acceptance.md`, update tasks 23 and 24 and the stream row, and push.
2. **T3 F6** (B4 and B5), on the [f6-s2-acceptance.md](f6-s2-acceptance.md) template:
   - the matrix from a reviewer;
   - gap tests with mutations;
   - docs: `docs/current-architecture.md` still says the Voronoi graphs are "registered without a lesson yet" (fix it);
   - `just check`;
   - the bilingual smoke of `voronoi` and `voronoi-degenerate` on the 4313 preview;
   - hosted CI.
3. After T3 F6, S3 (C5 Fortune) becomes possible. Its release condition is T0 and T3 accepted plus a beach-line performance measurement. Its task files are not written yet.
4. Worktree cleanup needs the owner (`--force` and `-D` were refused before):
   - the integrated agent worktrees `agent-a2db2ea2615a0587f` (23a/23b/24b) and `agent-aa916253880c89954` (S2 gaps), plus those listed in handoff 39;
   - branches `worktree-agent-ae1c6730a8e760de2` and `t3-20-backup`.

## Risks and lessons

- **Master was red from other streams** when I pushed:
  - `eed10ca6` (curves) and `0aa19043` (functions) both failed hosted CI.
  - Locally, `guidedExamplePreviews.test.ts` fails "publishes the school-function-graphs example cards". The functions commit `11926a7d` added `view` to the `rat-pole-oblique` scene without updating its preview-copy entry.
  - Both belong to those streams. Check `just ci` before pushing, and do not "fix" their files unless they are still red and idle.
- **My mistake:** my push command did not gate on the unit result. I pushed `39768524` after a `just unit src/learning` that failed, though only on the functions test above. Chain pushes with `&&` after the check, or read the status first.
- The lesson model has **no prerequisite link field**. "Links" to another lesson means naming it in prose, and real links live in chapter sections. Both the S2 record and 23b used that reading.
- Counts conflict on every rebase. Recount from the failure messages.
- Smoke evidence folders (PNGs, about 14 MB) stay untracked, as with earlier records; only the `.md` table is committed. Run `just lint` after copying any `.cjs` or `.mjs` into `docs/reviews`.

## Live processes

None. The 4313 preview was stopped, and every worker returned.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), `isolation: worktree`, at most two at once, watcher at 135k. Reviews: `bezeg-reviewer` (Sonnet). Smoke: `bezeg-smoke` (Sonnet).
- Successor launch, from the stream worktree: `claude --bg -n "geometry handler 42" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor starts its own successor the same way and tells it to do the same.
