# Geometry stream: handler handoff 29

Written 2026-11-02 by handler 29 (Opus 5.5, auto, effort medium) after the 150k soft threshold. Continues [handoff 28](handler-handoff-28.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- **Branch:** `stream-geometry`. Everything on it is pushed to `origin/master`, including this note's commit.
- **Old remote branch:** `origin/stream-geometry` (`0627de12`) is an old line; leave it alone and never force-push. `origin/geometry-t2-14-wip` is obsolete (its commit is on master).
- **Running processes:** no worker or preview from this session is running.
- **Done this run:**
  - **T2 task 14 accepted**, except item 5 (posters):
    - Commits: `0447e7a4` registration, `831a1958` smoke repairs, `d42fd99a` drag measurement, `18dd271f` acceptance, plus a hash-fix docs commit.
    - Evidence is at the end of the [task file](../../../tasks/triangulation-voronoi/14-t2-registration.md). The evaluation-log entry is written.
  - **Smoke repairs (`831a1958`):**
    - `PointSetGraph.afterBoardPress` defers board-press selection to a microtask. Pressing inside JSXGraph's pointer dispatch had thrown "reading 'hasPoint'".
    - `DelaunayGraph.initialView()` is `[-2, 6, 7, -1.5]`.
  - **Drag measurement** ([record](../triangulation-voronoi/14-perf.md)):
    - At 40 points the frame median is one 60 Hz tick.
    - The worst frames are 83 ms by default and 233 ms with the edge and angle overlays.
    - Decision: no curve batching now. Revisit if lesson 15 or 16 drags with overlays at 40 points.
    - Script: `scripts/triangulation-browser-perf.cjs`.
  - **Poster recipes for both routes** (`d35cccb2`): both captured and passed their evidence checks, but nothing was published (see Remaining 1).

## Remaining, in order

1. **Posters for `point-set-triangulation` and `delaunay` (blocked across streams).**
   - **Why nothing was published:** `scripts/capture-demonstration-previews.cjs:776` requires every active Demonstration to be captured. `bspline-basis` and `bspline-deboor` (curves stream) have no recipes, and `euler-line` (maps stream) has a recipe but no retained media.
   - **Options:**
     - Recapture all five ids together once the curves stream adds its bspline recipes. Check `grep -n "bspline-" scripts/demonstration-preview-recipes.cjs`.
     - Or ask the owner whether partial publishing may be added to the capture script.
     - Do not change the capture script without that decision.
   - **Capture flags:** the worker needed `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`. Since the manifest commit `fe8be6b0`, only recipe additions changed among the fingerprinted files.
   - **Windows shim:** on Windows the script's `git diff -- <~670 paths>` fails with `spawnSync git ENAMETOOLONG` (line ~550). The worker used a preload shim outside the repo; details in `posters-t2-handoff.md` (untracked). This is worth a small tooling fix of its own.
   - **Pending list:** both ids stay in `POSTER_PENDING` until then.
2. **Task 15** ([task file](../../../tasks/triangulation-voronoi/15-point-set-triangulation-lesson.md)): split it into two sequential Sonnet `bezeg-worker` slices.
   - **15a:** the three `point-set` actions (`set-triangulation`, `flip-edge`, `select-edge`), validation in `lessonCatalog.ts`, rejection by `EarClippingGraph`/`HullTraceGraph`, and tests. Template: task 09's action slice.
   - **15b:** lesson B2 in `compgeoGuidedLessons.ts`, removing `lesson: false` and the id from the list in `lessonCatalog.test.ts`, and the frame/readout tests.
   - **After both:** engineering review, then the guided-lesson smoke row and `just smoke-lesson point-set-triangulation` (SL and EN, live switch).
   - **Check:** the recipe comment was wrong about T0 (it has 7 triangles: 2n − 2 − k with n = 7, k = 5), so check every count quoted in lesson prose against the readout.
3. **Tasks 16 and 17**, one code worker at a time. **S2 kernel 14** (sweep) may interleave.
4. **Stream lines:** keep them current. Family 2 now says 14 is accepted with posters pending.

## Checks run this run

- At `3296b119` (task 14 before the repairs, on master at the time): tsc, the full unit suite (1081 s, passed) and `just build`.
- At `a175648b` (repairs): tsc, lint on the touched files, `just unit src/graphs/compgeo --maxWorkers=2`, `just build`, a mutation check of the deferral test, and a browser A/B on the smoke click sequences.
- After rebasing onto `002d14c8`:
  - tsc;
  - the enumerating test files of the registration commit (DemonstrationsPage, Routes, demonstrations, PresetCatalog, familyChapters, lessonCatalog);
  - both host tests;
  - `demonstrationPreviewAssets.test.ts`.
- Recipes: `node --test scripts/demonstration-preview-capture.test.cjs` and eslint.
- Logs: `docs/reviews/triangulation-voronoi/14-*.log` and `docs/reviews/feature-streams/geometry/posters-t2-*.log` (untracked).
- Hosted CI was green through `41421282869`. Check the run for `e47d5341` and later with `gh run list --branch master -L 3`.

## Risks

- **Memory:** it is tight; run heavy checks one at a time. The full unit suite takes about 18 minutes.
- **Rebase conflicts:** `lessonCatalog.test.ts` conflicted twice. Other streams release lessons and shrink the no-lesson id list; keep our ids and drop theirs.
- **LaTeX in docs:** write it with the Write or Edit tool, not a heredoc.
- **Never stage:** `src/demonstrationMotionAssets.ts`, smoke screenshots or JSON, or the untracked logs.
- **Host tests and the pointer path:** `triggerEventHandlers(['down'])` in host tests is synchronous and cannot show browser pointer-dispatch defects. Board-press handlers that rebuild overlays should use `afterBoardPress`.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium.
- Workers: `bezeg-worker`, Sonnet medium, one code worker at a time. Keep first slices small.
- Reviews: `bezeg-reviewer`, Sonnet for engineering and mathematics, Haiku for routine UI.
- Smoke: `bezeg-smoke`, Sonnet for broad runs and Haiku for narrow rechecks. Ask smoke workers to keep repro scripts in the job tmp directory; it made the A/B possible this run.
