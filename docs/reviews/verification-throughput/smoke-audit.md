# Smoke suite audit (2026-11-08)

Read-only research. Sources: `tests/*.cjs`, `playwright.config.cjs`, `.github/workflows/browser-smoke.yml`, CI run
42473882485 (master, success, 9m58s, "Remove arrows from guided lesson navigation"), runs 42471425087 and 42475921993
(job timings), local `playwright-report-4311` (2026-10-28, 244 tests, older shape). Parsed per-test durations:
`durations.tsv` beside this file (seconds, shard, spec, line, title); raw chromium log: `chromium.log`.
Extraction script: `scripts/pwrep.py` (decodes the HTML report's embedded zip).

## 1. Inventory

| Spec | Lines | Tests in CI run | Summed test time (s) |
| --- | --- | --- | --- |
| guided-lessons.smoke.spec.cjs (+ lesson-experience-checks.cjs, 345 lines, 20 tests) | 2971 | 292 | 2302 |
| demonstrations.smoke.spec.cjs | 279 | 126 | 272 |
| unified-learning.smoke.spec.cjs | 167 | 26 | 144 |
| demonstration-motion.smoke.spec.cjs | 267 | 15 | 104 |
| standalone-learning.smoke.spec.cjs | 244 | 8 | 75 |
| curve-ownership.smoke.spec.cjs | 379 | 6 | 42 |
| curve-editing-modes.smoke.spec.cjs | 112 | 4 | 26 |
| count-setter.smoke.spec.cjs | 183 | 5 | 23 |
| library-picker.smoke.spec.cjs | 247 | 6 | 20 |
| lesson-graph-access.smoke.spec.cjs | 193 | 3 | 17 |
| workflows.smoke.spec.cjs | 182 | 3 | 10 |
| history-entry-bridge.smoke.spec.cjs | 63 | 1 | 6 |
| home.smoke.spec.cjs | 111 | 2 | 4 |
| **Total** | | **497** | **~3047** |

Helpers: `lesson-smoke-helpers.cjs` (306), `smoke-catalog.cjs` (403; parses the TS demonstration catalog with the
TypeScript compiler to generate demonstration rows).

### How guided-lesson rows are generated

- `LESSONS` (line 2434) has 112 row objects plus `...patchRows` (11 Bézier-patch rows) = **123 lesson rows**. One row
  per available guided lesson (enforced by `src/learning/runtime/lessonSmokeCoverage.test.ts`), plus 5 extra patch
  section rows.
- Per row, **2 tests** (each walks the whole lesson, every frame, not one test per step):
  1. `sl:` desktop walk: deep link `?learn=1`, title, `setup`, then for every frame `stepProbe` (board assertions),
     offscreen-point check, pointer click on Next (15 s timeout), `settle`.
  2. `en 390x844` walk: same walk, plus per math frame: page scrollWidth and every notation/worked-example box inside
     the viewport; Next/Exit inside 390 px.
  3. Only for `EXIT_SAMPLE` (7 rows): `en: Exit restores the user state and re-entering twice...`.
- Fixed blocks: Shared lesson runtime (3 rows x 3 tests), Bernstein extras (3), Rational elevation extras (1 + 2),
  Observation flow (3), Inversion extras (1), lesson-experience-checks (20, Taylor at several layouts).
- `demonstrations.smoke.spec.cjs` generates **118** `"<id> renders its heading, graph, and inspector"` tests, one per
  demonstration from `smoke-catalog.cjs`.

## 2. Timing (CI run 42473882485, ubuntu, 3 workers per shard)

Job timeline (UTC): build done 11:03:08; chromium shards start 11:03:10-26, ~70 s of setup (npm ci ~40 s, Chromium
install ~9 s), test step lessons-1 4.4 m, lessons-2 **5.2 m**, lessons-3 3.4 m, other-specs 5.1 m; last chromium done
11:09:55. **Unit shards finished 11:07:35 / 11:09:57 / 11:10:57 - unit shard 3 (8 min of Vitest) is the critical
path, not smoke.** Same picture in 42471425087 (chromium done 10:34:24, unit 10:36:08) and 42475921993 (unit 11:39:57).

Where test time goes (summed, ~3047 s):

| Bucket | Tests | Sum (s) | Avg (s) | Share |
| --- | --- | --- | --- | --- |
| Lesson `sl:` desktop walks | 123 | 989 | 8.0 | 32% |
| Lesson `en 390x844` walks | 123 | 962 | 7.8 | 32% |
| `en: Exit` re-entry (7 rows + rational-elevation extra) | 8 | 146 | 18.2 | 5% |
| Other guided blocks (shared runtime, extras, observation) | 18 | 113 | 6.3 | 4% |
| lesson-experience-checks (Taylor layouts) | 20 | 93 | 4.6 | 3% |
| Per-demonstration render rows | 118 | 198 | 1.7 | 6% |
| Demonstration catalogue test (single test) | 1 | 55 | | 2% |
| demonstration-motion (two clip-decode tests 36 s + 34 s) | 15 | 104 | | 3% |
| Everything else in other-specs | ~90 | ~387 | | 13% |

Slowest single tests: catalogue (55.0 s), standalone-learning Bézier chapter examples (36.9), clip decode (35.8),
390 px preview decode (33.9), farin Exit (33.5), repeated-subdivision Exit (28.9), Shared runtime Back-lossless on
farin (22.8) / spline-g1 (20.5), ph-cubic Exit (21.2), decasteljau Exit (19.0), spline-c1 Exit (17.2),
spline-parameterization sl walk (16.8), root-finding 390 walk (15.6), decasteljau / circle sl walk (15.5).

Shard imbalance: lessons-2 holds 921 s of tests vs 502 s for lessons-3 (all 7 Exit rows sit in shard 2 because
Playwright shards by declaration order). Wall: 5.2 m vs 3.4 m.

Per-frame cost: a walk averages ~8 s for ~12-15 frames, ~0.5-0.6 s per frame. Each frame runs `progress()` ->
`reveal()` -> `settle()` (an `expect.poll` with several sequential CDP calls + `waitForTimeout(20)`), `isFinishing`,
`stepProbe` (often several `expect.poll`s, each re-evaluating the whole board), `offscreenPoints` evaluate, a pointer
`click` (actionability + stability) and another `settle()`. When the first poll attempt misses, `expect.poll`'s default
backoff adds 100 ms, then 250 ms, then 500 ms.

Local history: `docs/tasks/test-consolidation/coverage.md` "Final timing" (Oct 2026, 45 lessons): 280 -> 243 tests,
665 s -> 370 s wall locally after moving Exit/re-entry to the unit restoration contract. Lesson count has since grown
from 45 to 123 rows, so the walk buckets almost tripled.

Failure mode: run 42475921993 (a real regression) had 8 other-specs tests and one Exit row each run to the full 60 s /
150 s timeout; the other-specs shard took 6.7 m. Failing runs pay the timeouts serially per worker.

## 3. Overlap with unit tests

- Exit/re-entry: already deduplicated. `src/learning/runtime/lessonRestorationContract.tsx` (run by
  `lessonRestoration.part1-4.test.tsx`) walks **every** lesson on its real graph through `LessonSession`, every frame,
  a step back, exit and re-entry, and checks restored scene/board/controls. The 7 `EXIT_SAMPLE` smoke rows (146 s)
  are a production-bundle sample of that; they are the slowest lesson tests per row.
- Per-step board state: lesson content tests (`src/learning/content/*GuidedLessons.test.ts[x]`, e.g.
  `bsplineDeBoorGuidedLessons.test.tsx`, `rationalConstructionGuidedLessons.test.ts` for farin) run each lesson's
  scene actions in one synchronous sequence and assert quoted values, switches and point sets. The restoration
  contract also applies every frame's actions on a real JSXGraph board (jsdom with board shims). So the `stepProbe`
  assertions (weights, slider counts, switch states, point counts - e.g. the farin row) largely duplicate unit
  coverage; their unique value is that they run on the production bundle.
- What only the smoke walks check (jsdom cannot): real layout and hit-testing (Next not intercepted by board labels,
  pointer click), points inside the real board viewport at real container size (`offscreenSteps`; caught the
  arc-length resize framing issue), KaTeX/notation boxes inside a 390 px viewport and no page overflow, deep-link
  routing in the built app (`?learn=1`, `?example=`), no console errors / page errors over a full walk in a real
  browser, frame ordering through the real GuidedLesson component with real timers/animations (reducedMotion),
  patch surface evidence from the real WebGL/canvas surface (`assertSurfaceEvidence`).
- Desktop walk vs 390 walk: the order/completion/offscreen checks are repeated in both; the 390 walk adds layout
  checks; the desktop walk adds `stepProbe` and the sl title. The sl/en difference is mostly covered by
  `lessonMathNotation.test.ts` and localization lockstep checks in units.
- Per-demonstration render rows (118 x 1.7 s): heading/graph/inspector render on each route. Units mount graphs, but
  not via the production router; these are cheap per test and mostly page-load cost.

## 4. Config

- `playwright.config.cjs`: `workers` CI 3 (local min(6, cpus-2 or BEZEG_TEST_WORKERS)), `retries: 0`,
  `timeout: 60_000` (lesson describes 150_000, inversion 90_000, catalogue 150_000), `expect.timeout: 10_000`,
  `globalTimeout` 30 min, `fullyParallel: false` but guided-lessons sets `describe.configure({mode: 'parallel'})`
  (other specs run file-serial per worker), `trace: 'retain-on-failure'` (records a trace for every test, kept on
  failure - recording cost on every test), `screenshot: 'only-on-failure'`, no video, `reducedMotion: 'reduce'`,
  reporters list + html. `webServer`: `node scripts/serve-smoke-build.cjs` on 4173, `reuseExistingServer: false`,
  30 s timeout.
- CI: scope job skips everything for docs-only (`scripts/ci-change-scope.cjs`: only `docs/**/*.md` and root md files);
  every other change runs all 497 smoke tests. Each chromium shard repeats `npm ci` (~40 s) and checkout.
- Fixed sleeps (15 matches for waitForTimeout/setTimeout/sleep, 6 real sleeps):
  - `lesson-smoke-helpers.cjs:210` `waitForTimeout(20)` in `settle()` - runs ~2x per frame on every walk
    (~250 walks x ~13 frames x 2 = ~6,500 calls, ~130 s summed, ~4% of lesson time).
  - `guided-lessons.smoke.spec.cjs:2940/2945/2949` 700 + 250 + 700 ms (Observation flow playback test).
  - `library-picker.smoke.spec.cjs:234/242` 300 ms x 2.
  - `count-setter.smoke.spec.cjs:74` `settleFrames` = 2 rAF + 150 ms timeout.
  - The rest are `test.setTimeout`. Sleeps are a small share; the per-frame round trips dominate.

## 5. Ideas (ordered by value)

1. **Smoke is not the CI critical path.** Unit shard 3 ends 1-2 min after the last chromium shard in all three
   recent full runs. Shortening smoke alone cuts runner minutes, not wall clock, until the unit shards are rebalanced
   or a 4th unit shard is added. Check unit balance first if wall clock is the goal.
2. **Tier the lesson walks by change scope** (extend `ci-change-scope.cjs` to output a smoke tier):
   - Full (all 246 walks): changes under `src/learning/runtime/**`, `GuidedLesson*`, shared CSS/layout, app shell,
     KaTeX/notation, `tests/lesson-smoke-helpers.cjs`, `tests/guided-lessons.smoke.spec.cjs` helpers, deps.
   - Targeted: content-only change (`src/learning/content/<family>*`) -> rows whose ids map to that family
     (`just smoke-lesson <id>` already selects rows by id) + shared runtime rows + experience checks.
   - Sample otherwise (graph/control code): one row per graph route family (~20-25 rows, both walks) + EXIT_SAMPLE +
     shared runtime + experience checks, ~70 tests instead of ~290; keep the full set on a nightly
     `schedule:` / `workflow_dispatch` and before deploy if desired. Note graph changes do affect lessons (lessons
     run on graphs), so the sample must cover each graph module the lessons use; map rows by `path` route prefix.
3. **Drop the duplicated walk work**: keep both walks but move `stepProbe` board assertions only to one (already) and
   stop re-running order/completion/offscreen in the 390 walk, or run the 390 walk only on frames with math blocks
   (navigate by deep link to those frames if a frame deep link exists). Alternatively retire `stepProbe` for rows
   whose content unit test asserts the same per-step state, keeping the walk for layout/hit-testing.
4. **Cheaper per-frame sync**: replace `settle()`'s `expect.poll` + 20 ms sleep with one `page.waitForFunction`
   (rAF polling) that checks panel/handoff state in-page; have `progress()` not re-settle after `walkFrames` already
   settled; give `stepProbe`/settle polls `intervals: [16, 50, 100]` instead of the 100/250/500 ms default backoff.
   Expected: a large share of the ~0.55 s/frame.
5. **Rebalance shards**: interleave EXIT_SAMPLE rows or put Exit/shared-runtime/extras in their own Playwright project
   or order so shard 2 is not 921 s vs 502 s; ~1 min off the slowest lesson shard. Or shard by measured time
   (custom shard list from `durations.tsv`).
6. **Collapse the catalogue test** (55 s): read all card attributes in one `evaluateAll` and compare with the expected
   array; await poster `complete` for all images in one `waitForFunction` after scrolling (or force `loading=eager`
   in the test). Same pattern for the two clip-decode tests (36 s / 34 s).
7. **Fold the 118 per-demonstration render rows** into a few tests that visit routes in a loop on one page (saves
   per-test context/page startup, ~1 s each), or tier them like lesson rows.
8. **Remove fixed sleeps**: Observation flow 1.65 s (poll on playback state/time), library-picker 2 x 300 ms (poll
   on the debounced state), count-setter 150 ms (rAF-only or poll).
9. **Fail fast on regressions**: lower the lesson describe timeout from 150 s (walks average 8 s, max 33.5 s) to ~60 s
   and consider `maxFailures` per shard so a broken build does not burn timeouts serially.
10. Minor: `trace: 'retain-on-failure'` records every test; `'on-first-retry'` is moot with `retries: 0`, so consider
    `'retain-on-failure'` only for CI-failure triage value vs `'off'` + rerun locally - measure before changing.
