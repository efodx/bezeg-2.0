# Throughput session state (site walkthrough, package A)

Rewritten by handler 3 on 2026-11-14 with nine changes landed or publishing and change 6 being timed. Queue: [throughput queue](../../../tasks/site-walkthrough/throughput.md). Spec: [verification throughput, phase 8](../../../specs/verification-throughput.md#phase-8-remeasure-after-phases-07-local-waiting-first-owner-report-2026-11-14). Evidence: [remeasure note](../../verification-throughput/remeasure-2026-11-14.md).

## For the owner

**Your decision: change 6, may a lone slot holder use 10 workers?** Each run below is one whole-suite `just unit` of all 931 test files, on master's code of 2026-11-14:

| Workers | Wall | Other slot held during the run |
| --- | --- | --- |
| 10 | **739 s** | Never: the run was alone throughout |
| 5 (today's setting) | 1,422 s | Yes, in 89 of 97 samples taken every 15 s: another session's publish gate ran beside it |

- **The 5-worker run is not a clean baseline.** It shared the CPU almost throughout, so the two runs cannot be compared directly.
- **The 2026-11-02 measurements point the same way:** one run alone at 10 workers used 95% of the CPU, and two runs at 5 workers each kept total throughput within 5% of one 10-worker run. A lone run at 5 leaves about half the machine idle.
- **My recommendation: yes, but only while the other slot is free.** When no other slot is held, a slot holder gets 10 workers. A run that starts beside it gets its 5 and shares an oversubscribed CPU until the first run ends; nothing is narrowed.
- **The alternative** is to time one more lone 5-worker run first. That is about 15 more minutes of machine time, at a quiet moment.
- **Nothing in `scripts/test-slots.cjs` changes until you answer.**

**Where things stand (handler 3, 2026-11-14):**

- **All nine implemented changes are on master and deployed:** 7, 1, 3, 8, 10, 2, 4, 5 and 9. The last push is `f16d4c6f`, and hosted CI is green.
- **Change 9's first hosted run (43623381049):** 9.75 min from push to deploy, against a 12.2-min median before. Its six unit shards took 376–531 s, against 516–772 s with four. That is one run, and runner speed varies about 1.6x between jobs.
- **Policy:** the routine / full policy table is in [the command guide](../../../commands.md) under "Routine and full verification" (V4).

**The largest change, 4, cut a one-file slice check from about 15 minutes to about 6.** Each figure is one `just check-changed` run against the change alone:

| Edit | Files before (Vitest `--changed`) | Files after | Time after |
| --- | --- | --- | --- |
| Lesson text (`linearMapsChapterLessons.ts`) | 432 | 20 | 359 s, no slot wait |
| Shared graph helper (`labelLayout.ts`) | 303 (114 after change 2) | 29 | 350 s, no slot wait |
| One graph (`LogisticMapGraph.tsx`) | 299 (109 after change 2) | 24 | 1,083 s, of which 368 s waiting for a slot |
| One string (`sl.ts`) | 583 | 31 | 1,070 s, of which 515 s waiting for a slot |

- **Before:** the gate's median was 885 s and a one-graph fix took 1,016 s.
- **What is left is fixed cost.** In every run, about 326 s is the test step: mostly the catalog sweep files that always run, plus worker start-up. Typecheck, lint and build together are under 30 s with the caches.
- **The other floor is the slot queue.** It came from other sessions' publish gates, which still ran the old wide selection until change 4 reached master. That should shrink as their gates pick up change 4.

**What it costs:** a test the local check left out can now fail first on CI. Hosted CI still runs every test on every push, and a stream whose push goes red fixes that before it pushes anything else. One gap I found in review: `interpolationFamilyControls.test.tsx` mounts its graph only by id, so an edit to `InterpolationGraph.tsx` no longer selects it locally.

**What other sessions must do differently:**

- Expect a push to go red on CI on a test their local check skipped. They fix it first, as the gate's rule already says.
- A `just unit <directory>` that matches more than 20 test files now queues for a slot like a full run, and then gets 5 workers instead of 2 (change 5).
- CI runs six unit shards instead of four (change 9). Nothing to do; job names gain shards 5 and 6.
- Tests needing `createGraph` import it from `src/graphs/base/createTestGraph.ts` (change 2).

**Waits on you:** change 6, above.

**Session note:** at your request, handler 3 stopped the obsolete handlers with their processes on 2026-11-14: throughput 1 and 2, graphs 1, polish 1 (its internal preview on port 4342 went with it) and control-choice 3.

**Ready to read:** the [remeasure note](../../verification-throughput/remeasure-2026-11-14.md). It is a document, so there is no preview and no Tailscale address; port 4334 is unused.

**Approved by you on 2026-11-14:** "I agree with all of your recommendations." I read that as the ten changes below in the order I recommended, the policy table, and leaving unaffected graph and lesson tests to CI (change 4). Change 6 is only timed first, and its numbers come back to you before any slot setting changes, as I recommended. Tell the handler if you meant less: changes 5, 8, 9 and 10 were in the table but not in my "start with" sentence.

**Observed while timing (2026-11-14, 12:44–13:00 local):** my CSS before-run waited 863 s for a test slot, because two other sessions' publish gates held both slots in their `check-changed` unit steps for over 25 minutes each. The week's median slot wait was 1 s; under today's load the queue, not the tests, was the largest wait. Changes 1 and 4 matter here as well: a run that selects no tests no longer takes a slot.

### Headline numbers (week of 2026-11-07 to 11-14)

- A small code change takes about **15 minutes to verify locally** and 12 more to deploy. The gate's `check-changed` step: 204 runs, median 885 s, p90 1,762 s. Hosted: median 12.2 min from push to deployed.
- **`check-changed` is close to a full run for any app change.** A one-line edit selects 299 unit test files (one graph), 326 (a stylesheet), 432 (a lesson text) or 583 (a localization string) of 930. All four include the same 276 files, which carry 75% of the suite's cost.
- **The reason is one test helper.** About 260 test files import `realGraphTestHarness.tsx`, mostly for its board shims, and that file imports every graph in the app. Your module-boundary explanation (T04) is confirmed in this form. Duplicated assertions are not the cost: the candidate overlaps add up to under 3%.
- **Slot queueing is not the wait.** A full unit run waits a median of 1 s for a slot. A lone run uses 5 of 12 threads, and a lone run is the case 62% of the time.
- **Typecheck and lint cost 73 s and 37 s** at the median and run from scratch every time: 766 agent calls, 19 hours.
- **Workers were blocked on verification for 20% of their active time** (76.6 h), handlers for 5% (19.6 h).
- **CI regrew because the suite grew:** 674 unit test files on 11-09, 930 now. Nothing reports or limits that growth.
- **`docs:` pushes ran full** because the push also carried code (4 of 9) or a PNG, JSON or `DESIGN.md` that the documentation allowlist does not know (5 of 9).
- **The daily full run was green once in three days.** One run died at the 15-minute job limit.

### Proposed changes, in order of agent waiting removed

Savings are estimates from this week's volumes unless marked measured. "Guard" says what still checks the behavior. "Others" says what running sessions would notice.

| # | Change | Wait it removes | Expected saving | Guard | Risk to other sessions |
| --- | --- | --- | --- | --- | --- |
| 1 | **A CSS-only change selects only the unit tests that read stylesheets** in `check-changed` and the gate, plus the always-run tier and the build | 11–24 min of Vitest for a stylesheet edit | About 14 min per CSS-only slice; the polish and design sessions make these now | jsdom does not apply stylesheets, so a mounted-graph test cannot fail on one. Three unit tests read stylesheet source from disk (`OperationApplyReason`, `ControlRow`, `LookUnderneath`); they would always run for a CSS change, which the import-graph selection does not guarantee today. The build compiles the CSS, smoke covers rendering, and CI runs everything per push | Low. `scripts/commands.cjs` and its tests; no action needed from others |
| 2 | **Split the test harness** so that only the 57 tests that call `createGraph` import the all-graphs registry; the other 200 or so keep the shims and `mountGraph` | Unrelated graph tests selected for a one-graph edit | Simulated on the import graph: 299 → 109 files, 78% → 38% of suite cost for a one-graph fix. No effect on stylesheet, lesson or localization edits. Each of the other files also stops importing every graph, on CI too; that saving is not measured | No assertion changes. One import line in 57 test files | Low to medium. Touches test files in every family, so it conflicts with streams editing the same tests on the same day; best landed in one commit at a quiet moment |
| 3 | **Typecheck incrementally and lint with a cache** in the runner (`tsc --incremental`, `eslint --cache` by content) | The 73 s + 37 s paid before any test starts, and on every standalone call | Measured once here. Typecheck: 105 s as today, 7.5 s with nothing changed, 32 s after a one-graph edit, 112 s (no gain) after a localization catalog edit. Lint: 48 s as today, 4.8 s cached, also after a one-file edit | Same compiler and rules; CI stays uncached. To check before landing: that no lint rule in use reads types from other files, since a per-file cache would then keep a stale result | Low. Each worktree builds its cache on its first run (one slow run) |
| 4 | **Selection that stops at registries** for `check-changed` and the gate: a change is followed to the tests that import it, but not through the all-graphs registry, the lesson registries or the localization catalogs. The catalog sweeps keep running, on their sample plus the entries the change reaches, as they already decide for themselves | The remaining 109 files for a graph, 432 for a lesson text, 583 for a string | Estimated `check-changed` of 2–4 min instead of 15 for these changes: about 11 min per slice, and about 35 machine hours a week at this week's 204 gate runs | CI runs the full suite per push before deploy, as today. A break in graph B caused by a change in graph A's own file would be found on CI, not locally. Shared paths (`src/graphs/base/`, `src/bezeg/`, runtime, storage) still select everything | Medium. More pushes may go red on CI; the pushing stream fixes them first, as the gate's rule already says. Needs its own tests and one before/after per representative change |
| 5 | **Directory-wide filtered unit runs take a slot.** A `just unit <paths>` run that matches more than about 20 files gets a slot and its 5 workers instead of 2 workers and no slot | 107 runs of 10 min or more this week, 29.7 h | Up to half of that | Nothing is narrowed | Medium. Those runs would queue behind a gate run; small filtered runs are unaffected |
| 6 | **A lone slot holder uses more workers** (8–10 instead of 5 when no other slot is held) | Half the machine idle during 62% of test time | Unknown until timed; the 2026-11-02 figures suggest up to 40% off a lone run. I would time one run each way first | Nothing is narrowed | Medium. A second run that starts meanwhile shares an oversubscribed CPU until the first ends |
| 7 | **Widen the documentation allowlist** on CI to every file under `docs/` and to root Markdown files | A 12-minute full run, and a delayed deploy, for a state note with a screenshot | 5 of 9 `docs:` pushes on 11-13/14 | A docs change cannot alter the built app; the scope script's tests cover the list. To check before landing: no unit test reads a file under `docs/` | Low |
| 8 | **Repair the daily run:** raise the unit job limit for the scheduled run (15 → 25 min), and name its reader | A full run that is cancelled instead of reporting | Makes T03 true | It is the guard | Low. Workflow file |
| 9 | **CI wall:** balance the unit shards by cost, or go from 4 to 6 | The slowest shard, which sets the hosted wall | About 2–3 min of 12 | Nothing is narrowed | Low; 6 shards cost about 2.5 runner-minutes more per run |
| 10 | **The runner records its own timings** (one JSON line per run: slot wait, seconds per step, files selected), and the daily run saves per-file test durations for `just test-cost` | Nothing directly | Makes the next remeasure a query, and gives the regrowth guard a baseline it lacks today | — | Low |

Not proposed: deleting or merging tests for speed. The overlaps found are small (under 3% of cost) and unverified.

Approved order: 1, 3 and 7 (small, low risk, independent), then 8, then 2, then 4 with its measurements, then the timing of 6, then 10, 5 and 9. The place of 8, 10, 5 and 9 in that order is the handler's.

### Changes made, with before and after

Times are an agent's wall time through `just`, on this shared machine, once each. "Guard" is recorded in the spec, phase 8, "Changes landed".

| # | Commit | Wait removed | Representative change | Before | After |
| --- | --- | --- | --- | --- | --- |
| 7 | `0c634559` | A full CI run for a docs push carrying a PNG or `DESIGN.md` | The five such `docs:` pushes of 11-13/14 | Full run, about 12 min | Documentation-only, about 0.5 min (by the scope script's rule; first real push not yet observed). JSON and code under `docs/` still run full, because tests read some of them |
| 1 | `28be340b` | The import selection and its slot for a stylesheet edit | One-line edit of `WorkspaceControls.css`, `just check-changed` | 326 test files selected, slot required; the timed run waited 863 s for a slot, then its unit step broke off without a result after 2,356 s in total (the handler was committing in the same worktree meanwhile), so there is no valid test time; the remeasure note expects about the same as the one-graph fix, 1,016 s | 129 s wall, no slot, 15 test files (12 always-run + 3 stylesheet readers), caches warm |
| 3 | `ad9034cf` | Typecheck and lint from scratch on every run | `just typecheck` / `just lint` | 119 s / 77 s | 12 s / 15 s with nothing changed; 43 s / 9 s after a one-graph edit. A background publish worktree is seeded with the typecheck cache |
| 8 | `f49067c2` | A cancelled daily run | Scheduled unit job limit | 15 min (run 43413497282 cancelled) | 25 min for the scheduled run, 15 for pushes. First scheduled run with it: not yet observed |
| 10 | `9884d291` | Hand-parsing logs to remeasure | — | Logs only | `.command-logs/timings.jsonl`, one line per run; daily per-file durations as artifacts `unit-durations-*`, read by `just test-cost --results <dir>` |
| 2 | `82f0febe` | Unrelated graph tests selected for a one-graph edit | `LogisticMapGraph.tsx` / `labelLayout.ts`, Vitest `--changed` listing | 299 / 303 files; the gate step for a one-graph fix took 1,016 s (remeasure note) | 109 / 114 files. Timed `check-changed` of the graph edit after 1, 3 and 2: 2,926 s wall, passed, but it ran beside two publish gates and my own before-run on the same CPU, so it is no valid after time; retime it once the machine is quiet (`timings.jsonl` now splits wait from run) |
| 4 | `06d42948` | Tests reached only through a registry, selected for every one-file edit | The four representative edits, `just check-changed HEAD` (`.command-logs/t4/`) | 299 / 583 / 432 / 303 files; gate median 885 s | 24 / 31 / 20 / 29 files; 1,083 s (368 s slot wait) / 1,070 s (515 s wait) / 359 s / 350 s |
| 5 | `e08bea1c` | Directory-wide filtered runs on 2 workers beside the slots (107 runs of 10 min or more in the week) | `just unit <directory>` matching more than 20 files | No slot, 2 workers | A slot and its 5 workers. Not timed: the saving depends on how many such runs a week brings |
| 9 | `c4eb8c2a` | The slowest unit shard, which sets the hosted wall | Hosted full runs | 4 shards: 516–772 s (run 43591356678), 396–488 s (43588216160); wall median 12.2 min | 6 shards: 376–531 s; 9.75 min push to deploy (run 43623381049, one run) |
| 6 | (not changed) | Half the machine idle while one slot holder runs alone | Whole-suite `just unit`, 931 files | 5 workers: 1,422 s, beside another session's gate (not a lone run) | 10 workers: 739 s, alone throughout. Setting waits for the owner |

### Proposed routine / full policy (T03), your choice

| Tier | When | What runs |
| --- | --- | --- |
| Inner loop | A worker, after each edit | The test files of the module it changed, by path. Typecheck when types changed |
| Slice | The handler once per slice, and the publish gate | Typecheck, lint, the tests that import the changed files (change 4), the always-run tier, the catalog sweeps on their sample and reached entries, build. Browser smoke of the affected routes when a route, control, lesson or rendering path changed |
| Push | Hosted CI, every push with code | Every unit test and every smoke spec; catalog sweeps on sample, reached entries and one seventh by rotation. Deploys on green |
| Daily | Hosted CI, 03:17 UTC | Everything, every sweep entry. No deploy. A red daily run already makes the next push run every entry |
| On demand | Before pushing a change to restoration, Presets, scene replacement or lesson structure outside the shared paths | `BEZEG_SWEEPS=all just unit`, as the command guide says today |

**Choice 1, decided 2026-11-14:** the handlers read the daily run. Each handler reads the latest scheduled run at session start and reports or repairs a failure; GitHub's e-mail to you stays on. This is now in the handler card, the workflow and the command guide. It uses `gh run list` directly, so no script changed. The run itself still needs change 8 to be reliable.

**Choice 2, decided 2026-11-14:** the slice tier may leave unaffected graph and lesson tests to CI (change 4). That is the step that removes most of the 15 minutes, and it is the one that can let a red push through to CI.

You asked how often those tests caught bugs locally. **In the week measured, never.** Of 51 red local runs (17 gate failures, 23 `check-changed`, 11 whole-suite), 45 failed in a test the narrower selection would still run, or in no test at all. Six gate runs failed in tests it would skip, all on 2026-11-14: five on test time limits and worker start-up under load, one on a missing cache file. None was an assertion about behavior, and together they cost 4.5 hours of gate time. Details and limits: [remeasure note, section 6](../../verification-throughput/remeasure-2026-11-14.md#6-did-the-tests-a-narrower-selection-would-skip-catch-bugs-locally). Not examined: what failed in the 18 red hosted runs of those days, which would show how often CI is already the one that catches a defect.

## State

- Daily run at handler 3's start: 43585378440, green. The first scheduled run with change 8 (25-minute limit) and change 10 (duration artifacts) is due at 03:17 UTC on 2026-11-15.
- On master: all nine implemented changes (last `f16d4c6f`, hosted run 43623381049 green). Nothing of this session is unpublished except this note.
- Timing evidence: `.command-logs/t4/` (change 4), `.command-logs/t6/` (change 6: `summary.txt`, slot samples per run).
- Successor rule: every successor in this chain is Opus at medium effort. Launch from this directory with `claude --bg -n "walkthrough throughput handler <n+1>" --agent bezeg-handler --model opus --effort medium --permission-mode auto "<prompt>"`; thresholds 175k soft, 215k handoff. Implement only what the owner approved; the slot change of 6 goes to him first. Do not launch a successor while only waiting on him.

## For the next handler

1. **Owner's answer on change 6.**
   - If yes: in `scripts/test-slots.cjs`, give a slot holder 10 workers when no other slot is held at acquisition, and 5 otherwise. Cover it in `commands.test.cjs`/`just tooling-test`, update the slot paragraph of `docs/commands.md`, and say under "For the owner" what other sessions notice: a second run beside a lone one is slower until the first ends.
   - If he wants a clean baseline first: one lone 5-worker `just unit` with `.command-logs/t6/run.sh` edited to `for w in 5`.
2. **After 03:17 UTC:**
   - Note under change 8 whether the scheduled run finished within 25 minutes.
   - Download its `unit-durations-*` artifacts (`gh run download <run> -p 'unit-durations-*' -D .command-logs/durations`) and read them with `just test-cost --results .command-logs/durations`. If one shard is clearly longest, refine `PINNED_SHARDS` in `vite.config.mts` by cost.
3. **Close phase 8.** Mark V2 and V3 met in the spec and the queue once change 6 is settled. V1, V4 and V5 are met.
