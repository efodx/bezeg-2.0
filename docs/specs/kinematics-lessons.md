# Kinematics on curves (Kinematika na krivuljah)

**Status:** draft, 2026-11-10 (stream families-prep); not scheduled for release.
**Agreed:** owner scheduled preparation 2026-11-10 (family #7 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md)); details below are proposals for owner review.
**Source:** the research note's entry 7 (opening lesson, lesson list, risks) and the matura catalogue M-MAT-2026, text extraction read for this spec: §4.13 *Diferencialni račun* (page 21; *Uporaba odvoda*, *Drugi odvod funkcije*, *Modeliranje realnih problemov in njihovo reševanje z uporabo metod diferencialnega računa*, objectives "zapiše enačbi tangente in normale v dani točki krivulje" and "povezuje lastnosti funkcij in njen odvod"). Vector-valued derivatives, speed along a parametrized curve and acceleration components are not named in the extraction, so they are **enrichment** beyond the matura; the anchor covers the derivative, the second derivative, the tangent and normal, and modelling. Level markers (VR) were not verified. Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

Bezeg shows a parametric curve with its velocity vector (demonstration `curve-parametric`, route `/curve-geometry/parametric`, `src/demonstrations.ts:68`; graph `ParametricCurveGraph`, `src/graphs/curves/parametric/ParametricCurveGraph.tsx`, registered at `src/graphs/graphFactories.ts:161`) and its curvature and osculating circle (`curve-curvature`). The derivative is taught as a slope and as a tangent, but nothing shows the curve as a *motion*: the parameter is not time, the second derivative is never drawn as an arrow, and a learner cannot see that acceleration points into the bend, that a path has many parametrizations with different speeds, or that the curvature turns a speed into a normal acceleration \(a_N=\kappa v^2\). Physics classes use these ideas for projectiles and circular motion; the derivative is the same.

## Solution

Add a Learn chapter **Kinematika na krivuljah / Kinematics on curves** with five guided activities, each backed by a Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary, with the physics links as examples. Each lesson is 5–7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress. Each picture is labelled an **argument** (its construction establishes the claim) or an **illustration**.

**Cross-links, not repeats.** The tangent and speed of `curve-parametric` (lesson `curve-parametric` in `src/learning/content/curveGeometryChapter.ts:55`) and the curvature lesson (`curve-curvature`, line 70) are prerequisites. KN2 links the arc-length lesson steps `arc-constant-t`, `arc-speed-graph` and `arc-equal-arcs` (`src/learning/content/arcLengthGuidedLessons.ts:96`, 112, 144) and the parametrization lessons `up-speed`, `up-equal-arc` (`src/learning/content/parameterizationGuidedLessons.ts:218`, 230); the equal-arc idea is linked, not re-taught.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/kinematics/` (below) with oracle tests; ADRs 1–3 accepted | Kernel tests pass; no learner-visible route needed |
| A | KN1 Position, velocity, acceleration; KN2 Speed and parametrization | Batch 0 done; kinematics graph passes the batch gate |
| B | KN3 Projectile motion and the parabola; KN4 Uniform circular motion | Batch A released |
| C | KN5 Tangential and normal acceleration | Batch B released |

Publish batches separately. Do not expose unimplemented Demonstrations.

### Reuse and new modules

Verified by search in `src/`:

- `src/bezeg/impl/curve/curvature.ts`: `DerivativeSource` (`at(t)` gives `point`, `d1`, `d2`; line 26), `curvatureAt(d1, d2, scale)` (79; signed \(\kappa=(x'y''-y'x'')/|r'|^3\), `singular` for zero speed, `SPEED_EPS` 1e-9 of the scale), `osculatingCircle` (92). Reused as is: velocity is `d1`, acceleration is `d2`.
- `src/bezeg/impl/curve/parametric-sources.ts`: `cycloidSource` (30), `cardioidSource`, `roseSource`, `archimedeanSpiralSource`, `parabolaSource` (59, \(y=x^2\) by \(x\)). `src/graphs/curves/parametric/parametricCatalogue.ts`: `PARAMETRIC_CATALOGUE`, `velocityAt` (65, `stopped` at zero speed), `arcLength` (84, Simpson over the speed, 4000 intervals).
- Animated time: `AnimationDriver` (`src/learning/runtime/animation.ts:12`); precedents `EpicycleGraph` (`src/graphs/functions/EpicycleGraph.tsx`, time and playing flag are host state, never in a Preset) and the roll animation of `ParametricCurveGraph`.
- No existing acceleration, projectile or circular-motion code: searched `projectile`, `kinematic`, `acceleration` in `src/` (none in code; only the unrelated collision playground).

New modules (names suggested): `src/kinematics/motion.ts` (sources for projectile and uniform circular motion, reparametrization), `src/kinematics/decompose.ts` (tangential and normal components), `src/kinematics/arrowScale.ts` (scale ladder and labels), `src/kinematics/kinematicsModel.ts` (state parse/validation), graph `src/graphs/curves/kinematics/KinematicsGraph.tsx`. Pure maths stays free of React, JSXGraph, localization and graph-global state.

### Decisions needing an ADR

1. **Graph shape.** (a) New `KinematicsGraph` that reuses the catalogue and sources; (b) extend `ParametricCurveGraph` with acceleration and modes; (c) one graph per lesson. (b) changes an existing route and stored Presets; (c) duplicates the board code. Proposal: (a); the existing graph and route stay. Before Batch A.
2. **Units and \(g\).** (a) Physical units fixed per scene: lengths in metres, time in seconds, \(g=9{,}81\ \mathrm{m/s^2}\) as one named constant, shown on screen; (b) dimensionless units with \(g=1\); (c) \(g=10\). Proposal: (a), because the physics framing is the point; the constant is exported once and displayed with every projectile readout. Before Batch B.
3. **Arrow scale policy.** (a) A scale ladder \(1,2,5\times10^k\) chosen from the maximum of \(|v|\) and \(|a|\) over the domain, shown as "arrow of length 1 = \(s\) m/s" and "= \(s'\) m/s²" (velocity and acceleration have different scales, each labelled); (b) free zoom; (c) arrows always the same length. Proposal: (a), recomputed only when the scene changes, never while the point moves. Before Batch A.

## Kinematics kernel (owned by this spec)

1. **Motion.** A motion is a `DerivativeSource` plus a time domain. `projectileSource(v0, alphaDeg, g)` is \(r=(v_0\cos\alpha\,t,\;v_0\sin\alpha\,t-gt^2/2)\), \(r'\), \(r''=(0,-g)\). `circularSource(R, omega)` is \(r=(R\cos\omega t,R\sin\omega t)\). `reparametrize(source, phi)` takes \(\varphi,\varphi',\varphi''\) and gives \(r(\varphi(t))\) with \(r'\varphi'\) and \(r''\varphi'^2+r'\varphi''\) (chain rule); the path is unchanged.
2. **Decomposition.** `decompose(d1, d2)` returns speed \(v=|r'|\), \(a_T=r'\cdot r''/v\), \(a_N=(r'\times r'')/v\) (signed on the left normal) and \(\kappa=a_N/v^2\) from `curvatureAt`; singular (zero speed) returns no components. The test identity is \(a_T^2+a_N^2=|r''|^2\).
3. **Flight data.** `projectileSummary` gives flight time \(2v_y/g\), range, maximum height \(v_y^2/2g\) and apex time, closed forms used by the lesson readouts and by tests.
4. **Classification of \(a_T\).** For `circularSource` and `projectileSource` the status comes from the motion id, exactly by construction: uniform circular motion has \(a_T=0\) and "constant speed"; the projectile has no such label. For every other source "speeding up" and "slowing down" decide on the sign of \(a_T\) against the threshold \(10^{-9}\,|r''|\) (an acceleration scale; `SPEED_EPS` in `curvature.ts:39` is a speed threshold and is not reused here), and \(|a_T|\) below it reads "speed momentarily stationary (approximately)". That is a speed maximum, minimum or inflection, not constant speed (KN5 \(t=\pi\), KN2 \(t=0\)). The readout never says "exactly 0" for a computed value (see Correctness Notes).
5. **Arrow scale.** `arrowScale(maxMagnitude)` returns the ladder step and the label.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number was computed by the author with `node -e`-style scripts (listed with their outputs in the families-prep note `docs/reviews/feature-streams/families-prep/notes/spec-kinematics-waves.md`); none is guessed. Time \(t\) is in seconds, lengths in metres.

### KN1. Position, velocity and acceleration vectors

- Learning goal: the position \(r(t)\) is a point, the velocity \(r'(t)\) is tangent to the path with length equal to the speed, and the acceleration \(r''(t)\) is the rate at which the velocity changes; it need not be zero where the velocity is.
- Prerequisites: `curve-parametric`. Follow-up: KN5.
- Default example (*checked*): cycloid \(r=(t-\sin t,\,1-\cos t)\) (rolling radius \(1\) m, `cycloidSource(1)`). At \(t=\pi/2\): \(r=(0{,}5708;\,1)\), \(v=(1;\,1)\), speed \(\sqrt2=1{,}41421\), \(a=(1;\,0)\). At \(t=\pi\): \(v=(2;\,0)\), speed \(2\), \(a=(0;\,-1)\). At \(t=0\): \(v=(0;\,0)\) (cusp, the point is at rest) and \(a=(0;\,1)\), nonzero.
- Steps: (1) the path and a point at \(t=0\); predict where the point goes; (2) play or scrub \(t\), the position trace builds; (3) show the velocity arrow, tangent to the path; (4) predict, then show the acceleration arrow and where it points relative to the bend; (5) the cusp at \(t=0\): velocity zero, acceleration not; (6) free exploration with the catalogue curves.
- Graph needs: curve selector (cycloid, cardioid, rose, spiral from `PARAMETRIC_CATALOGUE`), time slider with numeric field and Play (uses the existing driver), position, velocity and acceleration arrows, a legend with both scale labels, readouts of \(r\), \(v\), \(a\) and speed, a text status ("at rest" at zero speed), keyboard stepping of \(t\).
- Acceptance:
  1. The numbers above agree to the displayed precision with `cycloidSource` output.
  2. Arrows are drawn from the point; the velocity arrow is parallel to the tangent of `curvatureAt`; zero speed draws no velocity arrow and says "at rest".
  3. Both scale labels are visible and change when the curve changes; arrow lengths are \(|v|/s\) and \(|a|/s'\) in screen units.
  4. Argument or illustration: an **illustration** of a definition (the arrows are \(r'\) and \(r''\) of the drawn source). The prose says the path is the same whatever the parameter is called "time".
  5. Reset, Preset (curve id and \(t\) only; the playing flag is not stored), restore, both languages pass.

### KN2. Speed and parametrization

- Learning goal: one path has many parametrizations; they change the speed, the acceleration and the time at which a place is reached, but not the path, its length or its direction of travel (the tangent); curvature is a property of the path.
- Prerequisites: KN1, `arc-constant-t`. Follow-up: the equal-arc lessons `up-equal-arc`, `arc-equal-arcs`.
- Default example (*checked*): the unit circle with \(\theta=t+b\sin t\), \(b=0{,}5\), against \(\theta=t\). Speed is \(1+b\cos t\): \(1{,}5\) at \(t=0\), \(1\) at \(t=\pi/2\), \(0{,}5\) at \(t=\pi\). At \(t=\pi/2\) the acceleration is \(a_T=-0{,}5\), \(a_N=1\); at \(t=0\) it is \(a_T=0\), \(a_N=2{,}25\). Curvature is \(\kappa=1\) at all three. The path length over \([0,2\pi]\) is \(6{,}28319\) for both. The quarter turn is reached at \(t=1{,}1206\) instead of \(\pi/2=1{,}5708\).
- Steps: (1) two points start together on one circle, one uniform; predict which gets to the top first; (2) play both; (3) the speed graph of each; (4) the arrow of the second is longer and shorter, the tangent is the same; (5) the acceleration of the second has a tangential part, the first none; (6) lengths and curvature are equal; (7) free exploration with slider \(b\in[0,0{,}9]\) and a link to the equal-arc lessons.
- Graph needs: two moving points, speed graph over \(t\), slider \(b\) (numeric field, step \(0{,}05\)), readouts of speed, \(a_T\), \(a_N\), \(\kappa\), arc length; the monotonicity of \(\theta\) holds for \(b<1\), the slider stops at \(0{,}9\).
- Acceptance:
  1. Numbers agree with `reparametrize` output; arc length is computed with `arcLengthBetween` (`src/bezeg/impl/kernels/arc-length.ts:87`, composite 24-point Gauss-Legendre on a `DerivativeSource`; the catalogue's `arcLength` is Simpson and takes only catalogue selections) and the test compares it with an independent Simpson sum (4000 intervals) and with \(2\pi\) to \(10^{-9}\) (tolerance).
  2. Both points use the same sampled instants; the velocity direction of the two points is the same at equal arc position (cross product at most \(10^{-12}\), tolerance).
  3. Argument or illustration: **argument** for "curvature is parametrization-invariant" (\(a_N=\kappa v^2\) with the same \(\kappa\) is displayed from the chain rule); an **illustration** for the particular \(b\). The prose names `up-equal-arc` as the way to remove the speed variation.
  4. Reset, Preset, restore, both languages pass.

### KN3. Projectile motion and the parabola

- Learning goal: with constant downward acceleration the horizontal velocity is constant, the vertical velocity changes linearly, and the path is a parabola; complementary angles give the same range.
- Prerequisites: KN1, quadratic functions. Follow-up: `curve-curvature` (the parabola's curvature).
- Default example (*checked*), \(v_0=20\) m/s, \(g=9{,}81\) m/s²: at \(45^\circ\) flight time \(2{,}8832\) s, range \(40{,}7747\) m, maximum height \(10{,}1937\) m at \(t=1{,}4416\) s, \(v_x=v_y=14{,}1421\) m/s. At \(30^\circ\) and \(60^\circ\) the range is \(35{,}3119\) m for both (heights \(5{,}0968\) and \(15{,}2905\) m). Path \(y=x\tan\alpha-gx^2/(2v_0^2\cos^2\alpha)\); at \(45^\circ\), \(t=1\) s: \(r=(14{,}1421;\,9{,}2371)\), \(v=(14{,}1421;\,4{,}3321)\), speed \(14{,}7908\) m/s. At the apex the speed is \(v_x=14{,}1421\), the acceleration \((0;\,-9{,}81)\) and the curvature \(g/v_x^2=0{,}04905\), radius \(20{,}3874\) m.
- Steps: (1) launch angle slider; predict the shape; (2) play the flight; (3) velocity arrows: horizontal part constant, vertical part shrinks, flips; (4) the acceleration arrow is the same everywhere; (5) the path as a quadratic (eliminate \(t\)); (6) \(30^\circ\) and \(60^\circ\) land together; (7) free exploration.
- Graph needs: speed and angle fields (steppers \(v_0\in[5,30]\) m/s step \(1\), \(\alpha\in[5^\circ,85^\circ]\) step \(5^\circ\)), the ground line, components of the velocity, constant acceleration arrow with its label "\(g=9{,}81\) m/s²", readouts of range, height and flight time, osculating circle at the apex (optional).
- Acceptance:
  1. The numbers above agree with `projectileSummary` and with the source output; range matches \(v_0^2\sin2\alpha/g\) to \(10^{-12}\) relative.
  2. \(g\) is the single named constant and appears in the label; no air resistance, said once in the prose.
  3. Argument or illustration: step (5) is an **argument** (the path equation follows by eliminating \(t\) from the drawn source); the range pairing is an **illustration** of the formula.
  4. Restore, Preset, both languages pass.

### KN4. Uniform circular motion and centripetal acceleration

- Learning goal: at constant speed on a circle the velocity changes direction only; the acceleration points to the centre with size \(v^2/R=\omega^2R\).
- Prerequisites: KN1, the unit circle (TR1 of [trigonometry-lessons](trigonometry-lessons.md) is a follow-up, not a prerequisite). Follow-up: KN5.
- Default example (*checked*): \(R=2\) m, \(\omega=\pi/2\) rad/s (period \(4\) s). Speed \(\omega R=3{,}14159\) m/s, \(a=\omega^2R=4{,}9348\) m/s² and \(v^2/R\) equals it. At \(t=1\): \(r=(0;\,2)\), \(v=(-3{,}1416;\,0)\), \(a=(0;\,-4{,}9348)\). Doubling \(\omega\): \(a=19{,}7392\). Doubling \(R\) at the same \(\omega\): \(v=6{,}2832\), \(a=9{,}8696\). Doubling \(R\) at the same speed: \(a=2{,}4674\).
- Steps: (1) the circle; predict the direction of the acceleration; (2) play; velocity arrow turns, constant length; (3) acceleration arrow, always toward the centre; (4) change \(\omega\); (5) change \(R\) at fixed \(\omega\); (6) change \(R\) at fixed speed (the field switches the held quantity); (7) free exploration.
- Graph needs: \(R\in[0{,}5,4]\) step \(0{,}5\), \(\omega\in[0{,}5,4]\) rad/s step \(0{,}25\), a "hold" choice (\(\omega\) or \(v\)), the centre, arrows with scale labels, readouts of period, speed and \(a\).
- Acceptance:
  1. Numbers agree with `circularSource` and `decompose`; the status "constant speed, \(a_T=0\)" comes from the motion id (exact by construction); the computed \(a_T\) double is shown as a rounded value.
  2. The acceleration arrow passes through the centre (cross product with \(r\) at most \(10^{-12}\), tolerance).
  3. Argument or illustration: an **illustration**; the claim \(a=-\omega^2r\) is stated from the source's derivative.
  4. Restore, Preset, both languages pass.

### KN5. Tangential and normal acceleration with curvature

- Learning goal: the acceleration splits into a part along the path (speeding up or slowing down) and a part toward the bend; the normal part is \(\kappa v^2\).
- Prerequisites: KN1, `curve-curvature`. Follow-up: free exploration with the catalogue curves.
- Default example (*checked*): cycloid with \(R=1\) m. At \(t=\pi/2\): speed \(1{,}41421\), \(a_T=0{,}70711\), \(a_N=-0{,}70711\) (negative: the path bends clockwise), \(\kappa=-0{,}35355\), \(\kappa v^2=-0{,}70711\), and \(a_T^2+a_N^2=1=|a|^2\). At \(t=\pi\): speed \(2\), \(a_T\approx0\), \(a_N=-1\), \(\kappa=-0{,}25\), radius of curvature \(4\) (the top of the arch). At \(t=1\): speed \(0{,}95885\), \(a_T=0{,}87758\), \(a_N=-0{,}47943\).
- Steps: (1) the path with velocity and acceleration; predict how much of the acceleration speeds the point up; (2) show the tangent and normal axes; (3) project the acceleration onto both; (4) the tangential part changes the speed (compare with the speed readout); (5) the normal part with the osculating circle; (6) \(\kappa v^2\): slow down and see the normal part shrink; (7) free exploration over the catalogue.
- Graph needs: tangent and normal axes, the two component arrows, the osculating circle (`osculatingCircle`), readouts of \(a_T\), \(a_N\), \(\kappa\), \(\kappa v^2\), and a status "speeding up/slowing down/speed momentarily stationary (approximately)" (see kernel item 4).
- Acceptance:
  1. The numbers agree with `decompose`. Oracles are independent of it: the cycloid closed forms \(a_T=\cos\tfrac t2\) and \(a_N=-\sin\tfrac t2\) for \(0<t<2\pi\) (derived from \(r'=(1-\cos t,\sin t)\), \(r''=(\sin t,\cos t)\); they give \(0{,}70711\), \(-0{,}70711\) at \(t=\pi/2\) and \(0\), \(-1\) at \(t=\pi\)), the projectile apex \(\kappa=g/v_x^2\), and a central finite difference of the speed (\(a_T=\mathrm{d}|r'|/\mathrm{d}t\), step \(10^{-5}\), tolerance \(10^{-8}\)). The identity \(a_N=\kappa v^2\) is a consistency check only, since `curvatureAt` divides the same cross product.
  2. At a cusp (zero speed) the components are "not defined", never 0.
  3. Argument or illustration: the decomposition is an **argument** (the drawn components are orthogonal projections of the drawn \(a\)); the numbers are an **illustration**.
  4. Restore, Preset, both languages pass.

## User Stories

1. As a student, I run a point along a curve and see its velocity and acceleration arrows.
2. As a student, I see that two parametrizations of one circle share the path but not the speed.
3. As a student, I change the launch angle and find that \(30^\circ\) and \(60^\circ\) land together.
4. As an educator, I project uniform circular motion and show why the acceleration points to the centre.
5. As a reader on a phone or keyboard, I enter \(t\) numerically and read text statuses instead of arrows.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Searched `src/localization/sl.ts`: *hitrost* ("Hitrost r′ = …", line 2128; "Hitrost je 0 (ost)", line 2129) and *ukrivljenost* exist; *pospešek*, *poševni met* and *kroženje* are absent. No source beyond usage in school physics was opened.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| velocity; speed | hitrost (vektor hitrosti; velikost hitrosti) | existing app usage |
| acceleration | pospešek | standard school physics |
| tangential, normal acceleration | tangentni pospešek, normalni pospešek | *tangenta*, *normala* already in the app; standard |
| centripetal acceleration | centripetalni pospešek | standard; gloss "pospešek proti središču" on first mention |
| uniform circular motion | enakomerno kroženje | standard |
| projectile motion | poševni met | standard |
| time, parameter | čas, parameter | existing |
| angular velocity | kotna hitrost | standard |

## Implementation Decisions

- The kernel is new pure TypeScript (`src/kinematics/`) built on `curvatureAt` and `DerivativeSource`; the existing curvature, catalogue and `ParametricCurveGraph` code is not edited.
- Graph state: curve or motion id, its parameters (snapped to the stated steppers), reparametrization \(b\), and \(t\). Time and the playing flag are host state and are not stored in a Preset (as for `EpicycleGraph`). Derived values are recomputed from validated state.
- Lesson scenes use typed actions (`set-motion`, `set-time`, `set-params`) through the lesson-action registry as in the [linear-maps spec](linear-maps-lessons.md#reuse-and-new-modules); multi-action scenes run synchronously in one tick and are unit tested that way.
- Routes and Presets are additive; no breaking change. A new demonstration family placement (`curve-geometry`) is decided in ADR 1.
- **Gating** (boundary in [families-prep](../tasks/feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)). Ungated now: this spec, F0 plan and ADR drafts, F1 kernel (`src/kinematics/` pure files and oracle tests). **Waits on Controls step 5:** F2a `KinematicsGraph` (playback, time stepper). **Waits on Controls step 7:** F2b registration and routes, F3 lessons, F4 chapter, F5 media. The spec plans no edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime or existing panels; a shared play or step control is a dependency on the Controls stream.
- Lesson text is one-shot ([rule](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)); prose follows `lessonMathNotation.test.ts`. Static previews and clips show the motion with a scrubbed \(t\), so clips follow the lesson guidance.

## Testing Decisions

- Kernel oracles: `projectileSource` and `circularSource` against closed forms and a central finite difference of the position (step \(10^{-5}\)); `decompose` against the identity \(a_T^2+a_N^2=|a|^2\) and against `curvatureAt` (independent formula \(\kappa=a_N/v^2\)); `reparametrize` against the closed-form circle values above; flight data against numeric solution of \(y(t)=0\) by bisection; arc length against \(2\pi\) and the known cycloid arch length \(8\) (`curveGeometryChapter.ts:63`).
- Edge tests: zero speed at the cycloid cusp (no components, no arrow), \(b\) near \(1\) rejected, \(\alpha\) at the stepper ends, \(R\) and \(\omega\) at the limits, non-finite input.
- Scene, Preset (save/reopen, export/import, malformed input), lesson/content (step counts, lockstep languages, `lessonMathNotation.test.ts`, `tsc --noEmit`) tests as in the other families.
- Browser: smoke row per lesson (default scene, play and pause, scrubbing, numeric entry, cusp, restore, catalog link, narrow viewport, keyboard, reduced motion).
- Performance: playing redraws a point, up to three arrows and a trace; measure per [the performance plan](../performance-plan.md).

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contracts are met with checked examples; units, \(g\) and both arrow scales are on screen.
3. Both languages, accessible numeric inputs, restore on exit, Presets and figure export pass; check legibility in Presentation mode.
4. Existing routes, Presets and `curve-parametric`, `curve-curvature` behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- Velocity and acceleration are the first and second parameter derivatives of the source; they depend on the parametrization (KN2), the direction of the tangent and \(\kappa\) do not.
- The tangential classification uses the stated threshold \(10^{-9}|r''|\) for generic sources and is shown as approximate; \(a_T\approx0\) means the speed is momentarily stationary, not constant. For `circularSource` and `projectileSource` the status is set from the motion id, exactly by construction (decided once, kernel item 4).
- \(a_N\) is signed on the left normal (same convention as `curvatureAt`); the prose says "toward the bend" for the unsigned reading.
- Zero speed makes the direction undefined; the kernel returns no components rather than a direction (`SPEED_EPS`).
- \(g=9{,}81\) m/s² is a stated model constant. Projectiles ignore air resistance and the Earth's rotation.
- Arrows are scaled drawings: their length is a displayed multiple of the magnitude and never compared across different units.
- Pictures illustrate instances; every "always" statement is a theorem or an explicit argument.

## Out of Scope

- Three-dimensional motion, dynamics and forces, energy, rotating frames, relativistic kinematics.
- Air resistance and numerical integration of equations of motion (a possible follow-up with the differential equation family).
- Exercises, grading, progress, free-text input, a formula parser.
- Changing `ParametricCurveGraph`, its Presets or the curvature kernel.
- Renderer replacement or build-tool changes.

## Further Notes

The research note estimates low risk because no new engine is needed. The two decisions most worth the owner's check are the fixed unit system with \(g=9{,}81\) and the separate graph (ADR 1). KN2 is the bridge to the parametrization family; its animation is a time-parameter motion like the epicycle graph and should not be produced before Controls step 5.
