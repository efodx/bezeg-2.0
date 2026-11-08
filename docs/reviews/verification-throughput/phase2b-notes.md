# Phase 2b notes: fold, split, shard rebalance

## Changes

- Fold: the Guided example scene acceptance check moved from `sceneContentAgainstGraphs.test.tsx` into the first
  restoration test of each lesson (`describeLessonRestoration`, `lessonRestorationContract.tsx`), on the same mount, from
  the fresh checkpoint (`rejectedActions`, exported; the activity describe uses it too). `BEZEG_LESSON_RESTORATION` now
  governs it; `BEZEG_SCENE_CONTENT` governs only the activities (lesson ids in it select nothing). Limit probes unchanged.
- Split: `LESSON_RESTORATION_PARTS` 4 -> 8, new `lessonRestoration.part5..8.test.tsx` (round-robin partition kept). The
  part-1 file also runs a partition test: parts 1..8 exist, no part 9, and the parts cover every guided lesson once.
- `sceneReplacementContract.test.tsx` was NOT split: its all-graph loop shares `open`, `replace`, `sceneObjects`, the
  `FigureCapture` mock and the KNOWN_FAILURES tables with the fixed matrices around it (about 130 lines of helpers
  used by five describes). Parts need those helpers moved into a new non-test support module, an owned-path
  extension, and the file is 133 s of 2572 s (one file, the 3rd longest). Not mechanical; proposed follow-up.
- Importers: `LESSON_RESTORATION_PARTS`, `selectedLessons`, `LESSON_SWEEP_SAMPLE` are imported only by the contract and
  `sceneContentAgainstGraphs.test.tsx` (which now imports `LESSON_SWEEP_SAMPLE` and `rejectedActions`); that file ran in the
  full run.

## Equivalence proof (observed)

Injected `{kind: 'bernstein-degree', degree: -1}` as an extra step scene for `bernstein` in the restoration walk
(`BEZEG_LESSON_RESTORATION=bernstein`): `lessonRestoration.part1` failed with
`AssertionError: scene actions the graph rejected: expected [ Array(1) ] to deeply equal []`, listing
`bernstein INJECTED: {"kind":"bernstein-degree","degree":-1} -> The Bernstein degree must be an integer from 0 to 5.`
(the same `where scene: action -> message` format as the old describe). Injection reverted (grep finds none).

## Full run (BEZEG_SWEEPS=all just unit): passed in 1628 s, 5 workers, shared machine

Per-file wall seconds (results.json; durations are test time and vary with machine load, 2 other runs held the slots):

| file | phase 2a "before" (all) | now (all) |
|---|---|---|
| lessonRestoration.part1..4 | 131.4 + 153.2 + 160.4 + 166.5 = 611.5 | parts 1-8: 69.7 + 96.0 + 120.7 + 136.9 + 82.6 + 89.8 + 71.4 + 63.8 = 730.9 |
| sceneContentAgainstGraphs | 110.5 | 21.3 |
| sceneReplacementContract | 120.5 | 132.8 |
| restoration + scene total | 722.0 | 752.2 |

Summed time is not lower (+30 s): the fold removed about 89 s from the scene file but added about 119 s to restoration
(the 2a run was on a quieter machine, 2 workers; this one ran beside two other test runs, and sceneReplacement, untouched,
also rose 10%, so about 10% of the difference is load). The fold saves one mount per lesson but the old check mounted
cheaply relative to the walk. The gain is the longest file: 166.5 -> 136.9 s, and a finer part grain for shard balance.

## Shard prediction (file-seconds from this run's results.json; 656 files, total 2572)

Assignment today: part N goes to shard ((N-1) mod count)+1, all other files by Vitest's sha1 path-hash order split by
count (reproduced in the script, same algorithm). Parts total 1248 s, other 643 files 1324 s.

| shards | assignment | per-shard file-s | critical path |
|---|---|---|---|
| 3 | current | 1200 / 755 / 618 | 1200 |
| 3 | parts balanced greedy + hash rest | 1068 / 796 / 708 | 1068 |
| 3 | all files LPT (needs a durations table) | 857 each | 857 (bound) |
| 4 | current | 858 / 628 / 566 / 520 | 858 |
| 4 | parts greedy + hash rest | 878 / 616 / 574 / 504 | 878 |
| 4 | all files LPT (bound) | 643 each | 643 |

Calibration: the spec measured the 3-shard critical path at 518 s wall (shard 1) before the split; scaling 1200 file-s to
518 s gives 0.43 s wall per file-s (an assumption: the split itself shifts weight between shards). Predicted 4 shards
with the current sequencer: 858 x 0.43 = 370 s, so about 148 s less than 3 shards; the best 3-shard variant without a
durations table (1068) saves about 57 s and needs a sequencer change. Extra `npm ci` (about 45 s) runs in parallel on
the new runner, so it adds cost, not critical path.

Decision: a 4th shard (gain about 148 s, over the 30 s bar). Edit is a plain matrix change in
`.github/workflows/browser-smoke.yml`: `shard: [1, 2, 3, 4]`, `--shard=N/4`, step name, header comment. The PartSequencer
needs no change (wraps by `count`). YAML diff reviewed by eye (flow sequence and two string substitutions; no YAML
parser installed here to run). Not verified: real CI timings; branch protection rules naming the unit checks (matrix
names `unit (1)`..`unit (3)`) would need a fourth entry added.
