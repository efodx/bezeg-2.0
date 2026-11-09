# Phase 4, shard map and phase 6a on hosted runs

Handler 4's judgement record for handoff 3's slices 1–2. Source: [spec](../../specs/verification-throughput.md).

Non-test time here is setup + environment + import, as in handoff 3 (transform excluded), summed over the four unit shards from Vitest's `Duration` line. Percentages are rounded, so each sum is good to about ±10 s. Baselines before phase 4: 364 s (42524584056) and 357 s (42527684457). Critical-path bar for the per-file shard map: about 8:30 of unit job wall.

## Unit shards

| Run | Commit | Vitest s per shard | Unit job wall per shard | Non-test s | Tests s |
| --- | --- | --- | --- | --- | --- |
| 42541468552 | `eb9af4bc` | 444 / 346 / 316 / 314 | 8:33 critical (shard 1) | 320 | 1050 |
| 42545997964 | `38805767` | 257 / 444 / 414 / 236 | 5:03 / 8:30 / 7:59 / 4:57 | 296 | about 1005 |

Run 42546128156 (`1247d217`) was documentation-only and ran no checks.

## Lesson smoke shards (phase 6a)

Audit test step before phase 6a: lessons-1/2/3 4.4 / 5.2 / 3.4 min, other-specs 5.1 min.

| Run | Commit | Test step (Playwright total) lessons-1/2/3, other | Job wall lessons-1/2/3, other | Failures |
| --- | --- | --- | --- | --- |
| 42545997964 | `38805767` | 3.0 / 3.2 / 2.7, 5.5 min | 4:01 / 4:07 / 3:39, 6:55 | none; `maxFailures` and the 60 s timeout did not fire |

Lesson shards fell by 1.4–2.0 min and are now even. other-specs (5.5 min, critical among Chromium jobs) is unchanged within runner variance; the catalogue batching slice targets it.
