# Phase 6a notes: guided-lesson smoke mechanics

Scope: `tests/lesson-smoke-helpers.cjs`, `tests/guided-lessons.smoke.spec.cjs` (timeouts, Exit placement, no row assertions changed), `playwright.config.cjs`.

## Changes

1. `settle()` is one `page.waitForFunction` (rAF polling, 10 s) with the original conditions: compact tab visible and Next hidden, or panel class `guided-lesson-handoff-visible`. The 20 ms sleep is gone. A timeout throws `settle: neither the compact tab (with Next hidden) nor the handoff-visible panel appeared within 10 s`. `progress()`/`reveal()` take `alreadySettled`; `walkFrames` passes it from the second frame on, because the previous statement of the loop is `settle()` (equivalent: nothing runs between them). Other callers still settle.
2. Timeouts: walks, shared runtime and the other guided blocks 150 s -> 60 s; Exit tests get 90 s. Slowest observed on hosted CI (run 42527684457, the three lessons shards): Exit 32.2 s (farin), then 27.9, 23.1 (Back-lossless on farin), 20.9, 20.0; slowest walk 15.8 s. No row is near 40 s, so the cut is blanket, but Exit keeps 90 s as headroom (1.9x the slowest on a hosted runner).
3. `maxFailures: 10` when `process.env.CI` is set; unlimited locally.
4. Exit tests moved out of the row describes into `exitTest(row)`, registered after rows spread evenly over the LESSONS order (`exitAfter`). Test names changed to `Lesson <id> exit > en: Exit restores ...`; `smoke-lesson` greps `Lesson <id>` prefixes, so they still match.

## Measurements (one machine, shared, one run each)

`just smoke-lesson farin linear-function bisection euler-method conic-focal` (16 tests, same build):

| | wall | summed test time |
| --- | --- | --- |
| before (HEAD files) | 49.9 s | 162.8 s |
| after | 41.4 s | 124.7 s |

Summed test time -23%. Noise is not measured (single runs).

Exit rows per `--shard=N/3` (listed with `just smoke-built --list --shard=N/3 <spec>`; test counts 98/97/97 both ways):

| shard | before | after |
| --- | --- | --- |
| 1 | none | decasteljau, ph-cubic, repeated-subdivision |
| 2 | decasteljau, ph-cubic, repeated-subdivision, farin, spline-c1, linear-function | farin, spline-c1 |
| 3 | bisection | linear-function, bisection |

(Before, shard 2 held six of seven rows by this listing; the audit said all seven.)

## Negative checks

- `settle` with its selectors broken (temporary): `Error: settle: neither the compact tab ... within 10 s: page.waitForFunction: Timeout 10000ms exceeded.` after 14.6 s total for one row.
- `CI=1` with the same breakage over 11 rows: `Testing stopped early after 10 maximum allowed failures.` (10 failed, 2 interrupted, 12 did not run, 49.7 s). The helper was restored afterwards.

## Not verified

- Hosted CI effect of the 60 s limit and maxFailures; shard wall times after rebalancing (needs a CI run).
- Weights of Exit rows (about 3x a walk) mean the shard sums are roughly even now, but only test counts were checked, not durations.

## Full spec run

`just smoke-built tests/guided-lessons.smoke.spec.cjs` (all three shards at once, 5 workers, 317 s wall): 291 passed, 1 failed. The failure was `Lesson elevation` 390 walk, `page.goto: net::ERR_NO_BUFFER_SPACE` after 339 ms (a Windows socket exhaustion error, not an assertion); `just smoke-lesson elevation` then passed. Counted as an environmental flake, not rerun in full.
