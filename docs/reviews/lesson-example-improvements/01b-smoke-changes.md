# 01b proposed smoke spec change (tests/guided-lessons.smoke.spec.cjs, row `alternativeDeCasteljau`, line ~446)

Not applied (the spec is not this worker's file).

Derivation: frames per step = explanation + calculation (only if the step has a worked example) + observation (`step()` in rationalConstructionGuidedLessons.ts). New steps 1-2 have worked examples (3 frames each); the old five steps keep their 3,2,2 pattern (old comment: 2 + 3 + 3 + 2 + 2). New total 3 + 3 + 2 + 3 + 3 + 2 + 2 = 18. Point counts, from `DecasteljauGraph2.tsx` (`bindSceneToFirstCurve`, `generateInterpolatingBezierCurves`): board points = control points + 2 helper points + 1 result point; curves = main + 2 helpers = 3 at any degree. Cubic steps 1-2 therefore have exactly one point fewer than quartic steps 3-7. Absolute counts were not measured in a browser.

Old:
```
    steps: 5,
    minFrames: 12, // 2 + 3 + 3 + 2 + 2 frames
...
        await expectRange(page, 0, [0.5, 0.5, 0.25, 0.75, 0.5][step - 1], `t slider at ${label}`, 2);
...
        expect(stats.points, `points stable at ${label}`).toBe(ctx.points);
...
    exitStep: 3,
```
New:
```
    steps: 7,
    minFrames: 18, // 3 + 3 + 2 + 3 + 3 + 2 + 2 frames
...
        await expectRange(page, 0, [0.5, 0.25, 0.5, 0.5, 0.25, 0.75, 0.5][step - 1], `t slider at ${label}`, 2);
...
        // setup runs on step 1 (cubic, 4 controls); quartic steps 3-7 have one more control point
        expect(stats.points, `points at ${label}`).toBe(ctx.points + (step >= 3 ? 1 : 0));
...
    exitStep: 5, // quartic scene with t = 1/4, matching duringLesson (0.25) and the restored user quartic
```
