# Verification throughput

Status: planned 2026-11-08 at the owner's request ("the pipeline is so slow; do the tests catch anything; will `just check-changed` be enough; streams wait on publishing"). Research only: no test, build or smoke run was started. Every number below comes from Vitest's cached `results.json` (2026-11-08), 400 hosted `Browser smoke` runs on master (2026-11-02 to 11-08), one Playwright log (run 42473882485), Git history, and the repository's own recorded measurements. Evidence: [docs/reviews/verification-throughput/](../reviews/verification-throughput/) (`unit-audit.md`, `smoke-audit.md`, `ci-history.md`, `workflow-blocking.md`, `controls-impact.md`).

**Reopened 2026-11-14:** the owner still reports about 12 minutes on CI and constant local waiting by agents. [Phase 8](#phase-8-remeasure-after-phases-07-local-waiting-first-owner-report-2026-11-14) remeasures before any further change.

Builds on [test consolidation](test-consolidation.md) (implemented 2026-10-25, browser suite 665 s → 370 s) and the [fail-fast publication gate](fail-fast-publication-gate.md). No phase is task-filed yet; file tasks under `docs/tasks/verification-throughput/` when a phase is picked up.

**Progress, 2026-11-08.**

- The controls stream took the red-master smoke repair (phase 0, first item) and adopted phase 5.
- Implemented with Node tests and lint only; hosted runs are not yet observed:
  - phase 0, CI scope (`dd3df425`);
  - phase 1 item 3, slot holding (`08381192`). A per-checkout run claim keeps the duplicate-run refusal for commands that no longer take a slot.
  - phase 1 items 1–2, publish-gate delta retry and lock (gate commit after `08381192`). It was independently reviewed, and the lock race, base drift and retry-trigger findings were fixed.
- Hosted run 42489627250 for `97614b1a` is green. Phases 0 and 1 are observed on CI.
- Phase 3 is implemented, with Node tests, focused Vitest runs and lint:
  - Derived catalog checks (`590212bc`); four injected faults still fail.
  - The `check-changed` always-run tier and the selector-removal warning (`7f41d970`, review fixes `ef7c16cf`).
  - The always-run step measured 27 s wall, not 2 s, because per-file setup dominates (phase 4).
  - The selector warning fires on the phase 0 removal.
  - Replay: [phase3-replay.md](../reviews/verification-throughput/phase3-replay.md). Of the 8 distinct bookkeeping causes, the tier or the import graph runs 6 locally and the warning catches 1. Poster provenance remains (generated-image freshness).
- Hosted run 42496853788 for `9b5b290e` (phase 3) is green.
- Phase 2, first slice: the scope is sampled locally and full in CI.
  - Covered sweeps: lesson restoration parts 1–4, `sceneContentAgainstGraphs` (scenes and activities) and `sceneReplacementContract`'s all-graph loop. They are tuned by `BEZEG_LESSON_RESTORATION`, `BEZEG_SCENE_CONTENT`, `BEZEG_SCENE_REPLACEMENT` and `BEZEG_SWEEPS=all`.
  - Sample: 19 of 118 lessons; scene replacement leaves out 101 graphs.
  - Per-file time of those six files fell from 842 s to 179 s (both measured at 2 workers; [phase2a-notes.md](../reviews/verification-throughput/phase2a-notes.md)).
  - A break in an unsampled graph's class (`EpicycleGraph`) and a changed lesson content file each selected their lessons locally, and the broken restoration failed.
  - Engineering review found nothing blocking. Its fixes:
    - mixed lesson and activity id lists;
    - the shared-path additions `setupTests`, `utils`, `types` and the scene helpers' model files;
    - the publish gate's delta list now uses the lesson sweeps' shared paths.
  - Accepted risk, as for the transient-state sample: a changed non-class helper or model file under a graph directory selects the family (the graph classes in that directory and below), and one in a directory without graph classes runs only the sample locally. A lesson content file that quotes one id but feeds several lessons under-selects. CI runs everything.
- Phase 2, structural slice ([phase2b-notes.md](../reviews/verification-throughput/phase2b-notes.md)).
  - Guided-scene acceptance is folded into the restoration walk. An injected rejected action still fails.
  - Restoration is split into eight parts, and CI moves to four Vitest shards. The predicted longest shard is 858 file-seconds, against 1200 with three.
  - `sceneReplacementContract` is not split. Its all-graph loop shares about 130 lines of helpers and a mock with four other describes, at 133 s.
  - The full `BEZEG_SWEEPS=all` run passed on a loaded machine. Summed restoration and scene time came to 752 s, against 722 s before. The untouched `sceneReplacementContract` also ran 10% slower, so the fold's saving is not shown locally.
  - Confirm on hosted runs: per-shard unit times, and whether the fold paid off.
- Phase 2b on CI (handler 3, [phase2b-ci-shards.md](../reviews/verification-throughput/phase2b-ci-shards.md)):
  - The four-shard runs 42514768457 and 42516291702 left shard 1 at 8:35 and 9:49 job wall, against 4:33 for shard 3. The cause was the path-hash split, which gave shard 1 `sceneReplacementContract` (157 s) and about five 30–40 s files. The part files were balanced.
  - The pre-fold three-shard run was already balanced (458 / 492 / 470 s of Vitest time), so the fourth shard alone saved about 40 s, not the predicted ~150 s.
  - Four heavy files are pinned to shard 3 (`b1b5598a`). On run 42524584056 the shards took 5:18 / 7:47 / 5:54 / 6:59, so the critical path fell to 7:47 (shard 2), and trigger to deploy took 8:32. The next run, 42527684457, took 5:17 / 5:04 / 9:06 / 6:58, with shard 3 (the pinned files) as the critical path. Per-file times show that the assignment is deterministic and the swing is runner speed: every file on a slow job ran about 1.6× slower. The pin overloaded shard 3 nominally. A per-file map over shards 1–3 replaced it, predicting 576 / 618 / 542 / 622 file-s, a critical path of about 310 s down from 350 s. Runner variance (about 1.6×) outweighs any assignment.
- Phase 4 (handler 3, [phase4-notes.md](../reviews/verification-throughput/phase4-notes.md)):
  - A `kernel` Vitest project runs the 161 analysis, compgeo, bezeg, projective and linear files in node with no setup file: 27 s locally, against about 150 s in jsdom.
  - The setup loads JSXGraph lazily, with board disposal kept.
  - Full local run: setup share 12% → 3%, environment 26% → 15%. The wall time is not comparable, because the setup change widens the local sweep sample.
  - Accepted on that evidence, pending CI.
  - First hosted run with phase 4 and the per-file shard map: 42541468552 for `eb9af4bc`, green.
    - All 656 files ran once (161 / 166 / 164 / 165).
    - Vitest took 444 / 346 / 316 / 314 s; shard 1 is the critical path at 8:33 job wall.
    - Summed over shards, from Vitest's percentages, against the two runs before:
      - setup 14 s against 104 and 96;
      - environment 135 against 157 and 156;
      - import 171 against 103 and 105, because files now load JSXGraph themselves;
      - tests 1050 against 919 and 948;
      - total 1421 against 1332 and 1352.
    - Non-test overhead fell by about 45 s (12%). Test time rose about 10%, within the 1.6× runner variance.
    - Neither change is shown to help on CI yet.
  - Decision: keep both, and judge on the mean of three hosted runs. Revert phase 4 if the summed non-test time does not fall. Revert the shard map to plain hash sharding plus parts if the critical path does not beat about 8:30.
  - The fold's saving stays unproven on CI. Restoration plus scene content summed 917 file-s before the fold and 831 and 1008 after; normalised by `sceneReplacementContract` it is about 35% cheaper.
- Phase 1 item 1 is complete: the gate's delta path also runs the always-run unit tier (`6a39ac59`). A rerun's first pass now uses a matching verified-base record (`dbabef1e`; see Follow-ups).
- `55c05845` fixes a tooling-test fragility: fixtures nested in the repository read the host branch's changes through `git diff`.
- Regrowth guard: `just test-cost` (`5029e1df`). The baseline is a local snapshot saved with `--save` in `.command-logs`, because no master run's `results.json` is recorded anywhere to compare against.
- Phase 6, first slice ([phase6a-notes.md](../reviews/verification-throughput/phase6a-notes.md)):
  - `settle()` is one in-page `waitForFunction` with rAF polling, and repeated settles inside frame walks are dropped.
  - Lesson timeouts went from 150 s to 60 s, and to 90 s for Exit tests. The slowest observed on CI was 32.2 s for an Exit test and 15.8 s for a walk.
  - `maxFailures: 10` on CI.
  - Exit tests are interleaved between rows, so `--shard=N/3` gets 3 / 2 / 2 Exit rows instead of 0 / 6 / 1.
  - A five-lesson subset fell from 162.8 s to 124.7 s of test time locally. The full guided-lessons spec passed locally, apart from one local socket error that passed on rerun.
  - Hosted lesson-shard times are not yet observed.
- Hosted judgement, handler 4 ([phase4-6a-hosted.md](../reviews/verification-throughput/phase4-6a-hosted.md)), over three runs (42541468552, 42545997964, 42552202709):
  - Phase 4 stays. Unit non-test time (setup + environment + import, summed over shards) was 320, 296 and 313 s, a mean of 310 s against 364 and 357 s before phase 4.
  - The per-file shard map stays. The unit critical path was 8:33, 8:30 and 8:06, a mean of 8:23 against the 8:30 bar. That margin is inside runner variance, and the critical shard moved between runs.
  - Phase 6a holds. Lesson test steps were 3.0 / 3.2 / 2.7 and 3.9 / 2.9 / 2.6 min, against 4.4 / 5.2 / 3.4. other-specs went from 5.5 to 4.7 min once catalogue batching landed. Neither `maxFailures` nor the 60 s timeout fired.
- Phase 6, catalogue batching: the catalogue card loop and the two all-clips decode loops each run as one in-page pass, and failures name the card id. Locally the tests took 31.0 → 0.9 s, 22.1 → 10.5 s and 20.6 → 17.5 s. The 390 px test is bound by decoding, not round trips. Five injected faults each failed and named their card. Hover in the batched clip loops is a synthetic `pointerover`; real-mouse hover stays covered by the file's first and last tests.
- Phase 6, lesson-walk scoping: `scripts/ci-change-scope.cjs` emits `lesson_grep` for the lessons-N shards.
  - All rows run when the change touches the lesson runtime or shared paths, the smoke helpers, the Playwright config or the workflow, and on dispatch or an undecidable scope.
  - A lesson-content change walks the rows it quotes; a content file that quotes none walks all.
  - Any other change walks 24 representative rows, which include all Exit samples, plus the spec's standalone extras describes: 74 of 292 tests.
  - Deploying pushes use the scoped set, because the unit sweeps and other-specs still run in full.
  - A shard left without rows passes (`--pass-with-no-tests`).
- Phase 1 item 4: [ADR 0043](../adr/0043-background-publish-worktree.md) decides on a background publish from a detached per-publish worktree. It is implemented as `just publish --background` and `--status` (`a5eec7a9`). Engineering review findings were fixed before commit: internal flags could delete a foreground checkout, two runs could start at once, and failed starts leaked worktrees. 35 gate tests pass.
- Handler 5, 2026-11-09:
  - The Windows launch fix (`ff37bc26`) works live: `just publish --background` returned in 9 s from the Bash tool and pushed `ba4d421b`. Hosted runs 42557268766 (`65a9a2eb`) and 42559644939 (`ba4d421b`) are green.
  - 42559644939 was the first scoped lesson run, with 25 / 25 / 24 tests and lessons job walls of about 2 min against 3:31–5:15 ([phase4-6a-hosted.md](../reviews/verification-throughput/phase4-6a-hosted.md)). Unit shard 1 (7:55) now bounds the run, at 8:39 from trigger to deploy.
  - The handler card and the feature-streams README now offer `--background` to every stream.
  - Gate timings, partial record ([gate-timings.md](../reviews/verification-throughput/gate-timings.md)). Across 35 published slices from 2026-11-07 to 11-09, full-check slices had a median of 38.7 min and 2.36 attempts before the phase-1 landing, and 18.9 min and 1.20 attempts after it. No push race appears after the landing. The owner accepted this 3-day record as the verdict (Follow-ups).
  - Family reach was checked in a real sweep. A scratch edit to `src/graphs/projective/definingPoints.ts` made `just unit src/graphs/base/GraphTransientState` mount all five projective graphs, against `projective-pascal` alone from the sample. All 152 tests passed.
  - `just test-cost` baseline saved from a clean full local run at `0b81cdad`: 661 files passed, 11,455 tests, 665 s wall at 5 workers, 3,629 file-s over 664 files. The previous baseline (1,271 s) came from a partial run and is not comparable. Vitest's results cache keeps entries for deleted test files, so `--save` recorded 7 stale files; they were removed from the baseline by hand. Follow-up: make `test-cost` skip files that no longer exist.
  - Other streams' running handlers were told about `--background` directly.
  - The `sceneReplacementContract` split was implemented, then rejected. On run 42559644939 the file took 107 s and was only the sixth-heaviest file; the `GraphTransientState` and `lessonRestoration` parts took up to 183 s. Four split files summed 197 s locally against 133 s for the single file. The predicted largest shard was unchanged. Shard 1 led at 847 file-s against 608–638, driven by `GraphTransientState.part1` at 183 s. That part holds the same number of tests as part 2 (111 s), so the gap is per-graph cost or the runner, not the split. The worker's support module is kept in `.command-logs/scene-replacement-split-support.tsx.txt` for reuse.

**Follow-ups:**

- Done (`dbabef1e`): a fresh `just publish` invocation now uses a matching verified-base record on its first pass, as the retry loop does. A record on the fetched master itself also takes the delta path.
- Done: the scope job's `gh api` lookup works with `actions: read`. The documentation-only run 42546128156 (`1247d217`) skipped its checks, and the script reaches that decision only after a successful lookup; a failed lookup falls back to full verification.
- Done: gate timings against the 2026-11-07 baseline ([gate-timings.md](../reviews/verification-throughput/gate-timings.md)). The owner closed this on the three-day record (2026-11-09) rather than a full week. After phase 1, full-check slices take about half the gate time and half the attempts, and no push race appears. The sample is small (5 full-check slices after the change), but no open decision depends on a larger one.

**Scheduling.**

- Phases 2–3 edit test files and need local full unit runs. They compete with streams for the two test slots and touch count tables that content streams edit, so start them when no content stream is mid-sweep.
- Phase 4 needs a measured full run.
- Phase 6 needs CI runs only.

## Answers to the owner's questions

**Do the tests catch anything?** Mostly yes, but the cost is not where the value is.

- 128 of 198 `fix` commits change a test, and only 72 of 792 test-touching commits are test-only. Real-graph host tests have the clearest record (B-spline/NURBS, Voronoi, Delaunay, `sceneReplacementContract`, `NumberInput`).
- Of 28 failed hosted runs, 4 distinct causes were real regressions: points outside a lesson frame, NURBS redraw, LaTeX in card alt text, a toolbar shifting between frames. 2 were lint. About 60% were bookkeeping: count tables, contract lists or generated images not updated after another stream registered a route or Preset. Flakes were about 0.7% of runs.
- 315 pure-logic files cost 98 s (5% of test time). They are cheap and should stay.
- Catalog-wide sweeps that mount a real graph for every lesson or Demonstration (`lessonRestoration.part1–4`, `sceneContentAgainstGraphs`, `sceneReplacementContract`, `GraphTransientState.part*`) take about 41% of unit test time. No fix commit has ever touched them. `GraphTransientState` failed 25 of 43 logged local runs, mostly while a graph was being registered, and rarely on a regression ([commands.md](../commands.md)).

**Will `just check-changed` be enough?** No. It helps, but it targets the wrong bottleneck.

- Selection is wide. A one-line change selects 163–283 of 614 files. 265 of 650 files import localization directly, so an `sl.ts`/`en.ts` edit (24 of the last 343 commits) selects most of the suite.
- It runs inside a machine-wide test slot that is held for tsc, lint, unit and build together. Only 2 slots exist.
- The main loss is the publication race described next. Each rebase onto a moved master reruns the gate.

**Do streams block on publishing?** Yes. A runtime gate takes 16–50 minutes while master moves every few minutes ([handler handoff](../reviews/feature-streams/controls/handler-handoff-3.md)).

- One stream ran three 24–41-minute gates in a row.
- The gate requires a clean checkout, so the stream cannot keep editing while it runs.
- Shared-file slices (localization, registrations) must push promptly, and each push invalidates every other gate still running.
- Hosted CI itself is not awaited, apart from "fix red before your next push".

**Will the controls stream lower this?** Not as currently written. It has added at least 12 test files and removed one. `sharedControls.graphs.test.tsx` mounts a real graph per case and is estimated at 55–60 s, the slowest unit file. Read literally, task 3 ("each family's panels pass the shared test") adds about 900–1,700 CPU-s, +40–80% of the suite. Shared controls make only 10–20 existing cases redundant (5–15 s). With the guardrails in phase 5 the stream ends roughly neutral.

## Diagnosis

1. **Waiting, not testing, dominates stream latency.** These costs multiply:
   - every gate rerun after losing the race;
   - slot queueing (2 slots, held through build);
   - 60 s machine-wide start spacing;
   - the clean-checkout requirement.
2. **Cost scales with content.** Per-lesson and per-Demonstration sweeps grow linearly with the catalog: 45 lessons at consolidation, 123 now; 118 Demonstrations.
   - Unit files grew about 3.6× in two weeks; a full local run took 103–143 s on 10-20 to 10-27 and 981 s on 11-03.
   - Every new lesson adds about 16 s of browser walks plus its share of four real-graph unit sweeps.
   - Each stream that adds content slows every other stream.
3. **Bookkeeping tests turn parallel work into conflicts.** Literal totals (118 in `demonstrations.test.ts:135,182`, `Routes.test.tsx:112`, `guidedExamplePreviewCopy.test.ts:23`) and hand-kept lists produce rebase conflicts (22 commits only recount) and about 60% of red CI. They catch no product bugs.
4. **Coverage gap: browser smoke is outside every local gate, and docs-only pushes hide red master.**
   - Commit 97d22db4 removed `PointCoordinateEditor`. 29 references to `.point-coordinate-editor` remain in four smoke specs (`curve-ownership`, `guided-lessons`, `library-picker`, `standalone-learning`).
   - Run 42475921993 (2fc4a346) is red, and the four docs-only runs after it show green without running Chromium.
5. **CI wall time is set by unit shard 1** (median 9.5 min, last to finish in 11 of 17 runs). `lessonRestoration.part4` alone takes 154 s. Smoke shards finish 1–2 minutes earlier, so cutting smoke saves runner minutes but no wall time.

## Plan

Ranked by stream time saved per unit of effort. Each phase is independent, measured before and after, and recorded here. "Full" verification stays in hosted CI before deployment throughout; the plan narrows what runs locally and per gate, not what guards the deployed site.

### Phase 0: repair master and stop masking red (immediately)

- The controls stream updates the four smoke specs to the shared point controls (or restores the class hook), then pushes and confirms a green full run.
- `scope` (`scripts/ci-change-scope.cjs`): a docs-only push selects full verification when the previous full-verification run on master did not succeed. Alternative: `just publish` prints and refuses on the last full run's failure. Pick one and record the reason.

Acceptance: master's latest full run is green; a fault-injected red full run followed by a docs-only push runs Chromium again.

### Phase 1: stop losing the publication race (largest stream gain, script-only)

1. **Record the verified base.** After `check-changed` passes, the gate stores the master revision it verified on. When the push is rejected and master moved, the gate:
   - rebases;
   - if the incoming commits touch no file the slice imports (per Vitest's module graph) and no shared path, reruns only typecheck, lint and the always-run tier from phase 3;
   - otherwise reruns `check-changed` limited to the incoming ∪ slice changes.

   This removes the rejection that the original spec gave for skipping ("the verified base isn't recorded").
2. **Machine-wide publish lock** around rebase, delta check and push. Gates on one machine stop invalidating each other, and the second gate's delta check sees the first gate's push.
3. **Narrow slot holding.** Take the test slot only around Vitest/Playwright, not tsc, lint or build. Exempt `typecheck` and `lint` from the 60 s start spacing but keep the memory floor.
4. **Later, needs an ADR:** publish from a dedicated worktree in the background, so the stream continues the next slice while its gate runs. The publication spec currently says the gate does not choose a worktree. Decided in [ADR 0043](../adr/0043-background-publish-worktree.md): `just publish --background` runs the unchanged gate in a detached per-publish worktree and reports through a result file.

Acceptance: `publish-gate.test.cjs` covers rejected-push → delta path, overlapping-incoming → full rerun, and lock contention. A recorded week of gates shows median gate time and reruns per published slice against the 2026-11-07 baseline (16–50 min, up to 3 reruns).

### Phase 2: make catalog sweeps scale with the change, not the catalog

Generalize the transient-state scope (`scripts/transient-state-scope.cjs`) to every catalog sweep:

- **Locally and in the gate:** each sweep runs the entries the change reaches plus a fixed representative sample (one per restoration mechanism and family). It runs every entry when a shared path changes.
- **In hosted CI:** every entry, as today.
- **Sweeps:** `lessonRestoration`, `sceneContentAgainstGraphs`, `sceneReplacementContract`, `GraphTransientState`, and the guided-lesson/Demonstration smoke rows (for `just smoke`/`smoke-lesson`).
- `BEZEG_<SWEEP>=all` overrides.
- Estimated saving: about 450–500 CPU-s on a typical local or gate run. Local full-suite wall time falls to about 180–200 s at 10 workers. A content-only slice runs its own rows instead of the catalog.

Same phase, structural:

- Fold the guided-scene part of `sceneContentAgainstGraphs` into the restoration walk so each lesson mounts once. Keep its activities and limit-probe parts. Up to about 90 CPU-s.
- Split `lessonRestoration` into eight parts and `sceneReplacementContract` (110 s) into parts. Rebalance the three unit shards (518 s vs 353 s today). CI critical path: about 9.5 → 7 min. Before splitting, measure whether a fourth unit shard is cheaper: each shard costs about 45 s of `npm ci`.

Acceptance:

- Faults are detected under the narrowed scope: a broken restoration in a changed lesson's graph and a broken shared base path each fail locally.
- A fault in an unchanged, unsampled lesson fails only in CI. This is a documented, accepted risk, like the transient-state one.
- Timings are recorded.

### Phase 3: remove bookkeeping churn and catch it locally

- Replace literal totals and hand-kept id lists with derived invariants. Every registered Demonstration has a route, copy, poster and home card; every lesson has a smoke row. Counts are asserted only where a count is the requirement.
- Add an always-run tier to `check-changed`: the catalog-loop and content-lint files. They sum to about 2 s. Vitest's import selection misses them when a registration changes through a file read. Together with generated-image freshness, they account for most of the 60% bookkeeping failures.
- Have the gate warn when the slice removes a CSS class, `data-*` attribute or `aria-label` that `tests/*.cjs` still references. This is a cheap static check that would have caught the phase 0 failure.

Acceptance: re-running the history in `ci-history.md` against the new tier shows which of the 12 stale-count and 5 generated-image failures it would have caught locally; aim for most of them.

### Phase 4: per-file overhead (measure first)

- Every one of 650 files pays for jsdom plus a full `jsxgraph` import in `src/setupTests.ts` (forks pool, `isolate: true`). That is about 630 s of worker time per full run spent outside tests.
- Move the 157 kernel-only files (analysis, compgeo, bezeg, projective, linear) into a Vitest `node` project with a light setup file.
- Make the JSXGraph setup lazy for files that never mount a board.
- Estimated 50–90 CPU-s. Accept only if a measured full run improves.

### Phase 5: guardrails for the controls stream (apply before task 3)

- The full shared-control behaviour test runs on two graphs per control kind, as the spec's acceptance already says. Every other migrated graph gets one thin wiring check.
- Delete each graph's duplicate control-mechanics cases in the commit that migrates it. Examples: `InversionGraph.host.test.tsx:591`, `InscribedAngleGraph.host.test.tsx:190`, `PointSetSegments.host.test.tsx:149,200`; full list in `controls-impact.md`.
- In `sharedControls.graphs.test.tsx`, mount once per group and reset between cases, and drop the redundant `curve-curvature` runs.
- Each placement/view rule gets a pure test plus one real-graph case, not three real-graph files.
- `just controls-fixture` stays outside `check-changed` and per-push CI.
- Each sweep slice reports its test-time delta from `results.json`.

### Phase 6: browser smoke (runner minutes, not wall time)

- Scope lesson walks in CI with `ci-change-scope.cjs`:
  - all walks when the lesson runtime, shared layout or smoke helpers change;
  - matching rows for lesson-content changes;
  - about 20–25 representative rows otherwise;
  - all rows on manual dispatch and on the deploying run if the owner prefers.
- Move the 7 Exit rows off lessons-2 (921 s vs 502 s on lessons-3).
- Replace `settle()`'s poll-and-sleep (runs about 6,500 times) with one in-page `waitForFunction`.
- Batch the catalogue and clip-decode tests (about 125 s) into one `evaluateAll`.
- Lower the lesson timeout from 150 s to 60 s and set `maxFailures`, so a broken selector does not run every row to timeout.

### Phase 7: rotate the catalog sweeps in CI, full daily (owner decision 2026-11-11)

The owner asked why every new Demonstration adds so much CI time when the per-Demonstration tests seem to catch problems only while that Demonstration is being built. The record agrees: the catalog sweeps take over half of unit test time (2,380 of 4,476 file-seconds on 2026-11-11), grow with every Demonstration and lesson, and no fix commit has touched them. The owner chose rotation with a **daily** full run, rather than the weekly run first proposed.

- A CI push or pull request that changes code checks, in every sweep, the sample, the entries reached by changes since a base, and every 7th entry from a rotating slice index (run number mod 7). 7 is odd, so a slice spreads over the 4 transient state and 8 lesson restoration part files and their shards.
- Push base: the head of the latest finished, not cancelled, full run on master, so a push whose run was cancelled stays in the diff. Pull request base: the merge base.
- Every entry runs for the daily scheduled run (03:17 UTC, separate concurrency groups, no deploy), a manual dispatch, a shared-path change, after a red latest full run, and when the run number, lookup or base is uncertain.
- Local runs and the publication gate are unchanged.

Acceptance:

- `scripts/ci-change-scope.test.cjs` and `scripts/transient-state-scope.test.cjs` cover rotation, base choice and every fallback to all entries. Done (56 tests pass).
- One Vitest part collects the sample plus the slice under rotation and every entry without it. Done locally on `GraphTransientState.part1`: 33 tests sampled, 65 with slice 3/7, 73 with slice 4/7, 256 for the daily run.
- Hosted: the first rotating push and the first daily run report their unit shard walls against the 8–11 min before. Open.

### Keeping it from regrowing

- Add `just test-cost` to print the slowest files and summed time from `results.json`, plus the delta against a baseline. Done: the baseline is a local snapshot saved with `just test-cost --save` after a full run. No master run's results are recorded anywhere to compare against.
- A new catalog-wide or real-graph-per-entry test must state its scope tier (sampled locally, rotated in CI with a daily full run) in its header comment.
- The handler card asks slices that add tests to report the time delta.

### Phase 8: remeasure after phases 0–7, local waiting first (owner report 2026-11-14)

Status: step 8a measured on 2026-11-14 in [the remeasure note](../reviews/verification-throughput/remeasure-2026-11-14.md); V1 and V5 are met there. Step 8b is a ranked proposal in [the throughput state note](../reviews/site-walkthrough/throughput/state.md). On 2026-11-14 the owner limited this phase to measuring and proposing, then approved the proposal (see "Owner decisions" below); implementation is under way, and "Changes landed" below lists each change as it lands. Source: [site walkthrough intake](site-walkthrough-intake-2026-11-14.md#8-verification-throughput-and-architecture-investigation), items T01–T05.

The owner reports that CI still takes about 12 minutes for small changes. On 2026-11-14 he added that the wait is local as well: agents wait for tests before they can continue, and this is a constant blocker. Local agent waiting is therefore the first thing this phase measures and the measure its changes are judged by.

Observed on 2026-11-14 from `gh run list` (run creation to last update, so queueing and deployment are included):

- The 24 successful full runs on master from 2026-11-13 and 11-14 took 9.1–14.9 min, median 12.2 min. The record on 2026-11-09 was 8:39 from trigger to deploy. Hosted time has regrown by about a third in five days, after phases 2, 4, 6 and 7.
- Documentation-only runs took 0.5–0.6 min. At least six pushes whose head commit is titled `docs:` ran full verification (for example `2370f88e`, 12.2 min). Measured since: of nine such pushes on 11-13 and 11-14, four carried code in the same push and five carried a PNG, a JSON file or `DESIGN.md`, which the documentation allowlist does not include; the red-latest-run rule caused none.
- More than 80 Git worktrees are registered on this machine. Measured since: one test-running command was active for 62% of the busy time of the week, two for 28%, three or more for 10%.

Step 8a, measurement only. Write the result to `docs/reviews/verification-throughput/remeasure-2026-11-14.md`.

- **Local.** From the `.command-logs` of every worktree over the last week, for each `check`, `check-changed`, `unit`, `smoke*` and `publish` run: time queued for a slot, start spacing, typecheck, lint, Vitest, build and smoke time, number of files selected, and reruns. Add what the logs cannot show: how long a handler or worker is idle between starting a check and using its result, taken from a sample of stream state notes and transcripts.
- **Four representative small changes**, each timed end to end from "edit done" to "verified locally" and to "deployed": a one-file graph fix, one localization string, a CSS-only change and one lesson content edit.
- **Hosted.** Per-job walls for the full runs above, the critical-path job in each, and what regrew since 2026-11-09 (file count, catalog size, whether rotation applies to these pushes). Explain the `docs:` pushes that ran full.
- **Cost against value (T04).** For the 30 most expensive files in `just test-cost`, name the distinct behavior each guards and mark the ones that repeat a guarantee another file already gives.

Step 8b, decide from 8a. These are hypotheses to test against the measurement, not selected work:

- Agents wait when they do not need to: a check that could run in a detached worktree in the background, as `just publish --background` does, while the agent continues.
- Workers run more than their slice needs: worker briefs ask for `check-changed` where focused files would do, with the handler running the wider check once per slice.
- Selection is wider than the change: a CSS-only or documentation-adjacent change still selects unit files; the 265 files that import localization make any string edit select most of the suite.
- Typecheck and lint are paid in full on every run without an incremental cache.
- Slot sizing (2 slots of 5 workers, set on 2026-11-02) no longer fits the current suite and the number of concurrent streams.
- Module boundaries: broad imports make unrelated tests reachable from small changes (the owner's architecture hypothesis in T04).

Policy to record with the decision (T03): which checks run on every change, which are sampled locally, which rotate in CI, and when everything runs. The daily full run from phase 7 already exists; this step confirms it runs, is green and is read by someone, and documents the whole policy in one place in [the command guide](../commands.md).

Owner decisions on the proposal, 2026-11-14:

- **Reader of the daily run (T03):** the handlers. Each reads the latest scheduled run at session start and reports or repairs a failure; GitHub's e-mail to the owner stays on. Written into [the workflow](../agent-workflow.md#daily-full-run), the handler card and [the command guide](../commands.md). The alternative was the owner alone through GitHub's e-mail. The run itself is not yet reliable (green once in three days, one cancellation at the 15-minute job limit); repairing it is change 8 below.
- **The proposal as a whole:** approved ("I agree with all of your recommendations"). Read as the ten changes of the state note in the recommended order, with the slot change (6) timed first and brought back to him before anything is changed. Each change still records its before and after and its guard here as it lands.
- **Whether the gate may leave unaffected graph and lesson tests to CI:** yes, as part of that approval. CI runs everything per push before deploying, and the stream whose push goes red repairs it before pushing anything else. The owner had asked how often those tests caught bugs locally. In the week measured, never: of 51 red local runs, six failed in such tests, all on time limits or a cache file under load ([remeasure note, section 6](../reviews/verification-throughput/remeasure-2026-11-14.md#6-did-the-tests-a-narrower-selection-would-skip-catch-bugs-locally)).

Changes landed, with what still guards each narrowed check (V3). Before and after timings are in [the state note](../reviews/site-walkthrough/throughput/state.md#changes-made-with-before-and-after).

- **Change 1, stylesheet-only selection (T02).** When a change has stylesheets (`.css`, `.scss`) and otherwise only documentation, `just check-changed` and the gate's slice check skip Vitest's import selection and its test slot, and run the always-run tier plus the three tests that read stylesheet source (`STYLESHEET_READERS` in `scripts/check-changed-always-run.cjs`). Guard: jsdom applies no stylesheet and the Vitest configuration processes no CSS, so no other unit test can observe the edit; `commands.test.cjs` fails when a test under `src/` reads a stylesheet and is missing from the list. The production build compiles the CSS, browser smoke covers rendering where the change alters a route or control, and CI runs every unit test per push.
- **Change 3, typecheck and lint caches (T02).** The runner calls `tsc --incremental` with its build information in the checkout's `.command-logs/tsc.tsbuildinfo`, and ESLint with `--cache --cache-strategy content` in `.command-logs/eslintcache.json`. A background publish worktree starts with a copy of its origin's typecheck cache; the lint cache is keyed by absolute path and is not copied. Nothing is narrowed: the compiler and rules are the same, TypeScript rechecks every file whose content hash differs and the files that depend on its declarations, and ESLint relints a file whose content or configuration changed. The lint configuration has no type-aware rule, so one file's lint result cannot depend on another file. Hosted CI calls `tsc` and `eslint` directly and stays uncached.
- **Change 8, daily run time limit (T03).** The unit job's limit is 25 minutes for the scheduled run and 15 for pushes. Its reader is the handlers (above). Nothing is narrowed.
- **Change 2, harness split (T04).** `createGraph` moved from `realGraphTestHarness.tsx` to `src/graphs/base/createTestGraph.ts`, which alone imports the all-graphs registry and the surface-view graphs; 57 tests and 3 contract helpers import it there. Nothing is narrowed: no assertion changed, and a test that mounts a graph by id still imports every graph through the new module. Tests that use only the shims and `mountGraph` stop being selected by unrelated graph edits, which is the intent.
- **Change 10, timing record (T02).** The runner appends one line per run to `.command-logs/timings.jsonl` (slot and memory wait, seconds per step, test files reported), and the scheduled run's unit shards upload Vitest's per-file durations, which `just test-cost --results <dir>` reads. Nothing is narrowed. This gives the regrowth guard above its baseline: the daily artifact of any day can be compared with `--save` of another.
- **Change 4, registry-bounded selection (T02).** `just check-changed` and the gate's `runtime` recipe select unit tests with `scripts/check-changed-selector.cjs` instead of Vitest's `--changed`: a changed file is followed to the tests that import it, transitively, but not through `allGraphFactories.ts`, `graphLoaders.ts`, the family `runtime.ts` loaders, the lesson registries, `chapterOwnedLessons.ts`, `lessonCatalog.ts`, `src/localization/index.ts`, `src/demonstrations.ts` or `src/Routes.tsx`. Shared paths, configuration and setup files, deleted files and selections over 400 files fall back to `--changed`. The catalog sweep files always run on their sample plus reached entries. Narrowed: tests that reach the changed file only through a registry, for example other graphs' tests for a graph edit, every catalog consumer for a string edit, and a test that mounts its own graph only by id through `createGraph` (`interpolationFamilyControls.test.tsx` for `InterpolationGraph.tsx`; the two other such tests are under the shared `src/graphs/base/`). Also not seen: an import whose specifier is built at run time, since imports are read by pattern. Guard: hosted CI runs every unit test per push before deploying, and a red push is fixed by the stream that pushed it before it pushes anything else (decided below). With the cut list emptied, the selector matched Vitest's `--changed` exactly on the representative changes.
- **Change 5, wide filtered runs take a slot (T02).** A `just unit <paths>` run whose path filters match more than 20 test files (`FILTERED_SLOT_FILES` in `scripts/commands.cjs`, counted as Vitest matches a filter, by substring of the path) takes a test slot and its workers instead of running beside the slots on 2. Nothing is narrowed: the same files run, with more workers, and such a run now queues behind a slot holder. Runs of 20 files or fewer are unchanged.
- **Change 6, lone-run workers (T02): timed only, owner decision pending.** One whole-suite `just unit` took 739 s at 10 workers alone, and 1,422 s at 5 workers beside another session's gate (not a lone run). Slot sizing is unchanged until the owner answers.
- **Change 9, six unit shards (T02).** The unit shards set the hosted wall (run 43591356678: shards 516–772 s against 80 s build plus 323–420 s smoke; run 43588216160: 396–488 s against 87 s plus 146–418 s). `browser-smoke.yml` runs six Vitest shards instead of four, and `PINNED_SHARDS` in `vite.config.mts` moves its pins to shards 3–6, because with six shards the part files load shards 1 and 2 most; `graphTeardownContract.test.tsx` is newly pinned. Cost: two more jobs of about a minute of setup each. Nothing is narrowed: the shards still partition every unit test file. Before and after hosted walls: the state note's table.
- **Change 7, documentation allowlist (T05).** CI treats every file under `docs/` and every Markdown file at the repository root as documentation, except data and code files (`.json`, `.js`, `.cjs`, `.mjs`, `.ts`, `.tsx`) and `docs/specs/school-function-graphs-lessons.md`, which a lesson test reads. Guard: a documentation-only push still builds nothing that ships, because the app is built from `src/` and `public/`; `ci-change-scope.test.cjs` fails when a unit test or smoke spec names a `docs/` file the allowlist accepts. Not guarded: a test that builds a `docs/` path at run time from parts and reads a non-data file; none does today, and such a read would need adding to the exception list.

Acceptance:

- **V1:** The remeasure note states, for each of the four representative changes, where the time goes locally and on CI, with the logs or run ids it came from.
- **V2:** Each change selected in 8b names the wait it removes and is measured before and after on the same representative changes. The headline measure is the agent's wall time from "edit done" to "verified locally".
- **V3:** No check is removed or narrowed without recording what still guards the behavior and where the full check runs.
- **V4:** The routine / full policy is written in the command guide, and the full run's schedule and owner are named.
- **V5:** The note explains why hosted time regrew after phases 2–7, so the same cause is covered by the regrowth guard above.

## Decisions taken

- CI stays the full gate before deployment. Making local and gate runs narrower is what speeds streams up; making CI faster only saves runner minutes and the time to notice red. Amended 2026-11-11 by the owner (phase 7): the catalog sweeps rotate per push, so their full check moves to a daily run. A regression only in an unrotated entry can therefore deploy and is found within a day. Every other check stays full per push.
- The local slice check and the publish gate leave tests that reach a change only through a registry to hosted CI (owner, 2026-11-14, phase 8 change 4). CI runs every unit test per push before deploying; a stream whose push goes red repairs it before it pushes anything else. The alternative, Vitest's full import selection locally, cost about 15 minutes per slice and caught no behavior defect in the week measured. The policy is in [the command guide](../commands.md).
- No test is deleted for speed alone where history shows it catches bugs. Deletions target duplicated mechanics and literal-count bookkeeping.
- Rejected for now:
  - pushing on hosted CI alone, because it breaks the fail-fast contract;
  - a GitHub merge queue, because it needs branch protection and the publication spec puts that out of scope;
  - an automatic per-test quarantine, because the flake rate is 0.7% and not the problem.

## Out of scope

Replacing Vitest or Playwright, renderer changes, and test-impact tooling beyond Vitest's module graph and the existing scope scripts.
