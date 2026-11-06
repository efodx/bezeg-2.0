# AB-C-P: Coons patch drag measurement

- **Commit and build:** `95ae4718` (clean), the handler-owned production preview at `http://127.0.0.1:4314/bezeg-2.0` (provenance checked by the handler, not by this run).
- **Browser:** Chromium 156.0.8078.4 (Playwright), viewport 1440x900, device scale factor 1.
- **Script:** `scripts/coons-gate-perf.cjs`; raw results in [ab-c-p-perf-raw.json](ab-c-p-perf-raw.json).

## Method

Method of `clipping-gate-perf.cjs`. The real page is driven by a mouse drag: the target `point3d` control point's screen position is the host's `data-surface-framing` point plus the host rect (no injection). The gesture is 150 pointer moves along a three-quarter loop of radius 12% of the host height, 2000 ms nominal. rAF intervals are sampled only inside the gesture (first 15 dropped), time inside `board.update` is recorded, the eight cases are interleaved, and 3 runs per case (also 3 at CPU/4) are reduced by the median of per-run statistics. The linked-corners switch is toggled through its label for case 3. Each run asserts: the control point moved (>5 px), an untouched point (`c1-1`, `p-3-3`) did not move (a missed press would orbit the camera and move every point), the projected mesh path set changed (hash of all 326 `d` attributes), the interior-net readout text changed (cases 1 to 3), the corner status is `met` after cases 1 and 2 and `mismatch` after case 3, at least 60 frames and 60 board updates, and no page error. All 24 runs passed.

Cases 1 to 3 use the default Coons scene with shown surface S, shading and control net on. Case 3 drags the topmost of the two coincident end points (`d1-0`; the script accepts either, but never both). Case 4 is the reference `/patches/tensor` default scene, point `p-1-1`, not pass or fail.

## Results (median over 3 runs of each run's statistic)

| Case | Frame median ms | Frame p95 ms | Frames >25 ms per run | `board.update` median / p95 ms |
|---|---|---|---|---|
| 1 coons `c0-1` inner | 16.7 | 16.8 | 0/0/22 | 2.70 / 5.10 |
| 1 CPU/4 | 16.7 | 66.7 | 146/145/146 | 11.70 / 19.50 |
| 2 coons linked corner `c0-3` | 16.7 | 16.8 | 0/0/0 | 2.20 / 2.90 |
| 2 CPU/4 | 16.7 | 66.7 | 145/146/148 | 11.70 / 15.70 |
| 3 coons unlinked end, status mismatch | 16.7 | 16.8 | 0/0/0 | 2.50 / 3.30 |
| 3 CPU/4 | 16.7 | 66.7 | 145/146/145 | 13.70 / 18.00 |
| 4 tensor `p-1-1` (reference) | 16.7 | 16.8 | 0/0/5 | 2.35 / 3.00 |
| 4 CPU/4 | 16.7 | 100.0 | 145/146/147 | 13.30 / 19.60 |

Each gesture produced about 300 board updates (two per pointer move) over 360 to 600 sampled frames; the gesture runs longer than the nominal 2000 ms because of Playwright round trips per move. One unthrottled case 1 run had a single 1017 ms stall (22 frames over 25 ms); the median of three hides it, see the raw file.

## Verdict against the 16.7 ms median and 33 ms p95 limits

- **Unthrottled:** no case exceeds either limit (median 16.7 is the 60 Hz frame; p95 16.8 ms).
- **CPU/4:** the frame median stays 16.7 ms in every case, but the p95 is 66.7 ms (run p95 values 66.7, 66.7, 116.6 to 116.7) in cases 1 to 3, over the 33 ms limit; about 145 frames per run exceed 25 ms. The tensor reference is worse (p95 100.0 ms, run values 83 to 133), so the Coons drag is no heavier than the mesh path it shares.
- Coons is not slower than tensor in any pairing: unthrottled update medians are 2.2 to 2.7 ms against 2.35 ms, throttled 11.7 to 13.7 ms against 13.3 ms.

## Mesh sampling density

`coonsScene.ts:18` `COONS_SHADING_DENSITY = 16`, equal to the tensor patch's `DEFAULT_SHADING_DENSITY = 16` (`TensorPatchGraph.tsx:69`); boundary curves use `CURVE_SAMPLES = 32` in both. Both routes drew the same number of projected paths (326) in the surface view. No density change is proposed (spec D4 acceptance 5).

## Not verified

Only the build-time provenance given by the handler; 3 runs per case, so the throttled p95 spread (66.7 to 116.7 ms between runs) is wide; no Firefox or touch; no measurement with the other shown surfaces (`lc`, `ld`, `b`) or with a rotated camera. Early debugging showed that a page scroll inside the measurement made the press miss the point and orbit the camera in about half the unlinked runs; the script no longer scrolls and asserts an untouched point stays put.
