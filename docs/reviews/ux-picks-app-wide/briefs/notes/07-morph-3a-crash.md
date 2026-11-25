# 07 morph 3a: crash and view findings (diagnosis)

Reproduced 1440x900, scripts 07-morph-3a-phasecrash.cjs and 07-morph-3a-remeasure.cjs, BASE switched per server.

1. Phase-portrait Next/Back/Next walk: "Target crashed" on BOTH 4474 (baseline f9082643) and 4472 (slice), after the same number of clicks (35). Pre-existing, not caused by 3a. No fix made.
2. Taylor Back on step 6: backPct 3.51 on baseline 4474 and on slice 4472, identical. Pre-existing. (Baseline records a 1-frame jump of about 46 % at n6/b6 with zoom reversal; the slice records no glide there. The step 6 Back view error is the same either way.)
3. Bisection step 13: single-frame jump 52.9 % on baseline and slice, identical. Pre-existing; the director is not involved.

No source files changed. Logs: /tmp/rm-447{2,4}-{taylor,bisection}.log (not kept in repo).
