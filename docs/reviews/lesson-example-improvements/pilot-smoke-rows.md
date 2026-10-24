# Pilot smoke rows (tests/guided-lessons.smoke.spec.cjs)

Status: all eight rows added (not run; syntax checked with `node --check`). Sources of expected values: fixtures and
worked examples in src/learning/content/{guidedLessons,expansionGuidedLessons,additionalGuidedLessons}.ts.
Paths from src/demonstrations.ts. Frame counts = sum of `frames` per step.

| Row | Steps / minFrames | Assertions | Source |
|---|---|---|---|
| bezier | 6 / 14 | symmetric cubic points steps 1-4, B(1/2)=(0,1) step 4, asymmetric cubic + (0.38,0.75) step 5, curve count stable; polygon switch OFF before lesson, ON during (exit step 3), OFF after | bezierSymmetric/AsymmetricFixture |
| decasteljau | 7 / 19 | t slider 0.5,0.5,0.5,0.5,0.25,0.75,0.5; scheme rows per step (quadratic, cubic, t=1/4, t=3/4, quartic final (0,1.75)); point count stable per degree; user t 0.8 replaced by 0.25 at step 5 and restored | worked examples |
| affine | 5 / 13 | base, translated (-2,-1), quarter-turn, scale-2 control points; curve count stable; polygon switch restore | affineFixture, centre (3,1) |
| elevation | 4 / 9 | P_0..P_3 steps 1-3, B(1/2)=(-0.5,1.75), B(3/4)=(1.625,0.8125) step 4, point count +1 at step 4; user elevation replaced at step 2 (points-1) and restored | additional lesson, Bernstein weights |
| rational | 5 / 13 | weights per step [1,1,1,1],[1,2,1,1],[1,4,1,1],[1,4,1,1],[1,1,1,1]; fixture points and B(1/2) (0,1.5),(-0.82,1.91),(-1.59,2.29); weight labels hidden before/after | RATIONAL fixtures header comment |
| rational-decasteljau | 6 / 14 | weights and final point per step (0,0),(0,1),(0,1),(0,1.5),(-0.82,1.91)x2; t slider 0.5; user t 0.8 restored | rationalDecasteljau fixtures |
| ph-cubic | 6 / 14 | control points (-2,-1),(-2/3,-1),(2/3,-1/3),(5/3,1) every step; offset curve adds curves from step 3 | worked example ph-default-control-points |
| ph-quintic | 5 / 11 | P_0=(-2,-1) and last point (1/3,16/15) every step; offset curve adds curves from step 3 | step 1 scene text |

## Unverified (check in the first browser run)
- Slider index 0 is `t` on decasteljau and rational-decasteljau routes (used in `rangeValue`/`setRange`).
- Scheme / marker points (decasteljau rows, B(1/2) markers) are visible board points; point-count stability per degree.
- Affine quarter-turn direction (counter-clockwise assumed) and that translate/rotate/scale actions are absolute from the fixture.
- Polygon switch label "Control polygon" exists on bezier/affine routes (maybe Display tab) and is OFF-able by default.
- Elevation: "Elevate degree" button; step 4 has exactly one more visible point than steps 1-3; step 2 scene has points = saved - 1.
- Rational base route has weight labels off by default (assertion in prepareUserState).
- PH rows: offset curve increases `boardStats().curves` from step 3 and not before; PH quintic last control point visible as a board point. No offset slider/user-state test was written (offset slider is behind the "Curve offsets" Display switch; slider name "Offset distance d", step 0.01) - remaining improvement.
- Hodograph generator points and the PH steps 4-6 offset sign are not asserted.
