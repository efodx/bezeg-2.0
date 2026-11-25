# Release gate 03-07 (a10ef63c)

Browser (CI args, CI=true, build/ reused):
- other-specs (SMOKE_TEST_IGNORE guided-lessons): 238 passed, 6 skipped, 1 failed.
- guided-lessons (unsharded): 320 passed, 20 skipped, 4 failed; rerun alone: 4 failed (3 same lessons + Taylor access), phase-portrait passed (flaky).
- Failures: see release-0307-*.log. .inspector-tabs / data-count-status references did not fail.

Fuzz (dev 4483, 50 seeds each, 3 routes parallel): taylor 50/50, linear 50/50, phase-portrait 50/50, bisection 50/50, taylor lesson 50/50, transformations 48/50, decasteljau 49/50.
Failures (seed 40 and 47 transformations, 42 decasteljau) all passed 3/3 on replay alone: flaky under parallel load.
