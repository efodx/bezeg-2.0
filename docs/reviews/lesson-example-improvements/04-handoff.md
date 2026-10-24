# Task 04 part (a) handoff (partial): spline-cn, spline-c1, spline-c2 content rewritten, tests/evidence not done

## State
- `src/learning/content/splineGuidedLessons.ts` edited (CRLF preserved) for spline-cn, spline-c1, spline-c2 only; G1 lessons and spline-parameterization untouched. Not yet typechecked.
- `splineGuidedLessons.test.ts` NOT yet updated: last vitest run had 8 expected failures (listed below). Scratch test removed. No evidence/smoke docs written yet.

## Chosen fixtures (all alpha 0, uniform knots; derived points computed with the repo scheme)
- cn steps 1-2 (cn-pieces, cn-extrapolate; second adds polygon): quad C1, free (-4,1),(-2,-2),(0,-3),(4,0); view [-6,3,6,-5]; 2 pieces, knots 0/.5/1; derived q1=(2,-4); pieces (-4,1),(-2,-2),(0,-3) | (0,-3),(2,-4),(4,0).
- cn step 3 (cn-degree-three): cubic C2, free (-5,-2),(-4,1),(-2,2),(0,1),(6,-2); view [-7,4,8,-5]; derived (2,0),(4,-3); first diff (2,-1), second diff (0,-2) at joint (0,1).
- cn step 4 (cn-nonlocal): demonstration-default (7 pts quad C1, 5 pieces), unchanged logic.
- cn step 5 (cn-limitation, NEW, lesson now 5 steps): fixture with old default 7 pts [[-3,2],[-4,.5],[-3.5,-1],[-1.5,-2],[.5,0],[2.5,1.5],[4,-2]], degree 3, continuity 2, view [-20,15,70,-40]; derived (0.5,-3),(4,-3.5),(-3,3.5),(-13.5,11),(18.5,-8),(61,-34.5); norms about 5 / 17 / 70; free points max 4.47 from origin.
- c1 steps 1,2,3,5: free (-4,-2),(-2,2),(2,2),(3,-1), view [-6,4,6,-4]; 2 pieces, joint J1=(0,2) horizontal tangent (2,0); second diffs (0,-4) vs (-1,-3). Step 4 (c1-local) stays demonstration-default 6 pts.
- c2 steps 1-3: free (-6,-1),(-5,3),(-3,-3),(3,0),(5,2),(6,-2), view [-8,5,8,-5]; 3 pieces; pieces (-6,-1),(-5,3),(-4,0),(-2.5,-1) | (-2.5,-1),(-1,-2),(1,-1),(2.5,0) | (2.5,0),(4,1),(5,2),(6,-2); joints (-2.5,-1),(2.5,0); second diff at J1 (0.5,2) both sides. Step 4 (c2-local) demonstration-default 7 pts.
- Labels with Label all points are piece-local `p_i^{(c)}`; text names free points p_i and gives coordinates.

## Remaining
1. Update splineGuidedLessons.test.ts: expectedSteps cn 5; basedOn assertion allow 'lesson-fixture' for cn/c1/c2; cn action set now {show-spline-labels, show-control-polygon}; replace cn bounds test (degree/continuity now in fixtures); replace pinned worked-example strings (cn example 0/1, c1 examples, c2 examples) with the new values above.
2. Add focused fixture tests (new file): derived points, piece counts, C0/C1/C2 with interval scaling (reuse junctionGap/derivative helpers), nonzero joint tangents, locality by moving named free points, derived points inside each view box, mutation-check assertions.
3. Run vitest (splineGuidedLessons, lessonMathNotation, sceneContentAgainstGraphs, new test) and `npx tsc --noEmit --pretty false`.
4. Write 04-evidence.md and 04-smoke-changes.md (smoke rows in tests/guided-lessons.smoke.spec.cjs ~578-653: cn now 5 steps with new ids/expectations, c1/c2 prompts and counts changed).
5. G1 worker: same fixture mechanism; test helpers (pieces, derived, junctionGap, changedPieces) live in splineGuidedLessons.test.ts.

## Checks run
vitest run of the three suites: 8 failures, all stale pinned strings/step counts/action sets in splineGuidedLessons.test.ts (list above in Remaining 1); lessonMathNotation and sceneContentAgainstGraphs had no reported failures in that run. tsc not run.
