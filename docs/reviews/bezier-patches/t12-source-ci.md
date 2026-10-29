# Task 12 exact source CI

Handler checked [run 40840496778](https://github.com/efodx/bezeg-2.0/actions/runs/40840496778) through the GitHub connector on 2026-10-29. The push run's exact source is `27330ef4a7af79e20d18d74a1dfa094fa9a70177`, not the subsequent documentation-only handoff commit.

Build, both unit shards, checks, and all three guided-lesson Chromium shards passed. The other-specs Chromium shard passed 119 tests and failed one: `tests/unified-learning.smoke.spec.cjs:10` expected eight `.learning-family` cards but received nine after the patches chapter was added. The aggregate smoke gate failed and deployment was skipped. This run does not establish a successful Pages deployment.

Job evidence: `123335812270`, “chromium (other-specs, **/guided-lessons.smoke.spec.cjs)”; failing assertion `toHaveCount(8)`, received `9`, timeout 10000 ms. The same file's chapter walk inventory also omitted `bezier-patches`. The task12 acceptance worker owns the bounded inventory/assertion repair and current chapter browser verification. Later repair checks and publication must be recorded separately; they do not change this original run's outcome.

## Repaired exact-source run

Handler confirmed [run 40862281154](https://github.com/efodx/bezeg-2.0/actions/runs/40862281154) through the GitHub connector on 2026-10-29. Its exact source is `fc15dbe237c010c6c1103c82bcc3f192641f9bee`, including chapter inventory repair `cf5c318`. The run completed successfully at 11:07:43 UTC: build, checks, both unit shards, all three lesson Chromium shards, other-specs Chromium, aggregate smoke and deploy all succeeded. This confirms deployment of that source, not completion or publication of the remaining task13 examples, images or motion clips. The later documentation-only handoff run is not used as source acceptance evidence.

## Task13 producer and runner exact-source run

Handler confirmed [run 40904168769](https://github.com/efodx/bezeg-2.0/actions/runs/40904168769) through the GitHub connector on 2026-10-29. Its exact source is `0f72761abfeedbc3dd20c7a8b519a9cba10a6744`, including producer `cbe00ee` and runner `be5ad2e`. Run and all jobs completed successfully: scope, build, checks, both unit shards, all three lesson Chromium shards, other-specs Chromium, aggregate smoke and deploy. The run completed at 15:47:35 UTC (16:47:35 Europe/Ljubljana). This confirms deployment of that source, not acceptance of the remaining task13 authored examples, real captures or motion clips. Later documentation-only CI is not substituted for this exact-source evidence.
