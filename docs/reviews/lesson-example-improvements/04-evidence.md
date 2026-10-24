# Task 04 part (a) evidence: spline-cn, spline-c1, spline-c2

Fixtures: uniform knots, alpha 0. View box format `[xmin, ymax, xmax, ymin]`. Derived points come from the repo classes (GenericBezierSpline, C1QuadraticBezierSpline, C2CubicBezierSpline). Verified by `src/learning/content/splineExamples.test.ts` (89 tests).

## Scenes
| Scene (step) | Free points | Derived points | Pieces / degree / continuity | View | Intended observation |
|---|---|---|---|---|---|
| cn-two-pieces-labelled (1), cn-extrapolation-polygon (2, +polygon) | (-4,1) (-2,-2) (0,-3) (4,0) | (2,-4) | 2 / 2 / C1; knots 0, 1/2, 1; joint (0,-3) | [-6,3,6,-5] | Two pieces, one joint; q1 = 2p2 - p1, joint is the midpoint of p1 q1 |
| cn-degree-three-continuity-two (3) | (-5,-2) (-4,1) (-2,2) (0,1) (6,-2) | (2,0) (4,-3) | 2 / 3 / C2; joint (0,1); first diff (2,-1), second diff (0,-2) both sides | [-7,4,8,-5] | Two derived points, the second farther out |
| cn-nonlocal-default (4, default) | route default 7 | 4 | 5 / 2 / C1 | default | Non-locality (unchanged) |
| cn-limitation-amplified (5, new) | (-3,2) (-4,.5) (-3.5,-1) (-1.5,-2) (.5,0) (2.5,1.5) (4,-2) | (.5,-3) (4,-3.5) (-3,3.5) (-13.5,11) (18.5,-8) (61,-34.5) | 4 / 3 / C2; joints (-1.5,-2) (.5,0) (2.5,1.5) | [-20,15,70,-40] (90 wide) | Derived distances about 5 / 17 / 70 vs free points <= 4.47 |
| c1 steps 1,2,3,5 | (-4,-2) (-2,2) (2,2) (3,-1) | joint (0,2) | 2 / 2 / C1; spans 1/2; horizontal tangent; second diffs (0,-4) vs (-1,-3) | [-6,4,6,-4] | Joint is the midpoint of p1p2, tangent along the edge, not C2 |
| c1-local-default (4) | 6 | 3 | 4 / 2 / C1 | default | Locality (unchanged) |
| c2 steps 1-3 | (-6,-1) (-5,3) (-3,-3) (3,0) (5,2) (6,-2) | (-4,0) (-2.5,-1) (-1,-2) (1,-1) (2.5,0) (4,1) | 3 / 3 / C2; joints (-2.5,-1) (2.5,0); second diff at J1 (0.5,2) both sides | [-8,5,8,-5] | Thirds on p2p3, joints midway between neighbouring inner points |
| c2-local-default (4) | 7 | 9 | 4 / 3 / C2 | default | Locality (unchanged) |

## Checks
Per fixture scene: piece count, free count, derived points, uniform spans; joints equal the stated points; positions and derivatives up to order r agree at every joint (with interval scaling) and order r+1 differs somewhere; joint tangent norm > 0.5 on both sides; locality (which pieces change when a named free point is moved); every free and derived point strictly inside the view. Prose: the stated points and counts appear in sl and en (sl uses `;` and `{,}`); limitation norms 5 / 17 / 70, free points <= 4.5, view width 90; second-difference values of the examples. splineGuidedLessons.test.ts updated: cn 5 steps, basedOn allows lesson-fixture for these lessons, cn action set, cn bounds test replaced by a fixture degree/continuity check, pinned worked-example strings replaced. No content change was needed.

## Mutation checks (all killed)
M1/M3/M6 move a cn/c1/c2 fixture point: derived-point and joint tests fail. M2 narrow the limitation view: in-view and limitation tests fail. M4 change an sl prose point: prose-point test fails. M5 prose 17 -> 18: limitation test fails. M7 c1 p1 = p2 (zero tangent): tangent test fails. M8 derivative sign removed, M9 one-sided span x1.1: continuity test fails (11 tests). M10 limitation continuity 2 -> 1: continuity, derived and limitation tests fail. M11 locality helper moves nothing: 9 locality tests fail.

## Commands
`npx vitest run src/learning/content/splineGuidedLessons.test.ts src/learning/content/lessonMathNotation.test.ts src/learning/content/sceneContentAgainstGraphs.test.tsx src/learning/content/splineExamples.test.ts`: 4 files, 187 passed. After the final type fix, splineGuidedLessons + splineExamples: 122 passed. `npx tsc --noEmit --pretty false`: clean. No build, no Playwright, no browser.

## Gaps
Rendering of fixtures, `offscreenPoints`, and user degree/continuity restore after exit are not browser-checked. Uniform knots make interval scaling cancel, so it is exercised only by mutation M9, not by a non-uniform spline. Smoke rows not yet edited (see 04-smoke-changes.md).

## For the G1 worker
- A fixture scene is `basedOn: 'lesson-fixture', curve: {points, degree?, continuity?}, view`; the adapted lesson exposes it as `step.scene.actions[0]` = `{kind: 'prepared-scene', source: 'lesson-fixture', curve, view}`. c1/c2 fixtures need only `points`.
- splineExamples.test.ts helpers to extend: `fixturesOf(id)` (reads the adapted lesson), `build`, `pieces`, `derived`, `spans`, `gap`, `changed`, and the `EXPECT` table keyed by scene id. Add G1 classes to `KIND`/`build`; G1 is only tangent-direction continuous, so use a cross-product/direction check instead of `gap` for k = 1.
- `getNonFreePoints` order equals piece order for cn but not for c2: compare c2 as a set.
- Helpers in splineGuidedLessons.test.ts are not exported.
- Windows tooling: heredoc python loses backslashes (use the Write tool or chr(92)); open files with encoding utf-8; keep CRLF in content files.

## Part (c): spline-g1 and spline-g1-symmetric
Files: splineGuidedLessons.ts (both lessons), splineGuidedLessons.test.ts (g1/g1s fixture tests), new splineG1Examples.test.ts (80 tests: both languages for prose). Fixtures and values: see 04c-handoff.md.
Assertions (per fixture scene): free-point list, ratio count/range, piece count, uniform spans, derived points (symmetric: joints), joints; tangent directions equal and nonzero at every joint (cross = 0, dot > 0); right/left derivative norm ratio = b (or (1-beta)/beta) under the actual spans, C1 only at ratio 1; polygon collinear at joints; locality/propagation (moved point or edited ratio changes exactly the stated pieces); every point and joint inside the view; slider-max (b = 3) still in view; prose points, counts, derivatives, norms (2 decimals) and ratio words in sl and en.
Result: 5 spline test files 269 passed; `npx tsc --noEmit --pretty false` clean.
Mutation checks on the lesson content (each run failed the new tests unless noted): g1 point moved (1 fail, after adding the POINTS assertion; first run survived because the fourth point does not affect joint/derived), ratio 0.25 to 0.3 (7), chain action 0.25 to 0.5 (3), chain last point moved (1, same survivor fix), sl norm 2,83 to 2,84 (1), en 28.28 to 28.29 (1), g1 view ymin -7 to -4 (2), symmetric beta 0.75 to 0.7 (4), symmetric point moved (10), symmetric joint prose -1,5 to -1,6 (1). Tangent direction is guaranteed by the construction, so no lesson-content mutation can break it; it is guarded against implementation change only.
Gaps: no browser check; smoke row changes are in 04-smoke-changes.md and not applied.
