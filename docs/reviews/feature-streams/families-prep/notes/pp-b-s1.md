# F3 Batch B slice 1: zoom and equilibrium actions, opening probe

## Written
- `src/learning/model.ts` (phase union): `set-zoom {zoom}` and `set-equilibrium {equilibrium}`, comment updated.
- `src/graphs/dynamics/PhasePortraitGraph.tsx` `applyPhaseAction`: both cases (unknown fields refused, merged state through `parsePhaseState`, `commitPhase` halts playback and writes changed fields only); comment updated.
- `LogisticMapGraph.tsx`: refuses both.
- `PhasePortraitLessonActions.host.test.tsx`: 6 new tests (equals zoom slider typing and equilibrium chooser; sequence with `set-system`; invalid zoom 7, -1, 1.5, NaN, equilibrium 1 for linear and weak-spiral, 2 and -1 for pendulum; unknown fields; set-system keeps zoom; playback paused; logistic refusal). The old "unknown operation set-zoom" entry in the bad list became "set-zoom with an extra field".
- Probe test deleted. Log: `.command-logs/pp-b/probe.txt` (sl and en).

## Observed
- Red (both effects commented out): 6 failures (`host-red.log`); green (`host.log`); `just unit src/graphs/dynamics` passed; tsc and lint clean (`s1-*.log`).
- `set-system` keeps `zoom`; resets `equilibrium` to 0 only where the system has no such one (tested).

## Probe summary
- All three PP3 openings show type, hyperbolic, eigenvalues, Jacobian and the "decision" row at once (no view modes).
- Pendulum (pi,0): "Tip linearizacije: sedlo (tau = 0, delta = -1)", Jacobian rows (0;1),(1;0), hyperbolic "da", eigenvalues "lambda1 = 1, lambda2 = -1", decision row names Hartman-Grobman. At zoom 0 the nonlinear ring has 20 of 24 halves stopped, the linear ring 24 of 24; at zoom 1 to 4 both are 24 of 24. Nothing quantifies the distance between the two curves at any zoom (only the stopped counts). The legend names ring (solid, nonlinear) and ring_linear (dashed) and the eigen lines.
- Pendulum (0,0): Jacobian (0;1),(-1;0), centre, hyperbolic "ne", eigenvalues "0 +- 1 i", status ends "Ni hiperbolicna: linearizacija ne doloca lokalnega portreta." (en: "Not hyperbolic: the linearization does not decide the local portrait."). Zoom 0: nonlinear ring 20 of 24 halves stopped, linear 0 of 24; zoom 3: 0 and 0.
- Weak-spiral: Jacobian is (0;-1),(1;0), NOT the pendulum's (0;1),(-1;0): a rotation of the other sense. Same centre wording, the status never says the exact brief phrase "not hyperbolic: the linearization does not decide" as one sentence; it is "Ni hiperbolicna: linearizacija ne doloca lokalnega portreta." Seed (1,0) and (0,1) at zoom 0: forward computed for the full 10 s, backward stopped at 0,48 s at the frame. Readouts show no radius r(t): the shrinking radius (0,2182179 at t = 10) is visible only in the drawing.

## Doubts
- Default seed (1,0) and the ring leave the view at zoom >= 1 for the pendulum (seed-1 "ustavljena po 0 s: zapustila je izcrtano obmocje"; same at weak-spiral zoom 3): a lesson that zooms must also `set-seeds` inside the half-width (4/2^zoom), otherwise the zoomed seed is stopped at 0 s. I did not probe zoomed scenes with an in-view seed (the probe only covered seed (0.05,0) at zoom 3, which is also outside: half-width 0,5 around (pi,0), seed is at theta = 0,05).
- For the pendulum at (pi,0) the seed fields mean (theta, omega) absolute, not relative to the equilibrium: a seed near the saddle is (3.14 + small, 0), reachable with grid 1/20 only at 3.15 etc.
- Drawing was not inspected visually (no browser); only DOM text.
