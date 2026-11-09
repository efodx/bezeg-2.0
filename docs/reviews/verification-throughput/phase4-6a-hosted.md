# Phase 4, shard map and phase 6a on hosted runs

Handler 4's judgement record for handoff 3's slices 1–2. Source: [spec](../../specs/verification-throughput.md).

Non-test time here is setup + environment + import, as in handoff 3 (transform excluded), summed over the four unit shards from Vitest's `Duration` line. Percentages are rounded, so each sum is good to about ±10 s. Baselines before phase 4: 364 s (42524584056) and 357 s (42527684457). Critical-path bar for the per-file shard map: about 8:30 of unit job wall.

## Unit shards

| Run | Commit | Vitest s per shard | Unit job wall per shard | Non-test s | Tests s |
| --- | --- | --- | --- | --- | --- |
| 42541468552 | `eb9af4bc` | 444 / 346 / 316 / 314 | 8:33 critical (shard 1) | 320 | 1050 |
| 42545997964 | `38805767` | 257 / 444 / 414 / 236 | 5:03 / 8:30 / 7:59 / 4:57 | 296 | about 1005 |
| 42552202709 | `0c672035` | 421 / 341 / 305 / 308 | 8:06 / 6:39 / 6:05 / 6:13 | 313 | about 1020 |

Verdict after three runs: mean non-test 310 s against about 360 s before phase 4, so phase 4 stays. Mean unit critical path 8:23 (8:33, 8:30, 8:06) against the 8:30 bar: the per-file shard map stays, but its margin is inside runner variance; the critical shard moved between runs (1, 2, 1).

Run 42546128156 (`1247d217`) was documentation-only and ran no checks.

## Lesson smoke shards (phase 6a)

Audit test step before phase 6a: lessons-1/2/3 4.4 / 5.2 / 3.4 min, other-specs 5.1 min.

| Run | Commit | Test step (Playwright total) lessons-1/2/3, other | Job wall lessons-1/2/3, other | Failures |
| --- | --- | --- | --- | --- |
| 42545997964 | `38805767` | 3.0 / 3.2 / 2.7, 5.5 min | 4:01 / 4:07 / 3:39, 6:55 | none; `maxFailures` and the 60 s timeout did not fire |
| 42552202709 | `0c672035` (all rows; catalogue batching in) | 3.9 / 2.9 / 2.6, 4.7 min | 5:15 / 3:46 / 3:31, 6:05 | none |
| 42559644939 | `ba4d421b` (first scoped run: 74 rows) | 1.3 / 1.0 / 0.8, 3.3 min | 2:31 / 2:07 / 2:03, 4:17 | none |

Lesson shards fell by 0.5–2.3 min against the audit and no longer carry a 2-minute imbalance. other-specs, the slowest Chromium job, was 5.5 min before catalogue batching and 4.7 min with it, against the audit's 5.1. Neither `maxFailures` nor the 60 s timeout caused a failure on either run.

Run 42559644939 pushed `ff37bc26` (publish script) and `ba4d421b` (documentation), so the scope job chose the representative rows. Playwright ran 25 / 25 / 24 tests on the three lessons shards, against about 97 each before, so `lesson_grep` reached `--grep`. The lessons shards' job wall fell to about 2 min, and other-specs (4:17) became the slowest Chromium job. The unit shards (5:55 / 5:18 / 5:55 / 7:55, shard 1 critical at 7:55) bound the run: trigger to deploy took 8:39.
