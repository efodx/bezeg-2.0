# Release gate 03-07 (a10ef63c)

Browser (CI args, CI=true, build/ reused):
- other-specs (SMOKE_TEST_IGNORE guided-lessons): 238 passed, 6 skipped, 1 failed.
- guided-lessons (unsharded): 320 passed, 20 skipped, 4 failed; rerun alone: 4 failed (3 same lessons + Taylor access), phase-portrait passed (flaky).
- Failures: see release-0307-*.log. .inspector-tabs / data-count-status references did not fail.

Fuzz (dev 4483, 50 seeds each, 3 routes parallel): taylor 50/50, linear 50/50, phase-portrait 50/50, bisection 50/50, taylor lesson 50/50, transformations 48/50, decasteljau 49/50.
Failures (seed 40 and 47 transformations, 42 decasteljau) all passed 3/3 on replay alone: flaky under parallel load.

## Rerun after fixes (HEAD 81d30976, dev 4483, build/ reused, CI=true)

- Fuzz `linear-map` (50 seeds, 30 steps): 50/50 passed, no replay needed. Log: smoke/release-rerun-fuzz-linear-map.log.
- Other specs, `SMOKE_TEST_IGNORE='**/guided-lessons.smoke.spec.cjs'`, port 4493: 239 passed, 6 skipped, 0 failed. Log: smoke/release-rerun-other-specs-ignore.log. A first attempt with `SMOKE_TEST_IGNORE=guided-lessons` did not exclude the file (562 passed, 26 skipped, 1 failed; smoke/release-rerun-other-specs.log), so that attempt is not counted.
- Guided lessons (unsharded), port 4493: 323 passed, 20 skipped, 1 failed. Log: smoke/release-rerun-guided.log.
- Failure: `tests/guided-lessons.smoke.spec.cjs:2808` `Lesson phase-portrait › sl: ?learn=1 walks every frame in order with pointer clicks on Next and completes`. First error: `visible board points outside the lesson view at desktop` (assertion at guided-lessons.smoke.spec.cjs:2772). Desktop viewport, so not phone-only.
- Alone rerun (file:line filter; the filter ran 146 tests, 145 passed): same failure at the same line. Reproducible, not flaky. Log: smoke/release-rerun-guided-phase-alone.log.
- Release 03-07 recorded this test as flaky (passed on rerun). It failed in both runs of this rerun.
