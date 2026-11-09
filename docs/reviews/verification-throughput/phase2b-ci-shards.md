# Phase 2b on CI: measured shards and rebalance

Source: hosted `browser-smoke.yml` logs, default Vitest reporter (per-file durations are printed for files over the
slow-test threshold, so only slow files are listed; sums below cover every printed file, 162-164 per shard).
Run A = 42514768457 (7c0a83ba), run B = 42516291702 (e7c03289), pre-fold run P = 42510913368 (19bd0dd0, three shards,
four restoration parts). Command: `npm test -- --shard=N/4`, `CI=true`, no cached durations.

## Per shard

`npm ci` is 29-48 s per job in every run (setup-node step under 2 s), so it is not shard-specific.

| run | shard | job wall | npm ci | Vitest Duration (breakdown) | file-s |
|---|---|---|---|---|---|
| A | 1 | 8:35 | 45 s | 451.8 s (tests 73%, env 9%, import 8%, setup 6%, transform 3%) | 943 |
| A | 2 | 6:44 | 44 s | 340.4 s (tests 68%, env 12%, import 9%, setup 8%) | 675 |
| A | 3 | 4:33 | 29 s | 225.9 s (tests 66%, env 13%, import 10%, setup 8%) | 431 |
| A | 4 | 6:56 | 47 s | 352.4 s (tests 68%, env 13%, setup 9%, import 7%) | 694 |
| B | 1 | 9:49 | 47 s | 523.9 s (tests 75%) | 1114 |
| B | 2 | 8:06 | 47 s | 420.7 s | 851 |
| B | 3 | 6:58 | 46 s | 353.2 s | 686 |
| B | 4 | 7:01 | 47 s | 353.0 s | 696 |
| P | 1/2/3 of 3 | 8:26 / 9:20 / 9:06 | 31 / 48 / 47 s | 458.2 / 491.7 / 470.4 s | 991 / 948 / 920 |

File times vary between runs (sceneReplacementContract: 111.5 s in P, 156.5 s in A, 183.8 s in B), so runner speed
differs; compare within a run. Wall per file-s is about 0.48 s in A and B.

## Top files (seconds, shard)

| file | A | B | P (3-shard) |
|---|---|---|---|
| GraphTransientState.part1 (shard 1) | 160.3 | 189.8 | 112.5 |
| sceneReplacementContract (hash, shard 1) | 156.5 | 183.8 | 111.5 |
| GraphTransientState.part2 (2) | 143.8 | 174.6 | 184.4 |
| GraphTransientState.part3 (3) | 85.5 | 131.2 | 139.5 |
| GraphTransientState.part4 (4) | 165.5 | 172.7 | 106.9 |
| lessonRestoration.part1 (1) / 2 (2) / 3 (3) / 4 (4) | 83.0 / 102.7 / 90.6 / 182.0 | 93.9 / 128.4 / 145.9 / 175.3 | 116.1 / 244.2 / 241.1 / 147.5 |
| lessonRestoration.part5 (1) / 6 (2) / 7 (3) / 8 (4) | 93.8 / 96.4 / 56.9 / 96.1 | 122.1 / 123.7 / 96.3 / 93.6 | - |
| sharedControls.graphs (hash, 1) | 38.2 | 44.3 | 26.4 |
| epicyclesGuidedLessons / curveGeometry...envelope (hash, 1) | 34.2 / 32.7 | 34.3 / 40.3 | 23.2 / 23.9 |
| jsxSurfaceFraming, arcLength (hash, 1) | 33.3, 32.9 | 36.2, 39.3 | 23.2, 23.3 |
| sceneContentAgainstGraphs (hash; 4 in A/B, 3 in P) | 29.5 | 28.7 | 167.7 |

## Why shard 1 is the critical path

Parts go to shard ((N-1) mod 4)+1, so shard 1 gets restoration parts 1 and 5 plus GraphTransientState part1 (337 s in A),
which is not worse than shards 2 and 4 (343 s, 444 s). The difference is the hash-assigned files: shard 1 drew
sceneReplacementContract (156.5 s) and four to five 30-40 s files (sharedControls.graphs, epicycles, envelope,
jsxSurfaceFraming, arcLength), 606 file-s in total against 332 / 197 / 250 on shards 2-4. Shard 3 received only two
restoration parts (part3, part7), GraphTransientState.part3 and nothing heavy, and finished 2 min early.

Predicted vs observed. The phase 2b notes predicted 858 / 628 / 566 / 520 file-s (critical path 858, about 370 s wall
at 0.43 s per file-s). Observed in A: 943 / 675 / 431 / 694 file-s, wall 452 / 340 / 226 / 352 s. The hash split is
off the prediction (shard 3 far lighter), and the critical path is 452 s (A) and 524 s (B), not 370 s. The 3-shard
baseline was not 518 / 353 at this commit: run P was balanced (458 / 492 / 470 s Vitest), so the fourth shard saved only
about 40 s of Vitest in A and nothing in B (524 s against 492 s), at the cost of one more runner.

## Does the fold pay on CI?

Restoration plus scene-content file-seconds:

| run | restoration parts | sceneContentAgainstGraphs | sum |
|---|---|---|---|
| P (4 parts, before fold) | 116.1 + 244.2 + 241.1 + 147.5 = 749 | 167.7 | 917 |
| A (8 parts, folded) | 802 | 29.5 | 831 |
| B (8 parts, folded) | 979 | 28.7 | 1008 |

Raw sums are -9% (A) and +10% (B), so the raw comparison is inconclusive. Normalising by the untouched
sceneReplacementContract (111.5 s in P, 156.5 in A, 183.8 in B) puts P at 917 x 1.40 = 1287 in A conditions and
917 x 1.65 = 1511 in B conditions, against 831 and 1008: the folded walk costs about 35% less. Conclusion: it costs
less on CI, with the caveat that the normaliser is a single file. The fold's clear gain is granularity (longest file
244 s -> 182 s in A).

## Change

`vite.config.mts` `PartSequencer`: four heavy hash-assigned files (sceneReplacementContract, sharedControls.graphs,
curveGeometryGuidedLessons.envelope, epicyclesGuidedLessons) are pinned to shard 3 (wrapping by count for other shard
counts), and removed from the hash pool. Unsharded runs are unaffected (`shard()` and the reordering in `sort()` only
run with `--shard`).

Predicted file-s from run A: shard 1 943-261 = 682, shard 2 675, shard 3 431+261 = 692, shard 4 694; wall at the
observed 0.48-0.52 s per file-s: about 330 / 340 / 360 / 352 s, critical path about 360 s against 452 s (-90 s; in
B about -100 s). Caveat: removing four files from the hash pool shifts the contiguous chunk boundaries by about one
file between neighbouring shards, a few file-s at most. Not verified: no Vitest run (the checkout's run claim was
reserved); `just lint vite.config.mts` and `just typecheck` passed. The next hosted run is the real check.

## After the pin (handler 3)

Hosted run 42524584056 for `6a39ac59` (pin `b1b5598a`), green. Unit job walls including `npm ci`: shard 1 5:18, shard 2 7:47, shard 3 5:54, shard 4 6:59. The critical path fell from 8:35 (run 42514768457) and 9:49 (run 42516291702) to 7:47, and the workflow from trigger to deploy took 8:32. Shard 2 is now the longest; its hash-assigned files are the next rebalancing input if the gap persists over a few runs. Per-file times for this run were not pulled.

Second post-pin sample: run 42527684457 for `d7cd5da8` (green), shard job walls 5:17 / 5:04 / 9:06 / 6:58. Shard 3, which holds the four pinned files plus restoration parts 3 and 7, became the critical path at 9:06, about as long as the pre-pin worst case. Two samples disagree (7:47 and 9:06 critical path), so the pin is not shown to help. Next: pull per-file times from both post-pin runs, and either spread the pinned files over shards 2–4 or drop the pin.

## Post-pin analysis (handler 3)

Per-file times pulled from the hosted logs of both post-pin runs (R1 = 42524584056, R2 = 42527684457; job ids in
`gh run view <run> --json jobs`), parsed with a small script (the log text carries literal `^[[2m` markers, not ESC
bytes). file-s = sum of printed per-file times (159-166 files per shard).

| shard | R1 Vitest (job wall) | R1 file-s | R2 Vitest (job wall) | R2 file-s | R1/R2 file-s ratio |
|---|---|---|---|---|---|
| 1 | 270.5 s (5:18) | 511 | 265.9 s (5:17) | 509 | 1.00 |
| 2 | 406.1 s (7:47) | 824 | 254.6 s (5:04) | 505 | 1.63 |
| 3 | 305.2 s (5:54) | 655 | 481.4 s (9:06) | 1040 | 0.63 |
| 4 | 350.2 s (6:59) | 687 | 349.8 s (6:58) | 690 | 1.00 |

Top files per shard (R1 / R2 seconds):

| shard | files |
|---|---|
| 1 | GraphTransientState.part1 124/127, lessonRestoration.part5 68/73, part1 58/60, arcLengthGuidedLessons 24/23, jsxSurfaceFraming 23/21, curveGeometryGuidedLessons.offset 16/16 |
| 2 | GraphTransientState.part2 180/109, lessonRestoration.part2 120/68, part6 119/74, InscribedAngleGraph.host 31/19, SimsonLineGraph.host 23/14, MonotoneTriangulationGraph.host 18/12, InversionGraph.host 18/12, degreeReductionGuidedLessons 17/11 |
| 3 | sceneReplacementContract 113/174, GraphTransientState.part3 97/144, lessonRestoration.part3 93/165, part7 66/102, PresetCatalog 30/45, sharedControls.graphs 27/43, curveGeometryGuidedLessons.envelope 22/38, epicyclesGuidedLessons 22/30, curveGeometryGuidedLessons 19/29 |
| 4 | lessonRestoration.part4 176/183, GraphTransientState.part4 161/168, part8 97/92, sceneContentAgainstGraphs 29/28, interpolationGuidedLessons 16/14, DelaunayGraph.host 14/13, HullTraceGraph.host 13/13 |

### Variance explanation

- The assignment is identical in both runs: the same files sit on the same shards, and shards 1 and 4 reproduce to
  within 1% (511/509, 687/690 file-s; 270/266 s, 350/350 s Vitest).
- The variance is per-runner speed. Shard 2 ran 1.63x slower in R1 than in R2 and shard 3 ran 1.59x slower in R2 than
  in R1, and the slowdown is uniform inside the job: shard 2 GraphTransientState.part2 1.65x, restoration part2 1.76x,
  small host files 1.6x; shard 3 sceneReplacementContract 1.54x, restoration part3 1.77x, part7 1.55x, small files
  1.5-1.7x. A noisy or slower hosted runner, not a test-content change, so the critical path swung between shards 2 and
  3 (7:47 vs 9:06). Wall per file-s: 0.47-0.53 s on a normal runner, 0.46-0.49 s on the slow ones (Vitest parallelism
  absorbs less, but still the count of file-s inflates).
- Run-to-run slow-runner draws happen to roughly one job in four; the earlier runs show the same (sceneReplacementContract
  111.5 s P, 156.5 A, 183.8 B, 113 R1, 174 R2: a 1.0-1.65x band).
- Is the pin too heavy for shard 3? On a normal-speed runner no: the nominal shard 3 is 655 file-s (R1, fast draw),
  305 s Vitest, below shard 4 (688 file-s, 350 s). The pin only matters when shard 3 draws a slow runner, because
  it is the second-heaviest shard in nominal terms (restoration parts 3 and 7 plus GraphTransientState.part3 = 256,
  pins 184, other hash files about 215). Nominal ranking (fast-draw file-s): shard 4 688, shard 3 655, shard 1 510,
  shard 2 505. So even without noise the pin overloaded shard 3 and left shards 1 and 2 about 150 file-s light, and
  shard 4 (never touched by the pin) is the nominal critical path at about 350 s.

### Proposal

Spread the pins. Nominal seconds are the fast-draw values above (the mean of the four runs is about 1.3x higher for
the heavy files, uniformly); predictions are file-s at the fast baseline, wall about 0.5 s per file-s.

```ts
const PINNED_TO_SHARD: Record<string, number> = {
    'sceneReplacementContract.test.': 2,
    'sharedControls.graphs.test.': 3,
    'curveGeometryGuidedLessons.envelope.test.': 3,
    'epicyclesGuidedLessons.test.': 3,
    'sceneContentAgainstGraphs.test.': 1,
    'interpolationGuidedLessons.test.': 1,
    'compgeoBezierHullsLesson.test.': 1,
    'triangleGeometryChapter.test.': 1,
};
```

| shard | now (fast draw) | change | predicted file-s | predicted Vitest wall |
|---|---|---|---|---|
| 1 | 510 | +29 +16 +11 +10 | 576 | about 290 s |
| 2 | 505 | +113 (sceneReplacementContract) | 618 | about 310 s |
| 3 | 655 | -113 | 542 | about 270 s |
| 4 | 688 | -66 | 622 | about 310 s |

Critical path about 310 s Vitest against 350 s now on a normal runner (-40 s), and a slow-runner draw (1.6x) on
the heaviest shard would give about 500 s, the same as today; assignment cannot remove that, only a smaller heaviest
shard (the 4 shards are within 15% after the change). Caveats: the four moved shard-4 files must be matched by exact
basename like the existing pins (verify the names are unique); removing files from the hash pool shifts the contiguous
chunk boundaries by about a file between neighbours, a few file-s; the small-file moves are the least certain part, so
the minimal alternative is only `sceneReplacementContract: 2` (shard 2 618, shard 3 542, shard 4 unchanged at 688,
critical path stays shard 4 at about 350 s). `PartSequencer.shard` needs the pin list generalized to a per-file shard
(`(shard - 1) % count === index - 1`). Not verified: nothing was run; predictions rest on two post-pin runs and the
earlier A/B/P tables.
