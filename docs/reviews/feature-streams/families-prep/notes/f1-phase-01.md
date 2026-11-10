# f1-phase-01 (phase-portraits task 01) - done, uncommitted

Files (new): src/dynamics/{rk4,classify2,systems2}.ts and .test.ts. No existing file edited.
- rk4.ts: rk4Step, integrate(f,s0,duration,{h,view}) -> {points,lastTime,stop}; stop in complete|non-finite|diverged|left-view; RK4_STEP=0.02, RK4_MAX_NORM=1e6 (Euclidean).
- classify2.ts: classifyPlane(m), traceDeterminant, companionMatrix. Uses gridInteger (throws RangeError off the quarter grid) and classifyEigen for star vs degenerate. Returns tau/delta/Delta with +0 (no -0).
- systems2.ts: SYSTEM_IDS, systemField, systemJacobian, systemEquilibria (pendulum: 0, +pi, -pi), isHyperbolic (integer test, throws off grid), equilibriumJacobian, isHyperbolicEquilibrium.

Checks: just unit src/dynamics pass (21 tests); tsc --noEmit exit 0 (no errors at all); just lint src/dynamics pass; no trailing whitespace.
Repairs: seed outside view now returns left-view after zero steps (test failed before fix); comment fixed.
Mutations (each observed failing, restored): k2 weight 1 -> 9 failures; centre folded into spiral -> 4; star/degenerate swapped -> 4.

Spec issue (not edited): PP2 says H(0,2)=2 (rotation). Actual H=omega^2/2-cos(0)=1, the separatrix (spec's own "omega=+-2 iff H=1"). H(0,1.9)=0.805 is right.
Notes: mixed-eigenvalue node ratio 16 only holds at small h (h=0.2 gives about 25); test uses 0.05/0.025/0.0125.
Not done: smoke tests (kernel only), consumers of these modules.
