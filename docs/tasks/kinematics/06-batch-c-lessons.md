# 06 Batch C: KN5 lessons (F3–F6)

Source: [kinematics spec](../../specs/kinematics-lessons.md), concept contract KN5, and the [batch-wide acceptance gate](../../specs/kinematics-lessons.md#batch-wide-acceptance-gate). Graph: `KinematicsGraph`, route `/curve-geometry/kinematics`. Depends on 05 (Batch B released).

Slices F3–F6 as in [04](04-batch-a-lessons.md); the lesson joins the chapter of task 04.

Acceptance: the spec's acceptance for KN5; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; `curve-parametric` and `curve-curvature` behave as before.

Status: F3 KN5 written and joined, F4 card captured (KN1-KN4 recaptured), F5 no new clip, F6 gate passed (handler 35: `just check` green at 55489256, live smokes `.command-logs/kin-c/smoke/`, `kin-c/f6/`, layout fixes 2bb4848a, bf5ea795, 16d82050 rechecked live in `kin-c/recheck/`); kinematics family complete (A-C).
