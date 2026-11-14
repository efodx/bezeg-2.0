# Verification remeasure, 2026-11-14

Step 8a of [verification throughput, phase 8](../../specs/verification-throughput.md#phase-8-remeasure-after-phases-07-local-waiting-first-owner-report-2026-11-14), for intake items T01–T05. Measurement only: no script, test, slot setting or workflow was changed. The proposal that follows from it is in the [throughput state note](../site-walkthrough/throughput/state.md).

## Summary

1. **A small code change costs about 15 minutes locally and 12 more on CI.** The publication gate's `check-changed` step ran 204 times this week with a median of 885 s (p90 1,762 s). Real one-file slices took 781–1,560 s there. Hosted verification then takes a median of 12.2 min to deploy.
2. **`check-changed` does not narrow anything for app code.** A one-line edit to one graph component selects 299 of 930 unit test files, a stylesheet 326, a lesson content file 432, a localization string 583. All of them contain the same 276 files, which carry 75% of the suite's cost. The logs agree: 131 of 146 `check-changed` runs selected 100 files or more, median 403.
3. **The cause is one import, which confirms the owner's T04 hypothesis in this form.** `src/graphs/base/realGraphTestHarness.tsx` is imported by 263 test files and imports the registry of every graph. So the test of one graph depends on every other graph. `GraphHost` reaches the workspace stylesheets and every lesson registry the same way.
4. **Queueing for a test slot is not the main wait.** A full unit run waited a median of 1 s for its slot. One test runner was active during 62% of the busy time, and it used 5 of the machine's 12 threads.
5. **Workers were blocked on a verification command for 20% of their active time** (76.6 h of 376 h in a week), handlers for 5% (19.6 h of 382 h). The largest part is 2,522 filtered unit calls (46 h). Typecheck and lint take 73 s and 37 s at the median and are paid in full on every call: 766 calls, 19 h.
6. **Hosted time regrew because the suite grew, and nothing limits that.** Unit test files went from 674 on 2026-11-09 to 930 (+38%), tests from about 12,800 to 17,600. The slowest of four unit shards sets the wall: it finished 8.9 min after the trigger then and 11.8 min now. Rotation applies to these pushes but covers only the catalog sweeps.
7. **`docs:` pushes ran full verification for two reasons.** Four of the nine on 11-13 and 11-14 carried code in the same push. Five carried a file the documentation allowlist does not know: a PNG or JSON under `docs/`, or `DESIGN.md`.
8. **The daily full run has been green once in three days**, starts about seven hours after its schedule, and has no named reader.

## What was measured, and from what

| Source | What it gave | Limits |
| --- | --- | --- |
| `.command-logs/*.log` of 71 worktrees, log start from 2026-11-07 00:00 UTC to about 11-14 11:00 UTC: 6,783 runs | Wall per run (file name time to last write), Vitest start, duration, file and test counts, Playwright counts and duration, failures | The runner does not log slot waits, start spacing or per-step seconds; they are inferred from Vitest's "Start at". A passing `typecheck` or `lint` writes nothing after its header, so its own log gives no duration |
| `publish-*.log` and `.json` of the same worktrees: 217 background publications | Per-step seconds as the runner printed them (`typecheck: passed in 73 s`), changed files per slice, failed stage | The `check-changed` log itself lives in the publish worktree and is deleted on success, so the number of files selected there is unknown |
| Session transcripts under `~/.claude/projects/` for this repository, 1,158 files since 11-07 | Seconds between each verification tool call and its result, by command | Only time stamps, tool names and command strings were read. A foreground call ends at 10 min at the latest. A chained command counts under its first `just` command. Worker or handler is decided by the transcript's path |
| `vitest list --changed --filesOnly` after a one-line edit, restored afterwards | Unit test files selected for each representative change; runs no test, 3–19 s each | The CSS change was not timed end to end (see below) |
| A static import graph of `src/` (2,158 files) | The modules through which tests reach an edited file. It reproduces Vitest's selection: 299 of 299, 432 of 432, 584 against 583, 345 against 326 for the stylesheet | Follows relative static and dynamic imports; one `import.meta.glob` is not followed |
| Vitest's cached per-file results of the `stream-families-prep` worktree (934 files, 2,257 file-seconds, written 11-14) | Cost per test file | It merges several runs under unknown load, with the catalog sweeps sampled. Another cache shows the same files two to eight times slower under load |
| `gh run list`, `gh run view` for 147 runs on 11-09, 11-11, 11-13 and 11-14 | Per-job walls, the last job to finish, scope reasons, unit shard summaries | Per-file durations on CI are not recorded anywhere |

Not measured: CPU load during runs; how long a handler is idle while a background gate runs (the transcripts show the call returning at once, not when the result is next used); the effect of any proposal.

The scripts are throwaway and sit in `.command-logs/remeasure/` of the `walkthrough-throughput` worktree, with their outputs (`summary.txt`, `publish-summary.txt`, `selection.txt`, `cost.txt`, `hubs.txt`, `hosted.txt`, `hosted2.txt`, `transcripts.txt`). They are not committed.

## 1. Local runs, 2026-11-07 to 11-14

Seconds, log start to last write, so any wait for a slot or for memory is inside.

| Run | Runs | Median | p75 | p90 | Summed | Ended red |
| --- | --- | --- | --- | --- | --- | --- |
| `check-changed` | 162 | 941 | 1,253 | 1,644 | 45.7 h | 23 |
| `check` | 18 | 1,436 | 1,880 | 2,453 | 7.5 h | 0 |
| `unit`, whole suite | 49 | 884 | 1,453 | 1,820 | 11.6 h | 11 |
| `unit`, filtered to paths | 3,835 | 14 | 35 | 117 | 71.6 h | 2,114 |
| Smoke, whole suite (15 with a result line) | 20 | 864 | 993 | 1,279 | 4.4 h | 10 |
| Smoke, filtered | 218 | 18 | 44 | 93 | 3.0 h | 53 |
| `controls-fixture` | 46 | 41 | 171 | 739 | 2.7 h | 18 |
| `tooling-test` | 90 | 107 | 161 | 187 | 3.0 h | 0 |
| `build` | 670 | 6.7 | 9.5 | 13.4 | 1.6 h | 0 |
| `typecheck`, `lint` alone | 493, 802 | see below | | | | 138, 110 |

**Inside `check-changed`** (146 runs with a Vitest summary):

| Part | Median | p90 | Source |
| --- | --- | --- | --- |
| Before Vitest starts: typecheck, lint, slot wait, spacing | 87 s | 220 s | Log start to Vitest "Start at" |
| Vitest | 884 s | 1,416 s | Vitest "Duration" |
| Always-run tier | 14 s | 22 s | Second Vitest summary, 80 runs |
| Build | 6 s | 11 s | Publish logs, 188 steps |
| Unit test files selected | 403 | 543 | "Test Files" |

Time does not follow the size of the selection once it passes 100 files: 28 runs with 100–299 files took a median of 1,016 s, 103 runs with 300 or more took 1,040 s. Six runs selected fewer than 20 files and took 121 s, of which 88 s passed before Vitest started. That 88 s is the floor every code change pays for typecheck and lint.

**Typecheck and lint.** From the 217 publish logs, as the runner timed them: `typecheck` median 73 s, p90 111 s (27 steps); `lint` median 37 s, p90 53 s (31 steps). The daily medians rose from 41 s and 36 s on 11-10 to 111 s and 52 s on 11-14. On CI they take 81 s and 44 s. Neither keeps a cache between runs.

**Slot waiting.** A whole-suite `unit` run starts Vitest a median of 1 s after its log starts (p90 2 s, 46 runs). A filtered smoke run spends 0.8 s outside Playwright at the median (p90 2.8 s). The tails are longer: `controls-fixture` has a p90 of 739 s for a 41 s check, and the [control choice state note](../control-choice/state.md) records one 25-minute wait for it. Over the busy time of the week (97.5 h of 179 h), one test-running command was active for 62%, two for 28%, three for 7% and four or more for 2%.

**Filtered unit runs** are the workers' inner loop:

- 1,900 of them run one file: wall median 10.8 s, of which Vitest 8.9 s. Tests are 31% of Vitest's time at the median; environment, import and transform are 53%. So a one-file run is about 3 s of tests and 6 s of start-up.
- 2,114 of 3,835 ended red, 1,253 of the one-file runs. A sample of 767 red one-file runs in one worktree: 659 assertion failures. These are red-first runs and observed pre-change failures, which the brief asks for.
- 107 runs took 10 minutes or more and add up to 29.7 h, 41% of all filtered time. They name whole directories (`src/learning`, `src/learning src/graphs/dynamics`), a median of 157 files. A filtered run holds no slot and gets 2 workers, so a directory run is slower than the same files would be on a slot with 5.

**Publication** (background, 217 runs): 187 pushed, 30 failed (17 at `verify:check-changed`, 6 at the rebase, 4 at whitespace, 3 others).

| Recipe | Pushed | Wall median | p90 | Summed |
| --- | --- | --- | --- | --- |
| `docs` | 22 | 7 s | 262 s | 0.5 h |
| `tooling` | 6 | 211 s | 234 s | 0.3 h |
| `runtime` | 159 | 886 s | 2,472 s | 48.8 h |

For `runtime`, everything outside the verification steps (fetch, rebase, push) is 11 s at the median. Master moved during 40 of the 159 runs, which then added the delta path: typecheck, lint, the always-run tier (17 s) and build, about 135 s. The `check-changed` step's daily median was 217 s on 11-10, 824 s on 11-11, 1,402 s on 11-12, 1,009 s on 11-13 and 1,843 s on 11-14.

**Agent time blocked** (transcripts, foreground calls only):

| Role | Transcripts | Active | Blocked on verification | Largest parts |
| --- | --- | --- | --- | --- |
| Workers | 1,009 | 376 h | 76.6 h (20%) | Filtered unit 46.1 h (2,522 calls, median 49 s); `typecheck` 7.7 h (272 calls, median 101 s); direct `npx` or `npm` 6.8 h (283 calls); `lint` 6.5 h (324 calls, median 69 s); `build` 3.1 h |
| Handlers | 149 | 382 h | 19.6 h (5%) | Filtered unit 8.0 h; `typecheck` 3.6 h; `publish --status` 2.0 h (329 calls); foreground `publish` 1.8 h |

"Active" drops gaps over 45 minutes. Together that is 6 to 17 hours of blocked agent time per day. Handlers mostly start the gate in the background (206 calls), so their waiting for it is not in these figures; the gate itself ran for 59 h.

## 2. Four representative small changes

Selection is from the probe on master `dbf3ff60`. Local time is the `check-changed` step and whole gate of a real publication of that kind, with its publish log's time; one row has no such log.

| Change | Probe file | Unit files selected (of 930) | Share of suite cost | Local, real slice | Source |
| --- | --- | --- | --- | --- | --- |
| One-file graph fix | `src/graphs/dynamics/LogisticMapGraph.tsx`; `src/graphs/linear/labelLayout.ts` | 299; 303 | 78% | 1,016 s step, 1,161 s gate | `stream-families-prep`, 11-13 23:54 UTC, `labelLayout.ts` and its test. Also 882 s on 11-11 13:53 (`BSplineBlossomGraph.tsx`) |
| One localization string | `src/localization/sl.ts` | 583 | 88% | 848 s step, 860 s gate | `stream-families-prep`, 11-11 09:18, `sl.ts` and `en.ts` |
| CSS only | `src/graphs/base/WorkspaceControls.css` | 326 | 82% | not timed | No CSS-only publication exists in the week. It selects the same 276-file core as the graph fix, so the same time is expected; no slot was spent to confirm it |
| One lesson content edit | `src/learning/content/linearMapsChapterLessons.ts` | 432 | 86% | 781 s step, 801 s gate | `stream-families-prep`, 11-13 08:30. Also 1,560 s on 11-13 13:32 (`phasePortraitsGuidedLessons.ts`) |

For comparison, slices that select no unit test took 102–177 s (a smoke spec only, five publications), and a pure model with its own test took 79–101 s on 11-10 (`src/isometry/isometry2.ts`, `src/trig/trigModel.ts`).

Where the time goes for each of the four, locally: 73 s typecheck and 37 s lint at the median, then 11 to 24 minutes of Vitest on a slot of 5 workers, then 6 s of build. On CI all four are code changes and run full verification: a median of 12.2 min from push to deployed on 11-14 (section 3). From "edit done" to "verified locally" is therefore about 15 minutes at the median for any of them, and to "deployed" about 27 minutes when the push is not overtaken.

**Why the selection is this wide.** Removing one module from the import graph, and counting how many of the selected tests no longer reach the edited file:

| Edited file | Tests reaching it | Module on the path | Tests that reach it only through that module |
| --- | --- | --- | --- |
| One graph component | 299 | `src/graphs/dynamics/runtime.ts` → `src/graphs/graphLoaders.ts` → `src/graphs/allGraphFactories.ts` | 292, 291, 270 |
| | | `src/graphs/base/realGraphTestHarness.tsx` (imports `allGraphFactories`, line 11; 263 test files import it) | 253 |
| A workspace stylesheet | 345 | `src/graphs/base/DemonstrationWorkspace.tsx`, `src/graphs/base/GraphHost.tsx` (224 test files import it) | 345, 341 |
| One lesson content file | 432 | Its chapter registry; then `DemonstrationWorkspace.tsx`, `GraphHost.tsx` | 429; 247, 245 |
| `sl.ts` | 584 | `src/localization/index.ts` (372 test files and 727 modules import it) | 570 |

A test that mounts one graph through the harness therefore imports every graph, every lesson registry and the workspace's stylesheets. Vitest's `--changed` follows that graph faithfully. The cost is concentrated the same way: the 276 files common to all five probes cost 1,698 of 2,257 file-seconds.

What the harness is imported for: of the 240 test files that import it with a plain named import, 234 take `installBoardShims`, 78 `mountGraph` and 57 `createGraph`. Only `createGraph` uses the registry, and `src/graphs/allGraphFactories.ts` loads every graph when it is imported (a top-level `await` over all loaders). Simulated on the same import graph, with the registry imported only by the 57 files that call `createGraph`: a one-graph edit would select 109 files (38% of suite cost) instead of 299 (78%), and `labelLayout.ts` 115 instead of 304. The stylesheet, lesson content and localization selections would not change; they pass through `GraphHost` and `localization/index`. The files that stay selected are the catalog sweeps and the lesson tests, which ask the registry for graphs by id.

Three unit tests read stylesheet source from disk (`OperationApplyReason.test.tsx`, `ControlRow.test.ts`, `LookUnderneath.test.tsx`). An import-graph selection does not see such reads.

## 3. Hosted runs

Successful full runs for a push to master (`gh run view --json jobs`; minutes).

| Day | Runs | Trigger to deployed, median | Last verification job ends | Then gate and deploy | Which job was last |
| --- | --- | --- | --- | --- | --- |
| 2026-11-09 | 13 | 9.3 | 8.9 | 0.4 | unit 1 (8), unit 2 (5) |
| 2026-11-11 | 32 | 10.1 | 9.6 | 0.4 | unit 2 (21), unit 1 (5), unit 3 (4), other smoke specs (2) |
| 2026-11-13 | 22 | 11.7 | 11.3 | 0.4 | unit 2 (10), unit 1 (8), unit 3 (2), other smoke specs (2) |
| 2026-11-14 | 12 | 12.2 | 11.8 | 0.4 | unit 1 (5), unit 2 (4), other (3) |

Job walls, median, 11-09 against 11-14: unit 1 8.0 → 9.6; unit 2 6.7 → 9.3; unit 3 6.4 → 7.8; unit 4 6.0 → 7.3; other smoke specs 6.1 → 7.5; lesson smoke shards 3.5–3.8 → 4.5–6.4; checks 2.1 → 2.8; build 1.2 → 1.3. Jobs start 0.1 min after the scope job ends, so runner queueing is not a factor. Each job spends about 75 s before its tests (checkout 10–17 s, Node 6 s, `npm ci` 32–55 s).

**What regrew** (unit shard logs of three runs per day):

- Unit test files: 674 on 11-09 (168, 166, 167, 164 per shard), 930 on 11-14 (235, 232, 233, 230). Tests: about 12,800 then; 16,700 in a rotated run and 17,600 in the daily run now.
- Slowest shard's Vitest duration: 427–441 s on 11-09, 489–594 s on 11-14. The four shards of one run differ widely (285–489 s in run 43583268170), so the split by file count is uneven by cost.
- Rotation applies to these pushes: `BEZEG_SWEEP_ROTATION` was `6/7`, `0/7` and `1/7` in the three runs read. It removes about 250–470 tests per shard and little time: run 43582058471 (rotated, but a shared-path change, so every entry ran) and the daily run 43585378440 have the same test counts, and their slowest shards took 594 s and 677 s.
- So the regrowth is new test files for new graphs and lesson families, not the sweeps that phases 2 and 7 bounded. Four shards stayed four. The regrowth guard of the spec is `just test-cost` against a baseline that is saved locally by hand; no baseline exists (`No baseline` on 11-14), nothing compares master against it, and nothing reports growth to anyone.

**`docs:` pushes that ran full verification**, 11-13 and 11-14, with the reason the scope job printed:

| Run | Head | Reason |
| --- | --- | --- |
| 43582058471 | `2370f88e` | `docs/controls/angle-slider.png` is outside the documentation allowlist |
| 43550862261 | `8ebcffa1` | `docs/tasks/control-choice/decisions.json` |
| 43520832417 | `b5525015` | `docs/reviews/linear-maps/guided-example-inventory.json` |
| 43515839065, 43435175913 | `b0817e70`, `db4e248a` | `DESIGN.md` |
| 43429672357, 43416018972, 43352521466, 43339241908 | `63c40cc0`, `97cce3fc`, `9b2fe596`, `c25e55b2` | Code in the same push: `LogisticMapGraph.tsx`, `App.tsx`, `mechanics/registration.ts`, `scripts/check-changed-always-run.cjs` |

The allowlist is `docs/**/*.md` plus `README.md`, `AGENTS.md` and `CLAUDE.md` (`scripts/ci-change-scope.cjs:56`). Neither cause the spec suggested (the red-latest-run rule) appears in these nine; the multi-commit push explains four.

**The daily full run** (cron `17 3 * * *`):

| Run | Created (UTC) | Result |
| --- | --- | --- |
| 43207298287 | 11-12 11:13 | Failed in the scope job's own test (`Test verification scope detector`); nothing else ran |
| 43413497282 | 11-13 11:00 | Unit shard 2 was cancelled at the job's 15-minute limit |
| 43585378440 | 11-14 10:27 | Green in 13.3 min; unit shards 2 and 3 took 12 of their 15 minutes |

It has run on each of the three days since phase 7, was green once, and starts seven to eight hours after 03:17 UTC. [The command guide](../../commands.md) says what to do with a failure seen only there, but names nobody who looks.

## 4. Cost against value (T04)

Seconds are from the `stream-families-prep` cache (section "What was measured"), in which the 30 most expensive files hold 32% of the suite's file-seconds and the 100 most expensive 60%; 642 of 934 files take under 2 s. The part files of the two sweeps are merged into one row each, and the last six rows are files that rank in the top 40 of the main checkout's cache instead. Every row except `jsxSurfaceView.rendering` is selected by all five one-line edits of section 2.

A read-only reviewer classified the files from their headers, `describe` and test titles and [the unit audit](unit-audit.md). It read no test bodies and ran nothing, so "Repeats" names a candidate overlap, not a proven one.

| File | s | Guards | Repeats |
| --- | --- | --- | --- |
| `learning/runtime/lessonRestoration.part1–8` (shims over `lessonRestorationContract.tsx`) | 134.2 | Every guided lesson: closing restores the edited graph twice, the graph stays interactive, board signatures match | Partly. Frame actions are also applied by `sceneContentAgainstGraphs`, `guidedExampleScenes` and the chapter tests; checkpoint restore also by `GraphTransientState`. The full-lesson walk is unique |
| `graphs/base/GraphTransientState.part1–4` (shims over `graphTransientStateContract.tsx`) | 75.5 | Per graph: checkpoint restore of scene, board and controls, same-tick rollback, default scene, Preset replacement against a fresh mount, figure batch | Yes, with `sceneReplacementContract`; the lesson-close path with `lessonRestoration` |
| `graphs/base/sceneReplacementContract` | 41.0 | Scene replacement through reload and figure batch leaves nothing behind, disposes once, handles a stored scene that disagrees with Preset data | Partly: checkpoint and default-scene replacement are in `GraphTransientState`, teardown in `graphTeardownContract`. Per-family disposal counts are distinct |
| `graphs/base/presets/PresetCatalog` | 38.3 | Collection key contract; every Demonstration with Presets has an accepted definition | Distinct. Five of six tests need no board. A churn file: 74 touches, 4 fix commits |
| `graphs/curves/bspline/standaloneSceneLifecycle` | 36.4 | Bézier-family standalone scene lifecycle: figure entry and return, Preset import, remount, construction failure, inert drag handler, same-tick rollback | Partly: remount and unmount overlap `graphTeardownContract`, replacement overlaps `sceneReplacementContract`. The failure, inert-handler and rollback cases are distinct |
| `graphs/linear/LinearMapIteration.host` | 36.0 | Linear map iteration: old Presets load unchanged, lesson-scene data, chained actions in one tick | Distinct graph; the one-tick pattern is shared with `WavesLessonActions.host` |
| `graphs/patches/jsxSurfaceFraming` | 31.6 | Camera framing of every patch route against an oracle; control points fit a phone host | Distinct |
| `learning/content/phasePortraitsGuidedLessons` | 29.8 | Scene state and readouts against an independent recomputation; numbers quoted in both languages | Distinct numbers; shared lesson skeleton |
| `graphs/base/sharedControls.graphs` | 28.7 | Shared point controls wired in the curve workspace for three graphs | Partly: Bézier add and typed edit are also in `CurveWorkspacePoints` |
| `graphs/base/graphTeardownContract` | 25.7 | Every graph, plain and in StrictMode: no board, listener, subscriber or timer after unmount | Replaced the per-graph teardown tests. Its scene-change leg overlaps `GraphTransientState` |
| `learning/content/curveGeometryGuidedLessons.envelope` | 24.5 | Envelope lesson: every scene's state; touching point against an independent De Casteljau value | Shared skeleton; distinct mathematics |
| `learning/content/arcLengthGuidedLessons` | 24.0 | Arc-length lesson against an independent computation of length, speed and polyline error | Shared skeleton; distinct numbers |
| `graphs/compgeo/InscribedAngleGraph.host` | 21.4 | Inscribed-angle graph: readouts, Thales, toggles, keyboard and typed parameter | Distinct |
| `learning/content/epicyclesGuidedLessons` | 21.0 | Nine scenes, out of order and twice in one tick; Fourier coefficients | Scene-order tests repeat other lesson files and the restoration walk; coefficients distinct |
| `learning/content/circleGeometryGuidedLessons` | 19.0 | Steps, scene state, quoted numbers, restore on leave, exact arithmetic | Shared skeleton; restore on leave repeats `lessonRestoration` |
| `learning/content/curveGeometryGuidedLessons` | 19.0 | Parametric and curvature scenes: readouts against the prose and kernel values | Shared skeleton; distinct checks |
| `learning/content/sceneContentAgainstGraphs` | 18.2 | Chapter activity actions are accepted by their graph; scene limit probes | First `describe` largely subsumed by the restoration walk; the limit probes are distinct |
| `graphs/patches/surface-view/jsxSurfaceView.rendering` | 17.7 | Surface view styling by role, mesh, markers, camera-only redraw | Distinct |
| `graphs/functions/WavesGraph` | 17.5 | Wave sum: hand values, readout labels, phase, cancellation | Distinct |
| `graphs/compgeo/SimsonLineGraph.host` | 16.8 | Simson line: default scene, overlays, foot triangle, Reset | Distinct; the Reset check copies the default-scene guarantee of `GraphTransientState` |
| `graphs/random/SimulationGraph` | 16.1 | Simulation modes: defaults, captions, messages | Distinct |
| `learning/content/combinatoricsGuidedLessons` | 16.0 | Steps, quoted numbers, scene state in one tick from a restored checkpoint | Shared skeleton; distinct numbers |
| `learning/content/guidedExampleScenes` | 14.6 | Family guided examples apply on their real graphs | Mostly: applies scene actions again, as the restoration walk does |
| `learning/content/curveGeometryGuidedLessons.offset` | 14.3 | Offset lesson: six scenes; a scene looks the same from any earlier scene | Shared skeleton |
| `graphs/complex/EulerCircleGraph` | 14.1 | Exact values at 30° and 60°, row labels, arrows follow switches | Distinct |
| `graphs/dynamics/PhasePortraitGraph` | 12.4 | Type labels, classification without a tolerance, labelled eigenvalues | Distinct |
| `graphs/base/controls/CurveOperationPanel` | 8.9 | Subdivide, extrapolate and elevate keep their mathematics | Distinct |
| `graphs/base/presets/PartialPresetDefaults` | 6.6 | Omitted Preset parts start from graph defaults after each prior scene | Distinct |
| `graphs/base/CurveWorkspacePoints` | 6.1 | Point decisions on Bézier: add, typed edit refits the view, drag shows in the list | Overlaps `sharedControls.graphs` |
| `graphs/functions/WavesLessonActions.host` | 5.8 | Waves lesson actions reach state, readouts and status | One-tick and playback-halt pattern repeats `LinearMapIteration.host` and the transient contract |

What this says about T04:

- **Duplicated assertions are a small part of the cost.** The reviewer's three largest candidate overlaps (the action-acceptance loops of `sceneContentAgainstGraphs` and `guidedExampleScenes`; the checkpoint and default-scene legs of `sceneReplacementContract`; the remount and Reset legs of `standaloneSceneLifecycle`, `SimsonLineGraph.host` and `sharedControls.graphs`) add up to an estimated 50–60 s of 2,257 file-seconds, under 3%. None of the three was checked by reading the tests.
- **Lesson files share a skeleton but not their content.** Each asserts its own mathematics and quoted numbers. Merging them would lose guarantees.
- **The repeated cost is the mount, not the assertion.** 29 of these 30 files mount a real board through `realGraphTestHarness` or `GraphHost`. The reviewer estimates that for about 11 of them (five of six `PresetCatalog` tests, eight lesson content files, the two action-acceptance files) a model-level check would assert the same thing. That estimate is from titles and is low confidence.
- **The module boundary is the larger effect** (section 2): it decides that all of these files run for every change, whatever they assert.

History was not used to judge which files catch bugs, beyond the unit audit's churn counts.

## 5. Typecheck and lint with a cache

One timing of each, in this worktree on master `dbf3ff60`, run one after another while other sessions were working. The compiler and ESLint were called directly, with their cache files under `.command-logs/remeasure/`; the runner was not changed. Each edit appended one comment line and was restored.

| Command | Seconds |
| --- | --- |
| `tsc --noEmit`, as the runner calls it today | 104.7 |
| `tsc --noEmit --incremental`, no cache yet | 112.2 |
| The same, nothing changed | 7.5 |
| The same, one graph component edited (`LogisticMapGraph.tsx`) | 31.6 |
| The same, after restoring that file | 9.2 |
| The same, `src/localization/sl.ts` edited | 111.8 |
| The same, after restoring `sl.ts` | 7.2 |
| `eslint .`, as the runner calls it today | 48.2 |
| `eslint . --cache --cache-strategy content`, no cache yet | 50.6 |
| The same, nothing changed | 4.8 |
| The same, one graph component edited | 4.8 |

An incremental typecheck saves about 70 s on a one-file graph edit and about 95 s when nothing changed, and saves nothing on an edit to a localization catalog, which 727 modules import. A cached lint saves about 43 s. Not checked: whether any lint rule in use reads type information from other files, in which case a per-file cache could keep a stale result.

## 6. Did the tests a narrower selection would skip catch bugs locally?

Asked by the owner on 2026-11-14, about proposal 4 of the state note (a selection that follows a change to the tests that import it but not through the all-graphs registry, the lesson registries or the localization catalogs). Answer for this week: **no behavior failure was caught by such a test in any local run.**

Method: every local run of the week that ran the changed-file selection or the whole suite and ended red, 51 in all. For each, the failing test files and error lines from the log, and the slice's changed files, were compared against the import graph with the registries cut. A failing test counts as "still run" when the slice changed it, when it imports a changed file without passing a registry, when it is a catalog sweep or in the always-run tier, or when the slice changed a shared path, which keeps selecting everything.

| Runs | Red | Failing test would still run | No test failed (lint, worker start-up) or none named | Failing test would be left to CI |
| --- | --- | --- | --- | --- |
| Gate, `verify:check-changed` | 17 | 7 | 4 | 6 |
| `check-changed` in a worktree | 23 | 23, two of them unplaced | 0 | 0 |
| Whole-suite `unit` | 11 | 11, one in a file that no longer exists | 0 | 0 |

The six gate runs whose failing tests the narrower selection would have skipped, all on 2026-11-14:

| Time (UTC) | Worktree | Gate seconds | Failing tests | Error |
| --- | --- | --- | --- | --- |
| 01:00 | `stream-families-prep` | 2,054 | `InscribedAngleGraph.host`, `LinearMapIteration.host` | Test timed out in 60000 ms and in 15000 ms |
| 01:33 | `stream-families-prep` | 1,843 | `FortuneGraph.host` | `ENOENT` on a file in `node_modules/.vitest-cache` |
| 03:26 | `stream-families-prep` | 424 | four `registrationLoading` tests | Test timed out in 15000 ms |
| 05:47 | `stream-control-choice` | 4,902 | six `registrationLoading` tests | Test timed out in 15000 ms; worker start timeouts |
| 07:14 | `stream-families-prep` | 2,915 | `graphCollectionIdentity` | Test timed out in 15000 ms; worker start timeouts |
| 08:26 | `stream-families-prep` | 4,220 | `CurveOperationPanel` | Test timed out in 15000 ms |

None is an assertion about behavior. All six are time limits or a cache file under load, in tests unrelated to the slice, and they cost 4.5 hours of gate time. A seventh gate run (06:15, 5,642 s) failed on worker start timeouts alone. The one gate failure that was a real defect (04:14, `sharedControls.graphs.test.tsx`, an assertion on the accumulation field) is in a test that imports files the slice changed, so it stays selected.

Limits:

- One week of logs; the gate's logs start on 11-09.
- For 15 of the 17 gate failures only the runner's tail excerpt of the test log survives. In the six above, the number of failing files in the excerpt equals Vitest's own count.
- For worktree runs the changed files are reconstructed from the worktree's reflog (the branch at the run plus the commits of the next four hours), so uncommitted work is approximated. Two runs were logged in kept publish worktrees without a reflog; they duplicate gate rows and their failures are the same timeouts and the same accumulation assertion.
- The import graph is today's, not the one at each run.
- Not examined: the 18 hosted runs that went red on the four days read (3, 12, 1 and 2). Those are failures the current local selection already let through, and what failed in them would say how often CI is the one that catches a defect today.

## 7. The phase 8 hypotheses against the measurement

| Hypothesis | Verdict | Evidence |
| --- | --- | --- |
| Agents wait where a background run would do | Partly. Handlers already publish in the background (206 of 266 gate starts). Workers wait in the foreground by design, 76.6 h | Section 1, transcripts |
| Workers run more than their slice needs | Partly. Workers ran `check-changed` only 64 times. Their cost is 2,522 filtered runs, 596 typecheck and lint calls, and directory-wide filtered runs on 2 workers (29.7 h) | Section 1 |
| Selection is wider than the change | Yes, and it is the largest finding: 299–583 of 930 files, 78–88% of cost, for a one-line edit | Section 2 |
| Typecheck and lint are paid in full every time | Yes: 73 s and 37 s at the median, 88 s before any test starts | Section 1 |
| Slot sizing no longer fits | Not as queueing: the median wait is 1 s. But a lone run uses 5 of 12 threads during 62% of the busy time, and filtered directory runs bypass the slots | Section 1 |
| Module boundaries make unrelated tests reachable | Yes: `realGraphTestHarness` → `allGraphFactories`, `GraphHost` → workspace → lesson registries, `localization/index` | Section 2 |
