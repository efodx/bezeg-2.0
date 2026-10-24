# Task 04 part (a): smoke row changes (tests/guided-lessons.smoke.spec.cjs, NOT yet applied)

Board point counts = free + derived points. Fixture steps use the lesson's own points; the default steps (cn step 4, c1 step 4, c2 step 4) keep the route default.

## spline-cn (row `splineCn`, ~line 578)
- `steps: 4,` -> `steps: 5,`; `minFrames: 10, // 2 + 3 + 3 + 2 frames` -> `minFrames: 12, // 2 + 3 + 3 + 2 + 2 frames`.
- Old stepProbe tuple (line ~588): `[[1, 2, 11], [1, 2, 11], [2, 3, 13], [1, 2, 11]][step - 1]`
  New (continuity, degree, points): `[[1, 2, 5], [1, 2, 5], [2, 3, 7], [1, 2, 11], [2, 3, 13]][step - 1]`
- Old comment: `// 7 free points plus the derived points (4 at n=2, r=1; 6 at n=3, r=2).`
  New: `// Steps 1-3: fixture free points 4 / 4 / 5 plus derived 1 / 1 / 2; step 4: default 7 + 4; step 5: fixture 7 + 6 derived.`
- `expect(... .polygon ...).toBe(step === 2)` stays (polygon only at step 2).
- Old: `if (step === 3) expect(await offscreenPoints(page), ...).toBeGreaterThan(0);`
  New: delete it. Fixtures set their own view; step 5 uses [-20,70]x[-40,15] and all derived points are inside it (see 04-evidence.md). Optionally `if (step !== 4) expect(await offscreenPoints(page), ...).toBe(0);` (not browser-verified; check offscreenPoints semantics first).
- `setup` (route default, 11 points), `prepareUserState`, `exitStep: 2` / `duringLesson` (degree 2), `assertUserState`, `reentryStep: 3`, `stableCounts`: unchanged. Verify in the browser that the user degree/continuity are restored after exit, since steps 2 and 3 are now fixture scenes.

## spline-c1 / spline-c2 (rows built by `symmetricSplineRow`, ~lines 612-665)
Add an optional `stepPoints` parameter (spline-g1-symmetric keeps using `points`):
- Signature: `function symmetricSplineRow({id, path, titles, steps, minFrames, points, polygonSteps, stepPoints})`
- stepProbe, old: `await expect.poll(async () => (await boardStats(page)).points, {message: ...}).toBe(points);`
  new: `const expected = stepPoints ? stepPoints[step - 1] : points;` and `.toBe(expected)`.
- duringLesson, old: `expect((await boardStats(page)).points).toBe(points);`
  new: `expect((await boardStats(page)).points).toBe(stepPoints ? stepPoints[exitStep - 1] : points);`
- `setup`, `prepareUserState`, `assertUserState` keep `points` (route default).

Rows:
- c1, old: `steps: 5, minFrames: 12, points: 9, polygonSteps: [2, 3], // 6 free points + 3 joints; 2 + 3 + 2 + 2 + 3 frames`
  new: same plus `stepPoints: [5, 5, 5, 9, 5],` (steps 1,2,3,5: 4 free + 1 joint; step 4 default 6 + 3).
- c2, old: `steps: 4, minFrames: 10, points: 16, polygonSteps: [2, 3], // 7 free points + 9 derived; 2 + 3 + 3 + 2 frames`
  new: same plus `stepPoints: [12, 12, 12, 16],` (steps 1-3: 6 free + 6 derived; step 4 default 7 + 9).
- Polygon steps [2, 3], step counts and frame minimums are unchanged for both.

## spline-g1 (`splineG1`, tests/guided-lessons.smoke.spec.cjs ~lines 667-700)
Steps 1-4 are 4-free-point fixtures with one b slider; step 5 (chain) has 5 free points and two sliders. Route default stays 5 free + 2 derived = 7 points and two sliders.
- `minFrames`, old: `minFrames: 11, // 2 + 3 + 2 + 2 + 2 frames`
  new: `minFrames: 12, // 2 + 3 + 3 + 2 + 2 frames` (step 3 gained a calculation frame).
- stepProbe, old:
  `await expectRange(page, 1, 1, \`second b slider unchanged at ${label}\`);`
  `await expect.poll(async () => (await boardStats(page)).points, {message: \`5 free + 2 derived points at ${label}\`}).toBe(7);`
  new:
  `if (step === 5) await expectRange(page, 1, 1, \`second b slider unchanged at ${label}\`);`
  `const points = [5, 5, 5, 5, 7][step - 1]; // 4 free + 1 derived; step 5: 5 free + 2 derived`
  `await expect.poll(async () => (await boardStats(page)).points, {message: \`points at ${label}\`}).toBe(points);`
- Slider values `[1, 1, 0.25, 2.5, 0.25][step - 1]` unchanged (same b per step; step 5 first b = 0.25, second 1).
- Polygon, old: `.toBe(step === 2 || step === 5)` new: `.toBe(step >= 2)` (steps 2-5 show the polygon; step 1 only labels).
- Comment "Even at b = 5/2 ... default view" should read "inside the lesson view" (offscreenPoints now checks the fixture view; the derived point (5, -5) is the one to watch).
- setup, prepareUserState, exitStep 3, duringLesson (b = 0.25), assertUserState: unchanged. `stableCounts` reads slider 1; it is only safe where the second slider exists (route default / after exit) - confirm in the run.

## spline-g1-symmetric (`splineG1Symmetric`, ~lines 702-734)
Steps 1, 2, 3, 5 are fixtures with 4 free points and one joint = 5 points and a single beta slider; step 4 stays on the route default (6 free + 3 joints = 9 points, three sliders, beta1 = 0.75).
- `minFrames` unchanged (12; 2 + 3 + 3 + 2 + 2).
- stepProbe, old:
  `const betas = [[0.5, 0.5, 0.5], [0.25, 0.5, 0.5], [0.75, 0.5, 0.5], [0.5, 0.75, 0.5], [0.99, 0.5, 0.5]][step - 1];`
  `for (const [index, value] of betas.entries()) await expectRange(page, index, value, \`beta${index} at ${label}\`);`
  `... message: \`6 free + 3 joint points at ${label}\`}).toBe(9);`
  new:
  `const betas = [[0.5], [0.25], [0.75], [0.5, 0.75, 0.5], [0.99]][step - 1]; // only step 4 has three sliders`
  loop unchanged;
  `const points = [5, 5, 5, 9, 5][step - 1]; // 4 free + 1 joint; step 4: 6 free + 3 joints` and `... message: \`points at ${label}\`}).toBe(points);`
- Polygon `.toBe(step <= 3)` unchanged (steps 1-3 show it; 4 and 5 only labels).
- setup (9), prepareUserState, exitStep 3, duringLesson (beta0 = 0.75), assertUserState: unchanged.
