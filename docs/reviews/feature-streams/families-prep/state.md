# Families-prep state note

Handler 9 handed off on 2026-11-12 to handler 10. The worktree is on branch `worktree-stream-families-prep-2`. Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take minutes while other streams hold the two test slots (`just check-changed` 15–25 min). Run long checks in the background.
- Publish with `just publish --background --recipe runtime --base <last published local commit> --commits <id,...>` (the `tooling` recipe does not cover `tests/*.spec.cjs`; use `runtime`), then check `just publish --status`. `.command-logs/h9-pubci.sh <local short sha>` waits for a publish and then watches its hosted CI run (`bash .command-logs/h9-pubci.sh <sha>` in the background); the owner asked that this stream keep master's CI green.
- If a publish fails at `reconcile`, abort the rebase in the kept publish worktree (`git -C <publish worktree> rebase --abort`), rebase only your new commits here with `git rebase --onto origin/master <last published local commit>`, resolve mechanically, rerun `just check-changed`, and publish on the new base. Do not rebase while a worker or a check runs in this tree; stop a worker's leftover background run with TaskStop on that worker (killing processes is denied by auto mode).
- Run `git diff --cached --check` before committing.
- To check something against committed code while workers edit the tree: `git worktree add ../<name> HEAD`, copy the files, junction `node_modules` (`New-Item -ItemType Junction`); remove the junction with `cmd /c rmdir` BEFORE `git worktree remove --force`.
- Remind reviewers and smoke workers: never bare `npx vitest`/`npm test`/playwright test runs. Smoke workers build a copy (`npx vite build --outDir .command-logs/<x>/site`) and serve it on their own port. Broad smoke goes to Sonnet. Working smoke scripts: `.command-logs/f2b-cl-smoke/`, `.command-logs/f2b-sl-smoke/`, `.command-logs/f2b-mp-smoke/`.
- Master has a teardown sweep (`src/graphs/base/graphTeardownContract.test.tsx`, `BEZEG_GRAPH_TEARDOWN`) instead of per-graph StrictMode tests; don't add StrictMode tests. Sweep filter for a slice: `BEZEG_TRANSIENT_STATE`, `BEZEG_PRESET_ROUNDTRIP`, `BEZEG_GRAPH_TEARDOWN` = ids.
- The CI browser smoke `tests/demonstrations.smoke.spec.cjs` checks every route; run it locally for new routes before publishing: `just smoke-built tests/demonstrations.smoke.spec.cjs --grep "<ids>"` after a `check-changed` build. A surface route without editable points needs `NO_POINT_SURFACE_IDS`; a text-only scene needs `TEXT_SCENE_IDS`.

## Done

- F0, F1, F2a for all fifteen families; **F2b for all fifteen families** (handlers 7–9).
- Handler 9 (local id → pushed; after a rebase onto master's teardown-sweep commit `84c25138`, the pushed ids equal the local ones):
  - Descent, phase portrait, logistic map `183b6076` (`/curve-geometry/descent`, `/analysis/phase-portrait`, `/analysis/logistic-map`); smoke repair `93d9eba9` (390 px first load framed for a transient height; visible reduced-motion reason). Notes `notes/f2b-mechanics-phase.md`, `-smoke.md`.
  - Solids, contour map, linear program `67261862` (`/analysis/solids` surface, `/analysis/contours`, `/analysis/linear-program`); smoke repair `d45335cb`. Notes `notes/f2b-solids-levelsets.md`, `-smoke.md`. Contour Preset key `contour` → `contour-map` (no route used it).
  - CI repair `311c4547`: hosted smoke failed on `solids` (no editable points, no preview recipe); spec declares it in `NO_POINT_SURFACE_IDS`. CI green at `311c4547`. A `curve-editing-modes` Save-tab timeout in the same run was a flake (12/12 local repeats passed).
  - Complex power, Euler `06a5ea0d` (`/complex-power`, `/complex-euler`, `src/graphs/complex/batchD/`; Euler Preset key → `complex-euler`); linear-map Batch D stays modes of `/linear-map` (tracedet Preset file import view fixed). Legend helpers moved to `src/graphs/legend/` (shared by level sets and complex maps). Notes `notes/f2b-complex-linear.md`, `-smoke.md`.
- **F2b pattern**: recipe in `notes/f2b-trig.md`; latest full file set `git show --stat 06a5ea0d`. Lessons (put them in every brief): frame in the sync after a build, never in `buildScene`; `initialize()` resets and frames once; Preset FILE import with `boardState` keeps the stored view (`keepImportedView`/`keepNextFrame`); frames fit all data (`fitBoundingBox`); non-geometric plots `equalAxisUnits` false + exact `showInitialView`; first load at 390 px settles from a transient height, so reframe an untouched view on a debounced ResizeObserver comparing box centres (`reframeToSize`, cleanup via `session.registerCleanup`); `fullUpdate()` only when visibility changes or after building still curves; legends/captions stack by wrapped line count at the live board edge (`src/graphs/legend/`); reduced-motion Play shows its reason as visible text linked by `describedBy`; `MOTION_PENDING` one entry per line.

## In flight at handoff

- Publish of `d45335cb,06a5ea0d` on base `311c4547` (check `just publish --status`; then watch its CI run, e.g. `bash .command-logs/h9-pubci.sh 06a5ea0d`). This state note commit follows; publish it with base `06a5ea0d` once that is ok (handler 9 started a background loop that does this; check status before starting another).
- No worker is running.

## Owed (also in each family's task file or notes)

- Browser frame times owed at F2b by ADR 0051 (solids), 0053 (level sets), 0054 (phase portraits and the logistic diagram): routes now exist; measure as handler 8 did (`docs/bezier-performance-results.md#f2b-simulation-and-kinematics-browser-timings--2026-11-11`, commit `bd26e7c1`).
- Shared-code items (another stream or an owner decision): the surface gesture hint promises a draggable point on solids (`src/graphs/base/DemonstrationWorkspace.tsx:284`); the surface board's own throttled resize can fire after `freeBoard` (`jsxSurfaceView.ts` createBoard, suggested `resize: {enabled: false}`); a CDP touch drag on a complex-plane point pans the board instead (also on the legacy complex routes; `notes/f2b-complex-linear-smoke.md` finding 1).
- Layout: LP 8-row legend overlaps the top vertex at 390 px; Euler legend wraps to 5 lines at 390 and the S label touches the circle at 1280; phase legend over eigen lines at 390 and a seed caption crossing an eigen line at 1280; logistic start/fixed captions overlap in the small cobweb panel at 390; descent track captions overlap when points are close; linear-map iterate `a2 = Ae2` and `v0` labels touch at 390. The shared 20 px per legend line over-allots about 4 px.
- The "unmoved view" check by box centre treats a zoom about the centre as unmoved (descent, logistic, complex `openingView.ts`).
- Older: randomness galton 10^5 at 4× CPU and markov box at 390; kinematics 30 fps at 4× CPU and captions over y ticks; waves sinc timing, plot size at 390, "view changed" note after import; cobweb step-back (F3 design question); isometry captions at 390; LatticePath `dragging` doubt; counting arrow at 390; circle Tab order; frieze NaN-break render check; phase-portrait curve updates; level-sets `JsxSurfaceView` update; `LessonAction` union entries for new scene actions (linear maps, complex maps, level sets, recursion); a browser look at every legend.

## Next

1. Confirm the pending publishes and the hosted CI run of the last push.
2. Browser frame times for solids, level sets (contours, LP), phase portrait and logistic map (one Sonnet worker; record in the performance results doc and the ADRs' owed lines).
3. F3 for the registered families per `docs/tasks/<family>/` release-batch files: split each release-batch file per batch first (the gates say "split this file into per-batch tasks when the gate opens"), then F3 scenes batch by batch, starting with families whose batches have no outside dependency (e.g. trigonometry, lines, isometries, circle geometry, combinatorics). Check `docs/tasks/feature-streams/README.md#family-template` for what F3 contains.

Rules to keep: at most two workers in the stream at once; never edit shared host files (`BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime, `src/graphs/base/` apart from test lists). At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
