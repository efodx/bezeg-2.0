# 07 handoff (partial): convergence examples

## Findings
- Sequence convention: tail n >= N, strict band |a_n - L| < epsilon (sequence.ts). eps=1/4 (grid value 0.25): a_4 = 1/4 is on the boundary (outside), a_5 = 1/5 inside, least N = 5, N=4 fails.
- Uniform examples: ids `power` (default r=0.8) and `scaled` (default r=1, n=5, x=0.5). x/n on [0,1]: sup = 1/n at x=1, shared N=11 at eps 0.1, N(0.5)=6. x^n on r=1: sup 1 not attained, endpoint error 0, no shared N for eps<1. All expressible with existing actions; nothing blocked.

## Done (src/learning/content/analysisGuidedLessons.ts, analysisGuidedLessons.test.ts)
- sequence: first step now eps=1/4, 12 terms, N=5 default, certificate hidden (scene actions: sequence-epsilon 0.25, 12 next-steps, hide). Prose, observations, learning goals, source support updated; step 2 explicitly narrows to eps=0.1 (N=11); eps=0.01, alternating, (-1)^n, n, free steps unchanged.
- uniform-convergence: new first step `uniform-scaled-step` (x/n on [0,1], n=4, supremum hidden, prediction before Show supremum); order now scaled, whole-interval (x^n [0,1]), supremum-one, pointwise [0,0.8], supremum, shared-n, domain-change (near 1, later), free-exploration (8 steps, 17 frames). Endpoint wording: limit 1 at x=1, error 0, "endpoint is no witness of the supremum".
- Tests added/updated (repo analysis functions); unit run: analysisGuidedLessons, lessonMathNotation, sceneContentAgainstGraphs = 129 passed.

## Remaining
- Mutation-check the new assertions (not done).
- `npx tsc --noEmit --pretty false` not run.
- Write 07-evidence.md and 07-smoke-changes.md. Smoke rows in tests/guided-lessons.smoke.spec.cjs: `sequence` (~line 1625: SEQUENCE_STEPS[0] must become epsilon 0.25, 12 terms, N 5, statuses per band count; step texts) and `uniform-convergence` (~line 1688: steps 7 -> 8, minFrames 15 -> 17, step order/ids changed, prepareUserState/exit step expectations, UNIFORM step table). Not edited per brief.
- No smoke/browser run; check live SL/EN.
