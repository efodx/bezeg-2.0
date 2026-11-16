# F3 kinematics Batch C (KN5), slice 1: osculating circle and opening probe

## Written
- `src/kinematics/kinematicsModel.ts`: stored toggle `osculating` (default false); the strict parser reads a missing field as false (old Presets), a non-boolean is refused.
- `src/graphs/curves/kinematics/KinematicsGraph.tsx`: tangent and normal axes (two thin dashed lines, shown while `split` and the point is regular), the osculating circle (`osculatingCircleNow()`: radius 1/|kappa|, centre on the left normal / kappa; hidden at a cusp, at kappa = 0 and above 2 board-frame sizes), a switch, three captions (axes, circle, circle-not-drawn), the cusp caption also for `osculating`.
- `src/learning/model.ts`: `set-params` gains `osculating?: boolean`. sl/en `kinematics_graph_osculating(_help)`, `_cap_axes`, `_cap_osculating`, `_cap_osculating_far`. `docs/localization.md`: one row.
- Already present, not added: a_T and a_N rows, kappa and kappa v^2 rows, the speeding/slowing/stationary status, "ni določen"/"not defined" at a cusp.

## Observed
- Tests: `KinematicsGraph.test.tsx` (new describe, six tests), host test (one). Red first was NOT done in order: implementation preceded the tests; the only red run (`s1-red.log`) showed two failures that were test errors (object count 26 to 34; alpha 90 outside [5, 85]). Green: `s1-unit.log`. tsc empty, lint and build passed.
- Probe: `.command-logs/kin-c/probe.txt` (sl and en). Spec numbers all agree (three decimals): t = pi/2 speed 1,414, a_T 0,707, a_N -0,707, kappa -0,354, kappa v^2 -0,707; t = pi speed 2, a_T 0, a_N -1, kappa -0,25, radius 4; t = 1: 0,959, 0,878, -0,479. Cusp t = 0 and 2 pi: components "ni določen". t = 0,01: kappa -50, radius 0,02 (tiny circle drawn).
- Board at the opening: [-2,67; 5,66; 8,95; -2,09]. The circle at t = pi (centre (pi, -2), r 4) is NOT inside the board: its lower part runs to y = -6. Same at pi/2 and t = 1; the projectile apex circle (r 20,4) also leaves the board. The frame is unchanged (an arc is shown).
- The cycloid has no speed field. "Slow down" works on circular only: R = 1, omega 1 to 0,5 at pi/2: a_N 1 to 0,25, kappa stays 1.
- Markers: the arrows are built once per scene, not per step; the test checks equal object and marker counts across set-time calls (jsdom may hold no markers, so weak).

## Which readouts reveal later answers on the first frame
All of a_T, a_N, kappa, kappa v^2 and the status show at every t; with `osculating` the radius is drawn. The caption "aₙ in κ: negativno, ko tir zavija desno" names the sign.

## Doubts
- Projectile near the apex says "zavira" with a_T = -0,011 (a_T threshold for "approximately 0" is small).
- Frame does not widen for the circle.
- Not verified: browser look, 310 px inspector, smoke.

## Slice 1b (accept-or-repair of the osculating circle)

- Centre drawn as a small fixed point and a thin segment from the moving point to it, both in the circle's colour, hidden with the circle (`KinematicsGraph.tsx`, after the circle curve). `kinematics_graph_cap_osculating` now names the centre and radius (sl and en). Owned object count 34 to 36. Test: centre (pi, -2), segment length 4 at t = pi, hidden at the cusp; seen red before the change.
- Red for slice 1 against HEAD `KinematicsGraph.tsx` and `kinematicsModel.ts`: 9 failures in 2 files (`s1b-red.log`); green again with the change.
- Marker test: markers are 4 in jsdom (not vacuous). Now also asserts the same object ids across five `set-time` calls and an `osculating` toggle; a temporary per-`set-time` object replacement fails it (`s1b-marker-red.log`), reverted.
- Browser look (`s1b-shots/`): inspector is 310 px wide natively at 1366x768. Switch label on one line; "Razstavi pospešek..." on two. Captions cross the dashed normal axis at t = pi (desktop). On 390x844 the captions wrap and cover the arc and the point: the board is short there.
- Checks: unit (kinematics, learning/content) passed, tsc empty, lint passed, build passed.
