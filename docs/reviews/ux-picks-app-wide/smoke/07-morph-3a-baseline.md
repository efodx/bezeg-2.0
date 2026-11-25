# 07 morph 3a baseline (pre-morph build f9082643 at http://127.0.0.1:4474/bezeg-2.0/)

Scripts: 07-morph-3a-t10.cjs, 07-morph-3a-baseline-click.cjs, 07-morph-3a-glides-probe.cjs (run with BASE env set to 4474).
Logs: 07-morph-3a-baseline-t10.log, 07-morph-3a-baseline-click.log, 07-morph-3a-baseline-glides.log.
Morph comparison values: 07-morph-3a-t10.log, 07-morph-3a-detail.log, and the brief.

## Check 1: Taylor step 9 to 10, 1440x900, 5 repeats (desktop)
- Baseline maxFrameGap: 1221, 1283, 1165, 1174, 1316 ms (1.17 to 1.32 s). Every repeat is over 1 s.
- Morph build: 1054 to 1218 ms (1.05 to 1.22 s).
- Other differences: baseline x-puck first change at 121 to 174 ms, morph at 1245 to 1369 ms. Baseline has 0 intermediate frames, morph has 1.
- Verdict: the more-than-1-s gap predates the morph change. The timing of the x-puck change differs, which is the morph change's effect.

## Check 2: Phase portrait at 1280x720, Next click interception
- Baseline: Next at step 1 is intercepted by `div.puck-body` (role slider, "Matrika A: a", value 4). Force-click did not advance, so steps 2 to 20 were never reached. Coverage is incomplete for later steps.
- Morph build (07-morph-3a-detail.log, phase1280 next probe): Next rect top element is `puck-body|DIV`, same result.
- Verdict: predates the change.

## Check 3: View glide counts per Next (glides-probe, bbox method)
| Lesson, viewport | Next steps asked | Baseline | Morph build (brief) |
|---|---|---|---|
| Phase portrait, 1440x900 | 1, 3, 8, 13 | 1, 1, 2, 1 | 2, 2, 2, 2 |
| Taylor, 1280x720 | 1, 5, 10 | 1, 1, 1 | 2, 2, 2 (zoom-in-and-back on Next 1) |
| Transformations, 1280x720 | 2, 10 | 1, 1 | 2, 2 |
| De Casteljau, 1280x720 | 4 | 2 | 2 |

- Full baseline sequences: phase 1440x900 1,1,1,1,1,1,1,2,1,1,1,1,1,1 (the last Next gives 0); Taylor 1280x720 all 1 over 22 steps; transformations 1280x720 all 1 over 15 steps; De Casteljau 1280x720 2,1,1,2,1 and then 1.
- The probe measures bbox change only. It cannot separate a zoom-in-and-back from a glide, so the baseline zoom on Taylor Next 1 was not checked directly.
- Verdict: only De Casteljau Next 4 matches the morph build's count. Phase 1, 3, 13 and Taylor 1, 5, 10 and transformations 2, 10 are 1 in the baseline, not 2. The glide counts are not identical to the morph build, so the difference is not pre-existing. It may come from the change or from measurement differences; not resolved here.

Fuzzer not run.
