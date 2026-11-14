# Throughput session state (site walkthrough, package A)

Written by handler 1 on 2026-11-14 after step 8a. Queue: [throughput queue](../../../tasks/site-walkthrough/throughput.md). Spec: [verification throughput, phase 8](../../../specs/verification-throughput.md#phase-8-remeasure-after-phases-07-local-waiting-first-owner-report-2026-11-14). Evidence: [remeasure note](../../verification-throughput/remeasure-2026-11-14.md).

## For the owner

**Ready to read:** the [remeasure note](../../verification-throughput/remeasure-2026-11-14.md). It is a document, so there is no preview and no Tailscale address; port 4334 is unused.

**Nothing has been changed.** The intake session relayed your correction during the measurement: this session measures and proposes, and waits for your approval of each change. I followed it. No script, slot setting, gate, workflow, test or brief wording was touched.

**Your decision:** which of the changes below to approve, and the two choices marked "your choice".

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

I would start with 1, 3 and 7 (small, low risk, independent), then 2, then 4 with its measurements, and time 6 before deciding it.

### Proposed routine / full policy (T03), your choice

| Tier | When | What runs |
| --- | --- | --- |
| Inner loop | A worker, after each edit | The test files of the module it changed, by path. Typecheck when types changed |
| Slice | The handler once per slice, and the publish gate | Typecheck, lint, the tests that import the changed files (change 4), the always-run tier, the catalog sweeps on their sample and reached entries, build. Browser smoke of the affected routes when a route, control, lesson or rendering path changed |
| Push | Hosted CI, every push with code | Every unit test and every smoke spec; catalog sweeps on sample, reached entries and one seventh by rotation. Deploys on green |
| Daily | Hosted CI, 03:17 UTC | Everything, every sweep entry. No deploy. A red daily run already makes the next push run every entry |
| On demand | Before pushing a change to restoration, Presets, scene replacement or lesson structure outside the shared paths | `BEZEG_SWEEPS=all just unit`, as the command guide says today |

**Your choice 1:** who reads the daily run. Options: (a) you, through GitHub's e-mail for a failed scheduled run; (b) the first handler session of each day, as a rule on the handler card, with `just ci` showing the latest daily verdict. I recommend (b), with (a) left on.

**Your choice 2:** whether the slice tier may leave unaffected graph and lesson tests to CI (change 4). That is the step that removes most of the 15 minutes, and it is the one that can let a red push through to CI.

## State

- Step 8a is done and step 8b is a proposal; see the queue. V1 and V5 of phase 8 are met by the note. V2, V3 and V4 wait for approved changes.
- Not measured, and said so in the note: CPU load during runs, handler idle time behind a background gate, the CSS change end to end, per-file durations on CI.
- The measurement scripts and outputs are in `.command-logs/remeasure/` of this worktree (not committed). `node_modules` here is a junction to the main checkout's; remove it with `cmd /c rmdir node_modules`, never recursively.
- No successor is launched: the remaining work needs the owner's approval.

## For the next handler

Continue only with changes the owner has approved, one small commit each, covered by `just tooling-test` where scripts change. For each: name the wait, time the same representative change before and after (the four in the note, section 2), and record in the spec what still guards a narrowed check. Changes to `scripts/commands.cjs`, the gate, slots or the workflow affect every running session: say in this note what they must do differently. If brief wording changes, change `docs/agent-workflow.md` in the same commit as the card.
