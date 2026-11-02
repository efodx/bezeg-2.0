# Geometry stream — handler handoff 22

Written 2026-11-02 by handler 21 (Opus 5.5, auto, effort medium) after the 150k soft threshold. Continues [handoff 21](handler-handoff-21.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Branch `stream-geometry` = `origin/master` `68cad435` plus this note. Sources clean; no worker, preview or watcher of this session is running.
- **Accepted and pushed this run:**
  - Sweep 12, lesson C2 (`segment-intersections`): `b7b856af` feat, `b213a37d` docs. Mutations M1, M3–M8 observed failing, M2 equivalent (`12-mutations.log`). Full unit: 7260 passed, plus one load timeout in the untouched `InscribedAngleGraph` drag test, which passes alone. Also: build, `just smoke-lesson segment-intersections` (SL and EN), and a live SL/EN/SL switch at trace step 17 (readouts, lists and progress switched with the same numbers, board labels `s1`–`s4` unchanged, no page errors). The prose's \(s_k\) are the model's segments k, and the board labels them `s${k+1}` (`PointSetGraph.tsx:639`).
  - The C2 host test `BentleyOttmannLessonActions.host.test.tsx` had an unbounded `while` loop driven by `next-step`, which hung the M3 mutant. It is now bounded and asserts the last step.
  - Triangulation 10, the T1 chapter `triangulations-voronoi`: `8f4118d3` feat, `68cad435` docs. Sonnet worker. Its `ear-clipping` section owns the lesson. The ownership-move mutation fails 2 chapter tests. Checks: `just unit src/learning` 1304 passed after the rebase, build, `just smoke-lesson ear-clipping`, and `tests/unified-learning.smoke.spec.cjs` 15 passed. **Breaking:** the old interim example id `lesson.bezier-curves.geometric-properties.ear-clipping` no longer resolves (recorded in the task file and the commit).
- **Not browser-checked:** the chapter page's return-link focus into the ear-clipping section. Unit tests cover it ("learn launches, example links and old routes").

## Remaining, in order

1. **Posters:** blocked on Maps. `validateRecipes(require('./tests/smoke-catalog.cjs'))` fails only for Maps' `triangle-centres` and `inscribed-angle`; the stream's "To Maps" line says so. Once those recipes land, capture every pending id with `node scripts/capture-demonstration-previews.cjs` (see `docs/commands.md` §preview), clear `POSTER_PENDING` (`src/demonstrationPosterPending.ts`) and the `DemonstrationsPage.test.tsx` exemption, and coordinate with Maps so only one stream captures.
2. **F6** for T1 (B1 ear clipping) and sweep S1 (C1, C2): the spec acceptance gates, `just check` once, smoke of the family routes in both languages, and hosted CI after the push. Without posters, CI's catalogue, preview-mapping and motion-poster rows stay red. F6 waits only on those. `interval-sweep` and `segment-intersections` still have the interim owner `bezier-curves/geometric-properties` and are in `CHAPTER_LINK_PENDING`. A sweep chapter (F4) may be needed first: check `docs/specs/sweep-algorithms-lessons.md` for placement.
3. Then: the next batches (triangulation T2, sweep S2) per their READMEs. Write the task files once their kernels are accepted.

## Risks

- The machine is slow and memory-tight. A full `just unit` took 20 min and a focused `src/learning` run 17 min. Run heavy checks in the foreground, one at a time, and wait on long ones with an `until grep` loop (≤600 s per call).
- Older trace host tests still use unbounded `while (...) click('next-step')` loops (`BentleyOttmannGraph.host.test.tsx:98,167,361,481`, `EarClippingGraph.host.test.tsx:83,117`, `EarClippingLessonActions.host.test.tsx:101`, `HullTraceLessonActions.host.test.tsx:60`, `IntervalSweepGraph.host.test.tsx:102`, `IntervalSweepLessonActions.host.test.tsx:97`). A broken Next hangs them instead of failing. Bound them in a small test-only slice when convenient.
- On Windows, `subprocess.run(..., timeout=)` with `shell=True` does not kill vitest. Use `Popen` and `taskkill /T /F` on timeout. Check for stray `vitest` processes from this worktree after a kill.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers `bezeg-worker` Sonnet medium, one at a time; reviews `bezeg-reviewer` Sonnet.
