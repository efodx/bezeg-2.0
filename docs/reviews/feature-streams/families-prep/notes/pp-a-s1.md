# pp-a slice 1: phase-portrait scene actions and opening probe

## Written
- `src/learning/model.ts` (phase union, ~line 530-550): `set-matrix {A,B,C,D}` (quarter units, -16..16), `set-system {system}`, `set-seeds {seeds: {X,Y}[]}` (1..6, each -80..80, seed = /20). `set-seed` (logistic X) unchanged. Imports `SystemId`.
- `src/graphs/dynamics/PhasePortraitGraph.tsx` (`applyPhaseAction`, `commitPhase`, `registerLessonActions`, before the Text section): merge, `parsePhaseState` before any write, `phase <op>: <field> <reason>.`, unknown fields refused, `set-r/set-seed/set-step` throw "not an operation of the phase portrait", valid action halts playback (time kept), only changed fields written. `set-system` = `withSystem(state, system)` then parse: matrix and seeds kept, equilibrium back to 0 where the system lacks it.
- `src/graphs/dynamics/LogisticMapGraph.tsx` (switch, 3 cases): refuses the new ops (needed for the exhaustive `never`; did not refuse before).
- `src/graphs/dynamics/PhasePortraitLessonActions.host.test.tsx`: 11 tests.
- Probe test deleted; evidence `.command-logs/pp-a/probe.txt` (sl lines 1-406, en 407-end).

## Observed
- Host test red (registry.on commented out): 9 failed, 1 passed (`host-red.log`); green 11 passed (`host.log`). `just unit src/graphs/dynamics` passed; tsc clean (0 lines).
- Default state IS the node N = [[-4,-1],[-2,-3]], seed (1,0): the opening shows type, tau, delta, discriminant, eigenvalues, inset marker at once.

## Probe summary (sl; en rows are the same keys)
- Rows always shown: time, system, centre, type, tau, delta, discriminant, matrix, hyperbolic, eigenvalues, view, per seed one row. Status sentence "Čas 0 s. Tip: <type> (τ = .., δ = ..)." gives the type too. Everything is visible: no view modes. Pendulum adds decision row, energy row per seed (H, "nihanje (sklenjena orbita)" / "vrtenje" / "točno na separatrisi (θ = 0 in |ω| = 2)"), ring rows, status "Tip linearizacije: središče ... Ni hiperbolična".
- Seed rows say only "forward computed for the whole 10 s / stopped after t s: left region". No bend, slow-direction or closing/drift readout; centre orbit simply "computed 10 s" both ways (end point after 10 s is (cos 10, sin 10) rotated, no drift readout).
- Node N, any seed: all 4 seeds (1,1),(1,-2),(-1,2),(2,0) forward 10 s, backward stops 0.18-0.42 s. Same rows for all seeds: seed choice changes only the seed row.
- Saddle diag(1,-1): seed (1,1) both halves stop 1.4 s; on the x-axis (1,0) forward stops 1.4 s, backward 10 s; (0,1) mirror; (1,0.05) forward 1.4 s, backward 4.4 s (the near-axis seed departs along the other direction), tau=0 delta=-1 disc=4 eigen 1,-1.
- Single entry node -> spiral from N: change C: -2..0 node, C=1/4 degenerate node (Δ=0, "stabilno degenerirano vozlišče"), C>=1/2 spiral (Δ=-1). From [[-1,0],[0,-2]]: set C=1 (C=4 stored), B 0 node, -1/4 degenerate, <=-1/2 spiral. Via D: [[-1,0],[0,d]] d -2..-1: node, d=-1 star node (Δ=0). Centre [[0,-1],[1,d]]: d=0 centre, d=-1/4 already spiral (tau -0.25).
- Saddle diag(1,-1) one entry D: -1..-1/4 saddle, 0 "premica ravnovesnih točk" (delta 0), 1/4..3/4 unstable node, 1 star node. So saddle -> node passes through delta=0.
- Spiral [[-1/4,-1],[1,-1/4]]: tau -0.5, delta 1.0625, lambda = -0,25 ± 1 i; forward 10 s, backward stops 5.88 s. Centre: tau 0 delta 1, lambda = 0 ± 1 i. E=[[4,1],[2,3]]: unstable node, lambda 5, 2, forward stops 0.34 s, backward 10 s. Star -I: "zvezdasto vozlišče", "(dvojna; vsaka smer je lastna smer)"; defective [[-1,1],[0,-1]]: "degenerirano", "(dvojna; ena lastna smer)"; [[0,1],[0,0]] "strižni tok"; delta=0 matrices "premica ravnovesnih točk" (also for tau=1,-1,2,3); zero matrix "vsaka točka je ravnovesna".
- Pendulum (default matrix kept, seeds read as theta, omega; labels θ, ω): (1,0) H=-0.540302 swing; (0,1) H=-0.5; (2,0) H=0.416147; (0,1.9) H=0.805 swing; (0,2) H=1 separatrix-exact, both halves 10 s (orbit ends near (±3.1414, 0.0002), never reaches the saddle); (0,2.25) H=1.53125 rotation, both halves stop 2.76 s; (0.05,2) H=1.00125 rotation (stops 8.62/8.66 s); (0,1.95) swing; (0,2.05) rotation, 4.28 s; (3.5,0) H=0.936457 swing, stops 1.56 s (view is x in [-4,4] around the centre); (3.15,0) H=0.999965 swing, stops 5.34 s; (4,0) stops 0.02 s; (0,0) H=-1. The separatrix-near status needs |H-1|<1e-9 off theta=0 and no grid seed reaches it (nearest seen: rotation 1.00125). No wrap in the seed (view shows x beyond pi; the wraps curve is drawing only). No pendulum picture or period row. Seeds default linear state keeps the matrix, which pendulum ignores.
- Controls: typed matrix entries (4 fields) only in `linear`; system chooser "Sistem"; seed count +/- and per-seed x,y (θ, ω for pendulum); zoom, equilibrium chooser (pendulum only); Play/Pause plays the time, time slider "Čas t" 0..10 s. Reset ("Ponastavi") sets time to 0 only; matrix, seeds, system stay. "Ponastavi prednastavitev" resets the preset. No Euler comparison anywhere: slice 2 states Euler numbers as arithmetic.
- Time 10 s: status adds "Konec izračunanih trajektorij: čas 10 s."

## Doubts / not verified
- Legend and caption texts drawn on the board (JSXGraph text objects) and the `phase_graph_legend_*` strings were not captured; only readout rows, status, inset label.
- Seed row's stop reason for a seed leaving the view at time 0.02 s (e.g. pendulum (4,0)) is a graph fact, not a bug.
- No smoke test run (not requested).
