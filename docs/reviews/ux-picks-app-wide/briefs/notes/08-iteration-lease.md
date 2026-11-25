# 08 iteration lease notes

`AnimationDriver` already had `useLease(spec)` (animation.ts:~45; `AnimationLeaseSpec` = arbiter getter, keys, onInterrupted). Frames run under `lease.run`, lease taken at play, released on pause/stop/dispose, interruption stops the driver. So `IterationController.useLease(spec)` is a thin passthrough (iterationController.ts) that also zeroes `elapsed` and reads `status === 'paused'` after an interruption (cleared on play/reset).

Linear map pilot switched (LinearMapGraph.tsx): hand-rolled `stepLease`, `releaseStepLease`, `lease.run(tick)` removed; `.useLease({arbiter: () => this.parameters, keys: ["linear-map-step"], onInterrupted: render})`.

Logs: 08-il-red.log (mutation: passthrough disabled, 6 of 6 new tests red), 08-il-unit-runtime.log, -linear.log, -writes.log, 08-il-tsc.log, 08-il-lint.log.

The 9 lane graphs (all bare AnimationDriver, none use IterationController; they call `driver.useLease(...)` directly):
- arc-length-param: curves/arclength/ArcLengthParametrizationGraph.tsx:277
- contour-map: levelsets/ContourMapGraph.tsx:802
- curve-kinematics: curves/kinematics/KinematicsGraph.tsx:733
- curve-parametric: curves/parametric/ParametricCurveGraph.tsx:68 (roll driver)
- decasteljau-alternative: curves/bezier/DecasteljauGraph2.tsx:42 (DecasteljauGraph.tsx:70 lessonAnimation too)
- epicycles: functions/EpicycleGraph.tsx:79
- mechanics-descent: mechanics/DescentGraph.tsx:789
- prob-simulation: random/SimulationGraph.tsx:679
- waves: functions/WavesGraph.tsx:783
Other bare drivers: PhasePortraitGraph.tsx:889, patches/patchSweep.ts:32.
IterationController users (use the new passthrough): LinearMapGraph:415, ComplexPowerGraph:398, EulerCircleGraph:458, LogisticMapGraph:557, RecursionCobwebGraph:360, base/tracePlayback.ts:58.
