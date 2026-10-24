# Task 04 part (c) handoff (partial): spline-g1 and spline-g1-symmetric

## Done
- `src/learning/content/splineGuidedLessons.ts` (CRLF kept): both G1 lessons rewritten (workedExamples + steps for each, learning goal added to g1, edge cases updated). Typecheck not run.
- `splineGuidedLessons.test.ts`: fixtureLessons now includes g1 and g1s; the g1 and g1s "numbers" blocks replaced with fixture-based tests (constants G1_FIXTURE, G1_CHAIN, G1S_FIXTURE). That file passes (35 tests); lessonMathNotation and sceneContentAgainstGraphs passed in the first run (before the later edits; rerun).
- NEW `src/learning/content/splineG1Examples.test.ts` (CRLF): written but 10 tests FAIL because of test bugs, not lesson bugs (see Remaining).

## Fixtures (alpha 0, uniform spans; derivative = n/span x edge)
spline-g1 (view [-6,4,7,-7] for steps 1-4): points (-4,-1),(-2,2),(0,0),(4,-1); joint p2=(0,0); q1 = p2 + b(2,-2).
- g1-default-labelled, g1-condition-polygon: b=1, q1=(2,-2). g1-b-quarter: b=0.25, q1=(0.5,-0.5). g1-b-two-and-half: b=2.5, q1=(5,-5) (b=3 gives (6,-6), still in view).
- Derivatives at joint (span 1/2, factor 4): left (8,-8), right (8b,-8b); norms 8*sqrt2, 2*sqrt2 (b=1/4), 20*sqrt2 (b=5/2). New worked example g1-derivative-magnitude (step 3).
- g1-chain-quarter (step 5): points (-5,-1),(-3,2),(-1,0),(2,-1),(5,2), splineRatios [1,1] then action set-spline-beta index 0 = 0.25; view [-7,5,8,-4]. Baseline q1=(1,-2), q2=(3,0); after q1=(-0.5,-0.5), q2=(4.5,-1.5); changed pieces [F,T,T]; second joint p3 derivative (span 1/3, factor 6) (6,6) -> (15,-3), equal both sides (C1 kept).
spline-g1-symmetric (view [-7,5,7,-3]): points (-5,-1),(-2,2),(2,0),(5,3), splineRatios [beta].
- beta .5: J=(0,1), derivs (8,-4)/(8,-4). .25: J=(-1,1.5), (4,-2)/(12,-6), ratio 3. .75: J=(1,0.5), (12,-6)/(4,-2), ratio 1/3. .99: J=(1.96,0.02), (15.84,-7.92)/(0.16,-0.08), ratio 1/99.
- Steps 1,2,3,5 are fixtures; step 4 (g1s-second-beta, locality) stays on the route default (6 points) with an intro sentence.

## Remaining
1. Fix splineG1Examples.test.ts (a python patch script, tmp/g1_fix5.py, did not apply; the file is unchanged since the failing run):
   - fixturesOf must read the RAW lesson (`splineGuidedLessons` step.scene.curve / actions with `action.value.index/value`), not the adapted lesson's first action (adapted shape differs: ratios stayed [1,1], and `step.scene` was undefined in the neighbours check, so use `stepOf`). Keep a check that the adapted first action has source 'lesson-fixture'.
   - Symmetric `getNonFreePoints` lists the joints: set `derived` = joints for g1s EXPECT rows.
   - Prose norm formatting: round to 2 decimals (`Number(x.toFixed(2))`) when quoting 2.83, 11.31, 28.28; the current `num` rounds to 9 digits. Remove the odd `num(...) === ''` expression and the `.map(v => v)` mention entry.
2. Run: `npx vitest run src/learning/content/splineGuidedLessons.test.ts src/learning/content/splineExamples.test.ts src/learning/content/splineG1Examples.test.ts src/learning/content/lessonMathNotation.test.ts src/learning/content/sceneContentAgainstGraphs.test.tsx` and `npx tsc --noEmit --pretty false`.
3. Mutation-check the new assertions (move a fixture point, change a prose number, break tangent direction, change a ratio).
4. Append a G1 section to 04-evidence.md and G1 smoke row changes to 04-smoke-changes.md (tests/guided-lessons.smoke.spec.cjs rows ~578-720: g1 counts 4 points / 2 pieces / 1 joint, new q1 values, chain 5 points; g1s step 1 uses 4 points, joint values above). Not started.
5. The `Tools: tmp/splice.py` name was overwritten by another worker; use unique script names.

## Files touched
src/learning/content/splineGuidedLessons.ts, splineGuidedLessons.test.ts, splineG1Examples.test.ts (new), this handoff.

## Update (v10)
Done: splineG1Examples.test.ts fixed (80 pass), mutation-checked, evidence and smoke-change sections appended. Remaining: lead applies smoke row changes and browser smoke.
